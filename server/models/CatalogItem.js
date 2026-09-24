const mongoose = require("mongoose");

const catalogItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    // Appwrite Storage file IDs — actual files MongoDB mein nahi hain.
    modelFileId: {
      type: String,
      required: true,
      trim: true,
    },

    thumbnailFileId: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

catalogItemSchema.index({
  status: 1,
  createdAt: -1,
});

module.exports = mongoose.model(
  "CatalogItem",
  catalogItemSchema
);