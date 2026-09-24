const mongoose = require("mongoose");
const Entitlement = require("../models/Entitlement");
const CreditLedger = require("../models/CreditLedger");
const GenerationJob = require("../models/GenerationJob");

async function restoreGenerationBalance(job, session, wasReserved) {
  const entitlement = await Entitlement.findOne({
    userId: job.userId,
  }).session(session);

  if (!entitlement) {
    throw new Error("Generation entitlement not found");
  }

  if (wasReserved) {
    if (entitlement.reservedCredits < 1) {
      throw new Error("Reserved credit missing");
    }

    entitlement.reservedCredits -= 1;
  }

  if (job.creditSource === "SUBSCRIPTION") {
    const subscription = entitlement.subscription;
    const jobDay = job.createdAt.toISOString().slice(0, 10);

    // Only reverse usage in the same active counting window.
    if (
      subscription.dailyWindow === jobDay &&
      subscription.dailyUsed > 0
    ) {
      subscription.dailyUsed -= 1;
    }

    if (
      subscription.monthlyWindowStartedAt &&
      subscription.monthlyWindowStartedAt <= job.createdAt &&
      subscription.monthlyUsed > 0
    ) {
      subscription.monthlyUsed -= 1;
    }
  } else if (job.creditSource === "FREE") {
    entitlement.freeCredits += 1;
  } else if (job.creditSource === "PURCHASED") {
    entitlement.purchasedCredits += 1;
  } else {
    throw new Error("Unknown generation credit source");
  }

  await entitlement.save({ session });
}
async function reserveGeneration({ userId, idempotencyKey, correlationId }) {
  const session = await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(async () => {
      const existing = await GenerationJob.findOne({
        userId,
        idempotencyKey,
      }).session(session);

      if (existing) {
        result = { job: existing, alreadyExists: true };
        return;
      }

      // Create the user's one free credit if entitlement does not exist.
      await Entitlement.updateOne(
        { userId },
        {
          $setOnInsert: {
            userId,
            freeCredits: 1,
            purchasedCredits: 0,
            reservedCredits: 0,
          },
        },
        { upsert: true, session }
      );

      let creditSource = "FREE";

      let entitlement = await Entitlement.findOneAndUpdate(
        { userId, freeCredits: { $gte: 1 } },
        { $inc: { freeCredits: -1, reservedCredits: 1 } },
        { session, new: true }
      );

if (!entitlement) {
  const current = await Entitlement.findOne({ userId })
    .session(session);

  const subscription = current?.subscription;
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  if (
    subscription?.active &&
    subscription.startsAt <= now &&
    subscription.endsAt > now
  ) {
    if (subscription.dailyWindow !== today) {
      subscription.dailyWindow = today;
      subscription.dailyUsed = 0;
    }

    if (
      !subscription.monthlyWindowStartedAt ||
      now.getTime() -
        subscription.monthlyWindowStartedAt.getTime() >=
        30 * 24 * 60 * 60 * 1000
    ) {
      subscription.monthlyWindowStartedAt = now;
      subscription.monthlyUsed = 0;
    }

    if (
      subscription.dailyUsed <
        subscription.dailyFairUseLimit &&
      subscription.monthlyUsed <
        subscription.monthlyFairUseLimit
    ) {
      subscription.dailyUsed += 1;
      subscription.monthlyUsed += 1;
      current.reservedCredits += 1;

      await current.save({ session });

      creditSource = "SUBSCRIPTION";
      entitlement = current;
    }
  }

  if (!entitlement) {
    creditSource = "PURCHASED";

    entitlement = await Entitlement.findOneAndUpdate(
      { userId, purchasedCredits: { $gte: 1 } },
      { $inc: { purchasedCredits: -1, reservedCredits: 1 } },
      { session, new: true }
    );
  }
}
      if (!entitlement) {
        const error = new Error("No generation credits available");
        error.statusCode = 402;
        error.code = "INSUFFICIENT_CREDITS";
        throw error;
      }

      const [job] = await GenerationJob.create(
        [{ userId, idempotencyKey, creditSource }],
        { session }
      );

      await CreditLedger.create(
        [{
          userId,
          referenceType: "GENERATION",
          referenceId: job.id,
          entryType: "RESERVE",
          creditSource,
          credits: 1,
          correlationId,
        }],
        { session }
      );

      result = { job, alreadyExists: false };
    });

    return result;
  } finally {
    await session.endSession();
  }
}

async function markGenerationSubmitted({
  jobId,
  taskId,
  correlationId,
}) {
  const session = await mongoose.startSession();

  try {
    let job;

    await session.withTransaction(async () => {
      job = await GenerationJob.findById(jobId).session(session);

      if (!job) throw new Error("Generation job not found");

      if (job.status === "submitted" && job.taskId === taskId) {
        return;
      }

      if (job.status !== "reserved") {
        throw new Error("Generation job cannot be submitted");
      }

      job.taskId = taskId;
      job.status = "submitted";

      await Entitlement.updateOne(
        { userId: job.userId, reservedCredits: { $gte: 1 } },
        { $inc: { reservedCredits: -1 } },
        { session }
      ).then((result) => {
        if (result.modifiedCount !== 1) {
          throw new Error("Reserved credit missing");
        }
      });

      await CreditLedger.create(
        [{
          userId: job.userId,
          referenceType: "GENERATION",
          referenceId: job.id,
          entryType: "CONSUME",
          creditSource: job.creditSource,
          credits: 1,
          correlationId,
        }],
        { session }
      );

      await job.save({ session });
    });

    return job;
  } finally {
    await session.endSession();
  }
}

async function releaseGeneration({
  jobId,
  reason,
  correlationId,
}) {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const job = await GenerationJob.findById(jobId).session(session);

      if (!job || job.status !== "reserved") return;

           await restoreGenerationBalance(job, session, true);
      await CreditLedger.create(
        [{
          userId: job.userId,
          referenceType: "GENERATION",
          referenceId: job.id,
          entryType: "RELEASE",
          creditSource: job.creditSource,
          credits: 1,
          correlationId,
          metadata: { reason },
        }],
        { session }
      );

      job.status = "failed";
      job.failureReason = reason;
      await job.save({ session });
    });
  } finally {
    await session.endSession();
  }
}
async function refundFailedGeneration({
  taskId,
  reason,
  correlationId,
}) {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const job = await GenerationJob.findOne({ taskId }).session(session);

      if (!job || job.status !== "submitted") return;

           await restoreGenerationBalance(job, session, false);
      await CreditLedger.create(
        [{
          userId: job.userId,
          referenceType: "REFUND",
          referenceId: job.id,
          entryType: "CREDIT",
          creditSource: job.creditSource,
          credits: 1,
          correlationId,
          metadata: { taskId, reason },
        }],
        { session }
      );

      job.status = "failed";
      job.failureReason = reason;
      await job.save({ session });
    });
  } finally {
    await session.endSession();
  }
}
module.exports = {
  reserveGeneration,
  markGenerationSubmitted,
  releaseGeneration,
  refundFailedGeneration,
};