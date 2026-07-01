import { Link, Route, Routes } from "react-router-dom";
import Import from "./pages/Import";
import InvoiceDetail from "./pages/InvoiceDetail";
import InvoiceList from "./pages/InvoiceList";

export default function App() {
  return (
    <>
      <nav>
        <strong>Invoice Import</strong>
        <Link to="/">Import</Link>
        <Link to="/invoices">Invoices</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Import />} />
        <Route path="/invoices" element={<InvoiceList />} />
        <Route path="/invoices/:id" element={<InvoiceDetail />} />
        <Route path="/invoices/:id/pricing" element={<InvoiceDetail />} />
      </Routes>
    </>
  );
}
