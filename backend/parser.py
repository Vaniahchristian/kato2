"""Parse Super Will Limited shipping manifest CSV/XLSX files."""

from __future__ import annotations

import csv
import io
import re
from dataclasses import dataclass, field
from datetime import date, datetime
from pathlib import Path
from typing import BinaryIO


@dataclass
class LineItem:
    description: str
    ctns: int | None
    qty_per_ctn: int | None
    unit: str | None
    unit_price: float | None
    price_suffix: str | None
    amount: float | None
    weight_kg: float | None
    gross_weight_kg: float | None


@dataclass
class ShopGroup:
    shop_no: str
    sub_amount: float | None = None
    deposit: float | None = None
    balance: float | None = None
    cbm: float | None = None
    line_items: list[LineItem] = field(default_factory=list)


@dataclass
class ParsedInvoice:
    supplier_name: str | None = None
    client: str | None = None
    loading_date: date | None = None
    container_no: str | None = None
    shop_groups: list[ShopGroup] = field(default_factory=list)
    general_cartons: int | None = None
    general_amount: float | None = None
    general_cbm: float | None = None
    general_weight: float | None = None
    fx_rate: float | None = None
    usd_amount: float | None = None
    deposit: float | None = None
    commission: float | None = None
    ship_cost: float | None = None
    balance: float | None = None


class ParseError(Exception):
    def __init__(self, message: str, row: int | None = None):
        self.row = row
        super().__init__(message)


def _cell(row: list[str], idx: int) -> str:
    if idx < len(row):
        return (row[idx] or "").strip()
    return ""


def _to_float(val: str) -> float | None:
    val = val.strip().replace(",", "").replace("￥", "").replace("$", "")
    if not val:
        return None
    try:
        return float(val)
    except ValueError:
        return None


def _to_int(val: str) -> int | None:
    f = _to_float(val)
    return int(f) if f is not None else None


def _parse_date(val: str) -> date | None:
    val = val.strip()
    if not val:
        return None
    for fmt in ("%m/%d/%Y", "%Y-%m-%d", "%d/%m/%Y"):
        try:
            return datetime.strptime(val, fmt).date()
        except ValueError:
            continue
    return None


def _read_rows_from_bytes(data: bytes, filename: str) -> list[list[str]]:
    lower = filename.lower()
    if lower.endswith(".xlsx"):
        from openpyxl import load_workbook

        wb = load_workbook(io.BytesIO(data), read_only=True, data_only=True)
        ws = wb.active
        rows: list[list[str]] = []
        for row in ws.iter_rows(values_only=True):
            rows.append([str(c) if c is not None else "" for c in row])
        wb.close()
        return rows

    text = data.decode("utf-8-sig")
    return list(csv.reader(io.StringIO(text)))


def _read_rows_from_path(path: Path) -> list[list[str]]:
    return _read_rows_from_bytes(path.read_bytes(), path.name)


def _parse_footer_line(line: str, invoice: ParsedInvoice) -> None:
    # FX: ￥62101.4/7.15=$8685.510
    fx = re.search(r"[/=]([\d.]+)\s*=\s*\$?([\d.]+)", line)
    if "￥" in line or "¥" in line:
        rate = re.search(r"[/]([\d.]+)", line)
        if rate:
            invoice.fx_rate = float(rate.group(1))
        if fx:
            invoice.usd_amount = float(fx.group(2))

    if line.upper().startswith("DEPOSIT"):
        m = re.search(r"\$?([\d.]+)", line)
        if m:
            invoice.deposit = float(m.group(1))

    if line.upper().startswith("COMMISSION"):
        amounts = re.findall(r"\$?([\d.]+)", line)
        if amounts:
            invoice.commission = float(amounts[-1])

    if line.upper().startswith("SHIP"):
        amounts = re.findall(r"=\$?([\d.]+)", line)
        if amounts:
            invoice.ship_cost = float(amounts[-1])
        else:
            m = re.search(r"\$?([\d.]+)\s*$", line)
            if m:
                invoice.ship_cost = float(m.group(1))

    if line.upper().startswith("BALANCE"):
        amounts = re.findall(r"=\$?([\d.]+)", line)
        if amounts:
            invoice.balance = float(amounts[-1])


