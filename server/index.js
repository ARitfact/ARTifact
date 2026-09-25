
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const axios = require("axios");
const multer = require("multer");
const FormData = require("form-data");

const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const authenticate = require("./middleware/authenticate");
const adminRoutes = require("./routes/adminRoutes");
const profileRoutes = require("./routes/profileRoutes");
const connectDatabase =
  require("./config/database");

const {
  storeGeneratedModel,
} = require("./services/generatedModelStorage");
  const {
  signModelUrl,
  verifyModelUrl,
} = require("./services/modelAccessService");
const {
  storeUploadedImage,
} = require("./services/uploadedImageStorage");
  const correlationId =
  require("./middleware/correlationId");
const requireIdempotencyKey = require("./middleware/requireIdempotencyKey");
const {
  reserveGeneration,
  markGenerationSubmitted,
  releaseGeneration,
  refundFailedGeneration,
} = require("./services/generationCreditService");
  const paymentRoutes =
  require("./routes/paymentRoutes");
const GenerationJob = require("./models/GenerationJob");
const arCaptureRoutes = require("./routes/arCaptureRoutes");
const authRoutes =
  require("./routes/authRoutes");
  const catalogRoutes = require("./routes/catalogRoutes");

const {
  getAllowedOrigins,
  preventAuthCaching,
} = require("./middleware/security");
const app = express();
const PORT = Number(process.env.PORT) || 5000;

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

// ========================================
// CORS CONFIGURATION
// ========================================

const allowedOrigins = (
  process.env.CLIENT_URLS ||
  "http://localhost:5173,http://127.0.0.1:5173"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    // Allow requests without origin:
    // Postman, mobile apps, server-to-server
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(
      new Error("Origin is not allowed by CORS")
    );
  },

  methods: ["GET", "POST", "OPTIONS"],

    allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Idempotency-Key",
    "X-Admin-Token",
    "X-CSRF-Protection",
  ],
  credentials: true,

  maxAge: 86400,
};

// ========================================
// MULTER CONFIGURATION
// ========================================

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: MAX_IMAGE_SIZE,
    files: 1,
  },

  fileFilter(req, file, callback) {
    if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
      return callback(
        new multer.MulterError(
          "LIMIT_UNEXPECTED_FILE",
          "image"
        )
      );
    }

    return callback(null, true);
  },
});

// ========================================
// GLOBAL MIDDLEWARE
// ========================================

app.disable("x-powered-by");

app.use(correlationId);
/*
 * Render/Vercel/reverse proxy ke peeche
 * correct client IP and HTTPS detection.
 */
if (
  process.env.RENDER === "true" ||
  process.env.NODE_ENV === "production"
) {
  app.set("trust proxy", 1);
}
/*
 * Secure HTTP response headers.
 */
app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
    crossOriginOpenerPolicy: {
  policy: "same-origin-allow-popups",
},

    contentSecurityPolicy:
      process.env.NODE_ENV ===
      "production",
  })
);

app.use(cors(corsOptions));

app.use(
  express.json({
    limit: "1mb",
    strict: true,
  })
);

app.use(
  express.urlencoded({
    extended: false,
    limit: "100kb",
  })
);

app.use(cookieParser());

// ========================================
// HOME ROUTE
// ========================================

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "ARTifact backend is running",
  });
});

// ========================================
// DATABASE MIDDLEWARE
// ========================================

app.use("/api", async (req, res, next) => {
  try {
    await connectDatabase();

    next();
  } catch (error) {
    console.error(
      "Database connection failed:",
      error.message
    );

    res.status(503).json({
      success: false,
      message:
        "Database service is temporarily unavailable",
    });
  }
});



app.use(
  "/api/v1/auth",
  preventAuthCaching,
  authRoutes
);

app.use(
  "/api/v1/payments",
  paymentRoutes
);

