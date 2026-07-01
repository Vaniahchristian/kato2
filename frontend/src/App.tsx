import { Route, Routes } from "react-router-dom";
import AppShell from "./components/AppShell";
import Import from "./pages/Import";
import InvoiceDetail from "./pages/InvoiceDetail";
import InvoiceList from "./pages/InvoiceList";

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Import />} />
        <Route path="/invoices" element={<InvoiceList />} />
        <Route path="/invoices/:id" element={<InvoiceDetail />} />
        <Route path="/invoices/:id/pricing" element={<InvoiceDetail />} />
      </Route>
    </Routes>
  );
}
