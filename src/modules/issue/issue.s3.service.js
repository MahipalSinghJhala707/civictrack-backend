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
  if (!BUCKET || !REGION) {
    throw new Error("Cannot build public URL: S3 bucket or region not configured");
  }
  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
};

async function uploadIssueImages(files = []) {
  if (!files || !files.length) return [];

  // Check if S3 is configured
  if (!REGION || !BUCKET) {
    throw new Error("S3 storage is not configured. Please configure AWS_REGION and AWS_S3_BUCKET environment variables.");
  }

  // Validate that files have required properties
  const validFiles = files.filter(file => {
    if (!file || !file.buffer) {
      console.warn("Skipping invalid file: missing buffer");
      return false;
    }
    return true;
  });

  if (!validFiles.length) {
    return [];
  }

  const uploads = validFiles.map(async (file) => {
    try {
      const key = buildKey(file.originalname || "image");

      const command = new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype || "application/octet-stream",
        ACL
      });

      await s3Client.send(command);
      return { success: true, url: buildPublicUrl(key) };
    } catch (uploadError) {
      console.error("Failed to upload single image:", {
        error: uploadError.message,
        code: uploadError.code,
        name: uploadError.name
      });
      // Return error info instead of throwing so other uploads can continue
      return { 
        success: false, 
        error: uploadError.message || "Unknown upload error",
        originalError: uploadError
      };
    }
  });

  const results = await Promise.all(uploads);
  
  // Filter successful uploads
  const successfulUploads = results
    .filter(result => result.success)
    .map(result => result.url);
  
  // Log failed uploads
  const failedUploads = results.filter(result => !result.success);
  if (failedUploads.length > 0) {
    console.warn(`${failedUploads.length} image(s) failed to upload:`, 
      failedUploads.map(f => f.error));
    
    // If all uploads failed, log error but don't throw
    // Images are optional, so we allow report creation to continue
    if (successfulUploads.length === 0) {
      const firstError = failedUploads[0];
      console.error("All image uploads failed:", firstError.error);
      // Return empty array - report can still be created without images
      return [];
    }
  }
  
  return successfulUploads;
}

module.exports = {
  uploadIssueImages
};

