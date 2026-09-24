const express = require("express");

const CatalogItem = require("../models/CatalogItem");

const {
  bucketId,
  endpoint,
  projectId,
} = require("../config/appwrite");

const router = express.Router();

function fileUrl(fileId) {
  const bucket = encodeURIComponent(bucketId);
  const file = encodeURIComponent(fileId);
  const project = encodeURIComponent(projectId);

  return (
    `${endpoint}/storage/buckets/${bucket}` +
    `/files/${file}/view?project=${project}`
  );
}

// GET /api/v1/catalog
router.get("/", async (req, res, next) => {
  try {
    const items = await CatalogItem.find({
      status: "published",
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const catalog = items.map((item) => ({
      id: String(item._id),
      name: item.name,
      category: item.category,
      description: item.description,
      thumbnailUrl: fileUrl(item.thumbnailFileId),
      modelUrl: fileUrl(item.modelFileId),
    }));

    return res.status(200).json({
      success: true,
      data: catalog,
    });
  } catch (error) {
    next(error);
  }
});
// GET /api/v1/catalog/:itemId
router.get("/:itemId", async (req, res, next) => {
  try {
    const item = await CatalogItem.findOne({
      _id: req.params.itemId,
      status: "published",
    }).lean();

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Furniture item not found",
      });
    }

    return res.json({
      success: true,
      data: {
        id: String(item._id),
        name: item.name,
        category: item.category,
        description: item.description,
        thumbnailUrl: fileUrl(item.thumbnailFileId),
        modelUrl: fileUrl(item.modelFileId),
      },
    });
  } catch (error) {
    next(error);
  }
});
module.exports = router;