def parse_rows(rows: list[list[str]]) -> ParsedInvoice:
    invoice = ParsedInvoice()
    current_group: ShopGroup | None = None
    in_items = False

    for i, row in enumerate(rows, start=1):
        c0 = _cell(row, 0)
        if not c0 and not any(_cell(row, j) for j in range(1, 14)):
            continue

        # Supplier
        if c0 and c0 != "Client" and not in_items and not invoice.supplier_name:
            if "Limited" in c0 or "LTD" in c0.upper():
                invoice.supplier_name = c0
                continue

        if c0 == "Client":
            invoice.client = _cell(row, 1) or invoice.client
            invoice.loading_date = _parse_date(_cell(row, 5)) or invoice.loading_date
            invoice.container_no = _cell(row, 11) or invoice.container_no
            continue

        if c0 == "Shop No.":
            in_items = True
            continue

        if c0 == "GENERAL CARTONS":
            in_items = False
            invoice.general_cartons = _to_int(_cell(row, 2))
            invoice.general_amount = _to_float(_cell(row, 7))
            invoice.general_cbm = _to_float(_cell(row, 10))
            invoice.general_weight = _to_float(_cell(row, 13))
            continue

        upper = c0.upper()
        if upper.startswith("DEPOSIT") or upper.startswith("COMMISSION") or upper.startswith("SHIP") or upper.startswith("BALANCE") or "￥" in c0 or "¥" in c0:
            _parse_footer_line(c0, invoice)
            continue

        if not in_items:
            continue

        desc = _cell(row, 1)
        if not desc:
            continue

        if c0:
            current_group = ShopGroup(
                shop_no=c0,
                sub_amount=_to_float(_cell(row, 8)),
                deposit=_to_float(_cell(row, 9)),
                balance=_to_float(_cell(row, 10)),
                cbm=_to_float(_cell(row, 11)),
            )
            invoice.shop_groups.append(current_group)
        elif current_group is None:
            raise ParseError(f"Line item without shop group: {desc}", row=i)

        current_group.line_items.append(
            LineItem(
                description=desc,
                ctns=_to_int(_cell(row, 2)),
                qty_per_ctn=_to_int(_cell(row, 3)),
                unit=_cell(row, 4) or None,
                unit_price=_to_float(_cell(row, 5)),
                price_suffix=_cell(row, 6) or None,
                amount=_to_float(_cell(row, 7)),
                weight_kg=_to_float(_cell(row, 12)),
                gross_weight_kg=_to_float(_cell(row, 13)),
            )
        )

    if not invoice.shop_groups:
        raise ParseError("No shop groups found in file")

    return invoice


def parse_file(path: str | Path) -> ParsedInvoice:
    return parse_rows(_read_rows_from_path(Path(path)))


def parse_upload(data: bytes, filename: str) -> ParsedInvoice:
    return parse_rows(_read_rows_from_bytes(data, filename))


def _self_check() -> None:
    sample = Path(__file__).resolve().parent.parent / "NALUYIMA 04 (1).csv"
    if not sample.exists():
        print(f"SKIP: sample file not found at {sample}")
        return

    inv = parse_file(sample)
    assert inv.supplier_name == "Super Will Limited", inv.supplier_name
    assert inv.client == "NALUYIMA", inv.client
    assert inv.container_no == "TGBU9257280", inv.container_no
    assert inv.loading_date == date(2025, 4, 15), inv.loading_date
    assert len(inv.shop_groups) == 7, len(inv.shop_groups)
    total_items = sum(len(g.line_items) for g in inv.shop_groups)
    assert total_items == 54, total_items
    assert inv.general_amount is not None and abs(inv.general_amount - 62101.4) < 0.1
    assert inv.general_cartons == 93
    print("parser self-check OK")


if __name__ == "__main__":
    _self_check()
