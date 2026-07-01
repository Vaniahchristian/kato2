import { useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { importFile } from "../api/client";

export default function Import() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    invoice: { id: string };
    shop_group_count: number;
    line_item_count: number;
    has_pricing_sheet?: boolean;
  } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await importFile(file);
      setResult(data);
      setFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Import manifest"
        description="Upload a Super Will Limited CSV or Excel workbook. Sheet 1 becomes the shipment record; Sheet 2 pricing is captured when present."
      />

      <section className="panel">
        <form onSubmit={handleSubmit} className="import-form">
          <label className={`dropzone${file ? " dropzone-has-file" : ""}`}>
            <input
              className="dropzone-input"
              type="file"
              accept=".csv,.xlsx"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <span className="dropzone-title">
              {file ? file.name : "Choose manifest file"}
            </span>
            <span className="dropzone-hint">CSV or XLSX · max one file per import</span>
          </label>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={!file || loading}>
              {loading ? "Processing…" : "Run import"}
            </button>
            {file && !loading && (
              <button type="button" className="btn btn-ghost" onClick={() => setFile(null)}>
                Clear
              </button>
            )}
          </div>
        </form>
      </section>

      {error && (
        <div className="alert alert-error" role="alert">
          <strong>Import failed</strong>
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div className="alert alert-success" role="status">
          <strong>Import complete</strong>
          <p>
            {result.shop_group_count} shop groups · {result.line_item_count} line items
            {result.has_pricing_sheet && " · pricing sheet attached"}
          </p>
          <Link to={`/invoices/${result.invoice.id}`} className="btn btn-primary btn-sm">
            Open shipment
          </Link>
        </div>
      )}
    </>
  );
}
