import { Router, type RequestHandler } from "express";
import rateLimit from "express-rate-limit";
import multer from "multer";
import { env } from "../../config/env.js";
import { testFileUpload } from "./files.controller.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
    fields: 0,
  },
});

const testUploadLimiter = rateLimit({
  windowMs: 60_000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

const requireLocalDevelopment: RequestHandler = (req, res, next) => {
  if (env.NODE_ENV !== "development") {
    res.status(404).json({ error: "Not Found." });
    return;
  }

  const remoteAddress = req.socket.remoteAddress?.replace(/^::ffff:/, "");
  if (remoteAddress !== "127.0.0.1" && remoteAddress !== "::1") {
    res.status(403).json({ error: "This test endpoint is local-only." });
    return;
  }

  next();
};

const receiveFile: RequestHandler = (req, res, next) => {
  upload.single("file")(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      const tooLarge = error.code === "LIMIT_FILE_SIZE";
      res.status(tooLarge ? 413 : 400).json({
        error: tooLarge
          ? "File exceeds the 5 MB test upload limit."
          : "Multipart upload was rejected.",
      });
      return;
    }
    if (error) {
      next(error);
      return;
    }
    next();
  });
};

router.post(
  "/test-upload",
  requireLocalDevelopment,
  testUploadLimiter,
  receiveFile,
  testFileUpload,
);

export default router;
