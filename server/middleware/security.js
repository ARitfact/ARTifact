const getAllowedOrigins = () => {
  return (
    process.env.CLIENT_URLS ||
    "http://localhost:5173,http://127.0.0.1:5173"
  )
    .split(",")
    .map((origin) =>
      origin.trim().replace(/\/$/, "")
    )
    .filter(Boolean);
};

/*
 * Protect endpoints that authenticate using
 * an HttpOnly refresh-token cookie.
 *
 * Custom header forces browser preflight,
 * while Origin validation prevents another
 * website from using the user's cookie.
 */
const protectCookieRequest = (
  req,
  res,
  next
) => {
  if (
    process.env.NODE_ENV !==
    "production"
  ) {
    return next();
  }

  const origin = req.get("origin");

  const csrfProtection =
    req.get(
      "x-csrf-protection"
    );

  const allowedOrigins =
    getAllowedOrigins();

  if (
    csrfProtection !==
    "artifact-web"
  ) {
    return res.status(403).json({
      success: false,
      code: "CSRF_PROTECTION_REQUIRED",
      message:
        "Request security verification failed",
    });
  }

  if (
    !origin ||
    !allowedOrigins.includes(
      origin.replace(/\/$/, "")
    )
  ) {
    return res.status(403).json({
      success: false,
      code: "UNTRUSTED_ORIGIN",
      message:
        "Request origin is not trusted",
    });
  }

  return next();
};

const preventAuthCaching = (
  req,
  res,
  next
) => {
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, private"
  );

  res.setHeader(
    "Pragma",
    "no-cache"
  );

  res.setHeader(
    "Expires",
    "0"
  );

  next();
};

module.exports = {
  getAllowedOrigins,
  protectCookieRequest,
  preventAuthCaching,
};