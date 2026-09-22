const mongoose = require("mongoose");
const { UAParser } = require("ua-parser-js");

const Session = require("../models/Session");

const User = require("../models/User");
const { OAuth2Client } = require("google-auth-library");

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


const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID
);
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

// =====================================
// GOOGLE AUTHENTICATION
// =====================================

const googleLogin = async (req, res) => {
  const {
    credential,
    rememberMe = false,
    deviceId,
    acceptedTerms = false,
    acceptedPrivacy = false,
   } = req.validated.body;

  if (
    !credential ||
    typeof credential !== "string"
  ) {
    return res.status(400).json({
      success: false,
      code: "GOOGLE_CREDENTIAL_REQUIRED",
      message: "Google credential is required",
    });
  }

  let googlePayload;

  try {
    const ticket =
      await googleClient.verifyIdToken({
        idToken: credential,
        audience:
          process.env.GOOGLE_CLIENT_ID,
      });

    googlePayload = ticket.getPayload();
  } catch (error) {
    console.error(
      "Google token verification failed:",
      error.message
    );

    return res.status(401).json({
      success: false,
      code: "GOOGLE_TOKEN_INVALID",
      message:
        "Google authentication failed",
    });
  }

  const {
    sub: googleId,
    email,
    email_verified: emailVerified,
    name,
    picture,
  } = googlePayload;

  if (
    !googleId ||
    !email ||
    emailVerified !== true
  ) {
    return res.status(401).json({
      success: false,
      code: "GOOGLE_ACCOUNT_INVALID",
      message:
        "Google account does not have a verified email",
    });
  }

  const normalizedEmail = email
    .trim()
    .toLowerCase();

  let user = await User.findOne({
    $or: [
      { googleId },
      { email: normalizedEmail },
    ],
  }).select(
    "+googleId +passwordVersion"
  );

  let isNewUser = false;

  if (!user) {
    if (
      acceptedTerms !== true ||
      acceptedPrivacy !== true
    ) {
      return res.status(400).json({
        success: false,
        code: "LEGAL_CONSENT_REQUIRED",
        message:
          "Terms and privacy policy must be accepted",
      });
    }

    try {
      user = await User.create({
        name:
          name?.trim() ||
          normalizedEmail.split("@")[0],

        email: normalizedEmail,

        profileImage:
          picture || null,

        passwordHash: null,

        authProviders: ["google"],

        googleId,

        emailVerified: true,

        emailVerifiedAt: new Date(),

        accountStatus: "active",

        acceptedTermsAt: new Date(),

        acceptedPrivacyAt: new Date(),

        lastLoginAt: new Date(),
      });

      isNewUser = true;
    } catch (error) {
      if (error.code !== 11000) {
        throw error;
      }

      user = await User.findOne({
        $or: [
          { googleId },
          { email: normalizedEmail },
        ],
      }).select(
        "+googleId +passwordVersion"
      );

      if (!user) {
        throw error;
      }
    }
  }

  if (
    user.accountStatus === "suspended"
  ) {
    return res.status(403).json({
      success: false,
      code: "ACCOUNT_SUSPENDED",
      message:
        "This account has been suspended",
    });
  }

  if (
    user.accountStatus === "deleted"
  ) {
    return res.status(403).json({
      success: false,
      code: "ACCOUNT_UNAVAILABLE",
      message:
        "This account is unavailable",
    });
  }

  /*
   * Safely link Google to an existing account.
   * Google has already verified ownership
   * of the supplied email address.
   */
  let userChanged = false;

  if (
    user.googleId &&
    user.googleId !== googleId
  ) {
    return res.status(409).json({
      success: false,
      code: "GOOGLE_ACCOUNT_CONFLICT",
      message:
        "This email is linked to another Google account",
    });
  }

 

  if (!user.googleId) {
    user.googleId = googleId;
    userChanged = true;
  }

  if (
    !user.authProviders.includes(
      "google"
    )
  ) {
    user.authProviders.push("google");
    userChanged = true;
  }

  if (!user.emailVerified) {
    user.emailVerified = true;
    user.emailVerifiedAt = new Date();
    userChanged = true;
  }

  if (
    user.accountStatus ===
    "pending_verification"
  ) {
    user.accountStatus = "active";
    userChanged = true;
  }

  if (
    !user.profileImage &&
    picture
  ) {
    user.profileImage = picture;
    userChanged = true;
  }

  user.lastLoginAt = new Date();
  user.failedLoginAttempts = 0;
  user.lockUntil = null;
  userChanged = true;

  if (userChanged) {
    await user.save({
      validateBeforeSave: false,
    });
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
    deviceId || generateDeviceId();

  const deviceName =
    [
      device.vendor,
      device.model,
    ]
      .filter(Boolean)
      .join(" ") ||
    device.type ||
    "Unknown device";

  const browserName =
    [
      browser.name,
      browser.version,
    ]
      .filter(Boolean)
      .join(" ") ||
    "Unknown";

  const operatingSystemName =
    [
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

    deviceId: finalDeviceId,

    deviceName,

    browser: browserName,

    operatingSystem:
      operatingSystemName,

    userAgent,

    ipAddress: getClientIP(req),

    rememberMe,

    lastUsedAt: new Date(),

    expiresAt: sessionExpiry,
  });

  const accessToken =
    createAccessToken({
      user,
      sessionId,
    });

  res.cookie(
    "artifact_refresh_token",
    refreshToken,
    getRefreshCookieOptions(
      rememberMe
    )
  );

  return res
    .status(isNewUser ? 201 : 200)
    .json({
      success: true,

      code: isNewUser
        ? "GOOGLE_REGISTRATION_SUCCESSFUL"
        : "GOOGLE_LOGIN_SUCCESSFUL",

      message: isNewUser
        ? "Account created successfully with Google"
        : "Google login successful",

      data: {
        accessToken,

        accessTokenExpiresIn:
          process.env
            .JWT_ACCESS_EXPIRES_IN ||
          "15m",

        isNewUser,

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
          authProviders:
            user.authProviders,
        },

        session: {
          id: sessionId,
          deviceId:
            finalDeviceId,
          deviceName,
          browser: browserName,
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
// FORGOT PASSWORD
// =====================================

const forgotPassword = async (req, res) => {
  const { email } = req.validated.body;

  const normalizedEmail = email
    .trim()
    .toLowerCase();

  const genericResponse = {
    success: true,
    code: "PASSWORD_RESET_REQUESTED",
    message:
      "If an account exists with this email, a password reset code will be sent.",
  };

  const user = await User.findOne({
    email: normalizedEmail,
  });

  if (
    !user ||
    user.accountStatus === "deleted" ||
    user.accountStatus === "suspended"
  ) {
    return res
      .status(200)
      .json(genericResponse);
  }

  const resendStatus =
    await canResendOTP({
      email: normalizedEmail,
      purpose: "password_reset",
    });

  /*
   * Do not reveal whether an account exists.
   */
  if (!resendStatus.allowed) {
    return res
      .status(200)
      .json(genericResponse);
  }

  try {
    const otpResult =
      await createOTP({
        userId: user._id,
        email: normalizedEmail,
        purpose: "password_reset",
        ipAddress:
          getClientIP(req),
        userAgent:
          req.get("user-agent") ||
          null,
      });

    await sendOTPEmail({
      email: normalizedEmail,
      name: user.name,
      otp: otpResult.otp,
      purpose: "password_reset",
    });
  } catch (error) {
    console.error(
      "Password reset email failed:",
      error.message
    );
  }

  return res
    .status(200)
    .json(genericResponse);
};

// =====================================
// RESET PASSWORD USING OTP
// =====================================

const resetPassword = async (
  req,
  res
) => {
  const {
    email,
    otp,
    newPassword,
  } = req.validated.body;

  const normalizedEmail = email
    .trim()
    .toLowerCase();

  const user =
    await User.findOne({
      email: normalizedEmail,
    }).select(
      "+passwordHash +passwordVersion"
    );

  /*
   * Same response prevents account discovery.
   */
  if (
    !user ||
    user.accountStatus === "deleted" ||
    user.accountStatus === "suspended"
  ) {
    return res.status(400).json({
      success: false,
      code: "OTP_INVALID_OR_EXPIRED",
      message:
        "The OTP is invalid or has expired",
    });
  }

  const verification =
    await verifyOTP({
      email: normalizedEmail,
      purpose: "password_reset",
      otp,
    });

  if (!verification.success) {
    return res.status(400).json({
      success: false,
      code: verification.code,
      message:
        verification.message,

      ...(verification
        .attemptsRemaining !==
      undefined
        ? {
            attemptsRemaining:
              verification
                .attemptsRemaining,
          }
        : {}),
    });
  }

  if (user.passwordHash) {
    const samePassword =
      await verifyPassword(
        newPassword,
        user.passwordHash
      );

    if (samePassword) {
      return res.status(400).json({
        success: false,
        code:
          "PASSWORD_REUSE_NOT_ALLOWED",
        message:
          "New password must be different from your current password",
      });
    }
  }

  user.passwordHash =
    await hashPassword(
      newPassword
    );

  user.passwordChangedAt =
    new Date();

  user.passwordVersion =
    (user.passwordVersion || 0) + 1;

  user.failedLoginAttempts = 0;
  user.lockUntil = null;

  if (
    !user.authProviders.includes(
      "local"
    )
  ) {
    user.authProviders.push(
      "local"
    );
  }

  await user.save({
    validateBeforeSave: false,
  });

  await Session.revokeAllForUser(
    user._id,
    "password_reset"
  );

  res.clearCookie(
    "artifact_refresh_token",
    getClearCookieOptions()
  );

  return res.status(200).json({
    success: true,
    code: "PASSWORD_RESET_SUCCESSFUL",
    message:
      "Password reset successfully. Please log in again.",
  });
};

// =====================================
// CHANGE PASSWORD
// =====================================

const changePassword = async (
  req,
  res
) => {
  const {
    currentPassword,
    newPassword,
  } = req.validated.body;

  const user =
    await User.findById(
      req.user._id
    ).select(
      "+passwordHash +passwordVersion"
    );

  if (!user) {
    return res.status(404).json({
      success: false,
      code: "USER_NOT_FOUND",
      message: "User was not found",
    });
  }

  if (!user.passwordHash) {
    return res.status(400).json({
      success: false,
      code:
        "LOCAL_PASSWORD_NOT_CONFIGURED",
      message:
        "This account does not have a password. Use forgot password to create one.",
    });
  }

  const currentPasswordCorrect =
    await verifyPassword(
      currentPassword,
      user.passwordHash
    );

  if (!currentPasswordCorrect) {
    return res.status(401).json({
      success: false,
      code:
        "CURRENT_PASSWORD_INCORRECT",
      message:
        "Current password is incorrect",
    });
  }

  const samePassword =
    await verifyPassword(
      newPassword,
      user.passwordHash
    );

  if (samePassword) {
    return res.status(400).json({
      success: false,
      code:
        "PASSWORD_REUSE_NOT_ALLOWED",
      message:
        "New password must be different from your current password",
    });
  }

  user.passwordHash =
    await hashPassword(
      newPassword
    );

  user.passwordChangedAt =
    new Date();

  user.passwordVersion =
    (user.passwordVersion || 0) + 1;

  user.failedLoginAttempts = 0;
  user.lockUntil = null;

  await user.save({
    validateBeforeSave: false,
  });

  /*
   * Password change invalidates every
   * active device, including this one.
   */
  await Session.revokeAllForUser(
    user._id,
    "password_changed"
  );

  res.clearCookie(
    "artifact_refresh_token",
    getClearCookieOptions()
  );

  return res.status(200).json({
    success: true,
    code:
      "PASSWORD_CHANGED_SUCCESSFULLY",
    message:
      "Password changed successfully. Please log in again.",
  });
};
module.exports = {
  register,
  verifyEmail,
  resendEmailOTP,
  login,
  googleLogin,
  forgotPassword,
  resetPassword,
  changePassword,
  refreshAccessToken,
  logout,
  logoutAll,
  getCurrentUser,
};