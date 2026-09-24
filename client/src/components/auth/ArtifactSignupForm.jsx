import { useState } from "react";

import Input from "../common/Input";
import Button from "../common/ArtifactButton";
import GoogleButton from "./GoogleButton";

import { authService } from "../../services/authService";

export default function SignupForm({
  onRegistered,
  onLogin,
  onAuthenticated,
}) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    terms: false,
    privacy: false,
  });
const [photo, setPhoto] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const updateField = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    if (!form.name.trim()) {
      setError("Please enter your name.");
      return;
    }

    if (!form.email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    if (!form.password) {
      setError("Please create a password.");
      return;
    }

    if (form.password.length < 8) {
      setError(
        "Your password must contain at least 8 characters."
      );
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!form.terms) {
      setError(
        "Please accept the Terms of Service."
      );
      return;
    }

    if (!form.privacy) {
      setError(
        "Please accept the Privacy Policy."
      );
      return;
    }

    try {
      setLoading(true);

    const response = await authService.register({
  name: form.name.trim(),
  email: form.email.trim(),
  password: form.password,
  acceptedTerms: form.terms,
  acceptedPrivacy: form.privacy,
});

      onRegistered?.(
  form.email.trim(),
  response,
  photo
);
    } catch (err) {
      setError(
        err?.message ||
          "Unable to create your account. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      className="signup-form"
      onSubmit={handleSubmit}
    >

      {error && (
        <div className="signup-error">
          {error}
        </div>
      )}

<div className="signup-field">
  <label htmlFor="signup-photo">
    Profile photo (optional)
  </label>

  <input
    id="signup-photo"
    type="file"
    accept="image/png,image/jpeg,image/webp"
    onChange={(event) => {
      const selected =
        event.target.files?.[0] || null;

      if (
        selected &&
        (
          ![
            "image/png",
            "image/jpeg",
            "image/webp",
          ].includes(selected.type) ||
          selected.size > 5 * 1024 * 1024
        )
      ) {
        setError(
          "Choose a PNG, JPEG, or WebP under 5 MB."
        );

        event.target.value = "";
        setPhoto(null);
        return;
      }

      setError("");
      setPhoto(selected);
    }}
  />

  <small>
    Saved after verification and sign-in.
    Keep this tab open until then.
  </small>
</div>
      {/* NAME */}
      <div className="signup-field">
        <label htmlFor="signup-name">
          Your name
        </label>

        <Input
          id="signup-name"
          name="name"
          type="text"
          value={form.name}
          placeholder="Your name"
          autoComplete="name"
          onChange={(event) =>
            updateField(
              "name",
              event.target.value
            )
          }
        />
      </div>


      {/* EMAIL */}
      <div className="signup-field">
        <label htmlFor="signup-email">
          Email address
        </label>

        <Input
          id="signup-email"
          name="email"
          type="email"
          value={form.email}
          placeholder="you@example.com"
          autoComplete="email"
          onChange={(event) =>
            updateField(
              "email",
              event.target.value
            )
          }
        />
      </div>


      {/* PASSWORD */}
      <div className="signup-field">
        <label htmlFor="signup-password">
          Password
        </label>

        <Input
          id="signup-password"
          name="password"
          type="password"
          value={form.password}
          placeholder="Create a password"
          autoComplete="new-password"
          onChange={(event) =>
            updateField(
              "password",
              event.target.value
            )
          }
        />
      </div>


      {/* CONFIRM PASSWORD */}
      <div className="signup-field">
        <label htmlFor="signup-confirm-password">
          Confirm password
        </label>

        <Input
          id="signup-confirm-password"
          name="confirmPassword"
          type="password"
          value={form.confirmPassword}
          placeholder="Repeat your password"
          autoComplete="new-password"
          onChange={(event) =>
            updateField(
              "confirmPassword",
              event.target.value
            )
          }
        />
      </div>


      {/* AGREEMENTS */}
      <div className="signup-agreements">

        <label className="agreement-row">
          <input
            type="checkbox"
            checked={form.terms}
            onChange={(event) =>
              updateField(
                "terms",
                event.target.checked
              )
            }
          />

          <span>
            I agree to the{" "}
            <button
              type="button"
              className="agreement-link"
              onClick={() => {
                console.log(
                  "Terms of Service"
                );
              }}
            >
              Terms of Service
            </button>
          </span>
        </label>


        <label className="agreement-row">
          <input
            type="checkbox"
            checked={form.privacy}
            onChange={(event) =>
              updateField(
                "privacy",
                event.target.checked
              )
            }
          />

          <span>
            I agree to the{" "}
            <button
              type="button"
              className="agreement-link"
              onClick={() => {
                console.log(
                  "Privacy Policy"
                );
              }}
            >
              Privacy Policy
            </button>
          </span>
        </label>

      </div>


      {/* CREATE ACCOUNT */}
      <Button
        type="submit"
        disabled={loading}
      >
        {loading
          ? "Creating account..."
          : "Create Account"}
      </Button>

<div className="signup-google">
  <span className="signup-google__divider">
    or continue with
  </span>

  <GoogleButton
    signup
    acceptedTerms={form.terms}
    acceptedPrivacy={form.privacy}
    onAuthenticated={(userData) =>
      onAuthenticated?.(userData, photo)
    }
    onError={setError}
  />

  {(!form.terms || !form.privacy) && (
    <small>
      Accept the Terms and Privacy Policy before choosing Google.
    </small>
  )}
</div>
      {/* LOGIN */}
      <div className="signup-login">

        <span>
          Already have an account?
        </span>

        <button
          type="button"
          className="signup-login-link"
          onClick={onLogin}
        >
          Sign in
        </button>

      </div>

    </form>
  );
}