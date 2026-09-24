const mongoose = require("mongoose");

const generationJobSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // One key per generation attempt; retries use the same key.
    idempotencyKey: {
      type: String,
      required: true,
      trim: true,
    },

    taskId: {
      type: String,
      default: null,
    },

    status: {
      type: String,
      enum: ["reserved", "submitted", "storing", "completed", "failed"],
      default: "reserved",
      required: true,
    },

    creditSource: {
      type: String,
      enum: ["FREE", "PURCHASED", "SUBSCRIPTION"],
      required: true,
    },

        imageUrl: {
      type: String,
      default: null,
    },

    imagePublicId: {
      type: String,
      default: null,
    },

        modelUrl: {
      type: String,
      default: null,
    },

    cloudinaryPublicId: {
      type: String,
      default: null,
    },

    modelBytes: {
      type: Number,
      default: null,
    },
        storageStartedAt: {
      type: Date,
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    failureReason: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

generationJobSchema.index(
  { userId: 1, idempotencyKey: 1 },
  { unique: true }
);

generationJobSchema.index(
  { taskId: 1 },
  { unique: true, partialFilterExpression: { taskId: { $type: "string" } } }
);

module.exports = mongoose.model("GenerationJob", generationJobSchema);