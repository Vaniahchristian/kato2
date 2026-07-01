import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../components/PageHeader";
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
        <span className="num invoice-card-amount">
          {inv.general_amount?.toLocaleString() ?? "—"}
        </span>
      </div>
      <dl className="invoice-card-meta">
        <div>
          <dt>Container</dt>
          <dd className="num">{inv.container_no ?? "—"}</dd>
        </div>
        <div>
          <dt>Loading</dt>
          <dd>{inv.loading_date ?? "—"}</dd>
        </div>
        <div className="invoice-card-meta-wide">
          <dt>Source file</dt>
          <dd>{inv.source_filename ?? "—"}</dd>
        </div>
        <div className="invoice-card-meta-wide">
          <dt>Imported</dt>
          <dd>{new Date(inv.created_at).toLocaleString()}</dd>
        </div>
      </dl>
      <button
        type="button"
        className="btn btn-danger btn-block"
        disabled={deleting}
        onClick={onDelete}
      >
        {deleting ? "Removing…" : "Remove shipment"}
      </button>
    </article>
  );
}

function TableSkeleton() {
  return (
    <div className="panel panel-flush">
      <div className="skeleton skeleton-row" />
      <div className="skeleton skeleton-row" />
      <div className="skeleton skeleton-row" />
    </div>
  );
}

export default function InvoiceList() {
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    listInvoices()
      .then(setInvoices)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(inv: InvoiceSummary) {
    const label = inv.client ?? inv.container_no ?? "this shipment";
    if (!confirm(`Remove ${label}? This cannot be undone.`)) return;
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
    <>
      <PageHeader
        title="Shipments"
        description="Imported manifests and container records."
        action={
          <Link to="/" className="btn btn-primary">
            New import
          </Link>
        }
      />

      {loading && <TableSkeleton />}
      {error && (
        <div className="alert alert-error" role="alert">
          <strong>Could not load shipments</strong>
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && invoices.length === 0 && (
        <div className="empty-state">
          <p className="empty-state-title">No shipments yet</p>
          <p className="empty-state-text">
            Import a manifest file to create your first container record.
          </p>
          <Link to="/" className="btn btn-primary">
            Import manifest
          </Link>
        </div>
      )}

      {invoices.length > 0 && (
        <>
          <div className="panel panel-flush invoice-list-desktop table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Container</th>
                  <th>Loading</th>
                  <th className="col-num">Amount</th>
                  <th>Source file</th>
                  <th>Imported</th>
                  <th className="col-actions" />
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td>
                      <Link to={`/invoices/${inv.id}`} className="row-link">
                        {inv.client ?? "—"}
                      </Link>
                    </td>
                    <td className="num">{inv.container_no ?? "—"}</td>
                    <td>{inv.loading_date ?? "—"}</td>
                    <td className="num">{inv.general_amount?.toLocaleString() ?? "—"}</td>
                    <td className="col-file">{inv.source_filename ?? "—"}</td>
                    <td className="col-muted">{new Date(inv.created_at).toLocaleString()}</td>
                    <td className="col-actions">
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        disabled={deletingId === inv.id}
                        onClick={() => handleDelete(inv)}
                      >
                        {deletingId === inv.id ? "…" : "Remove"}
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
    </>
  );
}
