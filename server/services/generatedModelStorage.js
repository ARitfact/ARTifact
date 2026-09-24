const axios = require("axios");
const { Transform } = require("stream");
const { pipeline } = require("stream/promises");

const cloudinary = require("../config/cloudinary");

const MAX_MODEL_BYTES = 95 * 1024 * 1024;

async function storeGeneratedModel({ sourceUrl, jobId }) {
  const url = new URL(sourceUrl);

  if (url.protocol !== "https:") {
    throw new Error("Model source must use HTTPS");
  }

  const response = await axios.get(sourceUrl, {
    responseType: "stream",
    timeout: 60000,
    maxRedirects: 0,
  });

  let totalBytes = 0;

  const sizeLimit = new Transform({
    transform(chunk, encoding, callback) {
      totalBytes += chunk.length;

      if (totalBytes > MAX_MODEL_BYTES) {
        callback(new Error("Generated GLB exceeds 95 MB"));
        return;
      }

      callback(null, chunk);
    },
  });

  let resolveUpload;
  let rejectUpload;

  const uploadResult = new Promise((resolve, reject) => {
    resolveUpload = resolve;
    rejectUpload = reject;
  });

  const cloudinaryStream = cloudinary.uploader.upload_stream(
    {
      resource_type: "image",
      public_id: `artifact/generated/${jobId}`,
      overwrite: true,
    },
    (error, result) => {
      if (error) rejectUpload(error);
      else resolveUpload(result);
    }
  );

  const [_, uploaded] = await Promise.all([
    pipeline(response.data, sizeLimit, cloudinaryStream),
    uploadResult,
  ]);

  if (!uploaded?.secure_url || !uploaded?.public_id) {
    throw new Error("Cloudinary did not return a model URL");
  }

  return {
    modelUrl: uploaded.secure_url,
    cloudinaryPublicId: uploaded.public_id,
    bytes: uploaded.bytes,
  };
}

module.exports = { storeGeneratedModel };