app.use("/api/v1/catalog", catalogRoutes);
app.use("/api/v1/profile", profileRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/ar-captures", arCaptureRoutes);
// ========================================
// HEALTH CHECK
// ========================================

app.get("/api/health", (req, res) => {
  const databaseConnected =
    mongoose.connection.readyState === 1;

  res.status(200).json({
    success: true,
    message: "ARTifact backend is healthy",

    database: databaseConnected
      ? "connected"
      : "disconnected",

    timestamp: new Date().toISOString(),
  });
});

// ========================================
// GENERATE 3D MODEL
// ========================================

app.post(
  "/api/generate-3d",
  authenticate,
  requireIdempotencyKey,
  upload.single("image"),

  async (req, res) => {
    let job;
    let taskCreationAttempted = false;
    let taskId = null;

    try {
      if (!process.env.TRIPO_API_KEY) {
        return res.status(503).json({
          success: false,
          message: "3D generation service is not configured",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Please upload an image",
        });
      }

      const reservation = await reserveGeneration({
        userId: req.user._id,
        idempotencyKey: req.idempotencyKey,
        correlationId: req.correlationId,
      });

      job = reservation.job;

      if (reservation.alreadyExists) {
        if (job.taskId) {
          return res.status(202).json({
            success: true,
            taskId: job.taskId,
            message: "Generation already started",
          });
        }

        return res.status(409).json({
          success: false,
          code: "GENERATION_ALREADY_PROCESSING",
          message: "This generation request is already processing.",
        });
      }
            const storedImage = await storeUploadedImage({
        buffer: req.file.buffer,
        jobId: job.id,
      });

      await GenerationJob.updateOne(
        { _id: job._id, status: "reserved" },
        {
          $set: {
            imageUrl: storedImage.imageUrl,
            imagePublicId: storedImage.imagePublicId,
          },
        }
      );

      const fileTypeByMime = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
      };

      const fileType = fileTypeByMime[req.file.mimetype];

      // ==================================
      // UPLOAD IMAGE TO TRIPO
      // ==================================

      const uploadForm = new FormData();

      uploadForm.append(
        "file",
        req.file.buffer,
        {
          filename:
            req.file.originalname ||
            `upload.${fileType}`,

          contentType: req.file.mimetype,

          knownLength: req.file.size,
        }
      );

      const tripoUploadResponse =
        await axios.post(
          "https://api.tripo3d.ai/v2/openapi/upload/sts",

          uploadForm,

          {
            headers: {
              Authorization:
                `Bearer ${process.env.TRIPO_API_KEY}`,

              ...uploadForm.getHeaders(),
            },

            timeout: 60000,

            maxContentLength:
              MAX_IMAGE_SIZE,

            maxBodyLength:
              MAX_IMAGE_SIZE,
          }
        );

      const imageToken =
        tripoUploadResponse.data
          ?.data
          ?.image_token;

      if (!imageToken) {
        throw new Error(
          "Tripo did not return an image token"
        );
      }

      // ==================================
      // CREATE TRIPO GENERATION TASK
      // ==================================

      const taskPayload = {
        type: "image_to_model",

        model_version:
          process.env.TRIPO_MODEL_VERSION ||
          "P1-20260311",

        file: {
          type: fileType,
          file_token: imageToken,
        },

        texture: true,

        pbr: true,

        enable_image_autofix: true,
      };

          taskCreationAttempted = true;

      const tripoTaskResponse = await axios.post(
        "https://api.tripo3d.ai/v2/openapi/task",
        taskPayload,
        {
          headers: {
            Authorization: `Bearer ${process.env.TRIPO_API_KEY}`,
            "Content-Type": "application/json",
          },
          timeout: 30000,
        }
      );

      taskId = tripoTaskResponse.data?.data?.task_id;

      if (!taskId) {
        throw new Error("Tripo did not return a task ID");
      }

      await markGenerationSubmitted({
        jobId: job._id,
        taskId,
        correlationId: req.correlationId,
      });

      return res.status(202).json({
        success: true,
        message: "3D generation started",
        taskId,
      });
    } catch (error) {
      console.error(
        "3D generation error:",
        error.response?.data || error.message
      );

     const tripoRejected =
  error.response &&
  error.response.status >= 400 &&
  error.response.status < 500;

if (job && (!taskCreationAttempted || (tripoRejected && !taskId))) {
        try {
          await releaseGeneration({
            jobId: job._id,
            reason: "Tripo upload failed",
            correlationId: req.correlationId,
          });
        } catch (releaseError) {
          console.error(
            "Credit release failed:",
            releaseError.message
          );
        }
      }

      if (error.statusCode === 402) {
        return res.status(402).json({
          success: false,
          code: error.code,
          message: error.message,
        });
      }

      if (error.response?.data?.code === 2010) {
  return res.status(503).json({
    success: false,
    code: "TRIPO_API_CREDITS_EMPTY",
    message: "3D generation is temporarily unavailable.",
  });
}
      return res.status(502).json({
        success: false,
        code: taskCreationAttempted
          ? "GENERATION_OUTCOME_UNKNOWN"
          : "GENERATION_START_FAILED",
        message: taskCreationAttempted
          ? "Could not confirm generation. Credit is reserved; contact support before retrying."
          : "Unable to start 3D generation",
      });
    }
  }
);

