const express = require("express");

const {
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
} = require("../controllers/authController");

const validate = require(
  "../middleware/validate"
);

const authenticate = require("../middleware/authenticate");

const asyncHandler = require(
  "../utils/asyncHandler"
);

const {
  registerSchema,
  verifyEmailSchema,
  resendEmailOTPSchema,
  loginSchema,
  googleLoginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} = require("../validators/authValidators");

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

router.post(
  "/google",
  loginLimiter,
  validate(googleLoginSchema),
  asyncHandler(googleLogin)
);

router.post(
  "/refresh",
  asyncHandler(
    refreshAccessToken
  )
);

router.post(
  "/logout",
  asyncHandler(logout)
);

router.post(
  "/logout-all",
  authenticate,
  asyncHandler(logoutAll)
);

router.get(
  "/me",
  authenticate,
  asyncHandler(getCurrentUser)
);

router.post(
  "/forgot-password",
  otpLimiter,
  validate(forgotPasswordSchema),
  asyncHandler(forgotPassword)
);

router.post(
  "/reset-password",
  otpLimiter,
  validate(resetPasswordSchema),
  asyncHandler(resetPassword)
);

router.post(
  "/change-password",
  loginLimiter,
  authenticate,
  validate(changePasswordSchema),
  asyncHandler(changePassword)
);

module.exports = router;