import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Readable } from "node:stream";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

function getR2Config() {
  const {
    R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY,
    R2_BUCKET_NAME,
  } = env;

  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
    throw new Error("Missing required R2 environment variables.");
  }

  return {
    accountId: R2_ACCOUNT_ID,
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
    bucketName: R2_BUCKET_NAME,
  };
}

export interface R2UploadResult {
  success: true;
  message: string;
  key: string;
}

export interface R2FileResult {
  success: true;
  message: string;
  key: string;
  data: Buffer;
}

export interface R2PresignedUrlResult {
  success: true;
  message: string;
  key: string;
  url: string;
  expiresInSeconds: number;
}

export interface R2DeleteResult {
  success: true;
  message: string;
  key: string;
}

let r2Client: S3Client | null = null;

function getR2Client(): S3Client {
  if (!r2Client) {
    const { accountId, accessKeyId, secretAccessKey } = getR2Config();

    r2Client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      forcePathStyle: true,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  return r2Client;
}

async function readBodyAsBuffer(body: unknown): Promise<Buffer> {
  if (!body) {
    throw new Error("Empty file body received from R2");
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

  const transformableBody = body as { transformToByteArray?: () => Promise<Uint8Array> };
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

  throw new Error("Unsupported R2 response body type.");
}

export class R2Service {
  static async uploadFile(
    key: string,
    body: string | Buffer | Uint8Array,
    contentType: string,
  ): Promise<R2UploadResult> {
    try {
      const client = getR2Client();
      const { bucketName } = getR2Config();
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: body,
        ContentType: contentType,
      });

      await client.send(command);
      logger.info({ key, contentType }, "File uploaded successfully to R2");

      return {
        success: true,
        message: "File uploaded successfully.",
        key,
      };
    } catch (error) {
      logger.error({ err: error, key }, "File upload failed to R2");
      throw error;
    }
  }

  static async getFileAsBuffer(key: string): Promise<R2FileResult> {
    try {
      const client = getR2Client();
      const { bucketName } = getR2Config();
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
      });

      const response = await client.send(command);
      const data = await readBodyAsBuffer(response.Body);
      logger.info({ key, byteLength: data.length }, "File downloaded successfully from R2");

      return {
        success: true,
        message: "File downloaded successfully.",
        key,
        data,
      };
    } catch (error) {
      logger.error({ err: error, key }, "File download failed from R2");
      throw error;
    }
  }

  static async getDownloadPresignedUrl(
    key: string,
    expiresInSeconds = 3600,
  ): Promise<R2PresignedUrlResult> {
    try {
      const client = getR2Client();
      const { bucketName } = getR2Config();
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
      });
      const url = await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
      logger.info({ key, expiresInSeconds }, "Download URL generated for R2 file");

      return {
        success: true,
        message: "Download URL generated successfully.",
        key,
        url,
        expiresInSeconds,
      };
    } catch (error) {
      logger.error({ err: error, key }, "Failed to generate R2 download URL");
      throw error;
    }
  }

  static async getUploadPresignedUrl(
    key: string,
    expiresInSeconds = 600,
  ): Promise<R2PresignedUrlResult> {
    try {
      const client = getR2Client();
      const { bucketName } = getR2Config();
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
      });
      const url = await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
      logger.info({ key, expiresInSeconds }, "Upload URL generated for R2 file");

      return {
        success: true,
        message: "Upload URL generated successfully.",
        key,
        url,
        expiresInSeconds,
      };
    } catch (error) {
      logger.error({ err: error, key }, "Failed to generate R2 upload URL");
      throw error;
    }
  }

  static async deleteFile(key: string): Promise<R2DeleteResult> {
    try {
      const client = getR2Client();
      const { bucketName } = getR2Config();
      const command = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
      });

      await client.send(command);
      logger.info({ key }, "File deleted successfully from R2");

      return {
        success: true,
        message: "File deleted successfully.",
        key,
      };
    } catch (error) {
      logger.error({ err: error, key }, "File deletion failed in R2");
      throw error;
    }
  }
}