// ========================================
// CHECK GENERATION STATUS
// ========================================

app.get(
  "/api/task/:taskId",
  authenticate,

  async (req, res) => {
    try {
      if (!process.env.TRIPO_API_KEY) {
        return res.status(503).json({
          success: false,
          message:
            "3D generation service is not configured",
        });
      }

      const { taskId } = req.params;

      const validTaskId =
        /^[A-Za-z0-9_-]+$/.test(taskId);

      if (!validTaskId) {
        return res.status(400).json({
          success: false,
          message: "Invalid task ID",
        });
      }
          const job = await GenerationJob.findOne({
  taskId,
  userId: req.user._id,
});

if (!job) {
  return res.status(404).json({
    success: false,
    message: "Generation task not found",
  });
}
      
      
      const tripoResponse =
        await axios.get(
          `https://api.tripo3d.ai/v2/openapi/task/${encodeURIComponent(
            taskId
          )}`,

          {
            headers: {
              Authorization:
                `Bearer ${process.env.TRIPO_API_KEY}`,
            },

            timeout: 30000,
          }
        );

      const task =
        tripoResponse.data?.data;

      if (!task) {
        return res.status(502).json({
          success: false,
          message:
            "Task information was not returned",
        });
      }
            if (
        task.status === "failed" ||
        task.status === "cancelled"
      ) {
        await refundFailedGeneration({
          taskId,
          reason: `Tripo task ${task.status}`,
          correlationId: req.correlationId,
        });
      }

           let modelUrl = job.modelUrl || null;

      if (task.status === "success" && !modelUrl) {
        const sourceUrl = task.result?.pbr_model?.url;

        if (!sourceUrl) {
          return res.status(502).json({
            success: false,
            message: "Tripo finished but did not provide a GLB",
          });
        }

       const claimed = await GenerationJob.findOneAndUpdate(
  {
    _id: job._id,
    modelUrl: null,
    $or: [
      { status: "submitted" },
      {
        status: "storing",
        storageStartedAt: {
          $lt: new Date(Date.now() - 3 * 60 * 1000),
        },
      },
    ],
  },
  {
    $set: {
      status: "storing",
      storageStartedAt: new Date(),
    },
  },
  { new: true }
);
        if (claimed) {
          try {
            const stored = await storeGeneratedModel({
              sourceUrl,
              jobId: job.id,
            });

            const completed = await GenerationJob.findByIdAndUpdate(
              job._id,
              {
                $set: {
                  status: "completed",
                  modelUrl: stored.modelUrl,
                  cloudinaryPublicId: stored.cloudinaryPublicId,
                  modelBytes: stored.bytes,
                  completedAt: new Date(),
                },
              },
              { new: true }
            );

            modelUrl = completed.modelUrl;
          } catch (storageError) {
            await GenerationJob.updateOne(
              { _id: job._id, status: "storing" },
              { $set: { status: "submitted" } }
            );

            console.error(
              "Generated model storage failed:",
              storageError.message
            );

            return res.status(503).json({
              success: false,
              code: "MODEL_STORAGE_PENDING",
              message:
                "Model is ready but storage is temporarily unavailable. Retry shortly.",
            });
          }
        } else {
          // Another poll request is uploading it.
          const latest = await GenerationJob.findById(job._id);
          modelUrl = latest?.modelUrl || null;
        }
      }

      return res.status(200).json({
        success: true,
        task,
        modelUrl,
      });
    } catch (error) {
      const providerStatus =
        error.response?.status;

      console.error(
        "Task status error:",

        error.response?.data ||
          error.message
      );

      return res
        .status(
          providerStatus === 404
            ? 404
            : 502
        )
        .json({
          success: false,

          message:
            providerStatus === 404
              ? "Generation task was not found"
              : "Unable to check generation status",
        });
    }
  }
);

