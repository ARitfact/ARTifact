import { useState } from "react";
import Input from "../common/Input";
import Button from "../common/ArtifactButton";
import { authService } from "../../services/authService";
import GoogleButton from "./GoogleButton";

export default function LoginForm({
  onAuthenticated,
  onForgotPassword,
  onSignup,
}) {
  const [form, setForm] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(event) {
    const { name, value, type, checked } =
      event.target;

    setForm((previous) => ({
      ...previous,
      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));

    if (error) {
      setError("");
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.email.trim()) {
      setError("Please enter your email.");
      return;
    }

    if (!form.password) {
      setError("Please enter your password.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response =
        await authService.login(form);

      onAuthenticated?.(
        response?.user || response
      );
    } catch (err) {
      setError(
        err.message ||
          "Unable to sign in. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      className="auth-form"
      onSubmit={handleSubmit}
    >
      {error && (
        <div className="auth-error">
          {error}
        </div>
      )}

      <Input
        label="Email"
        type="email"
        name="email"
        value={form.email}
        onChange={handleChange}
        placeholder="you@example.com"
        autoComplete="email"
      />

      <Input
        label="Password"
        type="password"
        name="password"
        value={form.password}
        onChange={handleChange}
        placeholder="Enter your password"
        autoComplete="current-password"
      />

      <div className="auth-form-row">
        <label className="remember-me">
          <input
            type="checkbox"
            name="rememberMe"
            checked={form.rememberMe}
            onChange={handleChange}
          />

          <span>Remember me</span>
        </label>

        <button
  type="button"
  className="auth-forgot-button"
  onClick={onForgotPassword}
>
  Forgot password?
</button>
      </div>

      <Button
        type="submit"
        loading={loading}
      >
        Sign In
      </Button>
<GoogleButton
  onAuthenticated={onAuthenticated}
  onError={setError}
/>
      <div className="auth-signup">
  <span>
    Don't have an account?
  </span>

  <button
    type="button"
    className="signup-link"
    onClick={onSignup}
  >
    Create one
  </button>
</div>
    </form>
  );
}