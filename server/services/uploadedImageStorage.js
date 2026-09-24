const { Readable } = require("stream");
const { pipeline } = require("stream/promises");

const cloudinary = require("../config/cloudinary");

async function storeUploadedImage({ buffer, jobId }) {
  let resolveUpload;
  let rejectUpload;

  const uploadResult = new Promise((resolve, reject) => {
    resolveUpload = resolve;
    rejectUpload = reject;
  });

  const uploadStream = cloudinary.uploader.upload_stream(
    {
      resource_type: "image",
      public_id: `artifact/uploads/${jobId}`,
      overwrite: true,
    },
    (error, result) => {
      if (error) rejectUpload(error);
      else resolveUpload(result);
    }
  );

  const [_, uploaded] = await Promise.all([
    pipeline(Readable.from(buffer), uploadStream),
    uploadResult,
  ]);

  if (!uploaded?.secure_url || !uploaded?.public_id) {
    throw new Error("Could not store uploaded image");
  }

  return {
    imageUrl: uploaded.secure_url,
    imagePublicId: uploaded.public_id,
  };
}

module.exports = { storeUploadedImage };