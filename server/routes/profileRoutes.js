const express = require("express");
const multer = require("multer");
const { randomUUID } = require("crypto");

const authenticate =
  require("../middleware/authenticate");

const {
  storeUploadedImage,
} = require("../services/uploadedImageStorage");

const router = express.Router();
router.use(authenticate);

router.patch("/", async (req, res, next) => {
  try {
    const { name } = req.body;

    if (
      typeof name !== "string" ||
      name.trim().length < 2 ||
      name.trim().length > 60
    ) {
      return res.status(400).json({
        success: false,
        message: "Name must be 2–60 characters.",
      });
    }

    req.user.name = name.trim();
    await req.user.save();

    return res.json({
      success: true,
      data: {
        user: {
          id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          profileImage:
            req.user.profileImage,
          role: req.user.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
});

function validImage(file) {
  const buffer = file?.buffer;
  if (!buffer) return false;

  const png =
    file.mimetype === "image/png" &&
    buffer.length >= 8 &&
    buffer
      .subarray(0, 8)
      .equals(
        Buffer.from([
          137, 80, 78, 71, 13, 10, 26, 10,
        ])
      );

  const jpg =
    file.mimetype === "image/jpeg" &&
    buffer.length >= 3 &&
    buffer[0] === 255 &&
    buffer[1] === 216 &&
    buffer[2] === 255;

  const webp =
    file.mimetype === "image/webp" &&
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) ===
      "RIFF" &&
    buffer.toString("ascii", 8, 12) ===
      "WEBP";

  return png || jpg || webp;
}

router.post(
  "/photo",
  upload.single("photo"),
  async (req, res, next) => {
    try {
      if (!validImage(req.file)) {
        return res.status(400).json({
          success: false,
          message:
            "Choose a PNG, JPEG, or WebP image (max 5 MB).",
        });
      }

      const stored =
        await storeUploadedImage({
          buffer: req.file.buffer,
          jobId:
            `avatars/${req.user._id}/` +
            randomUUID(),
        });

      req.user.profileImage =
        stored.imageUrl;

      await req.user.save();

      return res.json({
        success: true,
        data: {
          profileImage:
            req.user.profileImage,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;