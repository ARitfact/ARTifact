const crypto = require("crypto");

const getRequiredSecret = (name) => {
  const value = process.env[name];

  if (!value || value.length < 32) {
    throw new Error(
      `${name} must contain at least 32 characters`
    );
  }

  return value;
};

const generateOTP = () => {
  return crypto
    .randomInt(100000, 1000000)
    .toString();
};

const generateSecureToken = (
  numberOfBytes = 64
) => {
  return crypto
    .randomBytes(numberOfBytes)
    .toString("hex");
};

const generateTokenFamily = () => {
  return crypto.randomUUID();
};

const generateDeviceId = () => {
  return crypto.randomUUID();
};

const hashOTP = (otp) => {
  const pepper =
    getRequiredSecret("OTP_PEPPER");

  return crypto
    .createHmac("sha256", pepper)
    .update(String(otp))
    .digest("hex");
};

const hashToken = (token) => {
  const pepper =
    getRequiredSecret("TOKEN_PEPPER");

  return crypto
    .createHmac("sha256", pepper)
    .update(String(token))
    .digest("hex");
};

const safeCompare = (
  firstValue,
  secondValue
) => {
  if (
    typeof firstValue !== "string" ||
    typeof secondValue !== "string"
  ) {
    return false;
  }

  const firstBuffer =
    Buffer.from(firstValue);

  const secondBuffer =
    Buffer.from(secondValue);

  if (
    firstBuffer.length !==
    secondBuffer.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    firstBuffer,
    secondBuffer
  );
};

const verifyOTPHash = (
  otp,
  storedHash
) => {
  const receivedHash = hashOTP(otp);

  return safeCompare(
    receivedHash,
    storedHash
  );
};

const verifyTokenHash = (
  token,
  storedHash
) => {
  const receivedHash = hashToken(token);

  return safeCompare(
    receivedHash,
    storedHash
  );
};

module.exports = {
  generateOTP,
  generateSecureToken,
  generateTokenFamily,
  generateDeviceId,
  hashOTP,
  hashToken,
  safeCompare,
  verifyOTPHash,
  verifyTokenHash,
};