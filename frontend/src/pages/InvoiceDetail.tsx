import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { getInvoice, InvoiceDetail as Invoice, PricingItem } from "../api/client";

function fmt(n: number | null | undefined) {
  return n != null ? n.toLocaleString() : "—";
}

function groupByShop(items: PricingItem[]) {
  const groups: { shop_no: string; items: PricingItem[] }[] = [];
  const seen = new Map<string, PricingItem[]>();
  for (const item of items) {
    if (!seen.has(item.shop_no)) {
      const list: PricingItem[] = [];
      seen.set(item.shop_no, list);
      groups.push({ shop_no: item.shop_no, items: list });
    }
    seen.get(item.shop_no)!.push(item);
  }
  return groups;
}

function ManifestView({ invoice }: { invoice: Invoice }) {
  return (
    <>
      <div className="card">
        <dl className="meta-grid">
          <div><dt>Supplier</dt><dd>{invoice.supplier_name ?? "—"}</dd></div>
          <div><dt>Loading Date</dt><dd>{invoice.loading_date ?? "—"}</dd></div>
          <div><dt>Container</dt><dd>{invoice.container_no ?? "—"}</dd></div>
          <div><dt>Cartons</dt><dd>{fmt(invoice.general_cartons)}</dd></div>
          <div><dt>General Amount</dt><dd>{fmt(invoice.general_amount)}</dd></div>
          <div><dt>CBM</dt><dd>{fmt(invoice.general_cbm)}</dd></div>
          <div><dt>Weight (kg)</dt><dd>{fmt(invoice.general_weight)}</dd></div>
          <div><dt>USD Amount</dt><dd>{fmt(invoice.usd_amount)}</dd></div>
          <div><dt>Deposit</dt><dd>{fmt(invoice.deposit)}</dd></div>
          <div><dt>Commission</dt><dd>{fmt(invoice.commission)}</dd></div>
          <div><dt>Shipping</dt><dd>{fmt(invoice.ship_cost)}</dd></div>
          <div><dt>Balance</dt><dd>{fmt(invoice.balance)}</dd></div>
        </dl>
      </div>

      {invoice.shop_groups.map((group) => (
        <div key={group.id} className="card shop-group">
          <h3>Shop {group.shop_no}</h3>
          <div className="shop-summary">
            Sub: {fmt(group.sub_amount)} · Deposit: {fmt(group.deposit)} · Balance: {fmt(group.balance)} · CBM: {fmt(group.cbm)}
          </div>
          <div className="table-scroll table-scroll-manifest">
            <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Ctns</th>
                <th>Qty/Ctn</th>
                <th>Unit</th>
                <th>Price</th>
                <th>Amount</th>
                <th>Wt (kg)</th>
                <th>G.W (kg)</th>
              </tr>
            </thead>
            <tbody>
              {group.line_items.map((item) => (
                <tr key={item.id}>
                  <td>{item.description}</td>
                  <td>{item.ctns ?? "—"}</td>
                  <td>{item.qty_per_ctn ?? "—"}</td>
                  <td>{item.unit ?? "—"}</td>
                  <td>{item.unit_price != null ? `${item.unit_price}${item.price_suffix ?? ""}` : "—"}</td>
                  <td>{fmt(item.amount)}</td>
                  <td>{fmt(item.weight_kg)}</td>
                  <td>{fmt(item.gross_weight_kg)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      ))}
    </>
  );
}

function PricingView({ invoice }: { invoice: Invoice }) {
  const sheet = invoice.pricing_sheet!;
  const groups = useMemo(() => groupByShop(sheet.items), [sheet.items]);

  return (
    <>
      <div className="card">
        <dl className="meta-grid">
          <div><dt>Sheet</dt><dd>{sheet.sheet_name}</dd></div>
          <div><dt>Client</dt><dd>{sheet.client ?? invoice.client ?? "—"}</dd></div>
          <div><dt>Cartons</dt><dd>{fmt(sheet.general_cartons)}</dd></div>
          <div><dt>CBM</dt><dd>{fmt(sheet.general_cbm)}</dd></div>
          <div><dt>Weight</dt><dd>{fmt(sheet.general_weight)}</dd></div>
        </dl>
      </div>

      {groups.map((group) => (
        <div key={group.shop_no} className="card shop-group">
          <h3>Shop {group.shop_no}</h3>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Ctns</th>
                  <th>Qty/Ctn</th>
                  <th>Unit Price</th>
                  <th>Unit CBM</th>
                  <th>YEN-UGX</th>
                  <th>EXP/CTN</th>
                  <th>Value Nature</th>
                  <th>Value</th>
                  <th>Value PX</th>
                  <th>Total EXP/CTN</th>
                  <th>Selling PX/CTN</th>
                  <th>PRT/CTN</th>
                  <th>TT PFT/CTN</th>
                  <th>TT Sales</th>
                  <th>TT Taxes</th>
                </tr>
              </thead>
              <tbody>
                {group.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.description}</td>
                    <td>{item.ctns ?? "—"}</td>
                    <td>{item.qty_per_ctn ?? "—"}</td>
                    <td>{fmt(item.unit_price)}</td>
                    <td>{fmt(item.unit_cbm)}</td>
                    <td>{fmt(item.yen_ugx)}</td>
                    <td>{fmt(item.exp_per_ctn)}</td>
                    <td>{item.value_nature ?? "—"}</td>
                    <td>{fmt(item.value_amount)}</td>
                    <td>{fmt(item.value_px)}</td>
                    <td>{fmt(item.total_exp_per_ctn)}</td>
                    <td>{fmt(item.selling_px_per_ctn)}</td>
                    <td>{fmt(item.prt_per_ctn)}</td>
                    <td>{fmt(item.tt_pft_per_ctn)}</td>
                    <td>{fmt(item.tt_sales)}</td>
                    <td>{fmt(item.tt_taxes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </>
  );
}

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const isPricing = location.pathname.endsWith("/pricing");
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getInvoice(id)
      .then(setInvoice)
      .catch((e) => setError(e.message));
  }, [id]);

  if (error) return <div className="container"><div className="error">{error}</div></div>;
  if (!invoice) return <div className="container"><p>Loading…</p></div>;

  const hasPricing = invoice.pricing_sheet != null;

  return (
    <div className="container">
      <p><Link to="/invoices">← Back to list</Link></p>
      <h1 className="page-title">{invoice.client} — {invoice.container_no}</h1>

      <div className="sheet-tabs">
        <Link to={`/invoices/${id}`} className={!isPricing ? "active" : ""}>
          <span className="sheet-tab-short">Sheet 1</span>
          <span className="sheet-tab-full">Sheet 1 — Manifest</span>
        </Link>
        {hasPricing && (
          <Link to={`/invoices/${id}/pricing`} className={isPricing ? "active" : ""}>
            <span className="sheet-tab-short">Sheet 2</span>
            <span className="sheet-tab-full">Sheet 2 — Pricing</span>
          </Link>
        )}
      </div>

      {!isPricing && hasPricing && (
        <p className="sheet-hint">
          This file also has pricing data.{" "}
          <Link to={`/invoices/${id}/pricing`}>Go to Sheet 2 →</Link>
        </p>
      )}

      {isPricing && !hasPricing && (
        <div className="error">No pricing sheet for this invoice.</div>
      )}

      {isPricing && hasPricing && <PricingView invoice={invoice} />}
      {!isPricing && <ManifestView invoice={invoice} />}
    </div>
  );
}
