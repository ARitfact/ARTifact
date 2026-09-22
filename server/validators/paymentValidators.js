const { z } = require("zod");

const mongoIdSchema =
  z.string().regex(
    /^[a-fA-F0-9]{24}$/,
    "Invalid payment order ID"
  );

const razorpayOrderIdSchema =
  z.string().regex(
    /^order_[a-zA-Z0-9]+$/,
    "Invalid Razorpay order ID"
  );

const razorpayPaymentIdSchema =
  z.string().regex(
    /^pay_[a-zA-Z0-9]+$/,
    "Invalid Razorpay payment ID"
  );

const razorpaySignatureSchema =
  z.string().regex(
    /^[a-fA-F0-9]{64}$/,
    "Invalid Razorpay signature"
  );

// =====================================
// CREATE PAYMENT ORDER
// =====================================

const createPaymentOrderSchema =
  z.object({
    body: z
      .object({
        planCode: z.enum([
          "pack_3",
          "pack_10",
          "unlimited_monthly",
        ]),
      })
      .strict(),

    params: z.object({}),

    query: z.object({}),
  });

// =====================================
// VERIFY CHECKOUT PAYMENT
// =====================================

const verifyPaymentSchema =
  z.object({
    body: z
      .object({
        paymentOrderId:
          mongoIdSchema,

        razorpayOrderId:
          razorpayOrderIdSchema,

        razorpayPaymentId:
          razorpayPaymentIdSchema,

        razorpaySignature:
          razorpaySignatureSchema,
      })
      .strict(),

    params: z.object({}),

    query: z.object({}),
  });

// =====================================
// GET PAYMENT STATUS
// =====================================

const paymentStatusSchema =
  z.object({
    body: z.object({}),

    params: z
      .object({
        paymentOrderId:
          mongoIdSchema,
      })
      .strict(),

    query: z.object({}),
  });

module.exports = {
  createPaymentOrderSchema,
  verifyPaymentSchema,
  paymentStatusSchema,
};