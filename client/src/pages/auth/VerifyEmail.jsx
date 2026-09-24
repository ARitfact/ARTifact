import OTPVerification from "../../components/auth/ArtifactOTPVerification";

export default function VerifyEmail({
  email,
  onVerified,
  onBack,
}) {
  return (
    <section className="auth-page">
      <div className="auth-brand">
        <div className="brand-mark">
          A
        </div>

        <span>ARTifact</span>
      </div>

      <div className="auth-content verify-page-content">
        <div className="auth-intro">
          <p className="eyebrow">
            ONE LAST STEP
          </p>

          <h1>
            Verify
            <br />
            <em>your email.</em>
          </h1>

          <p className="auth-description">
            Your account is almost ready. Verify
            your email to enter ARTifact.
          </p>
        </div>

        <div className="auth-panel">
          <OTPVerification
            email={email}
            onVerified={onVerified}
            onBack={onBack}
          />
        </div>
      </div>

      <div className="auth-decoration auth-decoration-one" />
      <div className="auth-decoration auth-decoration-two" />
      <div className="auth-decoration auth-decoration-three" />
    </section>
  );
}