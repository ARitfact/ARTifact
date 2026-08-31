import { useRef, useState } from "react";
import ModelViewer from "./components/ModelViewer";
import ARViewer from "./components/ARViewer";

const API_URL = "https://ar-tifact-e3yz.vercel.app";

function App() {
  const fileInputRef = useRef(null);

  // --------------------------------
  // IMAGE STATE
  // --------------------------------

  const [image, setImage] = useState(null);

  // Persistent image preview
  const [preview, setPreview] = useState(() => {
    return (
      localStorage.getItem(
        "artifact_image_preview"
      ) || null
    );
  });

  // --------------------------------
  // MODEL STATE
  // --------------------------------

  const [modelUrl, setModelUrl] = useState(() => {
    const savedUrl =
      localStorage.getItem(
        "artifact_model_url"
      );

    if (!savedUrl) {
      return null;
    }

    // Convert old localhost URL
    // to current device IP/hostname
    if (savedUrl.includes("localhost:5000")) {
      return savedUrl.replace(
        "localhost:5000",
        `${window.location.hostname}:5000`
      );
    }

    return savedUrl;
  });

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [showAR, setShowAR] = useState(false);

  // --------------------------------
  // SAVE IMAGE PREVIEW
  // --------------------------------

  const saveImagePreview = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const img = new Image();

        img.onload = () => {
          // Compress image for localStorage
          const maxWidth = 1000;

          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height =
              (height * maxWidth) / width;

            width = maxWidth;
          }

          const canvas =
            document.createElement("canvas");

          canvas.width = width;
          canvas.height = height;

          const ctx =
            canvas.getContext("2d");

          ctx.drawImage(
            img,
            0,
            0,
            width,
            height
          );

          const compressedImage =
            canvas.toDataURL(
              "image/jpeg",
              0.75
            );

          try {
            localStorage.setItem(
              "artifact_image_preview",
              compressedImage
            );

            resolve(compressedImage);
          } catch (storageError) {
            console.error(
              "LocalStorage error:",
              storageError
            );

            reject(
              new Error(
                "Image is too large to save locally."
              )
            );
          }
        };

        img.onerror = () => {
          reject(
            new Error(
              "Unable to process image."
            )
          );
        };

        img.src = reader.result;
      };

      reader.onerror = () => {
        reject(
          new Error(
            "Unable to read image."
          )
        );
      };

      reader.readAsDataURL(file);
    });
  };

  // --------------------------------
  // SELECT IMAGE
  // --------------------------------

  const handleImage = async (file) => {
    if (!file) {
      return;
    }

    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/webp",
    ];

    // Check file type
    if (!allowedTypes.includes(file.type)) {
      setStatus(
        "Please upload a PNG, JPG, JPEG or WebP image."
      );

      return;
    }

    // Check file size
    if (file.size > 10 * 1024 * 1024) {
      setStatus(
        "Image must be smaller than 10 MB."
      );

      return;
    }

    try {
      // --------------------------------
      // Clear previous model
      // --------------------------------

      setModelUrl(null);

      localStorage.removeItem(
        "artifact_model_url"
      );

      setShowAR(false);
      setProgress(0);
      setStatus("");

      // --------------------------------
      // Save actual File object
      // --------------------------------

      setImage(file);

      // --------------------------------
      // Create persistent preview
      // --------------------------------

      const savedPreview =
        await saveImagePreview(file);

      setPreview(savedPreview);

    } catch (error) {
      console.error(
        "Image preview error:",
        error
      );

      setStatus(
        error.message ||
          "Unable to save image preview."
      );
    }
  };

  // --------------------------------
  // FILE INPUT
  // --------------------------------

  const handleFileChange = (event) => {
    const file =
      event.target.files?.[0];

    handleImage(file);
  };

  // --------------------------------
  // DRAG & DROP
  // --------------------------------

  const handleDrop = (event) => {
    event.preventDefault();

    const file =
      event.dataTransfer.files?.[0];

    handleImage(file);
  };

  // --------------------------------
  // REMOVE IMAGE
  // --------------------------------

  const removeImage = () => {
    setImage(null);
    setPreview(null);
    setModelUrl(null);

    setStatus("");
    setProgress(0);
    setShowAR(false);

    // Remove persistent data
    localStorage.removeItem(
      "artifact_image_preview"
    );

    localStorage.removeItem(
      "artifact_model_url"
    );

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // --------------------------------
  // DOWNLOAD 3D MODEL
  // --------------------------------

  const handleDownload = async () => {
    if (!modelUrl) {
      return;
    }

    try {
      setStatus(
        "Preparing download..."
      );

      const response =
        await fetch(modelUrl);

      if (!response.ok) {
        throw new Error(
          `Download failed: ${response.status}`
        );
      }

      const blob =
        await response.blob();

      const downloadUrl =
        window.URL.createObjectURL(blob);

      const link =
        document.createElement("a");

      link.href = downloadUrl;

      link.download =
        "artifact-3d-model.glb";

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(
        downloadUrl
      );

      setStatus(
        "3D model downloaded successfully! 🎉"
      );

    } catch (error) {
      console.error(
        "Download error:",
        error
      );

      setStatus(
        "Unable to download the 3D model."
      );

      alert(
        "Unable to download the 3D model."
      );
    }
  };

  // --------------------------------
  // GENERATE 3D MODEL
  // --------------------------------

  const handleGenerate = async () => {
    if (!image) {
      setStatus(
        "Please select an image first."
      );

      return;
    }

    try {
      setLoading(true);

      // Clear previous model
      setModelUrl(null);

      localStorage.removeItem(
        "artifact_model_url"
      );

      setProgress(0);

      setStatus(
        "Uploading image..."
      );

      // --------------------------------
      // Upload image
      // --------------------------------

      const formData =
        new FormData();

      formData.append(
        "image",
        image
      );

      const response =
        await fetch(
          `${API_URL}/api/generate-3d`,
          {
            method: "POST",
            body: formData,
          }
        );

      const data =
        await response.json();

      console.log(
        "Generation response:",
        data
      );

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error?.message ||
            data.message ||
            "Unable to start 3D generation."
        );
      }

      // --------------------------------
      // Get Task ID
      // --------------------------------

      const taskId =
        data.taskId;

      if (!taskId) {
        throw new Error(
          "No task ID was returned."
        );
      }

      console.log(
        "Task ID:",
        taskId
      );

      // --------------------------------
      // Poll Tripo
      // --------------------------------

      setStatus(
        "Creating your 3D model..."
      );

      let finished = false;

      while (!finished) {
        await new Promise(
          (resolve) =>
            setTimeout(
              resolve,
              5000
            )
        );

        const taskResponse =
          await fetch(
            `${API_URL}/api/task/${taskId}`
          );

        const taskData =
          await taskResponse.json();

        console.log(
          "Task:",
          taskData
        );

        if (
          !taskResponse.ok ||
          !taskData.success
        ) {
          throw new Error(
            "Unable to check generation status."
          );
        }

        const task =
          taskData.task;

        if (!task) {
          throw new Error(
            "Task information was not returned."
          );
        }

        // --------------------------------
        // Progress
        // --------------------------------

        const currentProgress =
          Number(
            task.progress || 0
          );

        setProgress(
          currentProgress
        );

        // --------------------------------
        // SUCCESS
        // --------------------------------

        if (
          task.status === "success"
        ) {
          // IMPORTANT:
          // Use our LOCAL backend URL.
          // Do not use the temporary Tripo URL.

          const url =
            taskData.modelUrl;

          if (!url) {
            throw new Error(
              "3D model URL was not returned by the server."
            );
          }

          console.log(
            "✅ Local model URL:",
            url
          );

          // --------------------------------
          // Set model
          // --------------------------------

          setModelUrl(url);

          // --------------------------------
          // Save model URL
          // --------------------------------

          localStorage.setItem(
            "artifact_model_url",
            url
          );

          setProgress(100);

          setStatus(
            "3D model ready! 🎉"
          );

          finished = true;
        }

        // --------------------------------
        // FAILED
        // --------------------------------

        else if (
          task.status === "failed" ||
          task.status === "error"
        ) {
          throw new Error(
            "3D generation failed."
          );
        }

        // --------------------------------
        // PROCESSING
        // --------------------------------

        else {
          setStatus(
            `Creating 3D model... ${
              task.status ||
              "processing"
            }`
          );
        }
      }

    } catch (error) {
      console.error(
        "Generation error:",
        error
      );

      setStatus(
        `Error: ${error.message}`
      );

    } finally {
      setLoading(false);
    }
  };

  // --------------------------------
  // START NEW MODEL
  // --------------------------------

  const handleNewModel = () => {
    setModelUrl(null);
    setImage(null);
    setPreview(null);

    setStatus("");
    setProgress(0);
    setShowAR(false);

    // Clear BOTH saved items
    localStorage.removeItem(
      "artifact_model_url"
    );

    localStorage.removeItem(
      "artifact_image_preview"
    );

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // --------------------------------
  // UI
  // --------------------------------

  return (
    <div className="app">

      {/* ================================= */}
      {/* HEADER */}
      {/* ================================= */}

      <header className="header">

        <div className="logo">
          ARTifact
        </div>

        <div className="tagline">
          Image → 3D
        </div>

      </header>

      {/* ================================= */}
      {/* MAIN */}
      {/* ================================= */}

      <main className="main">

        {/* ================================= */}
        {/* HERO */}
        {/* ================================= */}

        <section className="hero">

          <h1>
            Turn your image into
            <span> 3D.</span>
          </h1>

          <p>
            Upload an image of your furniture
            and generate an interactive 3D model.
          </p>

        </section>

        {/* ================================= */}
        {/* UPLOAD AREA */}
        {/* ================================= */}

        {!modelUrl && (

          <section className="upload-section">

            {!preview ? (

              <div
                className="drop-zone"
                onDragOver={(e) =>
                  e.preventDefault()
                }
                onDrop={handleDrop}
                onClick={() =>
                  fileInputRef.current?.click()
                }
              >

                <div className="upload-icon">
                  ↑
                </div>

                <h2>
                  Drop your image here
                </h2>

                <p>
                  or click to browse
                </p>

                <span>
                  PNG · JPG · JPEG · WebP
                  <br />
                  Max 10 MB
                </span>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleFileChange}
                  hidden
                />

              </div>

            ) : (

              <div className="preview-card">

                <img
                  src={preview}
                  alt="Selected furniture"
                />

                <button
                  className="remove-button"
                  onClick={removeImage}
                >
                  ×
                </button>

                <div className="file-info">

                  <strong>
                    {image?.name ||
                      "Selected furniture image"}
                  </strong>

                  <span>
                    {image
                      ? (
                          image.size /
                          1024 /
                          1024
                        ).toFixed(2)
                      : "Saved preview"}{" "}
                    {image ? "MB" : ""}
                  </span>

                </div>

              </div>

            )}

            {/* ================================= */}
            {/* GENERATE BUTTON */}
            {/* ================================= */}

            {preview && (

              <button
                className="generate-button"
                onClick={handleGenerate}
                disabled={
                  loading ||
                  !image
                }
              >

                {loading
                  ? "Creating 3D Model..."
                  : "Generate 3D Model →"}

              </button>

            )}

            {/* ================================= */}
            {/* STATUS */}
            {/* ================================= */}

            {status && (

              <div className="status">

                {loading && (

                  <div className="generation-card">

                    <div className="generation-title">

                      <span className="loader"></span>

                      <div>

                        <strong>
                          Creating your 3D model
                        </strong>

                        <p>
                          ARTifact is processing
                          your image...
                        </p>

                      </div>

                      <span className="progress-number">
                        {progress}%
                      </span>

                    </div>

                    <div className="progress-bar">

                      <div
                        className="progress-fill"
                        style={{
                          width:
                            `${progress}%`,
                        }}
                      />

                    </div>

                    <div className="progress-info">

                      <span>
                        {progress}% complete
                      </span>

                      <span>
                        {progress < 100
                          ? "Please wait..."
                          : "Complete"}
                      </span>

                    </div>

                    <div className="generation-steps">

                      <div className="step completed">

                        <span>
                          ✓
                        </span>

                        <p>
                          Image uploaded
                        </p>

                      </div>

                      <div
                        className={`step ${
                          progress > 0
                            ? "active"
                            : ""
                        }`}
                      >

                        <span>
                          {progress > 0
                            ? "●"
                            : "○"}
                        </span>

                        <p>
                          Generating 3D geometry
                        </p>

                      </div>

                      <div
                        className={`step ${
                          progress >= 70
                            ? "active"
                            : ""
                        }`}
                      >

                        <span>
                          {progress >= 70
                            ? "●"
                            : "○"}
                        </span>

                        <p>
                          Applying textures
                        </p>

                      </div>

                      <div
                        className={`step ${
                          progress >= 100
                            ? "completed"
                            : ""
                        }`}
                      >

                        <span>
                          {progress >= 100
                            ? "✓"
                            : "○"}
                        </span>

                        <p>
                          Finalizing model
                        </p>

                      </div>

                    </div>

                    <small>
                      Keep this window open while
                      ARTifact creates your model.
                    </small>

                  </div>

                )}

                {!loading &&
                  status &&
                  !modelUrl && (

                    <div className="status">
                      {status}
                    </div>

                  )}

              </div>

            )}

          </section>

        )}

        {/* ================================= */}
        {/* 3D MODEL WORKSPACE */}
        {/* ================================= */}

        {modelUrl && (

          <section className="workspace">

            {/* Workspace Header */}

            <div className="workspace-header">

              <div>

                <h2>
                  3D Workspace
                </h2>

                <p>
                  Compare your original image
                  with the generated 3D model.
                </p>

              </div>

              <button
                className="new-model-button"
                onClick={handleNewModel}
              >
                + New Model
              </button>

            </div>

            {/* Workspace Grid */}

            <div className="workspace-grid">

              {/* ================================= */}
              {/* ORIGINAL IMAGE */}
              {/* ================================= */}

              <div className="workspace-panel">

                <div className="panel-header">

                  <div>

                    <span className="panel-label">
                      INPUT
                    </span>

                    <h3>
                      Original Image
                    </h3>

                  </div>

                </div>

                <div className="image-preview">

                  {preview ? (

                    <img
                      src={preview}
                      alt="Original furniture"
                    />

                  ) : (

                    <div
                      style={{
                        color: "#777",
                        textAlign: "center",
                        padding: "40px",
                      }}
                    >
                      Original image preview
                      is unavailable.
                    </div>

                  )}

                </div>

              </div>

              {/* ================================= */}
              {/* 3D MODEL */}
              {/* ================================= */}

              <div className="workspace-panel">

                <div className="panel-header">

                  <div>

                    <span className="panel-label">
                      OUTPUT
                    </span>

                    <h3>
                      Generated 3D Model
                    </h3>

                  </div>

                </div>

                <div className="model-container">

                  <ModelViewer
                    modelUrl={modelUrl}
                  />

                </div>

                {/* ================================= */}
                {/* MODEL ACTIONS */}
                {/* ================================= */}

                <div className="model-actions">

                  <button
                    onClick={handleDownload}
                    disabled={!modelUrl}
                    className="download-button"
                  >
                    ⬇ Download 3D Model
                  </button>

                  <button
                    onClick={() =>
                      setShowAR(true)
                    }
                    disabled={!modelUrl}
                    className="ar-button"
                  >
                    📱 View in AR
                  </button>

                </div>

              </div>

            </div>

          </section>

        )}

      </main>

      {/* ================================= */}
      {/* AR VIEWER */}
      {/* ================================= */}

      {showAR && (

        <ARViewer
          modelUrl={modelUrl}
          onClose={() =>
            setShowAR(false)
          }
        />

      )}

    </div>
  );
}

export default App;