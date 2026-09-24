import {
  useContext,
  useEffect,
  useState,
} from "react";

import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  AuthContext,
} from "../context/AuthContext";

import {
  apiRequest,
} from "../services/api";

import {
  authService,
} from "../services/authService";

import "./Settings.css";

const inputStyle = {
  display: "block",
  width: "100%",
  padding: 12,
  marginTop: 8,
  borderRadius: 8,
  border: "1px solid #666",
  background: "var(--settings-input)",
  color: "inherit",
  fontSize: 16,
};

const buttonStyle = {
  padding: "11px 18px",
  background: "#d7ff3f",
  color: "#161c09",
  border: 0,
  borderRadius: 8,
  fontWeight: 800,
  cursor: "pointer",
};

export default function Settings() {
  const {
    user,
    checkAuth,
    logout,
  } = useContext(AuthContext);

  const navigate = useNavigate();
  const location = useLocation();

  const [name, setName] = useState(
    user?.name || ""
  );

  const [photo, setPhoto] =
    useState(null);

  const [
    currentPassword,
    setCurrentPassword,
  ] = useState("");

  const [
    newPassword,
    setNewPassword,
  ] = useState("");

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [theme, setTheme] = useState(
    () =>
      localStorage.getItem(
        "artifact-theme"
      ) || "dark"
  );

  useEffect(() => {
    setName(user?.name || "");
  }, [user?.name]);

  useEffect(() => {
    document.documentElement.dataset.theme =
      theme;

    localStorage.setItem(
      "artifact-theme",
      theme
    );
  }, [theme]);

  async function saveProfile(event) {
    event.preventDefault();

    setBusy(true);
    setError("");
    setMessage("");

    try {
      if (
        name.trim() !== user.name
      ) {
        await apiRequest(
          "/api/v1/profile",
          {
            method: "PATCH",
            body: {
              name: name.trim(),
            },
          }
        );
      }

      if (photo) {
        const data =
          new FormData();

        data.append(
          "photo",
          photo
        );

        await apiRequest(
          "/api/v1/profile/photo",
          {
            method: "POST",
            body: data,
          }
        );
      }

      await checkAuth();

      setPhoto(null);
      setMessage(
        "Profile updated."
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function changePassword(
    event
  ) {
    event.preventDefault();

    setBusy(true);
    setError("");
    setMessage("");

    try {
      await authService.changePassword({
        currentPassword,
        newPassword,
      });

      setCurrentPassword("");
      setNewPassword("");

      // Backend revokes all sessions.
      await logout();

      navigate(
        "/login",
        { replace: true }
      );
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

    return (
    <main className="settings-page">
      <header className="settings-topbar">
        <Link to="/dashboard" className="settings-brand">
          <span className="settings-brand-mark">A</span>
          ARTifact
        </Link>

        <Link to="/dashboard" className="settings-back">
          ← Back to dashboard
        </Link>
      </header>

      <div className="settings-container">
        <div className="settings-intro">
          <span className="settings-eyebrow">YOUR ACCOUNT</span>
          <h1>Make it yours.</h1>
          <p>
            Manage your profile, appearance, and account security.
          </p>
        </div>

        {error && (
          <div className="settings-notice settings-notice--error" role="alert">
            {error}
          </div>
        )}

        {message && (
          <div className="settings-notice" role="status">
            {message}
          </div>
        )}

        <div className="settings-layout">
          <div className="settings-main">
            <section className="settings-card settings-profile">
              <div className="settings-card-heading">
                <span className="settings-card-icon">✦</span>
                <div>
                  <h2>Profile</h2>
                  <p>The details people see on your account.</p>
                </div>
              </div>

              <div className="settings-identity">
                {user?.profileImage ? (
                  <img src={user.profileImage} alt="Your profile" />
                ) : (
                  <span>
                    {user?.name?.charAt(0).toUpperCase() || "A"}
                  </span>
                )}

                <div>
                  <strong>{user?.name || "ARTifact member"}</strong>
                  <small>{user?.email}</small>
                </div>
              </div>

              <form onSubmit={saveProfile} className="settings-form">
                <label>
                  Display name
                  <input
                    value={name}
                    required
                    minLength={2}
                    maxLength={60}
                    onChange={(event) => setName(event.target.value)}
                  />
                </label>

                <label>
                  Profile photo
                  <span className="settings-field-hint">
                    PNG, JPEG or WebP · Up to 5 MB
                  </span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) =>
                      setPhoto(event.target.files?.[0] || null)
                    }
                  />
                </label>

                {photo && (
                  <small className="settings-selected-file">
                    Selected: {photo.name}
                  </small>
                )}

                <button disabled={busy} className="settings-primary">
                  {busy ? "Saving..." : "Save changes"}
                  <span aria-hidden="true">↗</span>
                </button>
              </form>
            </section>

            <section className="settings-card">
              <div className="settings-card-heading">
                <span className="settings-card-icon">◇</span>
                <div>
                  <h2>Appearance</h2>
                  <p>Choose how ARTifact looks for you.</p>
                </div>
              </div>

              <label className="settings-theme-label">
                Interface theme
                <select
                  value={theme}
                  onChange={(event) => setTheme(event.target.value)}
                >
                  <option value="dark">Dark mode</option>
                  <option value="light">Light mode</option>
                </select>
              </label>
            </section>
          </div>

          <aside className="settings-side">
            <section className="settings-card">
              <div className="settings-card-heading">
                <span className="settings-card-icon">✳</span>
                <div>
                  <h2>Security</h2>
                  <p>Keep your account protected.</p>
                </div>
              </div>

              <form onSubmit={changePassword} className="settings-form">
                <label>
                  Current password
                  <input
                    type="password"
                    autoComplete="current-password"
                    required
                    value={currentPassword}
                    onChange={(event) =>
                      setCurrentPassword(event.target.value)
                    }
                  />
                </label>

                <label>
                  New password
                  <input
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(event) =>
                      setNewPassword(event.target.value)
                    }
                  />
                </label>

                <small className="settings-field-hint">
                  8–128 characters with uppercase, lowercase, and a number.
                </small>

                <button disabled={busy} className="settings-primary">
                  Change password
                  <span aria-hidden="true">↗</span>
                </button>
              </form>

              <Link to="/forgot-password" className="settings-text-link">
                Forgot your password? ↗
              </Link>
            </section>

            {user?.role === "admin" && (
              <Link to="/admin" className="settings-admin-link">
                Open admin panel <span>↗</span>
              </Link>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}