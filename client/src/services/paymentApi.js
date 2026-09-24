import {
  apiRequest,
} from "./api";

// =====================================
// GET PAYMENT PLANS
// =====================================

export const getPaymentPlans =
  async () => {
    return apiRequest(
      "/api/v1/payments/plans"
    );
  };

// =====================================
// CREATE PAYMENT ORDER
// =====================================

export const createPaymentOrder =
  async ({
    planCode,
    idempotencyKey,
  }) => {
    if (!idempotencyKey) {
      throw new Error(
        "Idempotency key is required"
      );
    }

    return apiRequest(
      "/api/v1/payments/orders",

      {
        method: "POST",

        headers: {
          "Idempotency-Key":
            idempotencyKey,
        },

        body: {
          planCode,
        },
      }
    );
  };

// =====================================
// VERIFY CHECKOUT PAYMENT
// =====================================

export const verifyPayment =
  async ({
    paymentOrderId,
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
  }) => {
    return apiRequest(
      "/api/v1/payments/verify",

      {
        method: "POST",

        body: {
          paymentOrderId,
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature,
        },
      }
    );
  };