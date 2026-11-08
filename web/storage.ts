import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v7 as uuidv7 } from "uuid";
import { env } from "../config/env.js";

let client;

function getStorageConfig() {
  const endpoint =
    process.env.AWS_ENDPOINT_URL_S3 || process.env.NEON_OBJECT_STORAGE_ENDPOINT;
  const bucket =
    process.env.NEON_OBJECT_STORAGE_BUCKET || env.OBJECT_STORAGE_BUCKET;
  const accessKeyId =
    process.env.AWS_ACCESS_KEY_ID ||
    process.env.NEON_OBJECT_STORAGE_ACCESS_KEY_ID;
  const secretAccessKey =
    process.env.AWS_SECRET_ACCESS_KEY ||
    process.env.NEON_OBJECT_STORAGE_SECRET_ACCESS_KEY;

  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "Neon Object Storage is not configured. Set its endpoint, bucket, and credentials.",
    );
  }

  return { endpoint, bucket, accessKeyId, secretAccessKey };
}

function getClient(config) {
  if (!client) {
    client = new S3Client({
      endpoint: config.endpoint,
      region:
        process.env.AWS_REGION ||
        process.env.NEON_OBJECT_STORAGE_REGION ||
        "auto",
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }
  return client;
}

function getMimeType(file) {
  const mimeType = file.mimetype || file.mimeType;
  if (!mimeType) throw new Error("Uploaded file content type is required.");
  return mimeType;
}

export async function verifyBucketConnection() {
  const config = getStorageConfig();
  await getClient(config).send(
    new HeadBucketCommand({ Bucket: config.bucket }),
  );
  return config.bucket;
}

export async function uploadSchoolLogo(schoolId, file, extension) {
  const config = getStorageConfig();
  const key = `${schoolId}/logos/${uuidv7()}.${extension}`;
  await getClient(config).send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: file.buffer,
      ContentLength: file.size,
      ContentType: getMimeType(file),
      CacheControl: "public, max-age=3600",
    }),
  );
  return key;
}

export async function uploadSchoolDocument(
  schoolId,
  file,
  extension,
  documentType,
) {
  const config = getStorageConfig();
  const key = `${schoolId}/documents/${uuidv7()}-${documentType}.${extension}`;
  await getClient(config).send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: file.buffer,
      ContentLength: file.size,
      ContentType: getMimeType(file),
      CacheControl: "private, max-age=3600",
    }),
  );
  return key;
}

async function deleteSchoolObject(key) {
  if (!key) return;
  const config = getStorageConfig();
  await getClient(config).send(
    new DeleteObjectCommand({ Bucket: config.bucket, Key: key }),
  );
}

export async function deleteSchoolLogo(key) {
  return deleteSchoolObject(key);
}

export async function deleteSchoolDocument(key) {
  return deleteSchoolObject(key);
}

export async function getSchoolLogoUrl(key) {
  if (!key) return null;
  const config = getStorageConfig();
  return getSignedUrl(
    getClient(config),
    new GetObjectCommand({
      Bucket: config.bucket,
      Key: key,
    }),
    { expiresIn: 3600 },
  );
}

export async function getSchoolDocumentUrl(key) {
  if (!key) return null;
  const config = getStorageConfig();
  return getSignedUrl(
    getClient(config),
    new GetObjectCommand({
      Bucket: config.bucket,
      Key: key,
    }),
    { expiresIn: 3600 },
  );
}
