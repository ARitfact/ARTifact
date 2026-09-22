const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Only hash will be stored.
    refreshTokenHash: {
      type: String,
      required: true,
      select: false,
    },

    tokenFamily: {
      type: String,
      required: true,
      immutable: true,
    },

    rotationCounter: {
      type: Number,
      default: 0,
      min: 0,
    },

    deviceId: {
      type: String,
      required: true,
      trim: true,
    },

    deviceName: {
      type: String,
      default: "Unknown device",
      trim: true,
      maxlength: 100,
    },

    browser: {
      type: String,
      default: "Unknown",
      maxlength: 100,
    },

    operatingSystem: {
      type: String,
      default: "Unknown",
      maxlength: 100,
    },

    userAgent: {
      type: String,
      default: null,
      maxlength: 1000,
      select: false,
    },

    ipAddress: {
      type: String,
      default: null,
      maxlength: 100,
      select: false,
    },

    rememberMe: {
      type: Boolean,
      default: false,
    },

    lastUsedAt: {
      type: Date,
      default: Date.now,
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    revokedAt: {
      type: Date,
      default: null,
    },

    revokeReason: {
      type: String,
      enum: [
        "logout",
        "logout_all",
        "password_changed",
        "password_reset",
        "token_reuse",
        "account_suspended",
        "admin_revoked",
        "expired",
      ],
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: "version",
    optimisticConcurrency: true,

    toJSON: {
      virtuals: true,

      transform(document, returnedObject) {
        delete returnedObject.refreshTokenHash;
        delete returnedObject.userAgent;
        delete returnedObject.ipAddress;
        delete returnedObject.__v;

        return returnedObject;
      },
    },
  }
);

// Automatically remove expired sessions.
sessionSchema.index(
  {
    expiresAt: 1,
  },
  {
    expireAfterSeconds: 0,
  }
);

sessionSchema.index({
  userId: 1,
  revokedAt: 1,
  expiresAt: 1,
});

sessionSchema.index({
  tokenFamily: 1,
});

sessionSchema.index({
  userId: 1,
  deviceId: 1,
  createdAt: -1,
});

sessionSchema.virtual("isExpired").get(function () {
  return this.expiresAt.getTime() <= Date.now();
});

sessionSchema.virtual("isActive").get(function () {
  return (
    this.revokedAt === null &&
    this.expiresAt.getTime() > Date.now()
  );
});

sessionSchema.methods.revoke = async function (
  reason = "logout"
) {
  if (!this.revokedAt) {
    this.revokedAt = new Date();
    this.revokeReason = reason;

    await this.save({
      validateBeforeSave: false,
    });
  }

  return this;
};

sessionSchema.methods.rotateToken = async function (
  newTokenHash,
  newExpiresAt
) {
  this.refreshTokenHash = newTokenHash;
  this.rotationCounter += 1;
  this.lastUsedAt = new Date();

  if (newExpiresAt) {
    this.expiresAt = newExpiresAt;
  }

  await this.save({
    validateBeforeSave: false,
  });

  return this;
};

sessionSchema.statics.findActiveSession =
  function (sessionId) {
    return this.findOne({
      _id: sessionId,
      revokedAt: null,
      expiresAt: {
        $gt: new Date(),
      },
    }).select(
      "+refreshTokenHash +userAgent +ipAddress"
    );
  };

sessionSchema.statics.revokeAllForUser =
  function (
    userId,
    reason = "logout_all",
    exceptSessionId = null
  ) {
    const query = {
      userId,
      revokedAt: null,
    };

    if (exceptSessionId) {
      query._id = {
        $ne: exceptSessionId,
      };
    }

    return this.updateMany(query, {
      $set: {
        revokedAt: new Date(),
        revokeReason: reason,
      },
    });
  };

const Session = mongoose.model(
  "Session",
  sessionSchema
);

module.exports = Session;