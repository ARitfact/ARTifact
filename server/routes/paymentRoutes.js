const express = require("express");

const authenticate =
  require(
    "../middleware/authenticate"
  );

const validate =
  require(
    "../middleware/validate"
  );

const asyncHandler =
  require(
    "../utils/asyncHandler"
  );

const requireIdempotencyKey =
  require(
    "../middleware/requireIdempotencyKey"
  );

const {
  paymentOrderLimiter,
  paymentVerificationLimiter,
} = require(
  "../middleware/rateLimiters"
);

const {
  createPaymentOrderSchema,
  verifyPaymentSchema,
} = require(
  "../validators/paymentValidators"
);

const {
  getPaymentPlans,
  createPaymentOrder,
  verifyPayment,
} = require(
  "../controllers/paymentController"
);

const router = express.Router();

// =====================================
// GET PAYMENT PLANS
// =====================================

router.get(
  "/plans",

  authenticate,

  getPaymentPlans
);

// =====================================
// CREATE RAZORPAY ORDER
// =====================================

router.post(
  "/orders",

  authenticate,

  /*
   * Must run after authenticate because
   * limiter uses req.user._id.
   */
  paymentOrderLimiter,

  requireIdempotencyKey,

  validate(
    createPaymentOrderSchema
  ),

  asyncHandler(
    createPaymentOrder
  )
);

// =====================================
// VERIFY RAZORPAY PAYMENT
// =====================================

router.post(
  "/verify",

  authenticate,

  paymentVerificationLimiter,

  validate(
    verifyPaymentSchema
  ),

  asyncHandler(
    verifyPayment
  )
);
module.exports = router;