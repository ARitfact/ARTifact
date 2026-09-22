const express = require("express");

const {
  register,
  verifyEmail,
  resendEmailOTP,
  login,
} = require(
  "../controllers/authController"
);

const validate = require(
  "../middleware/validate"
);

const asyncHandler = require(
  "../utils/asyncHandler"
);

const {
  registerSchema,
  verifyEmailSchema,
  resendEmailOTPSchema,
  loginSchema,
} = require(
  "../validators/authValidators"
);

const {
  registerLimiter,
  otpLimiter,
  loginLimiter,
} = require(
  "../middleware/rateLimiters"
);

const router = express.Router();

router.post(
  "/register",

  registerLimiter,

  validate(registerSchema),

  asyncHandler(register)
);

router.post(
  "/verify-email",

  otpLimiter,

  validate(verifyEmailSchema),

  asyncHandler(verifyEmail)
);

router.post(
  "/resend-email-otp",

  otpLimiter,

  validate(
    resendEmailOTPSchema
  ),

  asyncHandler(resendEmailOTP)
);

router.post(
  "/login",
  loginLimiter,
  validate(loginSchema),
  asyncHandler(login)
);

module.exports = router;