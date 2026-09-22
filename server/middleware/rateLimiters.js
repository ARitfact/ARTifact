const {
  rateLimit,
} = require("express-rate-limit");

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,

  limit: 10,

  standardHeaders: "draft-8",

  legacyHeaders: false,

  message: {
    success: false,
    message:
      "Too many registration attempts. Please try again later.",
  },
});

const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,

  limit: 10,

  standardHeaders: "draft-8",

  legacyHeaders: false,

  message: {
    success: false,
    message:
      "Too many OTP requests. Please try again later.",
  },
});

module.exports = {
  registerLimiter,
  otpLimiter,
};