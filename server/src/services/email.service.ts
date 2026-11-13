import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

export async function verifyEmailConnection(): Promise<void> {
  if (!env.SMTP_HOST && !env.SMTP_USER && !env.SMTP_PASSWORD) {
    logger.info("SMTP email connection check skipped; SMTP is not configured");
    return;
  }

  if (!env.SMTP_HOST) {
    throw new Error("SMTP_HOST is required to verify the email connection.");
  }

  if (Boolean(env.SMTP_USER) !== Boolean(env.SMTP_PASSWORD)) {
    throw new Error("SMTP_USER and SMTP_PASSWORD must both be configured.");
  }

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT ?? 587,
    secure: env.SMTP_SECURE,
    ...(env.SMTP_USER && env.SMTP_PASSWORD
      ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } }
      : {}),
  });

  try {
    await transporter.verify();
    logger.info(
      { host: env.SMTP_HOST, port: env.SMTP_PORT ?? 587 },
      "SMTP email connection verified",
    );
  } finally {
    transporter.close();
  }
}
