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


const loginSchema = z.object({
  body: z
    .object({
      email: emailSchema,

      password: z
        .string()
        .min(1, "Password is required")
        .max(
          128,
          "Password cannot exceed 128 characters"
        ),

      rememberMe: z
        .boolean()
        .optional()
        .default(false),

      deviceId: z
        .string()
        .trim()
        .min(1)
        .max(200)
        .optional(),
    })
    .strict(),

  params: z.object({}),

  query: z.object({}),
});

const googleLoginSchema = z.object({
  body: z
    .object({
      credential: z
        .string()
        .trim()
        .min(
          100,
          "Google credential is invalid"
        )
        .max(
          10000,
          "Google credential is too large"
        ),

      rememberMe: z
        .boolean()
        .optional()
        .default(false),

      deviceId: z
        .string()
        .trim()
        .min(1)
        .max(200)
        .optional(),

      acceptedTerms: z
        .boolean()
        .optional()
        .default(false),

      acceptedPrivacy: z
        .boolean()
        .optional()
        .default(false),
    })
    .strict(),

  params: z.object({}),

  query: z.object({}),
});

const forgotPasswordSchema =
  z.object({
    body: z
      .object({
        email: emailSchema,
      })
      .strict(),

    params: z.object({}),
    query: z.object({}),
  });

const resetPasswordSchema =
  z.object({
    body: z
      .object({
        email: emailSchema,

        otp: otpSchema,

        newPassword:
          passwordSchema,
      })
      .strict(),

    params: z.object({}),
    query: z.object({}),
  });

const changePasswordSchema =
  z.object({
    body: z
      .object({
        currentPassword: z
          .string()
          .min(
            1,
            "Current password is required"
          )
          .max(
            128,
            "Current password is too long"
          ),

        newPassword:
          passwordSchema,
      })
      .strict()
      .refine(
        (data) =>
          data.currentPassword !==
          data.newPassword,
        {
          message:
            "New password must be different from current password",
          path: ["newPassword"],
        }
      ),

    params: z.object({}),
    query: z.object({}),
  });
module.exports = {
  registerSchema,
  verifyEmailSchema,
  resendEmailOTPSchema,
  loginSchema,
  googleLoginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
};