const { z } = require("zod");

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Please enter a valid email")
  .max(254, "Email is too long");

const otpSchema = z
  .string()
  .trim()
  .regex(
    /^\d{6}$/,
    "OTP must contain exactly 6 digits"
  );

const passwordSchema = z
  .string()
  .min(
    8,
    "Password must contain at least 8 characters"
  )
  .max(
    128,
    "Password cannot exceed 128 characters"
  )
  .regex(
    /[a-z]/,
    "Password must contain a lowercase letter"
  )
  .regex(
    /[A-Z]/,
    "Password must contain an uppercase letter"
  )
  .regex(
    /[0-9]/,
    "Password must contain a number"
  );

const registerSchema = z.object({
  body: z
    .object({
      name: z
        .string()
        .trim()
        .min(
          2,
          "Name must contain at least 2 characters"
        )
        .max(
          60,
          "Name cannot exceed 60 characters"
        ),

      email: emailSchema,

      password: passwordSchema,

      acceptedTerms: z
        .boolean()
        .refine(
          (value) => value === true,
          {
            message:
              "You must accept the Terms of Service",
          }
        ),

      acceptedPrivacy: z
        .boolean()
        .refine(
          (value) => value === true,
          {
            message:
              "You must accept the Privacy Policy",
          }
        ),
    })
    .strict(),

  params: z.object({}),

  query: z.object({}),
});

const verifyEmailSchema = z.object({
  body: z
    .object({
      email: emailSchema,
      otp: otpSchema,
    })
    .strict(),

  params: z.object({}),

  query: z.object({}),
});

const resendEmailOTPSchema = z.object({
  body: z
    .object({
      email: emailSchema,
    })
    .strict(),

  params: z.object({}),

  query: z.object({}),
});

module.exports = {
  registerSchema,
  verifyEmailSchema,
  resendEmailOTPSchema,
};