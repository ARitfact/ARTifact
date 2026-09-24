import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiRequest } from "../services/api";
import ModelViewer from "../components/ModelViewer";
import ARViewer from "../components/ARViewer";
import "./ModelPreview.css";

export default function ModelPreview() {
  const { source, id } = useParams();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAR, setShowAR] = useState(false);

  const backPath = source === "catalog" ? "/catalog" : "/history";

  useEffect(() => {
    let active = true;

    async function loadItem() {
      setLoading(true);
      setError("");
      setItem(null);
      setShowAR(false);

      try {
        if (source !== "catalog" && source !== "history") {
          throw new Error("Invalid preview link.");
        }

        const endpoint =
          source === "catalog"
            ? `/api/v1/catalog/${encodeURIComponent(id)}`
            : `/api/v1/generations/${encodeURIComponent(id)}`;

        const response = await apiRequest(endpoint);

        if (active) {
          setItem(response.data);
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Could not load this model.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadItem();

    return () => {
      active = false;
    };
  }, [source, id]);

  return (
    <main className="model-preview-page">
      <header className="model-preview-topbar">
        <Link to="/dashboard" className="model-preview-brand">
          <span>A</span> ARTifact
        </Link>

        <Link to={backPath} className="model-preview-back">
          ← Back to {source === "catalog" ? "catalog" : "history"}
        </Link>
      </header>

      <div className="model-preview-container">
        {loading ? (
          <div className="model-preview-message">
            Loading your 3D preview...
          </div>
        ) : error ? (
          <div className="model-preview-message" role="alert">
            <h1>Preview unavailable</h1>
            <p>{error}</p>
            <Link to={backPath}>Go back ↗</Link>
          </div>
        ) : (
          <>
            <div className="model-preview-intro">
              <div>
                <span className="model-preview-eyebrow">
                  {source === "catalog"
                    ? "FURNITURE COLLECTION"
                    : "YOUR CREATION"}
                </span>

                <h1>{item.name}</h1>
                <p>
                  {item.description ||
                    "Rotate, zoom, and explore the model from every angle."}
                </p>
              </div>

              <div className="model-preview-actions">
                <button
                  type="button"
                  onClick={() => setShowAR(true)}
                >
                  View in AR ↗
                </button>

               
              </div>
            </div>

            <div className="model-preview-stage">
              <ModelViewer modelUrl={item.modelUrl} />
            </div>

            <p className="model-preview-hint">
              Drag to rotate · Scroll or pinch to zoom
            </p>
          </>
        )}
      </div>

      {showAR && item && (
        <ARViewer
          modelUrl={item.modelUrl}
          taskId={source === "history" ? item.taskId : undefined}
          onClose={() => setShowAR(false)}
        />
      )}
    </main>
  );
}