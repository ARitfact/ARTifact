import { useNavigate } from "react-router-dom";
import PaymentPlans from "../components/PaymentPlans";
import "./PaymentPlansPage.css";

export default function PaymentPlansPage() {
  const navigate = useNavigate();
  return <main className="payment-page">
    <div className="payment-page__shell">
      <header className="payment-page__nav">
        <button type="button" className="payment-page__brand" onClick={() => navigate("/")} aria-label="ARTifact home"><span>A</span> ARTifact</button>
        <button type="button" className="payment-page__back" onClick={() => navigate("/")}>← Back to app</button>
      </header>
      <PaymentPlans onPaymentSuccess={() => { /* Checkout confirms access here; dashboard can refresh entitlements when available. */ }} />
      <footer className="payment-page__footer"><span>ARTifact</span><span>IMAGE → 3D → AR</span></footer>
    </div>
  </main>;
}
