const { Client, Storage } = require("node-appwrite");

const {
  APPWRITE_ENDPOINT,
  APPWRITE_PROJECT_ID,
  APPWRITE_BUCKET_ID,
  APPWRITE_API_KEY,
} = process.env;

const missing = [
  "APPWRITE_ENDPOINT",
  "APPWRITE_PROJECT_ID",
  "APPWRITE_BUCKET_ID",
  "APPWRITE_API_KEY",
].filter((key) => !process.env[key]);

if (missing.length > 0) {
  throw new Error(
    `Missing Appwrite environment variables: ${missing.join(", ")}`
  );
}

const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY);

const storage = new Storage(client);

module.exports = {
  storage,
  bucketId: APPWRITE_BUCKET_ID,
  endpoint: APPWRITE_ENDPOINT.replace(/\/$/, ""),
  projectId: APPWRITE_PROJECT_ID,
};