const jwt = require("jsonwebtoken");

const {
  generateSecureToken,
  hashToken,
  verifyTokenHash,
} = require("../utils/crypto");

const getAccessSecret = () => {
  const secret =
    process.env.JWT_ACCESS_SECRET;

  if (!secret || secret.length < 64) {
    throw new Error(
      "JWT_ACCESS_SECRET must contain at least 64 characters"
    );
  }

  return secret;
};

const getRefreshTokenDays = (
  rememberMe = false
) => {
  const value = rememberMe
    ? process.env.REMEMBER_ME_DAYS || 90
    : process.env.REFRESH_TOKEN_DAYS || 30;

  return Number(value);
};

const createAccessToken = ({
  user,
  sessionId,
}) => {
  return jwt.sign(
    {
      role: user.role,
      sessionId:
        sessionId.toString(),
      passwordVersion:
        user.passwordVersion || 0,
    },

    getAccessSecret(),

    {
      subject:
        user._id.toString(),

      expiresIn:
        process.env
          .JWT_ACCESS_EXPIRES_IN ||
        "15m",

      issuer: "artifact-api",

      audience:
        "artifact-client",

      algorithm: "HS256",
    }
  );
};

const verifyAccessToken = (
  token
) => {
  return jwt.verify(
    token,
    getAccessSecret(),
    {
      issuer: "artifact-api",
      audience: "artifact-client",
      algorithms: ["HS256"],
    }
  );
};

const createRefreshToken = (
  sessionId
) => {
  const randomSecret =
    generateSecureToken(64);

  const refreshToken =
    `${sessionId}.${randomSecret}`;

  return {
    refreshToken,

    refreshTokenHash:
      hashToken(refreshToken),
  };
};

const extractSessionId = (
  refreshToken
) => {
  if (
    typeof refreshToken !==
    "string"
  ) {
    return null;
  }

  const separatorIndex =
    refreshToken.indexOf(".");

  if (separatorIndex <= 0) {
    return null;
  }

  return refreshToken.slice(
    0,
    separatorIndex
  );
};

const validateRefreshToken = (
  refreshToken,
  storedHash
) => {
  return verifyTokenHash(
    refreshToken,
    storedHash
  );
};

const getSessionExpiry = (
  rememberMe = false
) => {
  const days =
    getRefreshTokenDays(
      rememberMe
    );

  return new Date(
    Date.now() +
      days *
        24 *
        60 *
        60 *
        1000
  );
};

const getRefreshCookieOptions = (
  rememberMe = false
) => {
  const expiresAt =
    getSessionExpiry(
      rememberMe
    );

  const isProduction =
    process.env.NODE_ENV ===
    "production";

  return {
    httpOnly: true,

    secure: isProduction,

    sameSite: isProduction
      ? "none"
      : "lax",

    path: "/api/v1/auth",

    expires: expiresAt,

    maxAge:
      expiresAt.getTime() -
      Date.now(),
  };
};

const getClearCookieOptions =
  () => {
    const isProduction =
      process.env.NODE_ENV ===
      "production";

    return {
      httpOnly: true,

      secure: isProduction,

      sameSite: isProduction
        ? "none"
        : "lax",

      path: "/api/v1/auth",
    };
  };

module.exports = {
  createAccessToken,
  verifyAccessToken,
  createRefreshToken,
  extractSessionId,
  validateRefreshToken,
  getSessionExpiry,
  getRefreshCookieOptions,
  getClearCookieOptions,
};