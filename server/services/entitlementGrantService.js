const mongoose = require("mongoose");

const PaymentOrder =
  require(
    "../models/paymentOrder"
  );

const Entitlement =
  require(
    "../models/Entitlement"
  );

const CreditLedger =
  require(
    "../models/CreditLedger"
  );

const FinancialLedger =
  require(
    "../models/FinancialLedger"
  );

const {
  transitionPaymentStatus,
} = require(
  "./paymentStateService"
);

const grantCapturedPayment =
  async ({
    paymentOrderId,
    razorpayPaymentId,
    actor,
    correlationId,
  }) => {
    const session =
      await mongoose.startSession();

    let result;

    try {
      await session.withTransaction(
        async () => {
          const paymentOrder =
            await PaymentOrder
              .findById(
                paymentOrderId
              )
              .session(session);

          if (!paymentOrder) {
            const error =
              new Error(
                "Payment order was not found"
              );

            error.code =
              "PAYMENT_ORDER_NOT_FOUND";

            error.statusCode = 404;

            throw error;
          }

          /*
           * A captured payment may be
           * processed by both checkout
           * verification and webhook.
           */
          if (
            paymentOrder
              .entitlementGrantedAt
          ) {
            result = {
              alreadyGranted: true,
              paymentOrder,
            };

            return;
          }

          paymentOrder
            .razorpayPaymentId =
              razorpayPaymentId;

          await transitionPaymentStatus({
            paymentOrder,

            nextStatus:
              "CAPTURED",

            actor,

            reason:
              "Razorpay confirmed captured payment",

            correlationId,

            session,
          });

          let entitlement =
            await Entitlement
              .findOne({
                userId:
                  paymentOrder.userId,
              })
              .session(session);

          /*
           * Every user receives exactly
           * one free generation.
           */
          if (!entitlement) {
            entitlement =
              new Entitlement({
                userId:
                  paymentOrder.userId,

                freeCredits: 1,

                purchasedCredits: 0,

                reservedCredits: 0,
              });
          }

          const plan =
            paymentOrder.planSnapshot;

          if (
            plan.type ===
            "credit_pack"
          ) {
            if (
              !Number.isSafeInteger(
                plan.credits
              ) ||
              plan.credits <= 0
            ) {
              throw new Error(
                "Payment plan has invalid credits"
              );
            }

            entitlement
              .purchasedCredits +=
                plan.credits;

            await CreditLedger.create(
              [
                {
                  userId:
                    paymentOrder.userId,

                  referenceType:
                    "PAYMENT",

                  referenceId:
                    paymentOrder._id
                      .toString(),

                  entryType:
                    "CREDIT",

                  creditSource:
                    "PURCHASED",

                  credits:
                    plan.credits,

                  correlationId,

                  metadata: {
                    planCode:
                      paymentOrder
                        .planCode,

                    razorpayPaymentId,
                  },
                },
              ],
              {
                session,
              }
            );
          } else if (
            plan.type ===
            "subscription"
          ) {
            const now =
              new Date();

            const durationMs =
              plan.durationDays *
              24 *
              60 *
              60 *
              1000;

            const currentlyActive =
              entitlement
                .subscription
                .active &&
              entitlement
                .subscription
                .endsAt &&
              entitlement
                .subscription
                .endsAt > now;

            if (currentlyActive) {
              /*
               * Early renewal extends the
               * current subscription.
               */
              entitlement
                .subscription
                .endsAt =
                  new Date(
                    entitlement
                      .subscription
                      .endsAt
                      .getTime() +
                    durationMs
                  );
            } else {
              entitlement.subscription = {
                active: true,

                planCode:
                  paymentOrder.planCode,

                startsAt:
                  now,

                endsAt:
                  new Date(
                    now.getTime() +
                    durationMs
                  ),

                dailyFairUseLimit:
                  plan.dailyFairUseLimit,

                monthlyFairUseLimit:
                  plan.monthlyFairUseLimit,

                dailyUsed: 0,

                monthlyUsed: 0,

                dailyWindow:
                  now
                    .toISOString()
                    .slice(0, 10),

                monthlyWindowStartedAt:
                  now,
              };
            }
          } else {
            throw new Error(
              "Unsupported payment plan type"
            );
          }

          await entitlement.save({
            session,
          });

          /*
           * Double-entry financial record.
           */
          await FinancialLedger.create(
            [
              {
                transactionId:
                  razorpayPaymentId,

                paymentOrderId:
                  paymentOrder._id,

                userId:
                  paymentOrder.userId,

                entryType:
                  "PAYMENT_CAPTURE",

                debitAccount:
                  "razorpay_receivable",

                creditAccount:
                  "generation_revenue",

                amountPaise:
                  paymentOrder
                    .amountPaise,

                currency:
                  paymentOrder.currency,

                description:
                  `Captured ${paymentOrder.planCode} payment`,

                correlationId,
              },
            ],
            {
              session,
            }
          );

          paymentOrder
            .entitlementGrantedAt =
              new Date();

          await paymentOrder.save({
            session,
          });

          result = {
            alreadyGranted: false,
            paymentOrder,
            entitlement,
          };
        }
      );

      return result;
    } finally {
      await session.endSession();
    }
  };

module.exports = {
  grantCapturedPayment,
};