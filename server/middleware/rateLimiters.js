const {
  rateLimit,
} = require("express-rate-limit");

const createRateLimitHandler =
  (code, message) =>
  (req, res) => {
    return res.status(429).json({
      success: false,
      code,
      message,
    });
  };

const commonOptions = {
  standardHeaders: "draft-8",
  legacyHeaders: false,

  /*
   * Health checks and successful API
   * responses should not cause failed
   * authentication limits.
   */
  passOnStoreError: false,
};

const registerLimiter = rateLimit({
  ...commonOptions,

  windowMs: 15 * 60 * 1000,
  limit: 5,

  handler: createRateLimitHandler(
    "TOO_MANY_REGISTRATION_ATTEMPTS",
    "Too many registration attempts. Please try again later."
  ),
});

const otpLimiter = rateLimit({
  ...commonOptions,

  windowMs: 10 * 60 * 1000,
  limit: 5,

  handler: createRateLimitHandler(
    "TOO_MANY_OTP_REQUESTS",
    "Too many OTP requests. Please try again later."
  ),
});

const loginLimiter = rateLimit({
  ...commonOptions,

  windowMs: 15 * 60 * 1000,
  limit: 10,

  handler: createRateLimitHandler(
    "TOO_MANY_LOGIN_ATTEMPTS",
    "Too many login attempts. Please try again later."
  ),
});

const refreshLimiter = rateLimit({
  ...commonOptions,

  windowMs: 5 * 60 * 1000,
  limit: 30,

  handler: createRateLimitHandler(
    "TOO_MANY_REFRESH_ATTEMPTS",
    "Too many token refresh attempts. Please log in again."
  ),
});


// =====================================
// PAYMENT RATE LIMITERS
// =====================================

const paymentOrderLimiter =
  rateLimit({
    ...commonOptions,

    windowMs:
      15 * 60 * 1000,

    limit: 10,

    /*
     * Payment routes mein authenticate
     * middleware pehle run hona chahiye.
     */
    keyGenerator: (req) => {
      return req.user._id.toString();
    },

    handler:
      createRateLimitHandler(
        "TOO_MANY_PAYMENT_ATTEMPTS",

        "Too many payment attempts. Please try again later."
      ),
  });

const paymentVerificationLimiter =
  rateLimit({
    ...commonOptions,

    windowMs:
      15 * 60 * 1000,

    limit: 30,

    keyGenerator: (req) => {
      return req.user._id.toString();
    },

    handler:
      createRateLimitHandler(
        "TOO_MANY_PAYMENT_VERIFICATIONS",

        "Too many payment verification attempts. Please try again later."
      ),
  });


module.exports = {
  registerLimiter,
  otpLimiter,
  loginLimiter,
  refreshLimiter,

  paymentOrderLimiter,
  paymentVerificationLimiter,
};