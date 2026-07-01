import { useState } from "react";
import { Link } from "react-router-dom";
import { importFile } from "../api/client";

export default function Import() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ invoice: { id: string }; shop_group_count: number; line_item_count: number } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await importFile(file);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <h1>Import Manifest</h1>
      <div className="card">
        <form onSubmit={handleSubmit}>
          <p>Upload a Super Will Limited CSV or Excel manifest.</p>
          <input
            type="file"
            accept=".csv,.xlsx"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <div style={{ marginTop: "1rem" }}>
            <button type="submit" disabled={!file || loading}>
              {loading ? "Importing…" : "Import"}
            </button>
          </div>
        </form>
      </div>
      {error && <div className="error">{error}</div>}
      {result && (
        <div className="success">
          Imported {result.shop_group_count} shop groups, {result.line_item_count} line items.{" "}
          <Link to={`/invoices/${result.invoice.id}`}>View invoice</Link>
        </div>
      )}
    </div>
  );
}
