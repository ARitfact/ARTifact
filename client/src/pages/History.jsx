import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { apiRequest } from "../services/api";
import ModelViewer from "../components/ModelViewer";
import ARViewer from "../components/ARViewer";
import "./History.css";

export default function History() {
  const [models, setModels] = useState([]);
  const [arPhotos, setArPhotos] = useState([]);
const [arPage, setArPage] = useState(1);
const [arHasMore, setArHasMore] = useState(false);
const [arLoading, setArLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [selected, setSelected] = useState(null);
  const [showAR, setShowAR] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      setLoading(true);
      setError("");

      try {
        const result = await apiRequest(
          `/api/v1/generations?page=${page}`
        );

        if (cancelled) return;

        setModels((previous) =>
          page === 1
            ? result.data
            : [
                ...previous,
                ...result.data.filter(
                  (item) =>
                    !previous.some(
                      (existing) => existing.id === item.id
                    )
                ),
              ]
        );

        setHasMore(result.pagination.hasMore);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Could not load history.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [page]);

  useEffect(() => {
    let cancelled = false;

    async function loadARPhotos() {
      setArLoading(true);

      try {
        const result = await apiRequest(
          `/api/v1/ar-captures?page=${arPage}`
        );

        if (cancelled) return;

        setArPhotos((previous) =>
          arPage === 1
            ? result.data
            : [
                ...previous,
                ...result.data.filter(
                  (item) =>
                    !previous.some(
                      (existing) => existing.id === item.id
                    )
                ),
              ]
        );

        setArHasMore(result.pagination.hasMore);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Could not load AR photos.");
        }
      } finally {
        if (!cancelled) setArLoading(false);
      }
    }

    loadARPhotos();

    return () => {
      cancelled = true;
    };
  }, [arPage]);

  return (
    <main className="history-page">
      <header className="history-topbar">
        <Link to="/dashboard" className="history-brand">
          <span>A</span>
          ARTifact
        </Link>

        <nav>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/catalog">Catalog</Link>
          <Link to="/create" className="history-topbar-cta">
            Create model ↗
          </Link>
        </nav>
      </header>

      <div className="history-container">
        <section className="history-hero">
          <div>
            <span className="history-eyebrow">YOUR WORKSPACE</span>
            <h1>Your ideas, saved.</h1>
            <p>
              Every model you create and every AR moment you capture,
              together in one place.
            </p>
          </div>
          <span className="history-hero-art" aria-hidden="true">✳</span>
        </section>

        {error && (
          <div className="history-error" role="alert">{error}</div>
        )}

        <section className="history-section">
          <div className="history-section-heading">
            <div>
              <span className="history-eyebrow">01 / YOUR CREATIONS</span>
              <h2>3D models</h2>
              <p>Pick up where your imagination left off.</p>
            </div>
            <span className="history-count">{models.length} saved</span>
          </div>

          {loading ? (
            <p className="history-loading">Loading your models...</p>
          ) : !error && models.length === 0 ? (
            <div className="history-empty">
              <span className="history-empty-icon">◇</span>
              <h3>Your first creation starts here.</h3>
              <p>
                Turn a furniture image into a model you can explore in 3D.
              </p>
              <Link to="/create">Create a model ↗</Link>
            </div>
          ) : (
            <div className="history-grid">
              {models.map((model) => (
                <button
                  className="history-card"
                  key={model.id}
                  type="button"
                  onClick={() => {
                    setSelected(model);
                    setShowAR(false);
                  }}
                >
                  <div className="history-card-image">
                    {model.imageUrl ? (
                      <img
                        src={model.imageUrl}
                        alt="Uploaded furniture"
                        loading="lazy"
                      />
                    ) : (
                      <span>◇</span>
                    )}
                  </div>
                  <div className="history-card-info">
                    <div>
                      <small>3D CREATION</small>
                      <strong>Furniture model</strong>
                      <time>
                        {new Date(model.completedAt).toLocaleString()}
                      </time>
                    </div>
                    <span className="history-card-arrow">↗</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {hasMore && !loading && (
            <button
              className="history-more"
              type="button"
              onClick={() => setPage((current) => current + 1)}
            >
              Load more models
            </button>
          )}
        </section>

        <section className="history-section">
          <div className="history-section-heading">
            <div>
              <span className="history-eyebrow">02 / YOUR MOMENTS</span>
              <h2>Saved AR</h2>
              <p>Furniture you pictured in your own space.</p>
            </div>
            <span className="history-count">{arPhotos.length} saved</span>
          </div>

          {arLoading ? (
            <p className="history-loading">Loading AR captures...</p>
          ) : arPhotos.length === 0 ? (
            <div className="history-empty history-empty--ar">
              <span className="history-empty-icon">⌗</span>
              <h3>No AR moments saved yet.</h3>
              <p>
                Open one of your models in AR and save a screenshot
                to see it here.
              </p>
              <Link to="/catalog">Explore furniture ↗</Link>
            </div>
          ) : (
            <div className="history-grid">
              {arPhotos.map((photo) => (
                <a
                  className="history-card"
                  key={photo.id}
                  href={photo.imageUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <div className="history-card-image">
                    <img
                      src={photo.imageUrl}
                      alt="Saved AR furniture screenshot"
                      loading="lazy"
                    />
                  </div>
                  <div className="history-card-info">
                    <div>
                      <small>AR CAPTURE</small>
                      <strong>Saved moment</strong>
                      <time>
                        {new Date(photo.createdAt).toLocaleString()}
                      </time>
                    </div>
                    <span className="history-card-arrow">↗</span>
                  </div>
                </a>
              ))}
            </div>
          )}

          {arHasMore && !arLoading && (
            <button
              className="history-more"
              type="button"
              onClick={() => setArPage((current) => current + 1)}
            >
              Load more AR photos
            </button>
          )}
        </section>

        {selected && (
          <section className="history-preview">
            <div className="history-section-heading">
              <div>
                <span className="history-eyebrow">YOUR MODEL</span>
                <h2>3D preview</h2>
              </div>
              <button
                type="button"
                className="history-close"
                onClick={() => {
                  setSelected(null);
                  setShowAR(false);
                }}
              >
                Close ×
              </button>
            </div>

            <div className="history-viewer">
              <ModelViewer modelUrl={selected.modelUrl} />
            </div>

            <div className="history-preview-actions">
              <button type="button" onClick={() => setShowAR(true)}>
                View in AR ↗
              </button>
              <a href={selected.modelUrl} download>
                Download GLB ↓
              </a>
            </div>
          </section>
        )}
      </div>

      {showAR && selected && (
        <ARViewer
          modelUrl={selected.modelUrl}
          taskId={selected.taskId}
          onClose={() => setShowAR(false)}
        />
      )}
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#0b0d0a",
    color: "#f5f5ee",
  },
  header: {
    padding: "20px 5%",
    display: "flex",
    justifyContent: "space-between",
    borderBottom: "1px solid #30352b",
  },
  link: {
    color: "#d7ff3f",
  },
  content: {
    maxWidth: 1100,
    margin: "auto",
    padding: "40px 20px",
  },
  muted: {
    color: "#a7aea0",
  },
  grid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
    marginTop: 30,
  },
  card: {
    minHeight: 190,
    padding: 20,
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 12,
    border: "1px solid #30352b",
    borderRadius: 16,
    background: "#171a14",
    color: "white",
    cursor: "pointer",
  },
  icon: {
    fontSize: 55,
    color: "#d7ff3f",
  },
  loadButton: {
    marginTop: 16,
    padding: "10px 16px",
    border: 0,
    borderRadius: 8,
    background: "#d7ff3f",
    cursor: "pointer",
  },
  preview: {
    marginTop: 35,
    padding: 20,
    border: "1px solid #30352b",
    borderRadius: 16,
  },
  previewHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
};