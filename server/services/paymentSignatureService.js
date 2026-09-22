const crypto = require("crypto");

const verifyPaymentSignature = ({
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
}) => {
  const keySecret =
    process.env.RAZORPAY_KEY_SECRET;

  if (!keySecret) {
    throw new Error(
      "Razorpay key secret is missing"
    );
  }

  /*
   * Razorpay signs:
   * order_id + "|" + payment_id
   */
  const expectedSignature =
    crypto
      .createHmac(
        "sha256",
        keySecret
      )
      .update(
        `${razorpayOrderId}|${razorpayPaymentId}`
      )
      .digest("hex");

  const expectedBuffer =
    Buffer.from(
      expectedSignature,
      "hex"
    );

  const receivedBuffer =
    Buffer.from(
      razorpaySignature,
      "hex"
    );

  /*
   * timingSafeEqual prevents timing-based
   * signature comparison attacks.
   */
  if (
    expectedBuffer.length !==
    receivedBuffer.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    expectedBuffer,
    receivedBuffer
  );
};

module.exports = {
  verifyPaymentSignature,
};