const mongoose = require("mongoose");
const { UAParser } = require("ua-parser-js");

const Session = require("../models/Session");

const User = require("../models/User");

const {
  hashPassword,
  verifyPassword,
  passwordNeedsRehash,
} = require("../services/passwordService");

const {
  createAccessToken,
  createRefreshToken,
  getSessionExpiry,
  getRefreshCookieOptions,
} = require("../services/tokenService");

const {
  generateDeviceId,
  generateTokenFamily,
} = require("../utils/crypto");
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
const login = async (req, res) => {
  const {
    email,
    password,
    rememberMe = false,
    deviceId,
  } = req.validated.body;

  const normalizedEmail = email
    .trim()
    .toLowerCase();

  const user =
    await User.findByEmailWithPassword(
      normalizedEmail
    );

  const invalidCredentialsResponse = () => {
    return res.status(401).json({
      success: false,
      code: "INVALID_CREDENTIALS",
      message:
        "Invalid email or password",
    });
  };

  if (!user || !user.passwordHash) {
    return invalidCredentialsResponse();
  }

  if (
    user.lockUntil &&
    user.lockUntil.getTime() >
      Date.now()
  ) {
    const retryAfterSeconds =
      Math.ceil(
        (user.lockUntil.getTime() -
          Date.now()) /
          1000
      );

    return res.status(423).json({
      success: false,
      code: "ACCOUNT_TEMPORARILY_LOCKED",

      message:
        "Account temporarily locked due to repeated failed attempts.",

      retryAfterSeconds,
    });
  }

  const passwordCorrect =
    await verifyPassword(
      password,
      user.passwordHash
    );

  if (!passwordCorrect) {
    await user.recordFailedLogin();

    return invalidCredentialsResponse();
  }

  if (!user.emailVerified) {
    return res.status(403).json({
      success: false,
      code: "EMAIL_NOT_VERIFIED",

      message:
        "Please verify your email before logging in.",
    });
  }

  if (
    user.accountStatus ===
    "suspended"
  ) {
    return res.status(403).json({
      success: false,
      code: "ACCOUNT_SUSPENDED",

      message:
        "This account has been suspended.",
    });
  }

  if (
    user.accountStatus !== "active"
  ) {
    return res.status(403).json({
      success: false,
      code: "ACCOUNT_UNAVAILABLE",

      message:
        "This account is currently unavailable.",
    });
  }

  if (
    passwordNeedsRehash(
      user.passwordHash
    )
  ) {
    user.passwordHash =
      await hashPassword(password);
  }

  const userAgent =
    req.get("user-agent") || "";

  const parser =
    new UAParser(userAgent);

  const browser =
    parser.getBrowser();

  const operatingSystem =
    parser.getOS();

  const device =
    parser.getDevice();

  const sessionId =
    new mongoose.Types.ObjectId();

  const {
    refreshToken,
    refreshTokenHash,
  } = createRefreshToken(
    sessionId.toString()
  );

  const sessionExpiry =
    getSessionExpiry(rememberMe);

  const finalDeviceId =
    deviceId ||
    generateDeviceId();

  const deviceName = [
    device.vendor,
    device.model,
  ]
    .filter(Boolean)
    .join(" ") ||
    device.type ||
    "Unknown device";

  const browserName = [
    browser.name,
    browser.version,
  ]
    .filter(Boolean)
    .join(" ") ||
    "Unknown";

  const operatingSystemName = [
    operatingSystem.name,
    operatingSystem.version,
  ]
    .filter(Boolean)
    .join(" ") ||
    "Unknown";

  await Session.create({
    _id: sessionId,

    userId: user._id,

    refreshTokenHash,

    tokenFamily:
      generateTokenFamily(),

    rotationCounter: 0,

    deviceId:
      finalDeviceId,

    deviceName,

    browser:
      browserName,

    operatingSystem:
      operatingSystemName,

    userAgent,

    ipAddress:
      getClientIP(req),

    rememberMe,

    lastUsedAt:
      new Date(),

    expiresAt:
      sessionExpiry,
  });

  const accessToken =
    createAccessToken({
      user,
      sessionId,
    });

  await user.resetFailedLogins();

  res.cookie(
    "artifact_refresh_token",
    refreshToken,
    getRefreshCookieOptions(
      rememberMe
    )
  );

  return res.status(200).json({
    success: true,

    code: "LOGIN_SUCCESSFUL",

    message:
      "Login successful",

    data: {
      accessToken,

      accessTokenExpiresIn:
        process.env
          .JWT_ACCESS_EXPIRES_IN ||
        "15m",

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profileImage:
          user.profileImage,
        role: user.role,
        currentPlan:
          user.currentPlan,
        availableCredits:
          user.availableCredits,
      },

      session: {
        id: sessionId,
        deviceId:
          finalDeviceId,
        deviceName,
        browser:
          browserName,
        operatingSystem:
          operatingSystemName,
        rememberMe,
        expiresAt:
          sessionExpiry,
      },
    },
  });
};
module.exports = {
  register,
  verifyEmail,
  resendEmailOTP,
  login,
};