const crypto = require("crypto");

const getSecret = () => {
  const secret = process.env.MODEL_URL_SIGNING_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "MODEL_URL_SIGNING_SECRET must be at least 32 characters"
    );
  }

  return secret;
};

function signModelUrl(taskId, userId) {
  const expires = Math.floor(Date.now() / 1000) + 10 * 60;
  const payload = `${taskId}:${userId}:${expires}`;

  const signature = crypto
    .createHmac("sha256", getSecret())
    .update(payload)
    .digest("hex");

  return { expires, signature };
}

function verifyModelUrl(taskId, userId, expires, signature) {
  const expiry = Number(expires);

  if (
    !Number.isSafeInteger(expiry) ||
    expiry < Math.floor(Date.now() / 1000) ||
    typeof signature !== "string" ||
    !/^[0-9a-f]{64}$/i.test(signature)
  ) {
    return false;
  }

  const payload = `${taskId}:${userId}:${expiry}`;

  const expected = crypto
    .createHmac("sha256", getSecret())
    .update(payload)
    .digest();

  const received = Buffer.from(signature, "hex");

  return crypto.timingSafeEqual(expected, received);
}

module.exports = { signModelUrl, verifyModelUrl };