app.get(
  "/api/v1/generations/:generationId",
  authenticate,
  async (req, res, next) => {
    try {
      if (!mongoose.isValidObjectId(req.params.generationId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid model ID",
        });
      }

      const job = await GenerationJob.findOne({
        _id: req.params.generationId,
        userId: req.user._id,
        status: "completed",
        modelUrl: { $ne: null },
      })
        .select(
          "_id taskId imageUrl modelUrl modelBytes createdAt completedAt"
        )
        .lean();

      if (!job) {
        return res.status(404).json({
          success: false,
          message: "Saved model not found",
        });
      }

      return res.json({
        success: true,
        data: {
          id: String(job._id),
          taskId: job.taskId,
          name: "Furniture model",
          category: "Your creation",
          imageUrl: job.imageUrl,
          modelUrl: job.modelUrl,
          modelBytes: job.modelBytes,
          createdAt: job.createdAt,
          completedAt: job.completedAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);
app.get(
  "/api/v1/generations",
  authenticate,

  async (req, res, next) => {
    try {
      const page = Math.max(
        1,
        Math.min(1000, Number.parseInt(req.query.page, 10) || 1)
      );

      const limit = 20;

      const filter = {
        userId: req.user._id,
        status: "completed",
        modelUrl: { $ne: null },
      };

      const [jobs, total] = await Promise.all([
        GenerationJob.find(filter)
          .select(
  "_id taskId imageUrl modelUrl modelBytes createdAt completedAt"
)
          .sort({ completedAt: -1, _id: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),

        GenerationJob.countDocuments(filter),
      ]);

      return res.status(200).json({
        success: true,
        data: jobs.map((job) => ({
          id: job._id,
          taskId: job.taskId,
          imageUrl: job.imageUrl,
          modelUrl: job.modelUrl,
          modelBytes: job.modelBytes,
          createdAt: job.createdAt,
          completedAt: job.completedAt,
        })),
        pagination: {
          page,
          limit,
          total,
          hasMore: page * limit < total,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);
// ========================================
// STREAM GENERATED GLB MODEL
// ========================================

app.get(
  "/api/model/:taskId",

  async (req, res) => {
    try {
      if (!process.env.TRIPO_API_KEY) {
        return res.status(503).json({
          success: false,
          message:
            "3D generation service is not configured",
        });
      }

      const { taskId } = req.params;

      const validTaskId =
        /^[A-Za-z0-9_-]+$/.test(taskId);

      if (!validTaskId) {
        return res.status(400).json({
          success: false,
          message: "Invalid task ID",
        });
      }

      // Get task information from Tripo

      const taskResponse =
        await axios.get(
          `https://api.tripo3d.ai/v2/openapi/task/${encodeURIComponent(
            taskId
          )}`,

          {
            headers: {
              Authorization:
                `Bearer ${process.env.TRIPO_API_KEY}`,
            },

            timeout: 30000,
          }
        );

      const providerModelUrl =
        taskResponse.data
          ?.data
          ?.result
          ?.pbr_model
          ?.url;

      if (!providerModelUrl) {
        return res.status(404).json({
          success: false,
          message:
            "The generated model is not available yet",
        });
      }

      // Only accept HTTPS model URLs

      const parsedModelUrl =
        new URL(providerModelUrl);

      if (
        parsedModelUrl.protocol !== "https:"
      ) {
        throw new Error(
          "Tripo returned an invalid model URL"
        );
      }

      // Download and stream GLB

      const modelResponse =
        await axios.get(
          providerModelUrl,

          {
            responseType: "stream",

            timeout: 120000,

            maxContentLength:
              Infinity,

            maxBodyLength:
              Infinity,
          }
        );

      res.setHeader(
        "Content-Type",
        "model/gltf-binary"
      );

      res.setHeader(
        "Content-Disposition",
        `inline; filename="artifact-${taskId}.glb"`
      );

      res.setHeader(
        "Cache-Control",
        "private, max-age=3600"
      );

      const contentLength =
        modelResponse.headers[
          "content-length"
        ];

      if (contentLength) {
        res.setHeader(
          "Content-Length",
          contentLength
        );
      }

      modelResponse.data.on(
        "error",

        (streamError) => {
          console.error(
            "Model stream error:",
            streamError.message
          );

          if (!res.headersSent) {
            res.status(502).json({
              success: false,
              message:
                "Unable to stream the generated model",
            });
          } else {
            res.destroy(streamError);
          }
        }
      );

      req.on("close", () => {
        if (
          !modelResponse.data.destroyed
        ) {
          modelResponse.data.destroy();
        }
      });

      modelResponse.data.pipe(res);
    } catch (error) {
      console.error(
        "Model proxy error:",

        error.response?.data ||
          error.message
      );

      if (!res.headersSent) {
        return res.status(502).json({
          success: false,
          message:
            "Unable to load the generated 3D model",
        });
      }

      return res.end();
    }
  }
);

// ========================================
// 404 HANDLER
// ========================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});




// ========================================
// GLOBAL ERROR HANDLER
// ========================================

app.use(
  (error, req, res, next) => {

     if (error.statusCode) {
    return res
      .status(error.statusCode)
      .json({
        success: false,

        code:
          error.code ||
          "REQUEST_FAILED",

        message:
          error.message,
      });
  }
    // Multer upload errors

    if (
      error instanceof
      multer.MulterError
    ) {
      const message =
        error.code ===
        "LIMIT_FILE_SIZE"
          ? "Image must be smaller than 10 MB"
          : "Please upload one PNG, JPG, JPEG or WebP image";

      return res.status(400).json({
        success: false,
        message,
      });
    }

    // CORS error

    if (
      error.message ===
      "Origin is not allowed by CORS"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Origin is not allowed",
      });
    }

    console.error(
      "Unhandled server error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Internal server error",
    });
  }
);

// ========================================
// START LOCAL SERVER
// ========================================

const startServer = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error(
        "MONGODB_URI is missing"
      );
    }

    await connectDatabase();

    app.listen(
      PORT,
      "0.0.0.0",
      () => {
        console.log(
          `ARTifact server running on http://localhost:${PORT}`
        );
      }
    );
  } catch (error) {
    console.error(
      "Server startup failed:",
      error.message
    );

    process.exit(1);
  }
};

// Vercel will import and execute app.
// Local development starts Express manually.

if (
  process.env.NODE_ENV !==
  "production"
) {
  startServer();
}

module.exports = app;