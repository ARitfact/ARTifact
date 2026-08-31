import { useEffect, useRef, useState } from "react";

export default function ARViewer({ modelUrl, onClose }) {
  const viewerRef = useRef(null);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  // --------------------------------
  // Wait for Model Viewer
  // --------------------------------

  useEffect(() => {
    const checkModelViewer = async () => {
      try {
        await customElements.whenDefined("model-viewer");

        console.log("✅ Model Viewer loaded");

        setReady(true);
      } catch (err) {
        console.error(
          "❌ Model Viewer error:",
          err
        );

        setError(
          "Unable to load AR viewer."
        );
      }
    };

    checkModelViewer();
  }, []);

  // --------------------------------
  // Listen for AR status
  // --------------------------------

  useEffect(() => {
    if (!ready || !modelUrl) {
      return;
    }

    const viewer = viewerRef.current;

    if (!viewer) {
      return;
    }

    const handleARStatus = (event) => {
      console.log(
        "📱 AR status:",
        event.detail.status
      );

      if (event.detail.status === "failed") {
        setError(
          "AR could not start. Please make sure your phone supports AR."
        );
      }
    };

    viewer.addEventListener(
      "ar-status",
      handleARStatus
    );

    return () => {
      viewer.removeEventListener(
        "ar-status",
        handleARStatus
      );
    };
  }, [ready, modelUrl]);

  // --------------------------------
  // No model
  // --------------------------------

  if (!modelUrl) {
    return (
      <div className="ar-screen">

        <h2>
          No 3D model found
        </h2>

        <button onClick={onClose}>
          ← Back
        </button>

      </div>
    );
  }

  // --------------------------------
  // AR screen
  // --------------------------------

  return (
    <div
  className="ar-screen"
  style={{
    position: "fixed",
    inset: 0,
    width: "100vw",
    height: "100dvh",
    background: "#101010",
    color: "white",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    zIndex: 9999,
  }}
>

      {/* Header */}

      <div className="ar-header">

        <h2>
          📱 ARTifact AR
        </h2>

        <button
          onClick={onClose}
          className="ar-close"
        >
          ✕
        </button>

      </div>

      {/* Viewer */}

      <div
  className="ar-viewer-container"
  style={{
    flex: "1 1 auto",
    position: "relative",
    width: "100%",
    minHeight: 0,
    height: "100%",
    overflow: "hidden",
  }}
>

        {!ready && !error && (
          <div className="ar-loading">

            <h3>
              Loading AR viewer...
            </h3>

            <p>
              Please wait.
            </p>

          </div>
        )}

        {ready && (
          <model-viewer
            ref={viewerRef}
            src={modelUrl}
            alt="Generated furniture 3D model"

            ar
            ar-modes="webxr scene-viewer quick-look"

            ar-placement="floor"
            ar-scale="auto"

            camera-controls
            touch-action="pan-y"

            shadow-intensity="1"
            exposure="1"

            environment-image="neutral"

            style={{
  display: "block",
  width: "100%",
  height: "100%",
  minHeight: "300px",
  background: "#202020",
}}
          >

            <button
              slot="ar-button"
              className="place-ar-button"
            >
              📱 Place in Your Room
            </button>

          </model-viewer>
        )}

        {error && (
          <div className="ar-error">

            <h3>
              AR Error
            </h3>

            <p>
              {error}
            </p>

          </div>
        )}

      </div>

      {/* Footer */}

      <div className="ar-footer">

        <p>
          Rotate and zoom your furniture.
          <br />

          Tap{" "}

          <strong>
            Place in Your Room
          </strong>

          {" "}to use AR.
        </p>

      </div>

    </div>
  );
}