const { v2: cloudinary } = require("cloudinary");

const cloudinaryUrl = process.env.CLOUDINARY_URL;

if (!cloudinaryUrl) {
  throw new Error("CLOUDINARY_URL is missing");
}

const parsed = new URL(cloudinaryUrl);

if (
  parsed.protocol !== "cloudinary:" ||
  !parsed.username ||
  !parsed.password ||
  !parsed.hostname
) {
  throw new Error(
    "CLOUDINARY_URL must be cloudinary://API_KEY:API_SECRET@CLOUD_NAME"
  );
}

cloudinary.config({
  cloud_name: parsed.hostname,
  api_key: decodeURIComponent(parsed.username),
  api_secret: decodeURIComponent(parsed.password),
  secure: true,
});

module.exports = cloudinary;