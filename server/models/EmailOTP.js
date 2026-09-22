const mongoose = require("mongoose");

const emailOTPSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },

    purpose: {
      type: String,
      required: true,
      enum: [
        "email_verification",
        "password_reset",
        "email_change",
      ],
    },

    // Never store plain OTP.
    codeHash: {
      type: String,
      required: true,
      select: false,
    },

    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },

    maxAttempts: {
      type: Number,
      default: 5,
      min: 1,
      max: 10,
    },

    resendCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    nextResendAt: {
      type: Date,
      required: true,
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    consumedAt: {
      type: Date,
      default: null,
    },

    invalidatedAt: {
      type: Date,
      default: null,
    },

    ipAddress: {
      type: String,
      default: null,
      maxlength: 100,
      select: false,
    },

    userAgent: {
      type: String,
      default: null,
      maxlength: 1000,
      select: false,
    },
  },
  {
    timestamps: true,
    versionKey: "version",
    optimisticConcurrency: true,

    toJSON: {
      virtuals: true,

      transform(document, returnedObject) {
        delete returnedObject.codeHash;
        delete returnedObject.ipAddress;
        delete returnedObject.userAgent;
        delete returnedObject.__v;

        return returnedObject;
      },
    },
  }
);

// Automatically delete expired OTP records.
emailOTPSchema.index(
  {
    expiresAt: 1,
  },
  {
    expireAfterSeconds: 0,
  }
);

emailOTPSchema.index({
  email: 1,
  purpose: 1,
  createdAt: -1,
});

emailOTPSchema.index({
  userId: 1,
  purpose: 1,
  createdAt: -1,
});

emailOTPSchema.virtual("isExpired").get(function () {
  return this.expiresAt.getTime() <= Date.now();
});

emailOTPSchema.virtual("isConsumed").get(function () {
  return Boolean(this.consumedAt);
});

emailOTPSchema.virtual("isInvalidated").get(function () {
  return Boolean(this.invalidatedAt);
});

emailOTPSchema.virtual("attemptsRemaining").get(function () {
  return Math.max(
    this.maxAttempts - this.attempts,
    0
  );
});

emailOTPSchema.virtual("canResend").get(function () {
  return (
    this.nextResendAt.getTime() <= Date.now()
  );
});

emailOTPSchema.methods.isUsable = function () {
  return (
    !this.consumedAt &&
    !this.invalidatedAt &&
    this.expiresAt.getTime() > Date.now() &&
    this.attempts < this.maxAttempts
  );
};

emailOTPSchema.methods.recordFailedAttempt =
  async function () {
    this.attempts += 1;

    if (
      this.attempts >= this.maxAttempts
    ) {
      this.invalidatedAt = new Date();
    }

    await this.save({
      validateBeforeSave: false,
    });

    return this;
  };

emailOTPSchema.methods.markConsumed =
  async function () {
    this.consumedAt = new Date();

    await this.save({
      validateBeforeSave: false,
    });

    return this;
  };

emailOTPSchema.methods.invalidate =
  async function () {
    if (
      !this.invalidatedAt &&
      !this.consumedAt
    ) {
      this.invalidatedAt = new Date();

      await this.save({
        validateBeforeSave: false,
      });
    }

    return this;
  };

emailOTPSchema.statics.findActiveOTP =
  function (email, purpose) {
    return this.findOne({
      email: email.trim().toLowerCase(),
      purpose,
      consumedAt: null,
      invalidatedAt: null,
      expiresAt: {
        $gt: new Date(),
      },
    })
      .sort({
        createdAt: -1,
      })
      .select(
        "+codeHash +ipAddress +userAgent"
      );
  };

emailOTPSchema.statics.invalidateExisting =
  function (email, purpose) {
    return this.updateMany(
      {
        email: email
          .trim()
          .toLowerCase(),

        purpose,

        consumedAt: null,
        invalidatedAt: null,
      },

      {
        $set: {
          invalidatedAt: new Date(),
        },
      }
    );
  };

const EmailOTP = mongoose.model(
  "EmailOTP",
  emailOTPSchema
);

module.exports = EmailOTP;