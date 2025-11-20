const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const crypto = require("crypto");
const path = require("path");

const REGION = process.env.AWS_REGION;
const BUCKET = process.env.AWS_S3_BUCKET;
const BASE_URL = process.env.AWS_S3_BASE_URL;
const ACL = process.env.AWS_S3_ACL || "public-read";

const s3Client = new S3Client({
  region: REGION,
  credentials:
    process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
      ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
      : undefined
});

const ensureConfig = () => {
  if (!REGION || !BUCKET) {
    const err = new Error("S3 storage is not configured.");
    err.statusCode = 500;
    throw err;
  }
};

const buildKey = (originalName = "") => {
  const time = Date.now();
  const unique = crypto.randomUUID();
  const ext = path.extname(originalName).replace(".", "") || "jpg";
  return `issues/${time}-${unique}.${ext}`;
};

const buildPublicUrl = (key) => {
  if (BASE_URL) {
    return `${BASE_URL.replace(/\/$/, "")}/${key}`;
  }
  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
};

async function uploadIssueImages(files = []) {
  if (!files.length) return [];

  ensureConfig();

  const uploads = files.map(async (file) => {
    const key = buildKey(file.originalname);

    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype || "application/octet-stream",
      ACL
    });

    await s3Client.send(command);
    return buildPublicUrl(key);
  });

  return Promise.all(uploads);
}

module.exports = {
  uploadIssueImages
};

