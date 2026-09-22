const EmailOTP = require("../models/EmailOTP");

const {
  generateOTP,
  hashOTP,
  verifyOTPHash,
} = require("../utils/crypto");

const OTP_EXPIRY_MINUTES = 10;
const OTP_RESEND_COOLDOWN_SECONDS = 60;
const MAX_OTP_ATTEMPTS = 5;

const createOTP = async ({
  userId = null,
  email,
  purpose,
  ipAddress = null,
  userAgent = null,
}) => {
  const normalizedEmail = email
    .trim()
    .toLowerCase();

  // Invalidate previously active OTPs.
  await EmailOTP.invalidateExisting(
    normalizedEmail,
    purpose
  );

  const otp = generateOTP();

  const now = Date.now();

  const otpRecord =
    await EmailOTP.create({
      userId,

      email: normalizedEmail,

      purpose,

      codeHash: hashOTP(otp),

      attempts: 0,

      maxAttempts:
        MAX_OTP_ATTEMPTS,

      resendCount: 0,

      nextResendAt: new Date(
        now +
          OTP_RESEND_COOLDOWN_SECONDS *
            1000
      ),

      expiresAt: new Date(
        now +
          OTP_EXPIRY_MINUTES *
            60 *
            1000
      ),

      ipAddress,

      userAgent,
    });

  return {
    otp,

    otpId: otpRecord._id,

    expiresAt:
      otpRecord.expiresAt,

    nextResendAt:
      otpRecord.nextResendAt,
  };
};

const verifyOTP = async ({
  email,
  purpose,
  otp,
}) => {
  const normalizedEmail = email
    .trim()
    .toLowerCase();

  const otpRecord =
    await EmailOTP.findActiveOTP(
      normalizedEmail,
      purpose
    );

  if (!otpRecord) {
    return {
      success: false,

      code: "OTP_INVALID_OR_EXPIRED",

      message:
        "The OTP is invalid or has expired",
    };
  }

  if (!otpRecord.isUsable()) {
    return {
      success: false,

      code: "OTP_INVALID_OR_EXPIRED",

      message:
        "The OTP is invalid or has expired",
    };
  }

  const otpMatches =
    verifyOTPHash(
      otp,
      otpRecord.codeHash
    );

  if (!otpMatches) {
    await otpRecord.recordFailedAttempt();

    return {
      success: false,

      code: "OTP_INCORRECT",

      message:
        "The OTP is incorrect",

      attemptsRemaining:
        Math.max(
          otpRecord.maxAttempts -
            otpRecord.attempts,
          0
        ),
    };
  }

  await otpRecord.markConsumed();

  return {
    success: true,

    code: "OTP_VERIFIED",

    message:
      "OTP verified successfully",

    otpRecord,
  };
};

const canResendOTP = async ({
  email,
  purpose,
}) => {
  const normalizedEmail = email
    .trim()
    .toLowerCase();

  const existingOTP =
    await EmailOTP.findOne({
      email: normalizedEmail,

      purpose,

      consumedAt: null,

      invalidatedAt: null,

      expiresAt: {
        $gt: new Date(),
      },
    }).sort({
      createdAt: -1,
    });

  if (!existingOTP) {
    return {
      allowed: true,
      retryAfterSeconds: 0,
    };
  }

  const remainingMilliseconds =
    existingOTP.nextResendAt.getTime() -
    Date.now();

  if (
    remainingMilliseconds <= 0
  ) {
    return {
      allowed: true,
      retryAfterSeconds: 0,
    };
  }

  return {
    allowed: false,

    retryAfterSeconds:
      Math.ceil(
        remainingMilliseconds / 1000
      ),
  };
};

const invalidateOTPs = async ({
  email,
  purpose,
}) => {
  return EmailOTP.invalidateExisting(
    email,
    purpose
  );
};

module.exports = {
  createOTP,
  verifyOTP,
  canResendOTP,
  invalidateOTPs,

  OTP_EXPIRY_MINUTES,
  OTP_RESEND_COOLDOWN_SECONDS,
  MAX_OTP_ATTEMPTS,
};