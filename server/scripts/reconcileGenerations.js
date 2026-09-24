require("dotenv").config();

const axios = require("axios");
const crypto = require("crypto");

const connectDatabase = require("../config/database");
const GenerationJob = require("../models/GenerationJob");

const {
  refundFailedGeneration,
} = require("../services/generationCreditService");

const {
  storeGeneratedModel,
} = require("../services/generatedModelStorage");

async function reconcileJob(job) {
  const response = await axios.get(
    `https://api.tripo3d.ai/v2/openapi/task/${encodeURIComponent(
      job.taskId
    )}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.TRIPO_API_KEY}`,
      },
      timeout: 30000,
    }
  );

  const task = response.data?.data;

  if (!task) {
    throw new Error("Tripo returned no task");
  }

  if (
    task.status === "failed" ||
    task.status === "cancelled"
  ) {
    await refundFailedGeneration({
      taskId: job.taskId,
      reason: `Tripo task ${task.status}`,
      correlationId: crypto.randomUUID(),
    });

    return "refunded";
  }

  if (task.status !== "success") {
    return "processing";
  }

  const sourceUrl = task.result?.pbr_model?.url;

  if (!sourceUrl) {
    throw new Error("Completed task has no GLB URL");
  }

  const claimed = await GenerationJob.findOneAndUpdate(
    {
      _id: job._id,
      modelUrl: null,
      $or: [
        { status: "submitted" },
        {
          status: "storing",
          storageStartedAt: {
            $lt: new Date(Date.now() - 3 * 60 * 1000),
          },
        },
      ],
    },
    {
      $set: {
        status: "storing",
        storageStartedAt: new Date(),
      },
    },
    { new: true }
  );

  if (!claimed) {
    return "already_handled";
  }

  try {
    const stored = await storeGeneratedModel({
      sourceUrl,
      jobId: job.id,
    });

    await GenerationJob.updateOne(
      { _id: job._id, status: "storing" },
      {
        $set: {
          status: "completed",
          modelUrl: stored.modelUrl,
          cloudinaryPublicId: stored.cloudinaryPublicId,
          modelBytes: stored.bytes,
          completedAt: new Date(),
        },
      }
    );

    return "stored";
  } catch (error) {
    await GenerationJob.updateOne(
      { _id: job._id, status: "storing" },
      { $set: { status: "submitted" } }
    );

    throw error;
  }
}

async function main() {
  if (!process.env.TRIPO_API_KEY) {
    throw new Error("TRIPO_API_KEY is missing");
  }

  await connectDatabase();

  const jobs = await GenerationJob.find({
    taskId: { $type: "string" },
    status: { $in: ["submitted", "storing"] },
  })
    .sort({ createdAt: 1 })
    .limit(50);

  for (const job of jobs) {
    try {
      const result = await reconcileJob(job);
      console.log(job.id, result);
    } catch (error) {
      console.error(job.id, error.message);
    }
  }

  const uncertainCount = await GenerationJob.countDocuments({
    status: "reserved",
    taskId: null,
    createdAt: {
      $lt: new Date(Date.now() - 5 * 60 * 1000),
    },
  });

  if (uncertainCount > 0) {
    console.warn(
      `${uncertainCount} old reserved jobs need manual review`
    );
  }
}

main()
  .catch((error) => {
    console.error("Reconciliation failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    const mongoose = require("mongoose");
    await mongoose.disconnect();
  });