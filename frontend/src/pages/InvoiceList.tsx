import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { InvoiceSummary, deleteInvoice, listInvoices } from "../api/client";

function InvoiceCard({
  inv,
  deleting,
  onDelete,
}: {
  inv: InvoiceSummary;
  deleting: boolean;
  onDelete: () => void;
}) {
  return (
    <article className="invoice-card">
      <div className="invoice-card-top">
        <Link to={`/invoices/${inv.id}`} className="invoice-card-client">
          {inv.client ?? "—"}
        </Link>
        <span className="invoice-card-amount">
          {inv.general_amount?.toLocaleString() ?? "—"}
        </span>
      </div>
      <dl className="invoice-card-meta">
        <div>
          <dt>Container</dt>
          <dd>{inv.container_no ?? "—"}</dd>
        </div>
        <div>
          <dt>Loading</dt>
          <dd>{inv.loading_date ?? "—"}</dd>
        </div>
        <div className="invoice-card-meta-wide">
          <dt>File</dt>
          <dd>{inv.source_filename ?? "—"}</dd>
        </div>
        <div className="invoice-card-meta-wide">
          <dt>Imported</dt>
          <dd>{new Date(inv.created_at).toLocaleString()}</dd>
        </div>
      </dl>
      <button
        type="button"
        className="btn-danger btn-block"
        disabled={deleting}
        onClick={onDelete}
      >
        {deleting ? "Deleting…" : "Delete"}
      </button>
    </article>
  );
}

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
      <h1 className="page-title">Invoices</h1>
      {loading && <p>Loading…</p>}
      {error && <div className="error">{error}</div>}
      {!loading && !error && invoices.length === 0 && (
        <p>No invoices yet. <Link to="/">Import one</Link></p>
      )}
      {invoices.length > 0 && (
        <>
          <div className="card invoice-list-desktop table-scroll">
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

          <div className="invoice-list-mobile">
            {invoices.map((inv) => (
              <InvoiceCard
                key={inv.id}
                inv={inv}
                deleting={deletingId === inv.id}
                onDelete={() => handleDelete(inv)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
