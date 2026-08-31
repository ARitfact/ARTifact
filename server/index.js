const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const axios = require("axios");
const multer = require("multer");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");

dotenv.config();

const app = express();

const PORT = 5000;

const upload = multer({
  storage: multer.memoryStorage(),
});

app.use(cors());
app.use(express.json());

// --------------------------------
// Local model storage
// --------------------------------

const modelsDir =
  process.env.NODE_ENV === "production"
    ? path.join("/tmp", "artifact-models")
    : path.join(__dirname, "models");

if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir, { recursive: true });
}

// Serve saved GLB files
app.use(
  "/models",
  express.static(modelsDir, {
    setHeaders: (res) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader(
        "Content-Type",
        "model/gltf-binary"
      );
    },
  })
);

// --------------------------------
// Home
// --------------------------------

app.get("/", (req, res) => {
  res.json({
    message: "ARTifact backend is running 🚀",
  });
});

// --------------------------------
// Image → 3D
// --------------------------------

app.post(
  "/api/generate-3d",
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No image uploaded",
        });
      }

      console.log("\n==============================");
      console.log("📷 IMAGE RECEIVED");
      console.log("==============================");

      console.log("Name:", req.file.originalname);
      console.log("MIME:", req.file.mimetype);
      console.log("Size:", req.file.size);

      // --------------------------------
      // Upload image to Tripo
      // --------------------------------

      console.log("\n📤 Uploading image to Tripo...");

      const form = new FormData();

      form.append("file", req.file.buffer, {
        filename: req.file.originalname,
        contentType: req.file.mimetype,
      });

      const uploadResponse = await axios.post(
        "https://api.tripo3d.ai/v2/openapi/upload/sts",
        form,
        {
          headers: {
            Authorization: `Bearer ${process.env.TRIPO_API_KEY}`,
            ...form.getHeaders(),
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        }
      );

      const imageToken =
        uploadResponse.data?.data?.image_token;

      if (!imageToken) {
        throw new Error(
          "Tripo did not return an image_token"
        );
      }

      console.log(
        "🔑 Image token:",
        imageToken
      );

      // --------------------------------
      // Determine file type
      // --------------------------------

      let fileType = "jpg";

      if (req.file.mimetype === "image/png") {
        fileType = "png";
      } else if (
        req.file.mimetype === "image/webp"
      ) {
        fileType = "webp";
      }

      // --------------------------------
      // Create Tripo task
      // --------------------------------

      console.log(
        "\n🧠 Creating Image → 3D task..."
      );

      const taskRequest = {
        type: "image_to_model",

        model_version: "P1-20260311",

        file: {
          type: fileType,
          file_token: imageToken,
        },

        texture: true,
        pbr: true,

        enable_image_autofix: true,
      };

      const taskResponse = await axios.post(
        "https://api.tripo3d.ai/v2/openapi/task",
        taskRequest,
        {
          headers: {
            Authorization: `Bearer ${process.env.TRIPO_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      const taskId =
        taskResponse.data?.data?.task_id;

      if (!taskId) {
        throw new Error(
          "Tripo did not return a task_id"
        );
      }

      console.log(
        "\n✅ 3D GENERATION STARTED"
      );

      console.log(
        "Task ID:",
        taskId
      );

      res.json({
        success: true,
        message:
          "3D generation started 🚀",
        taskId,
      });

    } catch (error) {
      console.error(
        "\n❌ TRIPO ERROR"
      );

      console.error(
        error.response?.data ||
          error.message
      );

      res.status(500).json({
        success: false,
        message:
          "3D generation failed",
        error:
          error.response?.data ||
          error.message,
      });
    }
  }
);

// --------------------------------
// Check 3D generation status
// --------------------------------

app.get(
  "/api/task/:taskId",
  async (req, res) => {
    try {
      const { taskId } = req.params;

      console.log(
        "\n🔍 Checking task:",
        taskId
      );

      const response = await axios.get(
        `https://api.tripo3d.ai/v2/openapi/task/${taskId}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.TRIPO_API_KEY}`,
          },
        }
      );

      const task =
        response.data?.data;

      console.log(
        "📊 Task status:",
        task?.status,
        "Progress:",
        task?.progress
      );

      // --------------------------------
      // If generation finished
      // --------------------------------

      if (
        task?.status === "success"
      ) {
        const tripoModelUrl =
          task?.result?.pbr_model?.url;

        if (!tripoModelUrl) {
          throw new Error(
            "Tripo did not return the model URL."
          );
        }

        // Local filename
        const fileName =
          `${taskId}.glb`;

        const localFilePath =
          path.join(
            modelsDir,
            fileName
          ); 

        // --------------------------------
        // Download only once
        // --------------------------------

        if (
          !fs.existsSync(localFilePath)
        ) {
          console.log(
            "\n📦 Downloading model from Tripo..."
          );

          const modelResponse =
            await axios.get(
              tripoModelUrl,
              {
                responseType:
                  "arraybuffer",
                maxContentLength:
                  Infinity,
                maxBodyLength:
                  Infinity,
              }
            );

          fs.writeFileSync(
            localFilePath,
            modelResponse.data
          );

          console.log(
            "✅ Model saved locally:",
            localFilePath
          );

          console.log(
            "📦 Size:",
            modelResponse.data.length,
            "bytes"
          );
        } else {
          console.log(
            "✅ Model already stored locally."
          );
        }

        // --------------------------------
        // IMPORTANT
        // Return OUR URL
        // --------------------------------

        const localModelUrl =
  `http://${req.get("host")}/models/${fileName}`;

        return res.json({
          success: true,

          task: task,

          modelUrl:
            localModelUrl,
        });
      }

      // --------------------------------
      // Still processing
      // --------------------------------

      res.json({
        success: true,

        task: task,

        modelUrl: null,
      });

    } catch (error) {
      console.error(
        "\n❌ Task status error:"
      );

      console.error(
        error.response?.status,
        error.response?.data ||
          error.message
      );

      res.status(500).json({
        success: false,

        error:
          error.response?.data ||
          error.message,
      });
    }
  }
);

// --------------------------------
// Start server
// --------------------------------

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `ARTifact server running on http://localhost:${PORT}`
  );

  console.log(
    `📱 LAN server: http://10.142.40.198:${PORT}`
  );

  console.log(
    `📁 Models stored in: ${modelsDir}`
  );
});

if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(
      `ARTifact server running on http://localhost:${PORT}`
    );

    console.log(
      `📁 Models stored in: ${modelsDir}`
    );
  });
}

module.exports = app;