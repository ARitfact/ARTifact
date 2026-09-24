require("dotenv").config();

const mongoose = require("mongoose");

const connectDatabase = require("../config/database");
const CatalogItem = require("../models/CatalogItem");

async function main() {
  await connectDatabase();

  const item = await CatalogItem.findOneAndUpdate(
    {
      modelFileId: "6ab3f9e9003a937a2984",
    },
    {
      $set: {
        name: "Modern Bed",
        category: "Beds",
        description: "Explore this bed in 3D and AR.",
        thumbnailFileId: "6ab3faa40007c1ef23bd",
        status: "published",
      },
    },
    {
      upsert: true,
      returnDocument: "after",
      runValidators: true,
    }
  );

  console.log("Catalog item ready:", item.name);
}

main()
  .catch((error) => {
    console.error("Catalog seed failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });