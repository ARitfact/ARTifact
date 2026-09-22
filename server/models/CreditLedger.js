const mongoose = require("mongoose");

const creditLedgerSchema =
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

      referenceType: {
        type: String,

        enum: [
          "FREE_GRANT",
          "PAYMENT",
          "GENERATION",
          "REFUND",
          "ADMIN_CORRECTION",
        ],

        required: true,
      },

      /*
       * Payment order ID, generation job ID,
       * refund ID, etc.
       */
      referenceId: {
        type: String,

        required: true,

        trim: true,
      },

      entryType: {
        type: String,

        enum: [
          "CREDIT",
          "RESERVE",
          "CONSUME",
          "RELEASE",
          "REVERSE",
        ],

        required: true,
      },

      creditSource: {
        type: String,

        enum: [
          "FREE",
          "PURCHASED",
          "SUBSCRIPTION",
        ],

        required: true,
      },

      /*
       * Always positive.
       * Direction is determined by entryType.
       */
      credits: {
        type: Number,

        required: true,

        min: 1,

        validate: {
          validator:
            Number.isSafeInteger,

          message:
            "Credits must be a positive integer",
        },
      },

      metadata: {
        type: mongoose.Schema.Types.Mixed,

        default: {},
      },

      correlationId: {
        type: String,

        required: true,

        trim: true,

        index: true,
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

/*
 * Prevent duplicate ledger entry when
 * an API request or webhook is retried.
 */
creditLedgerSchema.index(
  {
    userId: 1,
    referenceType: 1,
    referenceId: 1,
    entryType: 1,
  },
  {
    unique: true,
  }
);

/*
 * Ledger entries are immutable.
 * Corrections require a new reversing entry.
 */
const preventModification = function () {
  throw new Error(
    "Credit ledger is append-only"
  );
};

creditLedgerSchema.pre(
  "updateOne",
  preventModification
);

creditLedgerSchema.pre(
  "updateMany",
  preventModification
);

creditLedgerSchema.pre(
  "findOneAndUpdate",
  preventModification
);

creditLedgerSchema.pre(
  "deleteOne",
  preventModification
);

creditLedgerSchema.pre(
  "deleteMany",
  preventModification
);

creditLedgerSchema.pre(
  "findOneAndDelete",
  preventModification
);

const CreditLedger =
  mongoose.model(
    "CreditLedger",
    creditLedgerSchema
  );

module.exports = CreditLedger;