import {
  apiRequest,
  clearAccessToken,
} from "./api";

const AUTH_BASE =
  "/api/v1/auth";

export const authService = {
  async register({
    name,
    email,
    password,
    acceptedTerms,
    acceptedPrivacy,
  }) {
    return apiRequest(
      `${AUTH_BASE}/register`,

      {
        method: "POST",

        skipAuthRefresh:
          true,

        body: {
          name,
          email,
          password,
          acceptedTerms,
          acceptedPrivacy,
        },
      }
    );
  },

  async verifyEmail({
    email,
    otp,
  }) {
    return apiRequest(
      `${AUTH_BASE}/verify-email`,

      {
        method: "POST",

        skipAuthRefresh:
          true,

        body: {
          email,
          otp,
        },
      }
    );
  },

  async resendEmailOTP({
    email,
  }) {
    return apiRequest(
      `${AUTH_BASE}/resend-email-otp`,

      {
        method: "POST",

        skipAuthRefresh:
          true,

        body: {
          email,
        },
      }
    );
  },

  async login({
    email,
    password,
    rememberMe = false,
  }) {
    /*
     * apiRequest automatically stores
     * returned accessToken in memory.
     */
    return apiRequest(
      `${AUTH_BASE}/login`,

      {
        method: "POST",

        skipAuthRefresh:
          true,

        body: {
          email,
          password,
          rememberMe,
        },
      }
    );
  },
  async googleLogin({
  credential,
  acceptedTerms = false,
  acceptedPrivacy = false,
}) {
  return apiRequest(
    `${AUTH_BASE}/google`,
    {
      method: "POST",
      skipAuthRefresh: true,
      body: {
        credential,
        acceptedTerms,
        acceptedPrivacy,
      },
    }
  );
},

  async getCurrentUser() {
    /*
     * On page refresh, the first /me
     * request may return 401. apiRequest
     * then refreshes and retries.
     */
    return apiRequest(
      `${AUTH_BASE}/me`
    );
  },

  async logout() {
    try {
      return await apiRequest(
        `${AUTH_BASE}/logout`,

        {
          method: "POST",

          skipAuthRefresh:
            true,

          headers: {
            "X-CSRF-Protection":
              "artifact-web",
          },
        }
      );
    } finally {
      clearAccessToken();
    }
  },

  async forgotPassword(
    email
  ) {
    return apiRequest(
      `${AUTH_BASE}/forgot-password`,

      {
        method: "POST",

        skipAuthRefresh:
          true,

        body: {
          email,
        },
      }
    );
  },

  async resetPassword({
    email,
    otp,
    newPassword,
  }) {
    return apiRequest(
      `${AUTH_BASE}/reset-password`,

      {
        method: "POST",

        skipAuthRefresh:
          true,

        body: {
          email,
          otp,
          newPassword,
        },
      }
    );
  },

  async changePassword({
    currentPassword,
    newPassword,
  }) {
    return apiRequest(
      `${AUTH_BASE}/change-password`,

      {
        method: "POST",

        body: {
          currentPassword,
          newPassword,
        },
      }
    );
  },

  async logoutAll() {
    try {
      return await apiRequest(
        `${AUTH_BASE}/logout-all`,

        {
          method: "POST",
        }
      );
    } finally {
      clearAccessToken();
    }
  },
};