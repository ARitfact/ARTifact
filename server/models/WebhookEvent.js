const mongoose = require("mongoose");

const webhookEventSchema =
  new mongoose.Schema(
    {
      provider: {
        type: String,

        enum: ["razorpay"],

        default: "razorpay",

        required: true,
      },

      /*
       * Razorpay sends this in:
       * x-razorpay-event-id
       */
      eventId: {
        type: String,

        required: true,

        unique: true,

        trim: true,
      },

      eventType: {
        type: String,

        required: true,

        trim: true,

        index: true,
      },

      /*
       * SHA-256 hash of raw webhook body.
       * Full payload is not stored here.
       */
      payloadHash: {
        type: String,

        required: true,

        match: /^[a-f0-9]{64}$/i,
      },

      status: {
        type: String,

        enum: [
          "RECEIVED",
          "PROCESSING",
          "PROCESSED",
          "IGNORED",
          "FAILED",
        ],

        default: "RECEIVED",

        required: true,

        index: true,
      },

      paymentOrderId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "PaymentOrder",

        default: null,

        index: true,
      },

      processingAttempts: {
        type: Number,

        default: 0,

        min: 0,
      },

      providerCreatedAt: {
        type: Date,

        default: null,
      },

      processedAt: {
        type: Date,

        default: null,
      },

      lastError: {
        type: String,

        default: null,

        maxlength: 500,
      },

      correlationId: {
        type: String,

        required: true,

        trim: true,

        index: true,
      },
    },
    {
      timestamps: true,

      versionKey: "version",

      optimisticConcurrency: true,
    }
  );

/*
 * Helps find failed or stuck webhook
 * events for safe retry.
 */
webhookEventSchema.index({
  status: 1,
  updatedAt: 1,
});

const WebhookEvent =
  mongoose.model(
    "WebhookEvent",
    webhookEventSchema
  );

module.exports = WebhookEvent;