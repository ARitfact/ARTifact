import { useEffect, useRef, useState } from "react";
import { apiRequest } from "../services/api";
import { Link } from "react-router-dom";

import ModelViewer from "../components/ModelViewer";
import GenerationProgress from "../components/GenerationProgress";
import ARViewer from "../components/ARViewer";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const MAX_SIZE = 10 * 1024 * 1024;

export default function CreateModel() {
  const inputRef = useRef(null);
  const generationKeyRef = useRef(null);

  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [taskId, setTaskId] = useState("");
  const [modelUrl, setModelUrl] = useState("");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [showAR, setShowAR] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!busy) return;
    const timer = setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [status]);

  useEffect(() => {
    if (!taskId || status !== "processing") {
      return;
    }

    let stopped = false;
let timer;
let attempts = 0;

  async function checkTask() {
  attempts += 1;

  if (attempts > 120) {
    setStatus("error");
    setMessage(
      "Model is taking longer than expected. Please check again later."
    );
    return;
  }

  try {
    const result = await apiRequest(
      `/api/task/${encodeURIComponent(taskId)}`
    );

    if (stopped) return;

    const taskStatus = result.task?.status;

    if (taskStatus === "success" && result.modelUrl) {
      setModelUrl(result.modelUrl);
      setStatus("complete");
      setMessage("Your 3D model is ready.");
      return;
    }

    if (
      taskStatus === "failed" ||
      taskStatus === "cancelled"
    ) {
      setStatus("error");
      setMessage(
        "Generation failed. Your credit has been refunded."
      );
      return;
    }

    // Still generating, or Cloudinary upload is in progress.
    timer = setTimeout(checkTask, 5000);
  } catch (error) {
    if (stopped) return;

    if (error.code === "MODEL_STORAGE_PENDING") {
      timer = setTimeout(checkTask, 5000);
      return;
    }

    setStatus("error");
    setMessage(error.message);
  }
}

    checkTask();

    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [taskId, status]);

  function chooseFile(selectedFile) {
    if (!selectedFile) return;

    if (!ALLOWED_TYPES.has(selectedFile.type)) {
      setMessage("Choose a JPG, PNG, or WebP image.");
      return;
    }

    if (selectedFile.size > MAX_SIZE) {
      setMessage("Image must be 10 MB or smaller.");
      return;
    }
    setElapsed(0);
    generationKeyRef.current = null;
    setFile(selectedFile);
    setTaskId("");
    setModelUrl("");
    setStatus("idle");
    setMessage("");
    setShowAR(false);
  }

  async function generateModel() {
    if (!file || status === "submitting") return;

    const formData = new FormData();
    formData.append("image", file);

    setElapsed(0);
    setStatus("submitting");
    setMessage("Uploading image and starting generation...");
    setModelUrl("");

    try {
     if (!generationKeyRef.current) {
  generationKeyRef.current = crypto.randomUUID();
}

const result = await apiRequest("/api/generate-3d", {
  method: "POST",
  body: formData,
  headers: {
    "Idempotency-Key": generationKeyRef.current,
  },
});
if (!result.taskId) {
  throw new Error("Could not start 3D generation.");
}

      setTaskId(result.taskId);
      setStatus("processing");
      setMessage("Creating your 3D model. This may take a few minutes.");
    } catch (error) {
      setStatus("error");
      setMessage(error.message);
    }
  }

  async function downloadModel() {
    if (!modelUrl || downloading) return;

    setDownloading(true);

    try {
      const response = await fetch(modelUrl);

      if (!response.ok) {
        throw new Error("Could not download the model.");
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = blobUrl;
      link.download = `artifact-${taskId}.glb`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setDownloading(false);
    }
  }

  function reset() {
    setElapsed(0);
    generationKeyRef.current = null;
    setFile(null);
    setTaskId("");
    setModelUrl("");
    setStatus("idle");
    setMessage("");
    setShowAR(false);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  const busy =
    status === "submitting" || status === "processing";

  return (
    <main className="theme-page" style={styles.page}>
      <header style={styles.header}>
        <Link to="/dashboard" style={styles.back}>
          ← Dashboard
        </Link>
        <strong>ARTifact</strong>
        <Link to="/catalog" style={styles.back}>
          Catalog
        </Link>
      </header>

      <div style={styles.content}>
        <span style={styles.eyebrow}>IMAGE TO 3D</span>
        <h1 style={styles.title}>Create your own model.</h1>
        <p style={styles.muted}>
          Upload a clear furniture photo. Once generation finishes,
          explore the model in 3D or try it in AR.
        </p>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) =>
            chooseFile(event.target.files?.[0])
          }
          style={{ display: "none" }}
        />

        {!file ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            style={styles.upload}
          >
            <span style={styles.uploadIcon}>＋</span>
            <strong>Choose a furniture image</strong>
            <span style={styles.muted}>
              JPG, PNG, or WebP · Maximum 10 MB
            </span>
          </button>
        ) : (
          <div style={styles.layout}>
            <section style={styles.panel}>
              <div style={styles.panelHeader}>
                <strong>Your image</strong>
                {!busy && (
                  <button
                    type="button"
                    onClick={reset}
                    style={styles.secondaryButton}
                  >
                    New image
                  </button>
                )}
              </div>

              <img
                src={previewUrl}
                alt="Furniture selected for 3D generation"
                style={styles.image}
              />

              <div style={styles.panelFooter}>
                <span style={styles.fileName}>{file.name}</span>

                <button
                  type="button"
                  onClick={generateModel}
                  disabled={busy}
                  style={{
                    ...styles.primaryButton,
                    opacity: busy ? 0.6 : 1,
                  }}
                >
                  {status === "submitting"
                    ? "Starting..."
                    : status === "processing"
                      ? "Creating..."
                      : "Generate 3D model"}
                </button>
              </div>
            </section>

            <section style={styles.panel}>
              <div style={styles.panelHeader}>
                <strong>3D workspace</strong>
              </div>

              {busy && <div style={{ padding: 20, color: "#646b4e" }} role="status">
                <progress max="600" value={Math.min(elapsed, 570)} style={{ width: "100%", accentColor: "#646b4e" }} />
                <p>Generating: {Math.floor(elapsed / 60)}m {String(elapsed % 60).padStart(2, "0")}s elapsed</p>
                <small>Approximate indicator. Actual time depends on the generation service.</small>
              </div>}
              {busy ? (
  <GenerationProgress status={status} />
) : modelUrl ? (
                <>
                  <div style={styles.viewer}>
                    <ModelViewer modelUrl={modelUrl} />
                  </div>

                  <div style={styles.actions}>
                    <button
                      type="button"
                      onClick={downloadModel}
                      disabled={downloading}
                      style={styles.primaryButton}
                    >
                      {downloading
                        ? "Downloading..."
                        : "Download GLB"}
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowAR(true)}
                      style={styles.secondaryButton}
                    >
                      View in AR
                    </button>
                  </div>
                </>
              ) : (
                <div style={styles.placeholder}>
                  <span style={styles.placeholderIcon}>◇</span>
                  <p>
                    Your generated 3D model will appear here.
                  </p>
                </div>
              )}
            </section>
          </div>
        )}

        {message && (
          <p
            role={status === "error" ? "alert" : "status"}
            style={{
              ...styles.status,
              color:
                status === "error" ? "#ffaaa2" : "#646b4e",
            }}
          >
            {busy && "◌ "}
            {message}
          </p>
        )}
      </div>

     {showAR && modelUrl && (
  <ARViewer
    modelUrl={modelUrl}
    taskId={taskId}
    onClose={() => setShowAR(false)}
  />
)}
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    width: "100%",
    overflowX: "hidden",
    background:
      "radial-gradient(ellipse at 92% 5%, rgba(220,216,198,.22), transparent 28%), #f5f3ec",
    color: "#25271f",
    fontFamily: "'DM Sans', Arial, sans-serif",
  },
  header: {
    minHeight: 72,
    padding: "14px clamp(16px, 5vw, 64px)",
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderBottom: "1px solid rgba(53,54,44,.09)",
    background: "rgba(250,249,244,.92)",
  },
  back: {
    color: "#646b4e",
    textDecoration: "none",
    fontSize: 12,
    fontWeight: 600,
  },
  content: {
    width: "min(1200px, calc(100% - 36px))",
    margin: "0 auto",
    padding: "clamp(28px, 5vw, 54px) 0 clamp(48px, 8vw, 88px)",
  },
  eyebrow: {
    color: "#646b4e",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: ".17em",
  },
  title: {
    margin: "12px 0",
    color: "#25271f",
    fontFamily: "'Playfair Display', Georgia, serif",
    fontSize: "clamp(36px, 5.5vw, 58px)",
    fontWeight: 500,
    lineHeight: 1.06,
    letterSpacing: "-.055em",
  },
  muted: {
    color: "#74766c",
    fontSize: "clamp(12px, 1.5vw, 14px)",
    lineHeight: 1.7,
  },
  upload: {
    display: "flex",
    width: "100%",
    minHeight: "clamp(220px, 34vw, 320px)",
    marginTop: "clamp(22px, 4vw, 34px)",
    padding: "clamp(20px, 4vw, 36px)",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 13,
    border: "1px dashed rgba(100,107,78,.4)",
    borderRadius: "5px 48px 5px 5px",
    background: "rgba(255,253,247,.76)",
    color: "#25271f",
    fontSize: 15,
    textAlign: "center",
    cursor: "pointer",
    transition: "border-color .2s ease, background .2s ease, transform .2s ease",
  },
  uploadIcon: {
    color: "#646b4e",
    fontSize: "clamp(38px, 7vw, 54px)",
  },
  layout: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))",
    gap: "clamp(12px, 2vw, 20px)",
    marginTop: "clamp(22px, 4vw, 35px)",
  },
  panel: {
    minWidth: 0,
    overflow: "hidden",
    border: "1px solid rgba(65,66,52,.12)",
    borderRadius: "5px 36px 5px 5px",
    background: "#fffdf7",
    color: "#25271f",
    boxShadow: "0 9px 28px rgba(49,48,39,.05)",
  },
  panelHeader: {
    display: "flex",
    minHeight: 64,
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    padding: "clamp(13px, 2.5vw, 18px)",
    borderBottom: "1px solid rgba(65,66,52,.1)",
    color: "#25271f",
  },
  image: {
    display: "block",
    width: "100%",
    height: "clamp(280px, 48vw, 430px)",
    objectFit: "contain",
    background: "#eeece3",
  },
  panelFooter: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "clamp(13px, 2.5vw, 18px)",
  },
  fileName: {
    maxWidth: "min(100%, 260px)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    color: "#74766c",
    fontSize: 11,
  },
  viewer: {
    width: "100%",
    height: "clamp(320px, 55vw, 550px)",
    minHeight: 280,
    background: "#eeece3",
  },
  placeholder: {
    display: "flex",
    minHeight: "clamp(280px, 48vw, 550px)",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 20,
    color: "#74766c",
    textAlign: "center",
  },
  placeholderIcon: {
    color: "#646b4e",
    fontSize: "clamp(64px, 12vw, 100px)",
  },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 9,
    padding: "clamp(13px, 2.5vw, 18px)",
  },
  primaryButton: {
    minHeight: 42,
    padding: "10px 17px",
    border: "1px solid #25271f",
    borderRadius: 999,
    background: "#25271f",
    color: "#fffdf7",
    fontSize: 11,
    fontWeight: 600,
    cursor: "pointer",
  },
  secondaryButton: {
    minHeight: 42,
    padding: "9px 16px",
    border: "1px solid rgba(100,107,78,.28)",
    borderRadius: 999,
    background: "transparent",
    color: "#454c36",
    fontSize: 11,
    fontWeight: 600,
    cursor: "pointer",
  },
  status: {
    marginTop: 18,
    color: "#646b4e",
    fontSize: 12,
    lineHeight: 1.6,
  },
};
