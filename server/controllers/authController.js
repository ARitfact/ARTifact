const User = require("../models/User");

const {
  hashPassword,
} = require(
  "../services/passwordService"
);

const {
  createOTP,
  verifyOTP,
  canResendOTP,
} = require("../services/otpService");

const {
  sendOTPEmail,
} = require("../services/emailService");

const getClientIP = (req) => {
  const forwardedFor =
    req.headers["x-forwarded-for"];

  if (
    typeof forwardedFor === "string"
  ) {
    return forwardedFor
      .split(",")[0]
      .trim();
  }

  return (
    req.ip ||
    req.socket?.remoteAddress ||
    null
  );
};

// =====================================
// REGISTER
// =====================================

const register = async (
  req,
  res
) => {
  const {
    name,
    email,
    password,
    acceptedTerms,
    acceptedPrivacy,
  } = req.validated.body;

  const normalizedEmail = email
    .trim()
    .toLowerCase();

  const existingUser =
    await User.findOne({
      email: normalizedEmail,
    });

  if (existingUser) {
    if (
      !existingUser.emailVerified &&
      existingUser.accountStatus ===
        "pending_verification"
    ) {
      return res.status(409).json({
        success: false,

        code:
          "EMAIL_VERIFICATION_PENDING",

        message:
          "An account with this email is awaiting verification",
      });
    }

    return res.status(409).json({
      success: false,

      code:
        "EMAIL_ALREADY_REGISTERED",

      message:
        "An account with this email already exists",
    });
  }

  const passwordHash =
    await hashPassword(password);

  let user;

  try {
    user = await User.create({
      name,

      email: normalizedEmail,

      passwordHash,

      authProviders: ["local"],

      emailVerified: false,

      accountStatus:
        "pending_verification",

      acceptedTermsAt:
        acceptedTerms
          ? new Date()
          : null,

      acceptedPrivacyAt:
        acceptedPrivacy
          ? new Date()
          : null,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,

        code:
          "EMAIL_ALREADY_REGISTERED",

        message:
          "An account with this email already exists",
      });
    }

    throw error;
  }

  try {
    const otpResult =
      await createOTP({
        userId: user._id,

        email:
          normalizedEmail,

        purpose:
          "email_verification",

        ipAddress:
          getClientIP(req),

        userAgent:
          req.get("user-agent") ||
          null,
      });

    await sendOTPEmail({
      email:
        normalizedEmail,

      name: user.name,

      otp: otpResult.otp,

      purpose:
        "email_verification",
    });

    return res.status(201).json({
      success: true,

      code:
        "REGISTRATION_PENDING_VERIFICATION",

      message:
        "Registration successful. Please verify your email.",

      data: {
        email: user.email,

        expiresAt:
          otpResult.expiresAt,

        nextResendAt:
          otpResult.nextResendAt,
      },
    });
  } catch (error) {
    console.error(
      "Registration email failed:",
      error.message
    );

    return res.status(502).json({
      success: false,

      code:
        "VERIFICATION_EMAIL_FAILED",

      message:
        "Account created, but the verification email could not be sent. Please request a new OTP.",
    });
  }
};

// =====================================
// VERIFY EMAIL
// =====================================

const verifyEmail = async (
  req,
  res
) => {
  const { email, otp } =
    req.validated.body;

  const normalizedEmail = email
    .trim()
    .toLowerCase();

  const user = await User.findOne({
    email: normalizedEmail,
  });

  if (!user) {
    return res.status(400).json({
      success: false,

      code:
        "OTP_INVALID_OR_EXPIRED",

      message:
        "The OTP is invalid or has expired",
    });
  }

  if (user.emailVerified) {
    return res.status(200).json({
      success: true,

      code:
        "EMAIL_ALREADY_VERIFIED",

      message:
        "Email is already verified",
    });
  }

  const verification =
    await verifyOTP({
      email: normalizedEmail,

      purpose:
        "email_verification",

      otp,
    });

  if (!verification.success) {
    return res.status(400).json({
      success: false,

      code:
        verification.code,

      message:
        verification.message,

      ...(verification
        .attemptsRemaining !==
      undefined
        ? {
            attemptsRemaining:
              verification.attemptsRemaining,
          }
        : {}),
    });
  }

  await user.markEmailVerified();

  return res.status(200).json({
    success: true,

    code:
      "EMAIL_VERIFIED",

    message:
      "Email verified successfully. You can now log in.",
  });
};

// =====================================
// RESEND EMAIL OTP
// =====================================

const resendEmailOTP = async (
  req,
  res
) => {
  const { email } =
    req.validated.body;

  const normalizedEmail = email
    .trim()
    .toLowerCase();

  const genericResponse = {
    success: true,

    message:
      "If an unverified account exists, a new verification code will be sent.",
  };

  const user = await User.findOne({
    email: normalizedEmail,
  });

  if (
    !user ||
    user.emailVerified ||
    user.accountStatus !==
      "pending_verification"
  ) {
    return res
      .status(200)
      .json(genericResponse);
  }

  const resendStatus =
    await canResendOTP({
      email:
        normalizedEmail,

      purpose:
        "email_verification",
    });

  if (!resendStatus.allowed) {
    return res.status(429).json({
      success: false,

      code:
        "OTP_RESEND_COOLDOWN",

      message:
        "Please wait before requesting another OTP.",

      retryAfterSeconds:
        resendStatus.retryAfterSeconds,
    });
  }

  const otpResult =
    await createOTP({
      userId: user._id,

      email:
        normalizedEmail,

      purpose:
        "email_verification",

      ipAddress:
        getClientIP(req),

      userAgent:
        req.get("user-agent") ||
        null,
    });

  await sendOTPEmail({
    email:
      normalizedEmail,

    name: user.name,

    otp: otpResult.otp,

    purpose:
      "email_verification",
  });

  return res.status(200).json({
    ...genericResponse,

    data: {
      expiresAt:
        otpResult.expiresAt,

      nextResendAt:
        otpResult.nextResendAt,
    },
  });
};

module.exports = {
  register,
  verifyEmail,
  resendEmailOTP,
};