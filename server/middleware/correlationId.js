const crypto = require("crypto");

const CORRELATION_ID_REGEX =
  /^[a-zA-Z0-9._:-]{8,100}$/;

const correlationId = (
  req,
  res,
  next
) => {
  const incomingId =
    req.get("x-correlation-id");

  /*
   * Accept a valid client-generated ID.
   * Otherwise generate a secure UUID.
   */
  req.correlationId =
    incomingId &&
    CORRELATION_ID_REGEX.test(
      incomingId
    )
      ? incomingId
      : crypto.randomUUID();

  /*
   * Return the same ID so frontend logs
   * can be matched with backend logs.
   */
  res.setHeader(
    "X-Correlation-Id",
    req.correlationId
  );

  next();
};

module.exports = correlationId;