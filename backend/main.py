import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from db import get_client
from parser import ParseError, parse_upload

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

app = FastAPI(title="Invoice Import API")


def _cors_origins() -> list[str]:
    origins = {
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://kato2.vercel.app",
    }
    if url := os.environ.get("FRONTEND_URL"):
        origins.add(url.rstrip("/"))
    return list(origins)


app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _insert_pricing(invoice_id: str, pricing) -> None:
    sb = get_client()
    sheet_res = (
        sb.table("pricing_sheets")
        .insert(
            {
                "invoice_id": invoice_id,
                "sheet_name": pricing.sheet_name,
                "client": pricing.client,
                "general_cartons": pricing.general_cartons,
                "general_cbm": pricing.general_cbm,
                "general_weight": pricing.general_weight,
            }
        )
        .execute()
    )
    sheet_id = sheet_res.data[0]["id"]
    sb.table("pricing_items").insert(
        [
            {
                "pricing_sheet_id": sheet_id,
                "shop_no": item.shop_no,
                "description": item.description,
                "ctns": item.ctns,
                "qty_per_ctn": item.qty_per_ctn,
                "unit_price": item.unit_price,
                "unit_cbm": item.unit_cbm,
                "yen_ugx": item.yen_ugx,
                "exp_per_ctn": item.exp_per_ctn,
                "value_nature": item.value_nature,
                "value_amount": item.value_amount,
                "value_px": item.value_px,
                "total_exp_per_ctn": item.total_exp_per_ctn,
                "selling_px_per_ctn": item.selling_px_per_ctn,
                "prt_per_ctn": item.prt_per_ctn,
                "tt_pft_per_ctn": item.tt_pft_per_ctn,
                "tt_sales": item.tt_sales,
                "tt_taxes": item.tt_taxes,
            }
            for item in pricing.items
        ]
    ).execute()


def _insert_invoice(parsed, filename: str, pricing=None) -> dict:
    sb = get_client()

    inv_row = {
        "supplier_name": parsed.supplier_name,
        "client": parsed.client,
        "loading_date": parsed.loading_date.isoformat() if parsed.loading_date else None,
        "container_no": parsed.container_no,
        "source_filename": filename,
        "general_cartons": parsed.general_cartons,
        "general_amount": parsed.general_amount,
        "general_cbm": parsed.general_cbm,
        "general_weight": parsed.general_weight,
        "fx_rate": parsed.fx_rate,
        "usd_amount": parsed.usd_amount,
        "deposit": parsed.deposit,
        "commission": parsed.commission,
        "ship_cost": parsed.ship_cost,
        "balance": parsed.balance,
    }

    inv_res = sb.table("invoices").insert(inv_row).execute()
    invoice_id = inv_res.data[0]["id"]

    for group in parsed.shop_groups:
        grp_res = (
            sb.table("shop_groups")
            .insert(
                {
                    "invoice_id": invoice_id,
                    "shop_no": group.shop_no,
                    "sub_amount": group.sub_amount,
                    "deposit": group.deposit,
                    "balance": group.balance,
                    "cbm": group.cbm,
                }
            )
            .execute()
        )
        group_id = grp_res.data[0]["id"]

        if group.line_items:
            sb.table("line_items").insert(
                [
                    {
                        "shop_group_id": group_id,
                        "description": item.description,
                        "ctns": item.ctns,
                        "qty_per_ctn": item.qty_per_ctn,
                        "unit": item.unit,
                        "unit_price": item.unit_price,
                        "price_suffix": item.price_suffix,
                        "amount": item.amount,
                        "weight_kg": item.weight_kg,
                        "gross_weight_kg": item.gross_weight_kg,
                    }
                    for item in group.line_items
                ]
            ).execute()

    if pricing:
        _insert_pricing(invoice_id, pricing)

    return {"id": invoice_id, **inv_row}


@app.post("/api/import")
async def import_file(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(400, "No filename")
    lower = file.filename.lower()
    if not (lower.endswith(".csv") or lower.endswith(".xlsx")):
        raise HTTPException(400, "Only .csv and .xlsx files are supported")

    data = await file.read()
    try:
        result = parse_upload(data, file.filename)
    except ParseError as e:
        detail = {"message": str(e)}
        if e.row:
            detail["row"] = e.row
        raise HTTPException(422, detail=detail) from e

    try:
        inv_result = _insert_invoice(result.manifest, file.filename, result.pricing)
    except Exception as e:
        raise HTTPException(500, f"Database insert failed: {e}") from e

    parsed = result.manifest
    return {
        "invoice": inv_result,
        "shop_group_count": len(parsed.shop_groups),
        "line_item_count": sum(len(g.line_items) for g in parsed.shop_groups),
        "has_pricing_sheet": result.pricing is not None,
    }


@app.get("/api/invoices")
def list_invoices():
    sb = get_client()
    res = (
        sb.table("invoices")
        .select("id, client, container_no, loading_date, general_amount, created_at, source_filename")
        .order("created_at", desc=True)
        .execute()
    )
    return res.data


@app.get("/api/invoices/{invoice_id}")
def get_invoice(invoice_id: str):
    sb = get_client()

    inv = sb.table("invoices").select("*").eq("id", invoice_id).maybe_single().execute()
    if not inv.data:
        raise HTTPException(404, "Invoice not found")

    groups = (
        sb.table("shop_groups").select("*").eq("invoice_id", invoice_id).order("shop_no").execute()
    )

    result_groups = []
    for g in groups.data:
        items = (
            sb.table("line_items")
            .select("*")
            .eq("shop_group_id", g["id"])
            .order("description")
            .execute()
        )
        result_groups.append({**g, "line_items": items.data})

    pricing_sheet = None
    ps = (
        sb.table("pricing_sheets")
        .select("*")
        .eq("invoice_id", invoice_id)
        .maybe_single()
        .execute()
    )
    if ps.data:
        items = (
            sb.table("pricing_items")
            .select("*")
            .eq("pricing_sheet_id", ps.data["id"])
            .order("shop_no")
            .execute()
        )
        pricing_sheet = {**ps.data, "items": items.data}

    return {**inv.data, "shop_groups": result_groups, "pricing_sheet": pricing_sheet}


@app.get("/api/health")
def health():
    return {"status": "ok"}
