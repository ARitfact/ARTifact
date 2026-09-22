const crypto = require("crypto");

const razorpay =
  require("../config/razorpay.js");

const PaymentOrder =
  require("../models/paymentOrder");

const {
  getPaymentPlan,
  getPublicPaymentPlans,
} = require(
  "../config/paymentPlans"
);

const {
  verifyPaymentSignature,
} = require(
  "../services/paymentSignatureService"
);

const {
  grantCapturedPayment,
} = require(
  "../services/entitlementGrantService"
);

const {
  transitionPaymentStatus,
} = require(
  "../services/paymentStateService"
);
// =====================================
// GET AVAILABLE PAYMENT PLANS
// =====================================

const getPaymentPlans = (
  req,
  res
) => {
  const plans =
    getPublicPaymentPlans();

  /*
   * Prevent browser/proxy from caching
   * old prices.
   */
  res.setHeader(
    "Cache-Control",
    "no-store"
  );

  return res.status(200).json({
    success: true,

    data: {
      plans,
    },
  });
};

// =====================================
// CREATE PAYMENT ORDER
// =====================================

const createPaymentOrder = async (
  req,
  res
) => {
  const { planCode } =
    req.validated.body;

  const plan =
    getPaymentPlan(planCode);

  if (!plan) {
    return res.status(400).json({
      success: false,

      code: "INVALID_PLAN",

      message:
        "Selected payment plan is invalid",
    });
  }

  /*
   * Check whether this exact request
   * was already processed.
   */
  const existingOrder =
    await PaymentOrder.findOne({
      userId: req.user._id,

      idempotencyKey:
        req.idempotencyKey,
    });

  if (existingOrder) {
    /*
     * Prevent accidental reuse of one
     * key for two different plans.
     */
    if (
      existingOrder.planCode !==
      planCode
    ) {
      return res.status(409).json({
        success: false,

        code:
          "IDEMPOTENCY_KEY_REUSED",

        message:
          "This Idempotency-Key was already used for another plan",
      });
    }

    return res
      .status(
        existingOrder.status ===
          "CREATING" ||
        existingOrder.status ===
          "UNKNOWN"
          ? 202
          : 200
      )
      .json({
        success: true,

        idempotentReplay: true,

        data: {
          paymentOrderId:
            existingOrder._id,

          razorpayOrderId:
            existingOrder
              .razorpayOrderId,

          status:
            existingOrder.status,

          amountPaise:
            existingOrder
              .amountPaise,

          currency:
            existingOrder.currency,

          keyId:
            process.env
              .RAZORPAY_KEY_ID,
        },
      });
  }

  const receipt =
    `art_${Date.now()}_${crypto
      .randomBytes(5)
      .toString("hex")}`;

  let paymentOrder;

  try {
    /*
     * Create local order first.
     * This becomes our source of truth.
     */
    paymentOrder =
      await PaymentOrder.create({
        userId:
          req.user._id,

        planCode:
          plan.code,

        planSnapshot: {
          name:
            plan.name,

          type:
            plan.type,

          credits:
            plan.credits || null,

          durationDays:
            plan.durationDays ||
            null,

          dailyFairUseLimit:
            plan.dailyFairUseLimit ||
            null,

          monthlyFairUseLimit:
            plan.monthlyFairUseLimit ||
            null,
        },

        amountPaise:
          plan.amountPaise,

        currency:
          plan.currency,

        idempotencyKey:
          req.idempotencyKey,

        receipt,

        status:
          "CREATING",

        correlationId:
          req.correlationId,
      });
  } catch (error) {
    /*
     * Two simultaneous requests may race.
     * Unique DB index allows only one.
     */
    const isIdempotencyDuplicate =
  error.code === 11000 &&
  error.keyPattern?.userId &&
  error.keyPattern?.idempotencyKey;

if (isIdempotencyDuplicate) {
      const duplicateOrder =
        await PaymentOrder.findOne({
          userId:
            req.user._id,

          idempotencyKey:
            req.idempotencyKey,
        });

        if (!duplicateOrder) {
  throw error;
}

      return res.status(200).json({
        success: true,

        idempotentReplay: true,

        data: {
          paymentOrderId:
            duplicateOrder._id,

          razorpayOrderId:
            duplicateOrder
              .razorpayOrderId,

          status:
            duplicateOrder.status,

          amountPaise:
            duplicateOrder
              .amountPaise,

          currency:
            duplicateOrder.currency,

          keyId:
            process.env
              .RAZORPAY_KEY_ID,
        },
      });
    }

    throw error;
  }

  try {
    /*
     * Price comes only from our backend.
     * Never accept amount from frontend.
     */
    const razorpayOrder =
      await razorpay.orders.create({
        amount:
          paymentOrder.amountPaise,

        currency:
          paymentOrder.currency,

        receipt:
          paymentOrder.receipt,

        notes: {
          localPaymentOrderId:
            paymentOrder._id.toString(),

          userId:
            req.user._id.toString(),

          planCode:
            paymentOrder.planCode,
        },
      });

    paymentOrder.razorpayOrderId =
      razorpayOrder.id;

    paymentOrder.status =
      "CREATED";

    paymentOrder.lastVerifiedAt =
      new Date();

    await paymentOrder.save();

    return res.status(201).json({
      success: true,

      data: {
        paymentOrderId:
          paymentOrder._id,

        razorpayOrderId:
          paymentOrder
            .razorpayOrderId,

        status:
          paymentOrder.status,

        amountPaise:
          paymentOrder.amountPaise,

        currency:
          paymentOrder.currency,

        keyId:
          process.env
            .RAZORPAY_KEY_ID,

        plan: {
          code:
            plan.code,

          name:
            plan.name,

          type:
            plan.type,
        },
      },
    });
  } catch (error) {

    console.error(
  "Razorpay order creation failed:",
  {
    statusCode:
      error.statusCode || null,

    code:
      error.error?.code ||
      error.code ||
      null,

    description:
      error.error?.description ||
      error.description ||
      error.message ||
      "Unknown Razorpay error",
  }
);
    /*
     * A timeout is ambiguous:
     * Razorpay may have created the order
     * even if our server missed the reply.
     */
    const isAmbiguousFailure =
      error.code === "ETIMEDOUT" ||
      error.code === "ECONNABORTED" ||
      error.code === "ECONNRESET";

    paymentOrder.status =
      isAmbiguousFailure
        ? "UNKNOWN"
        : "FAILED";

    paymentOrder.failureCode =
      error.code ||
      "RAZORPAY_ORDER_ERROR";

    paymentOrder.failureDescription =
      String(
        error.message ||
          "Unable to create Razorpay order"
      ).slice(0, 500);

    await paymentOrder.save();

    return res
      .status(
        isAmbiguousFailure
          ? 202
          : 502
      )
      .json({
        success: false,

        code:
          isAmbiguousFailure
            ? "PAYMENT_STATE_UNKNOWN"
            : "PAYMENT_ORDER_FAILED",

        message:
          isAmbiguousFailure
            ? "Payment order status is being confirmed. Do not retry with a new key."
            : "Unable to create payment order",

        data: {
          paymentOrderId:
            paymentOrder._id,

          status:
            paymentOrder.status,
        },
      });
  }
};


