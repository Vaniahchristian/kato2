import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { InvoiceSummary, deleteInvoice, listInvoices } from "../api/client";

export default function InvoiceList() {
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function load() {
    setLoading(true);
    listInvoices()
      .then(setInvoices)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(inv: InvoiceSummary) {
    const label = inv.client ?? inv.container_no ?? "this invoice";
    if (!confirm(`Delete ${label}? This cannot be undone.`)) return;
    setDeletingId(inv.id);
    setError(null);
    try {
      await deleteInvoice(inv.id);
      setInvoices((prev) => prev.filter((i) => i.id !== inv.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="container">
      <h1>Invoices</h1>
      {loading && <p>Loading…</p>}
      {error && <div className="error">{error}</div>}
      {!loading && !error && invoices.length === 0 && (
        <p>No invoices yet. <Link to="/">Import one</Link></p>
      )}
      {invoices.length > 0 && (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Client</th>
                <th>Container</th>
                <th>Loading Date</th>
                <th>Amount</th>
                <th>File</th>
                <th>Imported</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td>
                    <Link to={`/invoices/${inv.id}`}>{inv.client ?? "—"}</Link>
                  </td>
                  <td>{inv.container_no ?? "—"}</td>
                  <td>{inv.loading_date ?? "—"}</td>
                  <td>{inv.general_amount?.toLocaleString() ?? "—"}</td>
                  <td>{inv.source_filename ?? "—"}</td>
                  <td>{new Date(inv.created_at).toLocaleString()}</td>
                  <td>
                    <button
                      type="button"
                      className="btn-danger"
                      disabled={deletingId === inv.id}
                      onClick={() => handleDelete(inv)}
                    >
                      {deletingId === inv.id ? "Deleting…" : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
