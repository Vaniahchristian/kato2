const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export interface InvoiceSummary {
  id: string;
  client: string | null;
  container_no: string | null;
  loading_date: string | null;
  general_amount: number | null;
  created_at: string;
  source_filename: string | null;
}

export interface LineItem {
  id: string;
  description: string;
  ctns: number | null;
  qty_per_ctn: number | null;
  unit: string | null;
  unit_price: number | null;
  price_suffix: string | null;
  amount: number | null;
  weight_kg: number | null;
  gross_weight_kg: number | null;
}

export interface ShopGroup {
  id: string;
  shop_no: string;
  sub_amount: number | null;
  deposit: number | null;
  balance: number | null;
  cbm: number | null;
  line_items: LineItem[];
}

export interface PricingItem {
  id: string;
  shop_no: string;
  description: string;
  ctns: number | null;
  qty_per_ctn: number | null;
  unit_price: number | null;
  unit_cbm: number | null;
  yen_ugx: number | null;
  exp_per_ctn: number | null;
  value_nature: string | null;
  value_amount: number | null;
  value_px: number | null;
  total_exp_per_ctn: number | null;
  selling_px_per_ctn: number | null;
  prt_per_ctn: number | null;
  tt_pft_per_ctn: number | null;
  tt_sales: number | null;
  tt_taxes: number | null;
}

export interface PricingSheet {
  id: string;
  sheet_name: string;
  client: string | null;
  general_cartons: number | null;
  general_cbm: number | null;
  general_weight: number | null;
  items: PricingItem[];
}

export interface InvoiceDetail {
  id: string;
  supplier_name: string | null;
  client: string | null;
  loading_date: string | null;
  container_no: string | null;
  source_filename: string | null;
  general_cartons: number | null;
  general_amount: number | null;
  general_cbm: number | null;
  general_weight: number | null;
  fx_rate: number | null;
  usd_amount: number | null;
  deposit: number | null;
  commission: number | null;
  ship_cost: number | null;
  balance: number | null;
  created_at: string;
  shop_groups: ShopGroup[];
  pricing_sheet: PricingSheet | null;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const detail = body.detail;
    const message =
      typeof detail === "string"
        ? detail
        : detail?.message || JSON.stringify(detail) || res.statusText;
    throw new Error(message);
  }
  return res.json();
}

export function listInvoices(): Promise<InvoiceSummary[]> {
  return request("/api/invoices");
}

export function getInvoice(id: string): Promise<InvoiceDetail> {
  return request(`/api/invoices/${id}`);
}

export function deleteInvoice(id: string): Promise<{ ok: boolean }> {
  return request(`/api/invoices/${id}`, { method: "DELETE" });
}

export async function importFile(file: File) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_URL}/api/import`, { method: "POST", body: form });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.detail?.message || body.detail || res.statusText);
  }
  return body;
}
