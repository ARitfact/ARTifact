const mongoose = require("mongoose");

const arCaptureSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    generationJobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GenerationJob",
      required: true,
    },
    imageUrl: { type: String, required: true },
    imagePublicId: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ARCapture", arCaptureSchema);