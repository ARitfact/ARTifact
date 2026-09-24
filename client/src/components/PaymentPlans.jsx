import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { getPaymentPlans } from "../services/paymentApi";
import startRazorpayCheckout from "../services/startRazorpayCheckout";

const formatPrice = (paise) => new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 2,
}).format(paise / 100);

const detailsFor = (plan) => plan.type === "subscription"
  ? ["Unlimited generations for the plan period", `${plan.durationDays} days of access`, `Fair use: ${plan.dailyFairUseLimit}/day · ${plan.monthlyFairUseLimit}/month`]
  : [`${plan.credits} image to 3D generations`, "Use credits when you need them", "Secure checkout"];

export default function PaymentPlans({ onPaymentSuccess }) {
  const { user, isAuthenticated } = useContext(AuthContext);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await getPaymentPlans();
        if (active) setPlans(response?.data?.plans ?? []);
      } catch (err) {
        if (active) setError(err.message || "Could not load plans.");
      } finally {
        if (active) setLoading(false);
      }
    }
    if (isAuthenticated) load();
    else { setLoading(false); setError("Please log in to view plans."); }
    return () => { active = false; };
  }, [isAuthenticated, reloadKey]);

  async function purchase(code) {
    if (purchasing) return;
    setPurchasing(code);
    setError("");
    setMessage("");
    try {
      const result = await startRazorpayCheckout({ planCode: code, user });
      if (result.dismissed) setMessage("Checkout closed. You can choose a plan anytime.");
      if (result.success) {
        setMessage("Payment verified. Your plan is active.");
        onPaymentSuccess?.(result.verification);
      }
    } catch (err) {
      setError(err.code === "PAYMENT_STATUS_UNKNOWN" || err.code === "PAYMENT_ORDER_UNAVAILABLE"
        ? "Payment status is being confirmed. Please do not pay again yet."
        : err.message || "Payment could not be completed.");
    } finally {
      setPurchasing(null);
    }
  }

  return (
    <section className="payment-plans" aria-labelledby="plans-heading">
      <div className="payment-plans__intro">
        <span className="payment-plans__eyebrow">CREATE MORE · EXPLORE MORE</span>
        <h1 id="plans-heading">Ideas deserve <em>dimension.</em></h1>
        <p>Turn your furniture images into 3D experiences. Pick the plan that fits how you create.</p>
      </div>
      <div className="payment-plans__notice"><span aria-hidden="true">✦</span> Your account includes one free image to 3D generation.</div>
      {error && <div className="payment-plans__feedback payment-plans__feedback--error" role="alert">{error}{isAuthenticated && !plans.length && !loading && <button type="button" onClick={() => setReloadKey(k => k + 1)}>Try again</button>}</div>}
      {message && <div className="payment-plans__feedback" role="status">{message}</div>}
      {loading ? <div className="payment-plans__loading" role="status">Loading available plans…</div> : (
        <div className="payment-plans__grid">
          {plans.map((plan) => {
            const featured = plan.code === "pack_10";
            return <article className={`payment-plan-card${featured ? " payment-plan-card--featured" : ""}`} key={plan.code}>
              {featured && <span className="payment-plan-card__badge">POPULAR PICK</span>}
              <div className="payment-plan-card__top"><span className="payment-plan-card__icon" aria-hidden="true">{plan.type === "subscription" ? "∞" : plan.credits}</span><span className="payment-plan-card__kind">{plan.type === "subscription" ? "MONTHLY ACCESS" : "CREDIT PACK"}</span></div>
              <h2>{plan.name}</h2>
              <p className="payment-plan-card__description">{plan.type === "subscription" ? "For your ongoing creative projects." : "A flexible boost for your next creations."}</p>
              <div className="payment-plan-card__price">{formatPrice(plan.amountPaise)}<span> / {plan.type === "subscription" ? `${plan.durationDays} days` : "pack"}</span></div>
              <ul>{detailsFor(plan).map(item => <li key={item}><span aria-hidden="true">✓</span>{item}</li>)}</ul>
              <button className="payment-plan-card__button" type="button" disabled={Boolean(purchasing) || !isAuthenticated} onClick={() => purchase(plan.code)}>
                {purchasing === plan.code ? "Opening checkout…" : "Choose plan"} <span aria-hidden="true">↗</span>
              </button>
            </article>;
          })}
        </div>
      )}
      {!loading && !error && !plans.length && <p className="payment-plans__empty">No plans are available right now.</p>}
      <p className="payment-plans__footnote">Payments are completed through Razorpay. Credits are granted after payment verification.</p>
    </section>
  );
}
