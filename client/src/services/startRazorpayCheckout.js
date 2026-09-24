import loadRazorpay from
  "../utils/loadRazorpay";

import {
  createPaymentOrder,
  verifyPayment,
} from "./paymentApi";

const startRazorpayCheckout =
  async ({
    planCode,
    user,
  }) => {
    const loaded =
      await loadRazorpay();

    if (!loaded) {
      throw new Error(
        "Razorpay Checkout could not be loaded. Check your internet connection."
      );
    }

    /*
     * One UUID per purchase attempt.
     * apiRequest retry will reuse it.
     */
    const idempotencyKey =
      crypto.randomUUID();

    const orderResponse =
      await createPaymentOrder({
        planCode,
        idempotencyKey,
      });

    const order =
      orderResponse.data;

    if (
      !order.razorpayOrderId ||
      order.status === "UNKNOWN"
    ) {
      const error = new Error(
        "Payment order status is being confirmed. Please do not retry."
      );

      error.code =
        "PAYMENT_ORDER_UNAVAILABLE";

      throw error;
    }

    return new Promise(
      (resolve, reject) => {
        const options = {
          /*
           * Public Test Mode Key ID.
           * Key Secret never reaches frontend.
           */
          key:
            order.keyId,

          amount:
            order.amountPaise,

          currency:
            order.currency,

          order_id:
            order.razorpayOrderId,

          name:
            "AR-tifact",

          description:
            order.plan?.name ||
            "Image to 3D generation plan",

          prefill: {
            name:
              user?.name || "",

            email:
              user?.email || "",

            contact:
              user?.phone || "",
          },

          notes: {
            localPaymentOrderId:
              order.paymentOrderId,

            planCode,
          },

          theme: {
            color:
              "#2563eb",
          },

          handler:
            async (
              razorpayResponse
            ) => {
              try {
                const verification =
                  await verifyPayment({
                    paymentOrderId:
                      order
                        .paymentOrderId,

                    razorpayOrderId:
                      razorpayResponse
                        .razorpay_order_id,

                    razorpayPaymentId:
                      razorpayResponse
                        .razorpay_payment_id,

                    razorpaySignature:
                      razorpayResponse
                        .razorpay_signature,
                  });

                resolve({
                  success: true,
                  verification,
                });
              } catch (
                verificationError
              ) {
                reject(
                  verificationError
                );
              }
            },

          modal: {
            ondismiss: () => {
              resolve({
                success: false,
                dismissed: true,
              });
            },
          },
        };

        const checkout =
          new window.Razorpay(
            options
          );

        checkout.on(
          "payment.failed",

          (response) => {
            const error =
              new Error(
                response.error
                  ?.description ||
                "Payment failed"
              );

            error.code =
              response.error
                ?.code ||
              "PAYMENT_FAILED";

            error.details = {
              source:
                response.error
                  ?.source,

              step:
                response.error
                  ?.step,

              reason:
                response.error
                  ?.reason,

              orderId:
                response.error
                  ?.metadata
                  ?.order_id,

              paymentId:
                response.error
                  ?.metadata
                  ?.payment_id,
            };

            reject(error);
          }
        );

        checkout.open();
      }
    );
  };

export default startRazorpayCheckout;