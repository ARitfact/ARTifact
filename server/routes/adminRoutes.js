const express = require("express");
const multer = require("multer");
const argon2 = require("argon2");
const jwt = require("jsonwebtoken");
const { rateLimit } = require("express-rate-limit");
const {
  ID,
  Permission,
  Role,
} = require("node-appwrite");
const { InputFile } = require("node-appwrite/file");

const authenticate = require("../middleware/authenticate");
const {
  storage,
  bucketId,
} = require("../config/appwrite");
const CatalogItem = require("../models/CatalogItem");

const router = express.Router();

router.use(authenticate);

router.use((req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin account required.",
    });
  }

  next();
});

const unlockLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

router.post(
  "/unlock",
  unlockLimiter,
  async (req, res, next) => {
    try {
      const password = req.body?.password;
      const hash = process.env.ADMIN_ACCESS_HASH;

      if (!hash) {
        return res.status(503).json({
          success: false,
          message: "Admin access is not configured.",
        });
      }

      if (
        typeof password !== "string" ||
        password.length > 256 ||
        !(await argon2.verify(hash, password))
      ) {
        return res.status(401).json({
          success: false,
          message: "Invalid admin password.",
        });
      }

      const adminToken = jwt.sign(
        {
          purpose: "admin",
          sessionId: String(req.session._id),
        },
        process.env.JWT_ACCESS_SECRET,
        {
          subject: String(req.user._id),
          expiresIn: "15m",
          issuer: "artifact-api",
          audience: "artifact-admin",
          algorithm: "HS256",
        }
      );

      res.set("Cache-Control", "no-store");

      return res.json({
        success: true,
        data: {
          adminToken,
          expiresIn: 900,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

function requireUnlock(req, res, next) {
  try {
    const token = req.get("x-admin-token");

    if (!token) {
      throw new Error("Missing admin token");
    }

    const payload = jwt.verify(
      token,
      process.env.JWT_ACCESS_SECRET,
      {
        issuer: "artifact-api",
        audience: "artifact-admin",
        algorithms: ["HS256"],
      }
    );

    if (
      payload.purpose !== "admin" ||
      payload.sub !== String(req.user._id) ||
      payload.sessionId !== String(req.session._id)
    ) {
      throw new Error("Invalid admin token");
    }

    next();
  } catch {
    return res.status(403).json({
      success: false,
      message: "Unlock admin access again.",
    });
  }
}

router.get("/check", requireUnlock, (req, res) => {
  res.json({ success: true });
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024,
    files: 2,
  },
});

function validGlb(file) {
  const buffer = file?.buffer;

  return Boolean(
    buffer &&
      buffer.length >= 12 &&
      buffer.toString("ascii", 0, 4) === "glTF" &&
      buffer.readUInt32LE(4) === 2 &&
      buffer.readUInt32LE(8) === buffer.length
  );
}

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
  "/catalog",
  requireUnlock,
  upload.fields([
    { name: "model", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  async (req, res, next) => {
    const storedFileIds = [];

    try {
      const name = String(
        req.body.name || ""
      ).trim();

      const category = String(
        req.body.category || ""
      ).trim();

      const description = String(
        req.body.description || ""
      ).trim();

      const model = req.files?.model?.[0];
      const thumbnail =
        req.files?.thumbnail?.[0];

      if (
        name.length < 2 ||
        name.length > 120 ||
        !category ||
        category.length > 60 ||
        description.length > 1000 ||
        !validGlb(model) ||
        !validImage(thumbnail) ||
        thumbnail.size > 5 * 1024 * 1024
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Provide a name, category, valid GLB (max 25 MB), and PNG/JPEG/WebP thumbnail (max 5 MB).",
        });
      }

      const publicRead = [
        Permission.read(Role.any()),
      ];

      const modelFile =
        await storage.createFile({
          bucketId,
          fileId: ID.unique(),
          file: InputFile.fromBuffer(
            model.buffer,
            "model.glb"
          ),
          permissions: publicRead,
        });

      storedFileIds.push(modelFile.$id);

      const extension =
        thumbnail.mimetype === "image/png"
          ? "png"
          : thumbnail.mimetype ===
              "image/webp"
            ? "webp"
            : "jpg";

      const imageFile =
        await storage.createFile({
          bucketId,
          fileId: ID.unique(),
          file: InputFile.fromBuffer(
            thumbnail.buffer,
            `thumbnail.${extension}`
          ),
          permissions: publicRead,
        });

      storedFileIds.push(imageFile.$id);

      const item =
        await CatalogItem.create({
          name,
          category,
          description,
          modelFileId: modelFile.$id,
          thumbnailFileId:
            imageFile.$id,
          status: "published",
          createdBy: req.user._id,
        });

      return res.status(201).json({
        success: true,
        data: {
          id: item._id,
          name: item.name,
        },
      });
    } catch (error) {
      await Promise.allSettled(
        storedFileIds.map((fileId) =>
          storage.deleteFile({
            bucketId,
            fileId,
          })
        )
      );

      next(error);
    }
  }
);

module.exports = router;