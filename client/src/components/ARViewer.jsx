import { useEffect, useRef, useState } from "react";
import { apiRequest } from "../services/api";
import "./ARViewer.css";
const button = { background: "#d7ff3f", border: 0, borderRadius: 8, padding: "10px 14px", fontWeight: 700 };
export default function ARViewer({
  modelUrl,
  taskId,
  onClose,
}) {
  const viewerRef = useRef(null);
  const screenshotInputRef = useRef(null);
const [savingPhoto, setSavingPhoto] = useState(false);
const [savedMessage, setSavedMessage] = useState("");
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(false);
  const [fixed, setFixed] = useState(false);
  const [mode, setMode] = useState("flexible");
  const [size, setSize] = useState({ length: "", breadth: "", height: "" });
  const [scale, setScale] = useState(1);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    customElements.whenDefined("model-viewer").then(() => {
      if (mounted) setReady(true);
    }).catch(() => setError("Could not load the AR viewer."));
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !ready) return;
    const onStatus = (event) => {
      setActive(event.detail.status === "session-started");
      if (event.detail.status === "failed") setError("AR needs a supported Android device, Chrome, camera access, and HTTPS.");
    };
    viewer.addEventListener("ar-status", onStatus);
    return () => viewer.removeEventListener("ar-status", onStatus);
  }, [ready]);

  async function startAR() {
    const viewer = viewerRef.current;
    if (!viewer) return;
    try {
      if (mode === "manual") {
        const desired = [size.breadth, size.height, size.length].map(Number);
        if (desired.some((value) => !Number.isFinite(value) || value <= 0 || value > 10)) {
          setError("Enter positive breadth, height, and length in metres (maximum 10 m).");
          return;
        }
        const actual = viewer.getDimensions();
        if (!actual || [actual.x, actual.y, actual.z].some((value) => value <= 0)) {
          setError("Wait for the model to finish loading before setting dimensions.");
          return;
        }
        viewer.scale = `${desired[0] / actual.x} ${desired[1] / actual.y} ${desired[2] / actual.z}`;
      } else {
        viewer.scale = `${scale} ${scale} ${scale}`;
      }
      setError("");
      await viewer.activateAR();
    } catch {
      setError("Could not start WebXR. Open this HTTPS page in Chrome on an AR capable Android phone.");
    }
  }
