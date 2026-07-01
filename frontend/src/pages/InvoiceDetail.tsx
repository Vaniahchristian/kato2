import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import PageHeader from "../components/PageHeader";
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

function KpiStrip({ invoice }: { invoice: Invoice }) {
  const items = [
    { label: "General amount", value: fmt(invoice.general_amount) },
    { label: "Cartons", value: fmt(invoice.general_cartons) },
    { label: "USD total", value: fmt(invoice.usd_amount) },
    { label: "Balance", value: fmt(invoice.balance) },
  ];
  return (
    <div className="kpi-strip">
      {items.map((k) => (
        <div key={k.label} className="kpi">
          <span className="kpi-label">{k.label}</span>
          <span className="kpi-value num">{k.value}</span>
        </div>
      ))}
    </div>
  );
}

function MetaPanel({ invoice }: { invoice: Invoice }) {
  const fields = [
    ["Supplier", invoice.supplier_name],
    ["Loading date", invoice.loading_date],
    ["Container", invoice.container_no],
    ["CBM", fmt(invoice.general_cbm)],
    ["Weight (kg)", fmt(invoice.general_weight)],
    ["Deposit", fmt(invoice.deposit)],
    ["Commission", fmt(invoice.commission)],
    ["Shipping", fmt(invoice.ship_cost)],
    ["Source file", invoice.source_filename],
  ] as const;

  return (
    <section className="panel">
      <h2 className="panel-title">Shipment summary</h2>
      <dl className="meta-grid">
        {fields.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd className={label.includes("Container") || label.includes("amount") ? "num" : undefined}>
              {value ?? "—"}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function ManifestView({ invoice }: { invoice: Invoice }) {
  return (
    <>
      <MetaPanel invoice={invoice} />
      {invoice.shop_groups.map((group) => (
        <section key={group.id} className="panel panel-flush shop-group">
          <div className="panel-head">
            <h2 className="panel-title">Shop {group.shop_no}</h2>
            <div className="shop-summary num">
              Sub {fmt(group.sub_amount)} · Dep {fmt(group.deposit)} · Bal {fmt(group.balance)} · CBM {fmt(group.cbm)}
            </div>
          </div>
          <div className="table-scroll table-scroll-manifest">
            <table className="data-table data-table-compact">
              <thead>
                <tr>
                  <th>Description</th>
                  <th className="col-num">Ctns</th>
                  <th className="col-num">Qty/Ctn</th>
                  <th>Unit</th>
                  <th className="col-num">Price</th>
                  <th className="col-num">Amount</th>
                  <th className="col-num">Wt</th>
                  <th className="col-num">G.W</th>
                </tr>
              </thead>
              <tbody>
                {group.line_items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.description}</td>
                    <td className="num">{item.ctns ?? "—"}</td>
                    <td className="num">{item.qty_per_ctn ?? "—"}</td>
                    <td>{item.unit ?? "—"}</td>
                    <td className="num">
                      {item.unit_price != null ? `${item.unit_price}${item.price_suffix ?? ""}` : "—"}
                    </td>
                    <td className="num">{fmt(item.amount)}</td>
                    <td className="num">{fmt(item.weight_kg)}</td>
                    <td className="num">{fmt(item.gross_weight_kg)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </>
  );
}

function PricingView({ invoice }: { invoice: Invoice }) {
  const sheet = invoice.pricing_sheet!;
  const groups = useMemo(() => groupByShop(sheet.items), [sheet.items]);

  return (
    <>
      <section className="panel">
        <h2 className="panel-title">Pricing sheet · {sheet.sheet_name}</h2>
        <dl className="meta-grid">
          <div><dt>Client</dt><dd>{sheet.client ?? invoice.client ?? "—"}</dd></div>
          <div><dt>Cartons</dt><dd className="num">{fmt(sheet.general_cartons)}</dd></div>
          <div><dt>CBM</dt><dd className="num">{fmt(sheet.general_cbm)}</dd></div>
          <div><dt>Weight</dt><dd className="num">{fmt(sheet.general_weight)}</dd></div>
        </dl>
      </section>

      {groups.map((group) => (
        <section key={group.shop_no} className="panel panel-flush shop-group">
          <div className="panel-head">
            <h2 className="panel-title">Shop {group.shop_no}</h2>
          </div>
          <div className="table-scroll">
            <table className="data-table data-table-compact">
              <thead>
                <tr>
                  <th>Description</th>
                  <th className="col-num">Ctns</th>
                  <th className="col-num">Qty</th>
                  <th className="col-num">Price</th>
                  <th className="col-num">Unit CBM</th>
                  <th className="col-num">YEN-UGX</th>
                  <th className="col-num">EXP/CTN</th>
                  <th>Value</th>
                  <th className="col-num">Value PX</th>
                  <th className="col-num">TT Sales</th>
                  <th className="col-num">TT Taxes</th>
                </tr>
              </thead>
              <tbody>
                {group.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.description}</td>
                    <td className="num">{item.ctns ?? "—"}</td>
                    <td className="num">{item.qty_per_ctn ?? "—"}</td>
                    <td className="num">{fmt(item.unit_price)}</td>
                    <td className="num">{fmt(item.unit_cbm)}</td>
                    <td className="num">{fmt(item.yen_ugx)}</td>
                    <td className="num">{fmt(item.exp_per_ctn)}</td>
                    <td>{item.value_nature ?? "—"}</td>
                    <td className="num">{fmt(item.value_px)}</td>
                    <td className="num">{fmt(item.tt_sales)}</td>
                    <td className="num">{fmt(item.tt_taxes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </>
  );
}

function DetailSkeleton() {
  return (
    <div className="detail-loading">
      <div className="skeleton skeleton-kpi" />
      <div className="skeleton skeleton-panel" />
      <div className="skeleton skeleton-panel" />
    </div>
  );
}

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const isPricing = location.pathname.endsWith("/pricing");
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getInvoice(id)
      .then(setInvoice)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (error) {
    return (
      <div className="alert alert-error" role="alert">
        <strong>Could not load shipment</strong>
        <p>{error}</p>
        <Link to="/invoices" className="btn btn-ghost btn-sm">
          Back to shipments
        </Link>
      </div>
    );
  }

  if (loading || !invoice) return <DetailSkeleton />;

  const hasPricing = invoice.pricing_sheet != null;

  return (
    <>
      <PageHeader
        breadcrumb={{ label: "Shipments", to: "/invoices" }}
        title={`${invoice.client ?? "Shipment"} · ${invoice.container_no ?? ""}`}
        description={invoice.supplier_name ?? undefined}
      />

      <KpiStrip invoice={invoice} />

      <div className="sheet-tabs" role="tablist">
        <Link to={`/invoices/${id}`} className={!isPricing ? "active" : ""} role="tab">
          <span className="sheet-tab-short">Manifest</span>
          <span className="sheet-tab-full">Sheet 1 · Manifest</span>
        </Link>
        {hasPricing && (
          <Link to={`/invoices/${id}/pricing`} className={isPricing ? "active" : ""} role="tab">
            <span className="sheet-tab-short">Pricing</span>
            <span className="sheet-tab-full">Sheet 2 · Pricing</span>
          </Link>
        )}
      </div>

      {!isPricing && hasPricing && (
        <div className="alert alert-info">
          Pricing data is available for this workbook.{" "}
          <Link to={`/invoices/${id}/pricing`}>Open Sheet 2</Link>
        </div>
      )}

      {isPricing && !hasPricing && (
        <div className="alert alert-error">No pricing sheet on this shipment.</div>
      )}

      {isPricing && hasPricing && <PricingView invoice={invoice} />}
      {!isPricing && <ManifestView invoice={invoice} />}
    </>
  );
}
