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
  extractSessionId,
  validateRefreshToken,
  getSessionExpiry,
  getRefreshCookieOptions,
  getClearCookieOptions,
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


// =====================================
// REFRESH ACCESS TOKEN
// =====================================

const refreshAccessToken = async (
  req,
  res
) => {
  const refreshToken =
    req.cookies
      ?.artifact_refresh_token;

  const clearRefreshCookie =
    () => {
      res.clearCookie(
        "artifact_refresh_token",
        getClearCookieOptions()
      );
    };

  if (!refreshToken) {
    return res.status(401).json({
      success: false,
      code:
        "REFRESH_TOKEN_REQUIRED",

      message:
        "Refresh token is required",
    });
  }

  const sessionId =
    extractSessionId(
      refreshToken
    );

  if (
    !sessionId ||
    !mongoose.Types.ObjectId.isValid(
      sessionId
    )
  ) {
    clearRefreshCookie();

    return res.status(401).json({
      success: false,
      code:
        "REFRESH_TOKEN_INVALID",

      message:
        "Refresh token is invalid",
    });
  }

  const session =
    await Session.findById(
      sessionId
    ).select(
      "+refreshTokenHash"
    );

  if (!session) {
    clearRefreshCookie();

    return res.status(401).json({
      success: false,
      code:
        "SESSION_NOT_FOUND",

      message:
        "Session was not found",
    });
  }

  const tokenMatches =
    validateRefreshToken(
      refreshToken,
      session.refreshTokenHash
    );

  if (!tokenMatches) {
    await Session.revokeAllForUser(
      session.userId,
      "token_reuse"
    );

    clearRefreshCookie();

    return res.status(401).json({
      success: false,
      code:
        "REFRESH_TOKEN_REUSE_DETECTED",

      message:
        "Suspicious session activity detected. Please log in again.",
    });
  }

  if (
    session.revokedAt ||
    session.expiresAt.getTime() <=
      Date.now()
  ) {
    if (!session.revokedAt) {
      await session.revoke(
        "expired"
      );
    }

    clearRefreshCookie();

    return res.status(401).json({
      success: false,
      code:
        "SESSION_EXPIRED",

      message:
        "Session has expired. Please log in again.",
    });
  }

  const user =
    await User.findById(
      session.userId
    ).select(
      "+passwordVersion"
    );

  if (
    !user ||
    !user.emailVerified ||
    user.accountStatus !==
      "active"
  ) {
    await session.revoke(
      user?.accountStatus ===
        "suspended"
        ? "account_suspended"
        : "admin_revoked"
    );

    clearRefreshCookie();

    return res.status(403).json({
      success: false,
      code:
        "ACCOUNT_UNAVAILABLE",

      message:
        "This account is currently unavailable",
    });
  }

  const {
    refreshToken:
      newRefreshToken,

    refreshTokenHash:
      newRefreshTokenHash,
  } = createRefreshToken(
    session._id.toString()
  );

  const newExpiry =
    getSessionExpiry(
      session.rememberMe
    );

  await session.rotateToken(
    newRefreshTokenHash,
    newExpiry
  );

  const accessToken =
    createAccessToken({
      user,
      sessionId:
        session._id,
    });

  res.cookie(
    "artifact_refresh_token",
    newRefreshToken,
    getRefreshCookieOptions(
      session.rememberMe
    )
  );

  return res.status(200).json({
    success: true,

    code:
      "TOKEN_REFRESHED",

    message:
      "Access token refreshed successfully",

    data: {
      accessToken,

      accessTokenExpiresIn:
        process.env
          .JWT_ACCESS_EXPIRES_IN ||
        "15m",

      session: {
        id: session._id,

        expiresAt:
          newExpiry,
      },
    },
  });
};

// =====================================
// LOGOUT CURRENT DEVICE
// =====================================

const logout = async (
  req,
  res
) => {
  const refreshToken =
    req.cookies
      ?.artifact_refresh_token;

  if (refreshToken) {
    const sessionId =
      extractSessionId(
        refreshToken
      );

    if (
      sessionId &&
      mongoose.Types.ObjectId.isValid(
        sessionId
      )
    ) {
      const session =
        await Session.findById(
          sessionId
        ).select(
          "+refreshTokenHash"
        );

      if (session) {
        const tokenMatches =
          validateRefreshToken(
            refreshToken,
            session.refreshTokenHash
          );

        if (
          tokenMatches &&
          !session.revokedAt
        ) {
          await session.revoke(
            "logout"
          );
        }
      }
    }
  }

  res.clearCookie(
    "artifact_refresh_token",
    getClearCookieOptions()
  );

  return res.status(200).json({
    success: true,
    code:
      "LOGOUT_SUCCESSFUL",

    message:
      "Logged out successfully",
  });
};

// =====================================
// LOGOUT ALL DEVICES
// =====================================

const logoutAll = async (
  req,
  res
) => {
  await Session.revokeAllForUser(
    req.user._id,
    "logout_all"
  );

  res.clearCookie(
    "artifact_refresh_token",
    getClearCookieOptions()
  );

  return res.status(200).json({
    success: true,

    code:
      "ALL_SESSIONS_REVOKED",

    message:
      "Logged out from all devices successfully",
  });
};

// =====================================
// CURRENT USER
// =====================================

const getCurrentUser = async (
  req,
  res
) => {
  return res.status(200).json({
    success: true,

    data: {
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,

        emailVerified:
          req.user
            .emailVerified,

        profileImage:
          req.user
            .profileImage,

        role:
          req.user.role,

        currentPlan:
          req.user
            .currentPlan,

        availableCredits:
          req.user
            .availableCredits,

        reservedCredits:
          req.user
            .reservedCredits,

        storageUsedBytes:
          req.user
            .storageUsedBytes,

        preferences:
          req.user
            .preferences,

        createdAt:
          req.user
            .createdAt,
      },

      session: {
        id:
          req.session._id,

        deviceId:
          req.session
            .deviceId,

        deviceName:
          req.session
            .deviceName,

        browser:
          req.session.browser,

        operatingSystem:
          req.session
            .operatingSystem,

        rememberMe:
          req.session
            .rememberMe,

        lastUsedAt:
          req.session
            .lastUsedAt,

        expiresAt:
          req.session
            .expiresAt,
      },
    },
  });

  
};


module.exports = {
  register,
  verifyEmail,
  resendEmailOTP,
  login,
  refreshAccessToken,
  logout,
  logoutAll,
  getCurrentUser,
};