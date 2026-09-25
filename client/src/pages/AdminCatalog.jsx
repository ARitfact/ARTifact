import { useContext, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { apiRequest } from "../services/api";
import "./AdminCatalog.css";

export default function AdminCatalog() {
  const { user } = useContext(AuthContext);
  const [password, setPassword] = useState("");
  const [adminToken, setAdminToken] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [model, setModel] = useState(null);
  const [thumbnail, setThumbnail] = useState(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (!thumbnail) {
      setPreview("");
      return;
    }

    const url = URL.createObjectURL(thumbnail);
    setPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [thumbnail]);

  if (user?.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  async function unlock(event) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const result = await apiRequest("/api/v1/admin/unlock", {
        method: "POST",
        body: { password },
        headers: {
          "X-CSRF-Protection": "artifact-web",
        },
      });

      setAdminToken(result.data.adminToken);
      setPassword("");
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  }

  async function upload(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!model || !thumbnail) {
      setError("Select both a GLB and a thumbnail.");
      return;
    }

    if (
      model.size > 25 * 1024 * 1024 ||
      thumbnail.size > 5 * 1024 * 1024
    ) {
      setError(
        "GLB must be under 25 MB and thumbnail under 5 MB."
      );
      return;
    }

    const body = new FormData();
    body.append("name", name.trim());
    body.append("category", category.trim());
    body.append("description", description.trim());
    body.append("model", model);
    body.append("thumbnail", thumbnail);

    setBusy(true);

    try {
      const result = await apiRequest("/api/v1/admin/catalog", {
        method: "POST",
        body,
        headers: {
          "X-Admin-Token": adminToken,
          "X-CSRF-Protection": "artifact-web",
        },
      });

      setMessage(
        `${result.data.name} published to the catalog.`
      );
      setName("");
      setCategory("");
      setDescription("");
      setModel(null);
      setThumbnail(null);
      setFormKey((key) => key + 1);
    } catch (cause) {
      if (cause.status === 403) {
        setAdminToken("");
        setError("Admin access expired. Unlock it again.");
      } else {
        setError(cause.message);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="admin-catalog">
      <header className="admin-catalog__header">
        <Link to="/dashboard">← Dashboard</Link>
        <span>ARTifact · Admin</span>
      </header>

      <section className="admin-catalog__card">
        <p className="admin-catalog__eyebrow">
          CATALOG MANAGEMENT
        </p>
        <h1>Upload a 3D model</h1>
        <p>
          Publish a GLB and its thumbnail to the furniture
          catalog.
        </p>

        {error && (
          <div className="admin-catalog__error" role="alert">
            {error}
          </div>
        )}

        {message && (
          <div className="admin-catalog__success" role="status">
            {message} <Link to="/catalog">View catalog</Link>
          </div>
        )}

        {!adminToken ? (
          <form
            onSubmit={unlock}
            className="admin-catalog__form"
          >
            <label>
              Admin password
              <input
                type="password"
                autoComplete="off"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                required
              />
            </label>

            <button disabled={busy} type="submit">
              {busy ? "Unlocking…" : "Unlock upload"}
            </button>
          </form>
        ) : (
          <form
            key={formKey}
            onSubmit={upload}
            className="admin-catalog__form"
          >
            <label>
              Model name
              <input
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                minLength={2}
                maxLength={120}
                placeholder="Oak lounge chair"
                required
              />
            </label>

            <label>
              Category
              <input
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value)
                }
                maxLength={60}
                placeholder="Seating"
                required
              />
            </label>

            <label>
              Description (optional)
              <textarea
                value={description}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
                maxLength={1000}
                rows={3}
              />
            </label>

            <label>
              GLB model · max 25 MB
              <input
                type="file"
                accept=".glb,model/gltf-binary"
                onChange={(event) =>
                  setModel(event.target.files?.[0] || null)
                }
                required
              />
            </label>

            <label>
              Thumbnail · PNG, JPEG or WebP · max 5 MB
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) =>
                  setThumbnail(event.target.files?.[0] || null)
                }
                required
              />
            </label>

            {preview && (
              <img
                className="admin-catalog__preview"
                src={preview}
                alt="Thumbnail preview"
              />
            )}

            <button disabled={busy} type="submit">
              {busy ? "Uploading…" : "Publish to catalog"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}