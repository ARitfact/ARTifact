import SignupForm from "../../components/auth/ArtifactSignupForm";
import "./Auth.css";

export default function Signup({
  onRegistered,
  onLogin,
  onAuthenticated,
}) {
  return (
    <main className="auth-page signup-page">

      <div className="auth-noise" />
      <div className="auth-grid" />

      <div className="auth-glow auth-glow-one" />
      <div className="auth-glow auth-glow-two" />

      <section className="signup-shell">

        {/* =========================================
            BRAND
        ========================================== */}

        <header className="signup-brand">

          <div className="brand-mark">
            A
          </div>

          <div>
            <span className="brand-name">
              ARTifact
            </span>

            <span className="brand-tagline">
              DIGITAL CRAFT
            </span>
          </div>

        </header>


        {/* =========================================
            HERO
        ========================================== */}

        <section className="signup-hero">

          <div className="hero-eyebrow">
            <span className="eyebrow-dot" />

            START CREATING
          </div>

          <h1>
            Build your
            <br />
            <em>3D world.</em>
          </h1>

          <p>
            Start turning furniture images into
            interactive 3D experiences.
          </p>

        </section>


        {/* =========================================
            FORM CARD
        ========================================== */}

        <section className="signup-card">

          <div className="signup-heading">

            <span className="signup-kicker">
              GET STARTED
            </span>

            <h2>
              Create account
            </h2>

            <p>
              Join ARTifact and start creating.
            </p>

          </div>


         <SignupForm
  onRegistered={onRegistered}
  onLogin={onLogin}
  onAuthenticated={onAuthenticated}
/>

        </section>


        <footer className="signup-footer">
          ARTifact Engine
          <span />
          Image → 3D → AR
        </footer>

      </section>

    </main>
  );
}