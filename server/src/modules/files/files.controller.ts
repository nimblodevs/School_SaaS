import { randomUUID } from "node:crypto";
import { fileTypeFromBuffer } from "file-type";
import type { RequestHandler } from "express";
import { env } from "../../config/env.js";
import { NeonStorageService } from "../../services/neon.storage.js";
import { R2Service } from "../../services/r2.storage.js";

const allowedMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

export const testFileUpload: RequestHandler = async (req, res, next) => {
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: "Select a file using the 'file' field." });
    return;
  }

  const detectedType = await fileTypeFromBuffer(file.buffer);
  const isPlainText =
    file.originalname.toLowerCase().endsWith(".txt") &&
    file.mimetype === "text/plain" &&
    !file.buffer.includes(0);
  const mimeType = detectedType?.mime ?? (isPlainText ? "text/plain" : undefined);
  const extension = detectedType?.ext ?? (isPlainText ? "txt" : undefined);

  if (
    !mimeType ||
    !extension ||
    (mimeType !== "text/plain" && !allowedMimeTypes.has(mimeType)) ||
    file.mimetype !== mimeType
  ) {
    res.status(415).json({
      error: "Only PNG, JPEG, PDF, or plain-text test files are supported.",
    });
    return;
  }

  try {
    const key = `postman-tests/${randomUUID()}.${extension}`;
    if (env.FILE_STORAGE_PROVIDER === "r2") {
      await R2Service.uploadFile(key, file.buffer, mimeType);
    } else {
      await NeonStorageService.uploadFile(key, file.buffer, mimeType);
    }

    res.status(201).json({
      success: true,
      provider: env.FILE_STORAGE_PROVIDER,
      key,
      contentType: mimeType,
      sizeBytes: file.size,
    });
  } catch (error) {
    next(error);
  }
};