async function uploadARScreenshot(file) {
  if (!file || !taskId || savingPhoto) return;

  const allowed = [
    "image/png",
    "image/jpeg",
    "image/webp",
  ];

  if (!allowed.includes(file.type)) {
    setError("Choose a PNG, JPEG, or WebP screenshot.");
    return;
  }

  if (file.size > 8 * 1024 * 1024) {
    setError("Screenshot must be smaller than 8 MB.");
    return;
  }

  const formData = new FormData();
  formData.append("taskId", taskId);
  formData.append("image", file);

  setSavingPhoto(true);
  setSavedMessage("");
  setError("");

  try {
    await apiRequest("/api/v1/ar-captures", {
      method: "POST",
      body: formData,
    });

    setSavedMessage(
      "Saved AR photo uploaded. Open History to view it."
    );
  } catch (err) {
    setError(err.message || "Could not save AR photo.");
  } finally {
    setSavingPhoto(false);

    if (screenshotInputRef.current) {
      screenshotInputRef.current.value = "";
    }
  }
}
  return (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "#10120e",
      color: "white",
      zIndex: 9999,
      display: "flex",
      flexDirection: "column",
    }}
  >
    <input
      ref={screenshotInputRef}
      type="file"
      accept="image/png,image/jpeg,image/webp"
      style={{ display: "none" }}
      onChange={(event) =>
        uploadARScreenshot(event.target.files?.[0])
      }
    />

    <header
      style={{
        padding: 16,
        display: "flex",
        justifyContent: "space-between",
      }}
    >
      <strong>ARTifact AR</strong>

      <button
        type="button"
        style={button}
        onClick={onClose}
      >
        Close
      </button>
    </header>

    <div
      style={{
        position: "relative",
        flex: 1,
        minHeight: 0,
      }}
    >
      {ready && (
        <model-viewer
          ref={viewerRef}
          src={modelUrl}
          alt="Furniture in augmented reality"
          ar
          ar-modes="webxr"
          ar-placement="floor"
          ar-scale={mode === "manual" ? "fixed" : "auto"}
          camera-controls
          touch-action="none"
          shadow-intensity="1"
          environment-image="neutral"
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            pointerEvents: "auto",
          }}
        >
          {fixed && active && (
            <div
              onBeforeXRSelect={(event) =>
                event.preventDefault()
              }
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 9,
                touchAction: "none",
              }}
            />
          )}

          {active && (
            <div
              onBeforeXRSelect={(event) =>
                event.preventDefault()
              }
              style={{
                position: "absolute",
                top: 16,
                left: 16,
                zIndex: 10,
              }}
            >
              <button
                type="button"
                style={button}
                onClick={() =>
                  setFixed((value) => !value)
                }
              >
                {fixed ? "Unfix" : "Fix"}
              </button>
            </div>
          )}
        </model-viewer>
      )}

      {!active && (
  <div className="ar-controls">
    <div className="ar-controls-heading">
      <div>
        <span className="ar-kicker">ARTIFACT AR STUDIO</span>
        <h2>Find the right fit.</h2>
        <p>Set the furniture size before placing it in your room.</p>
      </div>
      <span className="ar-controls-mark" aria-hidden="true">◇</span>
    </div>

    <div className="ar-mode-switch" role="group" aria-label="Sizing mode">
      <label className={mode === "manual" ? "is-selected" : ""}>
        <input
          type="radio"
          name="ar-size-mode"
          checked={mode === "manual"}
          onChange={() => setMode("manual")}
        />
        <span>Exact dimensions</span>
      </label>

      <label className={mode === "flexible" ? "is-selected" : ""}>
        <input
          type="radio"
          name="ar-size-mode"
          checked={mode === "flexible"}
          onChange={() => setMode("flexible")}
        />
        <span>Flexible scale</span>
      </label>
    </div>

    {mode === "manual" ? (
      <div className="ar-dimensions">
        {[
          ["length", "Length"],
          ["breadth", "Breadth"],
          ["height", "Height"],
        ].map(([key, title]) => (
          <label key={key}>
            <span>{title}</span>
            <div className="ar-dimension-input">
              <input
                type="number"
                inputMode="decimal"
                min="0.01"
                max="10"
                step="0.01"
                placeholder="0.00"
                value={size[key]}
                onChange={(event) =>
                  setSize((previous) => ({
                    ...previous,
                    [key]: event.target.value,
                  }))
                }
              />
              <span>m</span>
            </div>
          </label>
        ))}
      </div>
    ) : (
      <div className="ar-scale-control">
        <div>
          <span>Preview scale</span>
          <strong>{scale.toFixed(2)}×</strong>
        </div>
        <input
          type="range"
          min="0.1"
          max="3"
          step="0.05"
          value={scale}
          onChange={(event) =>
            setScale(Number(event.target.value))
          }
        />
        <small>Pinch the object in AR to adjust it further.</small>
      </div>
    )}

    <div className="ar-controls-actions">
      <button
        type="button"
        className="ar-primary-action"
        disabled={!ready}
        onClick={startAR}
      >
        Open camera in AR ↗
      </button>

      <button
        type="button"
        className="ar-secondary-action"
        disabled={!taskId || savingPhoto}
        onClick={() => screenshotInputRef.current?.click()}
      >
        {savingPhoto ? "Uploading..." : "Upload AR screenshot"}
      </button>
    </div>

    <p className="ar-controls-footnote">
      Place the object in AR, take your phone’s screenshot,
      then return here to upload it.
    </p>

    {savedMessage && <p role="status">{savedMessage}</p>}
  </div>
)}
    </div>

    {error && (
      <p
        role="alert"
        style={{
          color: "#ffaaa2",
          padding: 16,
        }}
      >
        {error}
      </p>
    )}
  </div>
);
}