const mongoose = require("mongoose");

const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/;

const userSchema = new mongoose.Schema(
  {
    // =====================================
    // BASIC INFORMATION
    // =====================================

    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must contain at least 2 characters"],
      maxlength: [60, "Name cannot exceed 60 characters"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: [254, "Email is too long"],
      match: [EMAIL_REGEX, "Please enter a valid email address"],
    },

    profileImage: {
      type: String,
      default: null,
      trim: true,
    },

    // =====================================
    // AUTHENTICATION
    // =====================================

    passwordHash: {
      type: String,
      default: null,
      select: false,
    },

    authProviders: {
      type: [
        {
          type: String,
          enum: ["local", "google"],
        },
      ],

      default: ["local"],
    },

    googleId: {
      type: String,
      default: null,
      select: false,
    },

    // =====================================
    // EMAIL VERIFICATION
    // =====================================

    emailVerified: {
      type: Boolean,
      default: false,
    },

    emailVerifiedAt: {
      type: Date,
      default: null,
    },

    // =====================================
    // AUTHORIZATION
    // =====================================

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    // =====================================
    // ACCOUNT STATUS
    // =====================================

    accountStatus: {
      type: String,
      enum: [
        "pending_verification",
        "active",
        "suspended",
        "deleted",
      ],
      default: "pending_verification",
    },

    suspensionReason: {
      type: String,
      default: null,
      maxlength: 500,
      select: false,
    },

    suspendedAt: {
      type: Date,
      default: null,
    },

    deletedAt: {
      type: Date,
      default: null,
    },

    // =====================================
    // LOGIN SECURITY
    // =====================================

    failedLoginAttempts: {
      type: Number,
      default: 0,
      min: 0,
      select: false,
    },

    lockUntil: {
      type: Date,
      default: null,
      select: false,
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },

    passwordChangedAt: {
      type: Date,
      default: null,
      select: false,
    },

    passwordVersion: {
      type: Number,
      default: 0,
      min: 0,
      select: false,
    },

    // =====================================
    // USER PREFERENCES
    // =====================================

    preferences: {
      measurementUnit: {
        type: String,
        enum: ["metric", "imperial"],
        default: "metric",
      },

      preferredStyles: {
        type: [String],
        default: [],
      },

      preferredColors: {
        type: [String],
        default: [],
      },

      preferredMaterials: {
        type: [String],
        default: [],
      },

      budgetMin: {
        type: Number,
        default: null,
        min: 0,
      },

      budgetMax: {
        type: Number,
        default: null,
        min: 0,
      },
    },

    // =====================================
    // ARTIFACT ACCOUNT DATA
    // =====================================

    

    storageUsedBytes: {
      type: Number,
      default: 0,
      min: 0,
    },

  

    // =====================================
    // LEGAL CONSENT
    // =====================================

    acceptedTermsAt: {
      type: Date,
      required: [true, "Terms must be accepted"],
    },

    acceptedPrivacyAt: {
      type: Date,
      required: [true, "Privacy policy must be accepted"],
    },
  },
  {
    timestamps: true,

    versionKey: "version",

    optimisticConcurrency: true,

    minimize: false,

    toJSON: {
      virtuals: true,

      transform(document, returnedObject) {
        delete returnedObject.passwordHash;
        delete returnedObject.googleId;
        delete returnedObject.failedLoginAttempts;
        delete returnedObject.lockUntil;
        delete returnedObject.passwordChangedAt;
        delete returnedObject.passwordVersion;
        delete returnedObject.suspensionReason;
        delete returnedObject.__v;

        return returnedObject;
      },
    },

    toObject: {
      virtuals: true,
    },
  }
);

// =====================================
// INDEXES
// =====================================

userSchema.index({
  accountStatus: 1,
  createdAt: -1,
});

userSchema.index({
  role: 1,
  accountStatus: 1,
});

userSchema.index({
  lastLoginAt: -1,
});

userSchema.index(
  {
    googleId: 1,
  },
  {
    unique: true,
    sparse: true,
  }
);

// =====================================
// VIRTUAL PROPERTIES
// =====================================

userSchema.virtual("isLocked").get(function () {
  return Boolean(
    this.lockUntil &&
      this.lockUntil.getTime() > Date.now()
  );
});

userSchema.virtual("isActive").get(function () {
  return (
    this.accountStatus === "active" &&
    this.emailVerified === true
  );
});

// =====================================
// NORMALISE VALUES
// =====================================

userSchema.pre("validate", function () {
  if (this.email) {
    this.email = this.email
      .trim()
      .toLowerCase();
  }

  if (this.name) {
    this.name = this.name
      .trim()
      .replace(/\s+/g, " ");
  }

  if (
    this.preferences?.budgetMin !== null &&
    this.preferences?.budgetMax !== null &&
    this.preferences?.budgetMin >
      this.preferences?.budgetMax
  ) {
    this.invalidate(
      "preferences.budgetMax",
      "Maximum budget must be greater than minimum budget"
    );
  }
});

// =====================================
// ACCOUNT METHODS
// =====================================

userSchema.methods.recordFailedLogin =
  async function () {
    const MAX_ATTEMPTS = 5;
    const LOCK_DURATION_MS =
      15 * 60 * 1000;

    this.failedLoginAttempts += 1;

    if (
      this.failedLoginAttempts >=
      MAX_ATTEMPTS
    ) {
      this.lockUntil = new Date(
        Date.now() + LOCK_DURATION_MS
      );
    }

    await this.save({
      validateBeforeSave: false,
    });
  };

userSchema.methods.resetFailedLogins =
  async function () {
    this.failedLoginAttempts = 0;
    this.lockUntil = null;
    this.lastLoginAt = new Date();

    await this.save({
      validateBeforeSave: false,
    });
  };

userSchema.methods.markEmailVerified =
  async function () {
    this.emailVerified = true;
    this.emailVerifiedAt = new Date();

    if (
      this.accountStatus ===
      "pending_verification"
    ) {
      this.accountStatus = "active";
    }

    await this.save();
  };

userSchema.methods.markPasswordChanged =
  async function () {
    this.passwordChangedAt = new Date();
    this.passwordVersion += 1;

    await this.save({
      validateBeforeSave: false,
    });
  };

userSchema.methods.hasAuthProvider =
  function (provider) {
    return this.authProviders.includes(
      provider
    );
  };

// =====================================
// STATIC METHODS
// =====================================

userSchema.statics.findByEmailWithPassword =
  function (email) {
    return this.findOne({
      email: email.trim().toLowerCase(),
    }).select(
      "+passwordHash " +
        "+failedLoginAttempts " +
        "+lockUntil " +
        "+passwordChangedAt " +
        "+passwordVersion"
    );
  };

userSchema.statics.findByGoogleId =
  function (googleId) {
    return this.findOne({
      googleId,
    }).select("+googleId");
  };

// =====================================
// MODEL
// =====================================

const User = mongoose.model(
  "User",
  userSchema
);

module.exports = User;