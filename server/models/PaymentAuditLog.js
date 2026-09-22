const mongoose = require("mongoose");

const paymentAuditLogSchema =
  new mongoose.Schema(
    {
      paymentOrderId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "PaymentOrder",

        default: null,

        index: true,
      },

      userId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",

        default: null,

        index: true,
      },

      action: {
        type: String,

        required: true,

        trim: true,

        maxlength: 100,
      },

      fromStatus: {
        type: String,

        default: null,

        maxlength: 50,
      },

      toStatus: {
        type: String,

        default: null,

        maxlength: 50,
      },

      actor: {
        type: String,

        enum: [
          "USER",
          "SYSTEM",
          "RAZORPAY_WEBHOOK",
          "RECONCILIATION_JOB",
          "ADMIN",
        ],

        required: true,
      },

      reason: {
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

      ipAddress: {
        type: String,

        default: null,

        maxlength: 100,
      },

      userAgent: {
        type: String,

        default: null,

        maxlength: 500,
      },

      /*
       * Never store card numbers, CVV,
       * OTP or payment secrets here.
       */
      metadata: {
        type: mongoose.Schema.Types.Mixed,

        default: {},
      },
    },
    {
      timestamps: {
        createdAt: true,

        updatedAt: false,
      },

      versionKey: false,
    }
  );

paymentAuditLogSchema.index({
  paymentOrderId: 1,
  createdAt: -1,
});

paymentAuditLogSchema.index({
  userId: 1,
  createdAt: -1,
});

/*
 * Audit logs cannot be edited or deleted.
 * A correction creates another log entry.
 */
const preventModification = function () {
  throw new Error(
    "Payment audit log is append-only"
  );
};

paymentAuditLogSchema.pre(
  "updateOne",
  preventModification
);

paymentAuditLogSchema.pre(
  "updateMany",
  preventModification
);

paymentAuditLogSchema.pre(
  "findOneAndUpdate",
  preventModification
);

paymentAuditLogSchema.pre(
  "deleteOne",
  preventModification
);

paymentAuditLogSchema.pre(
  "deleteMany",
  preventModification
);

paymentAuditLogSchema.pre(
  "findOneAndDelete",
  preventModification
);

const PaymentAuditLog =
  mongoose.model(
    "PaymentAuditLog",
    paymentAuditLogSchema
  );

module.exports = PaymentAuditLog;