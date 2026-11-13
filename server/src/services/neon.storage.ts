import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Readable } from "node:stream";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

interface NeonStorageConfig {
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
}

export interface NeonStorageOperationResult {
  success: true;
  message: string;
  key: string;
}

export interface NeonStorageFileResult extends NeonStorageOperationResult {
  data: Buffer;
}

export interface NeonStorageUrlResult extends NeonStorageOperationResult {
  url: string;
  expiresInSeconds: number;
}

let client: S3Client | undefined;

function getStorageConfig(): NeonStorageConfig {
  if (env.FILE_STORAGE_PROVIDER !== "neon") {
    throw new Error(
      "File storage provider is not set to Neon Object Storage. Set FILE_STORAGE_PROVIDER=neon to use it.",
    );
  }

  const endpoint = env.AWS_ENDPOINT_URL_S3 ?? env.NEON_OBJECT_STORAGE_ENDPOINT;
  const bucket = env.NEON_OBJECT_STORAGE_BUCKET ?? env.AWS_S3_BUCKET;
  const accessKeyId =
    env.AWS_ACCESS_KEY_ID ?? env.NEON_OBJECT_STORAGE_ACCESS_KEY_ID;
  const secretAccessKey =
    env.AWS_SECRET_ACCESS_KEY ?? env.NEON_OBJECT_STORAGE_SECRET_ACCESS_KEY;
  const region = env.AWS_REGION ?? env.NEON_OBJECT_STORAGE_REGION ?? "auto";

  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "Neon Object Storage is not configured. Set its endpoint, bucket, and credentials.",
    );
  }

  return { endpoint, bucket, accessKeyId, secretAccessKey, region };
}

function getClient(): S3Client {
  if (!client) {
    const config = getStorageConfig();
    client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  return client;
}

export async function verifyStorageConnection(): Promise<void> {
  const { bucket } = getStorageConfig();
  await getClient().send(
    new HeadBucketCommand({
      Bucket: bucket,
    }),
  );
  logger.info(
    { provider: "Neon Object Storage" },
    "File storage provider connected",
  );
}

async function readBodyAsBuffer(body: unknown): Promise<Buffer> {
  if (!body) {
    throw new Error("Empty file body received from Neon Object Storage.");
  }

  if (Buffer.isBuffer(body)) {
    return body;
  }

  if (body instanceof Uint8Array) {
    return Buffer.from(body);
  }

  if (typeof body === "string") {
    return Buffer.from(body);
  }

  const transformableBody = body as {
    transformToByteArray?: () => Promise<Uint8Array>;
  };
  if (typeof transformableBody.transformToByteArray === "function") {
    return Buffer.from(await transformableBody.transformToByteArray());
  }

  if (body instanceof Readable) {
    const chunks: Buffer[] = [];

    for await (const chunk of body) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    return Buffer.concat(chunks);
  }

  throw new Error("Unsupported Neon Object Storage response body type.");
}

export class NeonStorageService {
  static async uploadFile(
    key: string,
    body: string | Buffer | Uint8Array,
    contentType: string,
  ): Promise<NeonStorageOperationResult> {
    try {
      const { bucket } = getStorageConfig();
      await getClient().send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        }),
      );

      logger.info({ key, contentType }, "File uploaded successfully to Neon Object Storage");
      return { success: true, message: "File uploaded successfully.", key };
    } catch (error) {
      logger.error({ err: error, key }, "File upload failed to Neon Object Storage");
      throw error;
    }
  }

  static async deleteFile(key: string): Promise<NeonStorageOperationResult> {
    try {
      const { bucket } = getStorageConfig();
      await getClient().send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: key,
        }),
      );

      logger.info({ key }, "File deleted successfully from Neon Object Storage");
      return { success: true, message: "File deleted successfully.", key };
    } catch (error) {
      logger.error({ err: error, key }, "File deletion failed in Neon Object Storage");
      throw error;
    }
  }

  static async getDownloadUrl(
    key: string,
    expiresInSeconds = 3600,
  ): Promise<NeonStorageUrlResult> {
    try {
      const { bucket } = getStorageConfig();
      const url = await getSignedUrl(
        getClient(),
        new GetObjectCommand({
          Bucket: bucket,
          Key: key,
        }),
        { expiresIn: expiresInSeconds },
      );

      logger.info({ key, expiresInSeconds }, "Download URL generated for Neon Object Storage");
      return {
        success: true,
        message: "Download URL generated successfully.",
        key,
        url,
        expiresInSeconds,
      };
    } catch (error) {
      logger.error({ err: error, key }, "Failed to generate Neon Object Storage download URL");
      throw error;
    }
  }

  static async getFileAsBuffer(key: string): Promise<NeonStorageFileResult> {
    try {
      const { bucket } = getStorageConfig();
      const response = await getClient().send(
        new GetObjectCommand({
          Bucket: bucket,
          Key: key,
        }),
      );
      const data = await readBodyAsBuffer(response.Body);

      logger.info(
        { key, byteLength: data.length },
        "File downloaded successfully from Neon Object Storage",
      );
      return {
        success: true,
        message: "File downloaded successfully.",
        key,
        data,
      };
    } catch (error) {
      logger.error({ err: error, key }, "File download failed from Neon Object Storage");
      throw error;
    }
  }
}
