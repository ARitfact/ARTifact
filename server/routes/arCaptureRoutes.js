const express = require("express");
const multer = require("multer");
const mongoose = require("mongoose");
const { Readable } = require("stream");
const { pipeline } = require("stream/promises");

const authenticate = require("../middleware/authenticate");
const cloudinary = require("../config/cloudinary");
const GenerationJob = require("../models/GenerationJob");
const ARCapture = require("../models/ARCapture");

const router = express.Router();

router.use(authenticate);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024,
    files: 1,
  },
});

function validImage(file) {
  if (!file) return false;

  const b = file.buffer;

  const png =
    b.length >= 8 &&
    b.subarray(0, 8).equals(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
    );

  const jpg =
    b.length >= 3 &&
    b[0] === 255 &&
    b[1] === 216 &&
    b[2] === 255;

  const webp =
    b.length >= 12 &&
    b.toString("ascii", 0, 4) === "RIFF" &&
    b.toString("ascii", 8, 12) === "WEBP";

  return (
    (file.mimetype === "image/png" && png) ||
    (file.mimetype === "image/jpeg" && jpg) ||
    (file.mimetype === "image/webp" && webp)
  );
}

async function storeImage(buffer, publicId) {
  let resolveUpload;
  let rejectUpload;

  const uploaded = new Promise((resolve, reject) => {
    resolveUpload = resolve;
    rejectUpload = reject;
  });

  const stream = cloudinary.uploader.upload_stream(
    {
      resource_type: "image",
      public_id: publicId,
      overwrite: false,
    },
    (error, result) => {
      if (error) rejectUpload(error);
      else resolveUpload(result);
    }
  );

  const [, result] = await Promise.all([
    pipeline(Readable.from(buffer), stream),
    uploaded,
  ]);

  if (!result?.secure_url || !result?.public_id) {
    throw new Error("Image upload failed");
  }

  return result;
}

router.post(
  "/",
  upload.single("image"),
  async (req, res, next) => {
    try {
      const { taskId } = req.body;

      if (
        typeof taskId !== "string" ||
        taskId.length < 1 ||
        taskId.length > 128 ||
        !validImage(req.file)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "A valid task ID and PNG, JPEG, or WebP screenshot are required.",
        });
      }

      const job = await GenerationJob.findOne({
        taskId,
        userId: req.user._id,
        status: "completed",
      })
        .select("_id")
        .lean();

      if (!job) {
        return res.status(404).json({
          success: false,
          message: "Completed model not found.",
        });
      }

      const count = await ARCapture.countDocuments({
        userId: req.user._id,
        generationJobId: job._id,
      });

      if (count >= 20) {
        return res.status(409).json({
          success: false,
          message: "Maximum 20 AR photos per model.",
        });
      }

      const publicId =
        `artifact/ar/${req.user._id}/` +
        new mongoose.Types.ObjectId();

      const image = await storeImage(
        req.file.buffer,
        publicId
      );

      try {
        const saved = await ARCapture.create({
          userId: req.user._id,
          generationJobId: job._id,
          imageUrl: image.secure_url,
          imagePublicId: image.public_id,
        });

        return res.status(201).json({
          success: true,
          data: {
            id: saved._id,
            imageUrl: saved.imageUrl,
            createdAt: saved.createdAt,
            label: "Saved AR",
          },
        });
      } catch (error) {
        await cloudinary.uploader
          .destroy(image.public_id, {
            resource_type: "image",
          })
          .catch(() => {});

        throw error;
      }
    } catch (error) {
      next(error);
    }
  }
);

router.get("/", async (req, res, next) => {
  try {
    const page = Math.max(
      1,
      Math.min(1000, parseInt(req.query.page, 10) || 1)
    );

    const limit = 20;

    const [items, total] = await Promise.all([
      ARCapture.find({ userId: req.user._id })
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select("generationJobId imageUrl createdAt")
        .lean(),

      ARCapture.countDocuments({
        userId: req.user._id,
      }),
    ]);

    return res.json({
      success: true,
      data: items.map((item) => ({
        id: item._id,
        generationId: item.generationJobId,
        imageUrl: item.imageUrl,
        createdAt: item.createdAt,
        label: "Saved AR",
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
});

module.exports = router;