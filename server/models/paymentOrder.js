const mongoose = require("mongoose");

const planSnapshotSchema =
  new mongoose.Schema(
    {
      name: {
        type: String,
        required: true,
        trim: true,
      },

      type: {
        type: String,
        enum: [
          "credit_pack",
          "subscription",
        ],
        required: true,
      },

      credits: {
        type: Number,
        default: null,
        min: 1,
      },

      durationDays: {
        type: Number,
        default: null,
        min: 1,
      },

      dailyFairUseLimit: {
        type: Number,
        default: null,
        min: 1,
      },

      monthlyFairUseLimit: {
        type: Number,
        default: null,
        min: 1,
      },
    },
    {
      _id: false,
    }
  );

const paymentOrderSchema =
  new mongoose.Schema(
    {
      userId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",

        required: true,

        index: true,
      },

      planCode: {
        type: String,

        enum: [
          "pack_3",
          "pack_10",
          "unlimited_monthly",
        ],

        required: true,
      },

      planSnapshot: {
        type: planSnapshotSchema,

        required: true,
      },

      /*
       * Always store money in paise.
       * Example: ₹100.50 = 10050.
       */
      amountPaise: {
        type: Number,

        required: true,

        min: 1,

        validate: {
          validator:
            Number.isSafeInteger,

          message:
            "Payment amount must be an integer in paise",
        },
      },

      currency: {
        type: String,

        enum: ["INR"],

        default: "INR",

        required: true,
      },

      /*
       * Supplied by our frontend.
       * Prevents repeated clicks from
       * creating multiple local orders.
       */
      idempotencyKey: {
        type: String,

        required: true,

        trim: true,
      },

      receipt: {
        type: String,

        required: true,

        unique: true,

        trim: true,
      },

      razorpayOrderId: {
        type: String,

        

        unique: true,

        sparse: true,

        trim: true,
      },

      razorpayPaymentId: {
        type: String,

       

        unique: true,

        sparse: true,

        trim: true,
      },

      status: {
        type: String,

        enum: [
          "CREATING",
          "CREATED",
          "PENDING",
          "AUTHORIZED",
          "CAPTURED",
          "FAILED",
          "UNKNOWN",
          "VOIDED",
          "REFUND_PENDING",
          "REFUNDED",
          "CHARGEBACK",
        ],

        default: "CREATING",

        required: true,

        index: true,
      },

      entitlementGrantedAt: {
        type: Date,

        default: null,
      },

      failureCode: {
        type: String,

        default: null,

        maxlength: 100,
      },

      failureDescription: {
        type: String,

        default: null,

        maxlength: 500,
      },

      lastVerifiedAt: {
        type: Date,

        default: null,
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
 * Same user + same idempotency key
 * can create only one payment order.
 */
paymentOrderSchema.index(
  {
    userId: 1,
    idempotencyKey: 1,
  },
  {
    unique: true,
  }
);

/*
 * Used by reconciliation jobs to locate
 * stuck payments efficiently.
 */
paymentOrderSchema.index({
  status: 1,
  updatedAt: 1,
});

const PaymentOrder =
  mongoose.model(
    "PaymentOrder",
    paymentOrderSchema
  );

module.exports = PaymentOrder;