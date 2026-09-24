import { useState } from "react";
import { Link } from "react-router-dom";
import { authService } from "../../services/authService";

const inputStyle = {
  width: "100%",
  padding: 12,
  border: "1px solid #555c4b",
  borderRadius: 8,
  background: "#22271e",
  color: "white",
  fontSize: 16,
};

const buttonStyle = {
  padding: 12,
  background: "#d7ff3f",
  color: "#151a09",
  border: 0,
  borderRadius: 9,
  fontWeight: 800,
  cursor: "pointer",
};

export default function ForgotPassword() {
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] =
    useState("");
  const [confirm, setConfirm] =
    useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] =
    useState("");

  async function sendCode(event) {
    event.preventDefault();

    setBusy(true);
    setError("");
    setMessage("");

    try {
      await authService.forgotPassword(
        email.trim()
      );

      setStep("reset");
      setMessage(
        "If an account exists, a six-digit reset code was sent to your email."
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function reset(event) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);

    try {
      await authService.resetPassword({
        email: email.trim(),
        otp: otp.trim(),
        newPassword: password,
      });

      setStep("done");
      setPassword("");
      setConfirm("");
      setOtp("");

      setMessage(
        "Password changed. Please sign in again."
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0b0d0a",
        color: "white",
        display: "grid",
        placeItems: "center",
        padding: 20,
      }}
    >
      <section
        style={{
          width: "min(100%, 430px)",
          background: "#171a14",
          border: "1px solid #30352b",
          borderRadius: 16,
          padding: 28,
        }}
      >
        <Link
          to="/login"
          style={{ color: "#d7ff3f" }}
        >
          ← Sign in
        </Link>

        <h1>Reset password</h1>

        {error && (
          <p
            role="alert"
            style={{ color: "#ffaaa2" }}
          >
            {error}
          </p>
        )}

        {message && (
          <p
            role="status"
            style={{ color: "#d7ff3f" }}
          >
            {message}
          </p>
        )}

        {step === "email" && (
          <form
            onSubmit={sendCode}
            style={{
              display: "grid",
              gap: 14,
            }}
          >
            <label>
              Email address
              <input
                style={inputStyle}
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
              />
            </label>

            <button
              disabled={busy}
              style={buttonStyle}
            >
              {busy
                ? "Sending..."
                : "Send reset code"}
            </button>
          </form>
        )}

        {step === "reset" && (
          <form
            onSubmit={reset}
            style={{
              display: "grid",
              gap: 14,
            }}
          >
            <label>
              Email address
              <input
                style={inputStyle}
                type="email"
                required
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
              />
            </label>

            <label>
              Six-digit code
              <input
                style={inputStyle}
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                value={otp}
                onChange={(event) =>
                  setOtp(event.target.value)
                }
              />
            </label>

            <label>
              New password
              <input
                style={inputStyle}
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
              />
            </label>

            <label>
              Confirm new password
              <input
                style={inputStyle}
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(event) =>
                  setConfirm(event.target.value)
                }
              />
            </label>

            <small
              style={{ color: "#a7aea0" }}
            >
              Use 8–128 characters with
              uppercase, lowercase, and a
              number.
            </small>

            <button
              disabled={busy}
              style={buttonStyle}
            >
              {busy
                ? "Resetting..."
                : "Reset password"}
            </button>

            <button
              type="button"
              onClick={() =>
                setStep("email")
              }
              style={{
                background: "none",
                border: 0,
                color: "#d7ff3f",
                cursor: "pointer",
              }}
            >
              Request another code
            </button>
          </form>
        )}

        {step === "done" && (
          <Link
            to="/login"
            style={{ color: "#d7ff3f" }}
          >
            Go to sign in →
          </Link>
        )}
      </section>
    </main>
  );
}