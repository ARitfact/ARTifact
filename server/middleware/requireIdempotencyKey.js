const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const requireIdempotencyKey = (
  req,
  res,
  next
) => {
  const idempotencyKey =
    req.get("idempotency-key");

  if (
    !idempotencyKey ||
    !UUID_REGEX.test(idempotencyKey)
  ) {
    return res.status(400).json({
      success: false,

      code:
        "INVALID_IDEMPOTENCY_KEY",

      message:
        "A valid UUID Idempotency-Key header is required",
    });
  }

  req.idempotencyKey =
    idempotencyKey.toLowerCase();

  next();
};

module.exports =
  requireIdempotencyKey;