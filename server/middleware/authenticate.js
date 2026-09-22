const User = require("../models/User");
const Session = require("../models/Session");

const {
  verifyAccessToken,
} = require("../services/tokenService");

const authenticate = async (
  req,
  res,
  next
) => {
  try {
    const authorization =
      req.get("authorization");

    if (
      !authorization ||
      !authorization.startsWith(
        "Bearer "
      )
    ) {
      return res.status(401).json({
        success: false,
        code: "ACCESS_TOKEN_REQUIRED",
        message:
          "Authentication is required",
      });
    }

    const token =
      authorization.slice(7).trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        code: "ACCESS_TOKEN_REQUIRED",
        message:
          "Authentication is required",
      });
    }

    const payload =
      verifyAccessToken(token);

    const [user, session] =
      await Promise.all([
        User.findById(
          payload.sub
        ).select(
          "+passwordVersion"
        ),

        Session.findOne({
          _id: payload.sessionId,

          userId: payload.sub,

          revokedAt: null,

          expiresAt: {
            $gt: new Date(),
          },
        }),
      ]);

    if (!user || !session) {
      return res.status(401).json({
        success: false,
        code: "SESSION_INVALID",
        message:
          "Your session is no longer valid",
      });
    }

    if (
      user.accountStatus !==
        "active" ||
      !user.emailVerified
    ) {
      return res.status(403).json({
        success: false,
        code: "ACCOUNT_UNAVAILABLE",
        message:
          "This account is currently unavailable",
      });
    }

    if (
      Number(
        payload.passwordVersion
      ) !==
      Number(
        user.passwordVersion || 0
      )
    ) {
      return res.status(401).json({
        success: false,
        code:
          "PASSWORD_CHANGED",

        message:
          "Please log in again",
      });
    }

    req.user = user;
    req.session = session;
    req.auth = payload;

    next();
  } catch (error) {
    if (
      error.name ===
      "TokenExpiredError"
    ) {
      return res.status(401).json({
        success: false,
        code: "ACCESS_TOKEN_EXPIRED",
        message:
          "Access token has expired",
      });
    }

    if (
      error.name ===
      "JsonWebTokenError"
    ) {
      return res.status(401).json({
        success: false,
        code: "ACCESS_TOKEN_INVALID",
        message:
          "Access token is invalid",
      });
    }

    next(error);
  }
};

module.exports = authenticate;