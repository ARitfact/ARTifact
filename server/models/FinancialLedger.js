const mongoose = require("mongoose");

const financialLedgerSchema =
  new mongoose.Schema(
    {
      /*
       * Razorpay payment/refund ID or
       * unique internal transaction ID.
       */
      transactionId: {
        type: String,

        required: true,

        trim: true,
      },

      paymentOrderId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "PaymentOrder",

        required: true,

        index: true,
      },

      userId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",

        required: true,

        index: true,
      },

      entryType: {
        type: String,

        enum: [
          "PAYMENT_CAPTURE",
          "REFUND",
          "CHARGEBACK",
          "CORRECTION",
        ],

        required: true,
      },

      /*
       * Example payment capture:
       *
       * Debit  = razorpay_receivable
       * Credit = generation_revenue
       */
      debitAccount: {
        type: String,

        enum: [
          "razorpay_receivable",
          "generation_revenue",
          "customer_refund_payable",
          "chargeback_expense",
          "correction_account",
        ],

        required: true,
      },

      creditAccount: {
        type: String,

        enum: [
          "razorpay_receivable",
          "generation_revenue",
          "customer_refund_payable",
          "chargeback_expense",
          "correction_account",
        ],

        required: true,
      },

      /*
       * Money is always stored in paise.
       */
      amountPaise: {
        type: Number,

        required: true,

        min: 1,

        validate: {
          validator:
            Number.isSafeInteger,

          message:
            "Ledger amount must be an integer in paise",
        },
      },

      currency: {
        type: String,

        enum: ["INR"],

        default: "INR",

        required: true,
      },

      description: {
        type: String,

        required: true,

        trim: true,

        maxlength: 300,
      },

      correlationId: {
        type: String,

        required: true,

        trim: true,

        index: true,
      },

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

/*
 * One financial event can be recorded
 * only once, even after retries.
 */
financialLedgerSchema.index(
  {
    transactionId: 1,
    entryType: 1,
  },
  {
    unique: true,
  }
);

/*
 * Debit and credit accounts must differ.
 */
financialLedgerSchema.pre(
  "validate",

  function () {
    if (
      this.debitAccount ===
      this.creditAccount
    ) {
      this.invalidate(
        "creditAccount",
        "Debit and credit accounts must be different"
      );
    }
  }
);

/*
 * Financial entries are immutable.
 */
const preventModification = function () {
  throw new Error(
    "Financial ledger is append-only"
  );
};

financialLedgerSchema.pre(
  "updateOne",
  preventModification
);

financialLedgerSchema.pre(
  "updateMany",
  preventModification
);

financialLedgerSchema.pre(
  "findOneAndUpdate",
  preventModification
);

financialLedgerSchema.pre(
  "deleteOne",
  preventModification
);

financialLedgerSchema.pre(
  "deleteMany",
  preventModification
);

financialLedgerSchema.pre(
  "findOneAndDelete",
  preventModification
);

const FinancialLedger =
  mongoose.model(
    "FinancialLedger",
    financialLedgerSchema
  );

module.exports = FinancialLedger;