// =====================================
// VERIFY CHECKOUT PAYMENT
// =====================================

const verifyPayment = async (
  req,
  res
) => {
  const {
    paymentOrderId,
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
  } = req.validated.body;

  /*
   * User can verify only their own order.
   */
  const paymentOrder =
    await PaymentOrder.findOne({
      _id:
        paymentOrderId,

      userId:
        req.user._id,
    });

  if (!paymentOrder) {
    return res.status(404).json({
      success: false,

      code:
        "PAYMENT_ORDER_NOT_FOUND",

      message:
        "Payment order was not found",
    });
  }

  /*
   * Never trust the order ID supplied
   * by the frontend.
   */
  if (
    paymentOrder
      .razorpayOrderId !==
    razorpayOrderId
  ) {
    return res.status(400).json({
      success: false,

      code:
        "PAYMENT_ORDER_MISMATCH",

      message:
        "Payment order verification failed",
    });
  }

  /*
   * Repeated verification after credits
   * were already granted is a safe no-op.
   */
  if (
    paymentOrder
      .entitlementGrantedAt
  ) {
    return res.status(200).json({
      success: true,

      idempotentReplay: true,

      data: {
        paymentOrderId:
          paymentOrder._id,

        status:
          paymentOrder.status,

        entitlementGranted:
          true,
      },
    });
  }

  const validSignature =
    verifyPaymentSignature({
      /*
       * Trusted ID from our database,
       * not directly from the client.
       */
      razorpayOrderId:
        paymentOrder
          .razorpayOrderId,

      razorpayPaymentId,

      razorpaySignature,
    });

  if (!validSignature) {
    return res.status(400).json({
      success: false,

      code:
        "PAYMENT_SIGNATURE_INVALID",

      message:
        "Payment signature verification failed",
    });
  }

  let razorpayPayment;

  try {
    /*
     * Signature proves authenticity.
     * Fetch confirms current status,
     * amount, currency and ownership.
     */
    razorpayPayment =
      await razorpay.payments.fetch(
        razorpayPaymentId
      );
  } catch (error) {
    console.error(
      "Razorpay payment fetch failed:",
      {
        statusCode:
          error.statusCode ||
          null,

        code:
          error.error?.code ||
          error.code ||
          null,

        description:
          error.error
            ?.description ||
          error.message ||
          "Unknown Razorpay error",
      }
    );

    /*
     * Do not assume success or failure
     * after a network/provider error.
     */
    await transitionPaymentStatus({
      paymentOrder,

      nextStatus:
        "UNKNOWN",

      actor:
        "USER",

      reason:
        "Unable to confirm payment status from Razorpay",

      correlationId:
        req.correlationId,
    });

    return res.status(202).json({
      success: false,

      code:
        "PAYMENT_STATUS_UNKNOWN",

      message:
        "Payment status is being confirmed. Do not make another payment.",

      data: {
        paymentOrderId:
          paymentOrder._id,

        status:
          "UNKNOWN",
      },
    });
  }

  /*
   * Verify every financial field.
   */
  const paymentMatches =
    razorpayPayment.id ===
      razorpayPaymentId &&

    razorpayPayment.order_id ===
      paymentOrder
        .razorpayOrderId &&

    razorpayPayment.amount ===
      paymentOrder
        .amountPaise &&

    razorpayPayment.currency ===
      paymentOrder.currency;

  if (!paymentMatches) {
    return res.status(400).json({
      success: false,

      code:
        "PAYMENT_DETAILS_MISMATCH",

      message:
        "Payment details do not match the order",
    });
  }

  if (
    razorpayPayment.status ===
    "captured"
  ) {
    const grantResult =
      await grantCapturedPayment({
        paymentOrderId:
          paymentOrder._id,

        razorpayPaymentId:
          razorpayPayment.id,

        actor:
          "USER",

        correlationId:
          req.correlationId,
      });

    return res.status(200).json({
      success: true,

      idempotentReplay:
        grantResult
          .alreadyGranted,

      message:
        "Payment verified successfully",

      data: {
        paymentOrderId:
          paymentOrder._id,

        status:
          "CAPTURED",

        entitlementGranted:
          true,
      },
    });
  }

  if (
    razorpayPayment.status ===
    "authorized"
  ) {
    await transitionPaymentStatus({
      paymentOrder,

      nextStatus:
        "AUTHORIZED",

      actor:
        "USER",

      reason:
        "Payment is authorized but not captured",

      correlationId:
        req.correlationId,
    });

    return res.status(202).json({
      success: true,

      message:
        "Payment is authorized and awaiting capture",

      data: {
        paymentOrderId:
          paymentOrder._id,

        status:
          "AUTHORIZED",

        entitlementGranted:
          false,
      },
    });
  }

  if (
    razorpayPayment.status ===
    "failed"
  ) {
    paymentOrder.failureCode =
      razorpayPayment
        .error_code ||
      "PAYMENT_FAILED";

    paymentOrder
      .failureDescription =
        razorpayPayment
          .error_description ||
        "Payment failed";

    await transitionPaymentStatus({
      paymentOrder,

      nextStatus:
        "FAILED",

      actor:
        "USER",

      reason:
        paymentOrder
          .failureDescription,

      correlationId:
        req.correlationId,
    });

    return res.status(402).json({
      success: false,

      code:
        "PAYMENT_FAILED",

      message:
        "Payment was not completed",
    });
  }

  await transitionPaymentStatus({
    paymentOrder,

    nextStatus:
      "PENDING",

    actor:
      "USER",

    reason:
      `Razorpay status: ${razorpayPayment.status}`,

    correlationId:
      req.correlationId,
  });

  return res.status(202).json({
    success: true,

    message:
      "Payment is still processing",

    data: {
      paymentOrderId:
        paymentOrder._id,

      status:
        "PENDING",

      entitlementGranted:
        false,
    },
  });
};
module.exports = {
  getPaymentPlans,
  createPaymentOrder,
  verifyPayment,
};