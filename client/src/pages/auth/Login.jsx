import LoginForm from "../../components/auth/LoginForm";
import "./Auth.css";

export default function Login({
  onAuthenticated,
  onSignup,
  onForgotPassword,
}) {
  return (
    <main className="auth-page">
      {/* Background */}
      <div className="auth-noise" />
      <div className="auth-grid" />

      {/* Glow effects */}
      <div className="auth-glow auth-glow-one" />
      <div className="auth-glow auth-glow-two" />

      <section className="auth-shell">

        {/* =====================================================
            HERO
        ====================================================== */}
        <div className="auth-hero">

          <header className="auth-brand">
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


          <div className="hero-content">

            <div className="hero-eyebrow">
              <span className="eyebrow-dot" />
              THE FUTURE OF FURNITURE
            </div>

            <h1>
              Turn furniture
              <br />
              into <em>3D.</em>
            </h1>

            <p className="hero-description">
              Create, explore and experience furniture
              in 3D and augmented reality.
            </p>


            {/* Product visual */}
            <div className="hero-visual">

              <div className="visual-orbit orbit-one" />
              <div className="visual-orbit orbit-two" />

              <div className="visual-glow" />

              <div className="floating-label label-three-d">
                <span>3D</span>
                MODEL
              </div>

              <div className="floating-label label-ar">
                <span>AR</span>
                READY
              </div>

              <div className="product-placeholder">
                <div className="product-chair">
                  <div className="chair-back" />
                  <div className="chair-seat" />
                  <div className="chair-leg leg-one" />
                  <div className="chair-leg leg-two" />
                  <div className="chair-leg leg-three" />
                  <div className="chair-leg leg-four" />
                </div>
              </div>

              <div className="visual-floor" />

            </div>

          </div>


          <div className="hero-footer">
            <span>
              IMAGE → 3D MODEL → AR
            </span>

            <span className="hero-line" />

            <span>
              ARTIFACT ENGINE
            </span>
          </div>

        </div>


        {/* =====================================================
            AUTH PANEL
        ====================================================== */}
        <div className="auth-panel-wrapper">

          <div className="auth-panel">

            <div className="mobile-brand">
              <div className="brand-mark">
                A
              </div>

              <span>
                ARTifact
              </span>
            </div>


            <div className="auth-heading">

              <span className="auth-kicker">
                WELCOME BACK
              </span>

              <h2>
                Sign in to
                <br />
                your workspace.
              </h2>

              <p>
                Continue creating something
                extraordinary.
              </p>

            </div>


            <LoginForm
              onAuthenticated={onAuthenticated}
              onSignup={onSignup}
              onForgotPassword={onForgotPassword}
            />


            <div className="auth-security">
              <span className="security-icon">
                ✦
              </span>

              <span>
                Secure workspace
              </span>

              <span className="security-dot">
                •
              </span>

              <span>
                Encrypted connection
              </span>
            </div>

          </div>

        </div>

      </section>

    </main>
  );
}