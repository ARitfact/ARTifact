const argon2 = require("argon2");

const ARGON_OPTIONS = {
  type: argon2.argon2id,

  memoryCost: 19456,

  timeCost: 2,

  parallelism: 1,

  hashLength: 32,
};

const validatePassword = (password) => {
  if (typeof password !== "string") {
    return {
      valid: false,
      message: "Password is required",
    };
  }

  if (password.length < 8) {
    return {
      valid: false,
      message:
        "Password must contain at least 8 characters",
    };
  }

  if (password.length > 128) {
    return {
      valid: false,
      message:
        "Password cannot exceed 128 characters",
    };
  }

  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      message:
        "Password must contain a lowercase letter",
    };
  }

  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      message:
        "Password must contain an uppercase letter",
    };
  }

  if (!/[0-9]/.test(password)) {
    return {
      valid: false,
      message:
        "Password must contain a number",
    };
  }

  return {
    valid: true,
    message: null,
  };
};

const hashPassword = async (
  password
) => {
  const validation =
    validatePassword(password);

  if (!validation.valid) {
    const error = new Error(
      validation.message
    );

    error.statusCode = 400;
    error.code = "INVALID_PASSWORD";

    throw error;
  }

  return argon2.hash(
    password,
    ARGON_OPTIONS
  );
};

const verifyPassword = async (
  password,
  passwordHash
) => {
  if (
    !password ||
    !passwordHash
  ) {
    return false;
  }

  try {
    return await argon2.verify(
      passwordHash,
      password
    );
  } catch (error) {
    console.error(
      "Password verification failed:",
      error.message
    );

    return false;
  }
};

const passwordNeedsRehash = (
  passwordHash
) => {
  if (!passwordHash) {
    return false;
  }

  return argon2.needsRehash(
    passwordHash,
    ARGON_OPTIONS
  );
};

module.exports = {
  validatePassword,
  hashPassword,
  verifyPassword,
  passwordNeedsRehash,
};