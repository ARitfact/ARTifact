const getPositiveInteger = (
  environmentVariable
) => {
  const value = Number(
    process.env[environmentVariable]
  );

  if (
    !Number.isSafeInteger(value) ||
    value <= 0
  ) {
    throw new Error(
      `${environmentVariable} must be a positive integer in paise`
    );
  }

  return value;
};

const paymentPlans = Object.freeze({
  pack_3: Object.freeze({
    code: "pack_3",
    name: "3 Image Generations",
    type: "credit_pack",

    credits: 3,

    amountPaise:
      getPositiveInteger(
        "PACK_3_PRICE_PAISE"
      ),

    currency: "INR",
  }),

  pack_10: Object.freeze({
    code: "pack_10",
    name: "10 Image Generations",
    type: "credit_pack",

    credits: 10,

    amountPaise:
      getPositiveInteger(
        "PACK_10_PRICE_PAISE"
      ),

    currency: "INR",
  }),

  unlimited_monthly: Object.freeze({
    code: "unlimited_monthly",
    name: "Monthly Unlimited",
    type: "subscription",

    durationDays: 30,

    dailyFairUseLimit:
      getPositiveInteger(
        "UNLIMITED_DAILY_FAIR_USE_LIMIT"
      ),

    monthlyFairUseLimit:
      getPositiveInteger(
        "UNLIMITED_MONTHLY_FAIR_USE_LIMIT"
      ),

    amountPaise:
      getPositiveInteger(
        "UNLIMITED_MONTHLY_PRICE_PAISE"
      ),

    currency: "INR",
  }),
});

const getPaymentPlan = (planCode) => {
  return paymentPlans[planCode] || null;
};

const getPublicPaymentPlans = () => {
  return Object.values(
    paymentPlans
  ).map((plan) => ({
    code: plan.code,
    name: plan.name,
    type: plan.type,

    credits:
      plan.credits || null,

    durationDays:
      plan.durationDays || null,

    dailyFairUseLimit:
      plan.dailyFairUseLimit || null,

    monthlyFairUseLimit:
      plan.monthlyFairUseLimit || null,

    amountPaise:
      plan.amountPaise,

    currency:
      plan.currency,
  }));
};

module.exports = {
  paymentPlans,
  getPaymentPlan,
  getPublicPaymentPlans,
};