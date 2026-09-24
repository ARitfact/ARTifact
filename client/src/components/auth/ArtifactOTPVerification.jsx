import { useEffect, useState } from "react";
import Button from "../common/ArtifactButton";
import { authService } from "../../services/authService";

export default function OTPVerification({
  email,
  onVerified,
  onBack,
}) {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] =
    useState(false);
  const [resendTimer, setResendTimer] =
    useState(0);

  useEffect(() => {
    if (resendTimer <= 0) return;

    const timer = setInterval(() => {
      setResendTimer((value) =>
        value <= 1 ? 0 : value - 1
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [resendTimer]);

  function handleOTPChange(event) {
    const value =
      event.target.value
        .replace(/\D/g, "")
        .slice(0, 6);

    setOtp(value);
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (otp.length !== 6) {
      setError(
        "Please enter the 6-digit verification code."
      );
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response =
        await authService.verifyEmail({
          email,
          otp,
        });

      onVerified?.(response);
    } catch (err) {
      setError(
        err.message ||
          "The verification code is invalid."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (resendTimer > 0 || resending) {
      return;
    }

    try {
      setResending(true);
      setError("");

      await authService.resendEmailOTP({
        email,
      });

      setResendTimer(60);
    } catch (err) {
      setError(
        err.message ||
          "Unable to resend the code."
      );
    } finally {
      setResending(false);
    }
  }

  return (
    <form
      className="auth-form otp-form"
      onSubmit={handleSubmit}
    >
      <button
        type="button"
        className="back-button"
        onClick={onBack}
      >
        ← Back
      </button>

      <div className="otp-heading">
        <span className="otp-icon">
          ✦
        </span>

        <h2>Check your email</h2>

        <p>
          We sent a 6-digit verification code
          to
        </p>

        <strong>{email}</strong>
      </div>

      {error && (
        <div className="auth-error">
          {error}
        </div>
      )}

      <div className="otp-input-wrapper">
        <input
          value={otp}
          onChange={handleOTPChange}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="000000"
          aria-label="Verification code"
        />
      </div>

      <Button
        type="submit"
        loading={loading}
        disabled={otp.length !== 6}
      >
        Verify Email
      </Button>

      <div className="resend-section">
        <span>
          Didn't receive the code?
        </span>

        <button
          type="button"
          className="text-button strong"
          disabled={
            resendTimer > 0 || resending
          }
          onClick={handleResend}
        >
          {resending
            ? "Sending..."
            : resendTimer > 0
              ? `Resend in ${resendTimer}s`
              : "Resend code"}
        </button>
      </div>
    </form>
  );
}