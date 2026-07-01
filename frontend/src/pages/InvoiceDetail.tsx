import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getInvoice, InvoiceDetail as Invoice } from "../api/client";

function fmt(n: number | null | undefined) {
  return n != null ? n.toLocaleString() : "—";
}

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
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

  return (
    <div className="container">
      <p><Link to="/invoices">← Back to list</Link></p>
      <h1>{invoice.client} — {invoice.container_no}</h1>

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
      ))}
    </div>
  );
}
