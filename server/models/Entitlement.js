const mongoose = require("mongoose");

const subscriptionSchema =
  new mongoose.Schema(
    {
      active: {
        type: Boolean,
        default: false,
      },

      planCode: {
        type: String,

        enum: [
          "unlimited_monthly",
          null,
        ],

        default: null,
      },

      startsAt: {
        type: Date,
        default: null,
      },

      endsAt: {
        type: Date,
        default: null,
      },

      dailyFairUseLimit: {
        type: Number,
        default: 0,
        min: 0,
      },

      monthlyFairUseLimit: {
        type: Number,
        default: 0,
        min: 0,
      },

      dailyUsed: {
        type: Number,
        default: 0,
        min: 0,
      },

      monthlyUsed: {
        type: Number,
        default: 0,
        min: 0,
      },

      /*
       * Format: YYYY-MM-DD
       * Used to reset daily usage.
       */
      dailyWindow: {
        type: String,
        default: null,
      },

      monthlyWindowStartedAt: {
        type: Date,
        default: null,
      },
    },
    {
      _id: false,
    }
  );

const entitlementSchema =
  new mongoose.Schema(
    {
      userId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",

        required: true,

        unique: true,

        index: true,
      },

      /*
       * Every user receives exactly
       * one free generation.
       */
      freeCredits: {
        type: Number,

        default: 1,

        min: 0,

        validate: {
          validator:
            Number.isSafeInteger,

          message:
            "Free credits must be an integer",
        },
      },

      purchasedCredits: {
        type: Number,

        default: 0,

        min: 0,

        validate: {
          validator:
            Number.isSafeInteger,

          message:
            "Purchased credits must be an integer",
        },
      },

      /*
       * Credits temporarily locked while
       * a generation request is processing.
       */
      reservedCredits: {
        type: Number,

        default: 0,

        min: 0,

        validate: {
          validator:
            Number.isSafeInteger,

          message:
            "Reserved credits must be an integer",
        },
      },

      subscription: {
        type: subscriptionSchema,

        default: () => ({}),
      },
    },
    {
      timestamps: true,

      versionKey: "version",

      optimisticConcurrency: true,
    }
  );

/*
 * Prevent logically invalid balances.
 */
entitlementSchema.pre(
  "validate",

  function () {
    if (
      this.freeCredits < 0 ||
      this.purchasedCredits < 0 ||
      this.reservedCredits < 0
    ) {
      this.invalidate(
        "credits",
        "Credit balances cannot be negative"
      );
    }

    const subscription =
      this.subscription;

    if (
      subscription.active &&
      (
        !subscription.startsAt ||
        !subscription.endsAt ||
        !subscription.planCode
      )
    ) {
      this.invalidate(
        "subscription",
        "Active subscription requires plan and validity dates"
      );
    }

    if (
      subscription.dailyUsed >
      subscription.dailyFairUseLimit
    ) {
      this.invalidate(
        "subscription.dailyUsed",
        "Daily fair-use limit exceeded"
      );
    }

    if (
      subscription.monthlyUsed >
      subscription.monthlyFairUseLimit
    ) {
      this.invalidate(
        "subscription.monthlyUsed",
        "Monthly fair-use limit exceeded"
      );
    }
  }
);

const Entitlement =
  mongoose.model(
    "Entitlement",
    entitlementSchema
  );

module.exports = Entitlement;