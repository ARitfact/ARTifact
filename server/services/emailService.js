const axios = require("axios");

const BREVO_API_URL =
  "https://api.brevo.com/v3/smtp/email";

const escapeHTML = (value = "") => {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
};

const getEmailConfiguration = () => {
  const {
    BREVO_API_KEY,
    EMAIL_FROM_ADDRESS,
    EMAIL_FROM_NAME,
    EMAIL_REPLY_TO,
  } = process.env;

  if (!BREVO_API_KEY) {
    throw new Error(
      "BREVO_API_KEY is missing"
    );
  }

  if (!EMAIL_FROM_ADDRESS) {
    throw new Error(
      "EMAIL_FROM_ADDRESS is missing"
    );
  }

  return {
    apiKey: BREVO_API_KEY,

    senderAddress:
      EMAIL_FROM_ADDRESS,

    senderName:
      EMAIL_FROM_NAME ||
      "ARTifact",

    replyTo:
      EMAIL_REPLY_TO ||
      EMAIL_FROM_ADDRESS,
  };
};

const sendTransactionalEmail =
  async ({
    to,
    recipientName = "",
    subject,
    htmlContent,
    textContent,
  }) => {
    const configuration =
      getEmailConfiguration();

    try {
      const response =
        await axios.post(
          BREVO_API_URL,

          {
            sender: {
              name:
                configuration.senderName,

              email:
                configuration.senderAddress,
            },

            to: [
              {
                email: to,

                ...(recipientName
                  ? {
                      name: recipientName,
                    }
                  : {}),
              },
            ],

            replyTo: {
              email:
                configuration.replyTo,

              name:
                configuration.senderName,
            },

            subject,

            htmlContent,

            textContent,
          },

          {
            headers: {
              accept:
                "application/json",

              "api-key":
                configuration.apiKey,

              "content-type":
                "application/json",
            },

            timeout: 15000,
          }
        );

      return {
        success: true,

        messageId:
          response.data?.messageId ||
          null,
      };
    } catch (error) {
      console.error(
        "Brevo email error:",
        {
          status:
            error.response?.status,

          message:
            error.response?.data
              ?.message ||
            error.message,
        }
      );

      const emailError =
        new Error(
          "Unable to send email"
        );

      emailError.statusCode = 502;
      emailError.code =
        "EMAIL_DELIVERY_FAILED";

      throw emailError;
    }
  };

const getOTPContent = ({
  name,
  otp,
  purpose,
}) => {
  const safeName =
    escapeHTML(name || "there");

  const safeOTP =
    escapeHTML(otp);

  const purposeContent = {
    email_verification: {
      subject:
        "Verify your ARTifact account",

      heading:
        "Verify your email address",

      description:
        "Use the verification code below to activate your ARTifact account.",
    },

    password_reset: {
      subject:
        "Reset your ARTifact password",

      heading:
        "Reset your password",

      description:
        "Use the code below to reset your ARTifact account password.",
    },

    email_change: {
      subject:
        "Confirm your new email address",

      heading:
        "Confirm your email address",

      description:
        "Use the verification code below to confirm your new email address.",
    },
  };

  const selectedContent =
    purposeContent[purpose];

  if (!selectedContent) {
    throw new Error(
      "Unsupported OTP purpose"
    );
  }

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />

  <title>
    ${selectedContent.subject}
  </title>
</head>

<body
  style="
    margin: 0;
    padding: 0;
    background-color: #f4f4f5;
    font-family: Arial, Helvetica, sans-serif;
    color: #18181b;
  "
>
  <table
    role="presentation"
    width="100%"
    cellspacing="0"
    cellpadding="0"
    border="0"
    style="
      width: 100%;
      background-color: #f4f4f5;
      padding: 32px 16px;
    "
  >
    <tr>
      <td align="center">

        <table
          role="presentation"
          width="100%"
          cellspacing="0"
          cellpadding="0"
          border="0"
          style="
            width: 100%;
            max-width: 560px;
            background-color: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            border: 1px solid #e4e4e7;
          "
        >
          <tr>
            <td
              style="
                background-color: #18181b;
                color: #ffffff;
                padding: 24px 32px;
                text-align: center;
              "
            >
              <div
                style="
                  font-size: 26px;
                  font-weight: 700;
                  letter-spacing: -0.5px;
                "
              >
                ARTifact
              </div>

              <div
                style="
                  margin-top: 6px;
                  font-size: 13px;
                  color: #a1a1aa;
                "
              >
                Visualise your space before
                transforming it
              </div>
            </td>
          </tr>

          <tr>
            <td
              style="
                padding: 36px 32px;
              "
            >
              <p
                style="
                  margin: 0 0 18px;
                  font-size: 16px;
                "
              >
                Hello ${safeName},
              </p>

              <h1
                style="
                  margin: 0 0 14px;
                  font-size: 24px;
                  line-height: 1.3;
                "
              >
                ${selectedContent.heading}
              </h1>

              <p
                style="
                  margin: 0;
                  color: #52525b;
                  font-size: 15px;
                  line-height: 1.7;
                "
              >
                ${selectedContent.description}
              </p>

              <div
                style="
                  margin: 30px 0;
                  padding: 20px;
                  border-radius: 12px;
                  background-color: #f4f4f5;
                  border: 1px solid #e4e4e7;
                  text-align: center;
                "
              >
                <div
                  style="
                    color: #71717a;
                    font-size: 12px;
                    font-weight: 600;
                    letter-spacing: 1.5px;
                    text-transform: uppercase;
                  "
                >
                  Verification code
                </div>

                <div
                  style="
                    margin-top: 10px;
                    color: #18181b;
                    font-size: 36px;
                    font-weight: 700;
                    letter-spacing: 8px;
                  "
                >
                  ${safeOTP}
                </div>
              </div>

              <p
                style="
                  margin: 0;
                  color: #52525b;
                  font-size: 14px;
                  line-height: 1.7;
                "
              >
                This code expires in
                <strong>10 minutes</strong>.
                Do not share it with anyone.
              </p>

              <p
                style="
                  margin: 22px 0 0;
                  color: #71717a;
                  font-size: 13px;
                  line-height: 1.6;
                "
              >
                If you did not request this
                email, you can safely ignore
                it.
              </p>
            </td>
          </tr>

          <tr>
            <td
              style="
                padding: 20px 32px;
                border-top: 1px solid #e4e4e7;
                color: #71717a;
                font-size: 12px;
                text-align: center;
              "
            >
              © ${new Date().getFullYear()}
              ARTifact. All rights reserved.
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const textContent = `
Hello ${name || "there"},

${selectedContent.heading}

${selectedContent.description}

Your verification code is: ${otp}

This code expires in 10 minutes.

Do not share this code with anyone.

If you did not request this email, you can safely ignore it.

ARTifact
  `.trim();

  return {
    subject:
      selectedContent.subject,

    htmlContent,

    textContent,
  };
};

const sendOTPEmail = async ({
  email,
  name,
  otp,
  purpose,
}) => {
  const content =
    getOTPContent({
      name,
      otp,
      purpose,
    });

  return sendTransactionalEmail({
    to: email,

    recipientName: name,

    subject: content.subject,

    htmlContent:
      content.htmlContent,

    textContent:
      content.textContent,
  });
};

module.exports = {
  sendTransactionalEmail,
  sendOTPEmail,
};