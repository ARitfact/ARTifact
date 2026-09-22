const PaymentAuditLog =
  require(
    "../models/PaymentAuditLog"
  );

const ALLOWED_TRANSITIONS = {
  CREATING: [
    "CREATED",
    "UNKNOWN",
    "FAILED",
  ],

  CREATED: [
    "PENDING",
    "AUTHORIZED",
    "CAPTURED",
    "FAILED",
    "UNKNOWN",
  ],

  PENDING: [
    "AUTHORIZED",
    "CAPTURED",
    "FAILED",
    "UNKNOWN",
  ],

  AUTHORIZED: [
    "CAPTURED",
    "VOIDED",
    "FAILED",
    "UNKNOWN",
  ],

  /*
   * Razorpay may later confirm an
   * initially ambiguous request.
   */
  UNKNOWN: [
    "CREATED",
    "PENDING",
    "AUTHORIZED",
    "CAPTURED",
    "FAILED",
    "VOIDED",
  ],

  /*
   * Late-authorized payments can
   * sometimes follow an earlier failure.
   */
  FAILED: [
    "AUTHORIZED",
    "CAPTURED",
  ],

  CAPTURED: [
    "REFUND_PENDING",
    "REFUNDED",
    "CHARGEBACK",
  ],

  REFUND_PENDING: [
    "CAPTURED",
    "REFUNDED",
    "CHARGEBACK",
  ],

  REFUNDED: [
    "CHARGEBACK",
  ],

  VOIDED: [],

  CHARGEBACK: [],
};

const transitionPaymentStatus =
  async ({
    paymentOrder,
    nextStatus,
    actor,
    reason,
    correlationId,
    session = null,
  }) => {
    const currentStatus =
      paymentOrder.status;

    /*
     * Same event received again:
     * treat as successful no-op.
     */
    if (
      currentStatus === nextStatus
    ) {
      return {
        changed: false,
        paymentOrder,
      };
    }

    const allowedStatuses =
      ALLOWED_TRANSITIONS[
        currentStatus
      ] || [];

    if (
      !allowedStatuses.includes(
        nextStatus
      )
    ) {
      const error = new Error(
        `Invalid payment transition: ${currentStatus} -> ${nextStatus}`
      );

      error.code =
        "INVALID_PAYMENT_TRANSITION";

      error.statusCode = 409;

      throw error;
    }

    paymentOrder.status =
      nextStatus;

    paymentOrder.lastVerifiedAt =
      new Date();

    await paymentOrder.save({
      session,
    });

    await PaymentAuditLog.create(
      [
        {
          paymentOrderId:
            paymentOrder._id,

          userId:
            paymentOrder.userId,

          action:
            "PAYMENT_STATUS_CHANGED",

          fromStatus:
            currentStatus,

          toStatus:
            nextStatus,

          actor,

          reason:
            reason || null,

          correlationId,
        },
      ],
      {
        session,
      }
    );

    return {
      changed: true,
      paymentOrder,
    };
  };

module.exports = {
  ALLOWED_TRANSITIONS,
  transitionPaymentStatus,
};