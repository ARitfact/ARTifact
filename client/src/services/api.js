const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000";

/*
 * Access token stays only in JavaScript
 * module memory—not localStorage.
 */
let accessToken = null;

/*
 * Prevent multiple simultaneous 401
 * responses from refreshing separately.
 */
let refreshPromise = null;

export const setAccessToken = (
  token
) => {
  accessToken =
    token || null;
};

export const clearAccessToken = () => {
  accessToken = null;
};

export const getAccessToken = () => {
  return accessToken;
};

const readResponse = async (
  response
) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const performRequest = async (
  endpoint,
  options
) => {
  const {
    method = "GET",
    body,
    headers = {},
    ...rest
  } = options;

  const requestHeaders = {
    ...headers,
  };

  if (body !== undefined && !(body instanceof FormData)) {
    requestHeaders[
      "Content-Type"
    ] = "application/json";
  }

  if (
    accessToken &&
    !requestHeaders.Authorization
  ) {
    requestHeaders.Authorization =
      `Bearer ${accessToken}`;
  }

  return fetch(
    `${API_URL}${endpoint}`,

    {
      method,

      credentials:
        "include",

      headers:
        requestHeaders,

      body:
  body instanceof FormData
    ? body
    : body !== undefined
      ? JSON.stringify(body)
      : undefined,

      ...rest,
    }
  );
};

const refreshAccessToken =
  async () => {
    if (refreshPromise) {
      return refreshPromise;
    }

    refreshPromise =
      (async () => {
        const response =
          await fetch(
            `${API_URL}/api/v1/auth/refresh`,

            {
              method: "POST",

              credentials:
                "include",

              headers: {
                "Content-Type":
                  "application/json",

                "X-CSRF-Protection":
                  "artifact-web",
              },
            }
          );

        const data =
          await readResponse(
            response
          );

        if (!response.ok) {
          clearAccessToken();

          throw new Error(
            data?.message ||
              "Session refresh failed"
          );
        }

        const newAccessToken =
          data?.data?.accessToken;

        if (!newAccessToken) {
          clearAccessToken();

          throw new Error(
            "Refresh response did not include an access token"
          );
        }

        setAccessToken(
          newAccessToken
        );

        return newAccessToken;
      })();

    try {
      return await refreshPromise;
    } finally {
      refreshPromise = null;
    }
  };

export async function apiRequest(
  endpoint,
  options = {}
) {
  const {
    skipAuthRefresh = false,
    ...requestOptions
  } = options;

  let response =
    await performRequest(
      endpoint,
      requestOptions
    );

  /*
   * Access token may expire after
   * 15 minutes. Refresh once, then
   * replay the original request.
   */
  if (
    response.status === 401 &&
    !skipAuthRefresh &&
    endpoint !==
      "/api/v1/auth/refresh"
  ) {
    try {
      await refreshAccessToken();

      response =
        await performRequest(
          endpoint,
          requestOptions
        );
    } catch {
      /*
       * Preserve the original 401
       * response below.
       */
    }
  }

  const data =
    await readResponse(
      response
    );

  if (!response.ok) {
    const error = new Error(
      data?.message ||
        data?.error ||
        "Something went wrong. Please try again."
    );

    error.status =
      response.status;

    error.code =
      data?.code ||
      "API_REQUEST_FAILED";

    error.data = data;

    throw error;
  }

  /*
   * Automatically capture tokens returned
   * after login or refresh.
   */
  const returnedAccessToken =
    data?.data?.accessToken;

  if (returnedAccessToken) {
    setAccessToken(
      returnedAccessToken
    );
  }

  return data;
}

export { API_URL };