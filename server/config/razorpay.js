const Razorpay = require("razorpay");

const {
  RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET,
} = process.env;

if (
  !RAZORPAY_KEY_ID ||
  !RAZORPAY_KEY_SECRET
) {
  throw new Error(
    "Razorpay credentials are missing"
  );
}

const razorpayClient =
  new Razorpay({
    key_id:
      RAZORPAY_KEY_ID,

    key_secret:
      RAZORPAY_KEY_SECRET,
  });

module.exports =
  razorpayClient;