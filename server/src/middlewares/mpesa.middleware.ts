import { timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
import type { RequestHandler } from "express";
import { env } from "../config/env.js";

export const requireMpesaApiKey: RequestHandler = (req, res, next) => {
  const expected = env.MPESA_API_KEY;
  if (!expected || expected.length < 32) {
    res
      .status(503)
      .json({ error: "M-Pesa API authorization is not configured." });
    return;
  }

  const supplied = req.get("x-mpesa-api-key") ?? "";
  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(supplied);
  if (
    expectedBytes.length !== suppliedBytes.length ||
    !timingSafeEqual(expectedBytes, suppliedBytes)
  ) {
    res.status(401).json({ error: "Unauthorized." });
    return;
  }
  next();
};

function normalizeIp(ip: string): string {
  return ip.startsWith("::ffff:") ? ip.slice(7) : ip;
}

export const requireMpesaCallbackIp: RequestHandler = (req, res, next) => {
  if (env.NODE_ENV !== "production") {
    next();
    return;
  }

  const configured =
    env.MPESA_ALLOWED_IPS?.split(",").map((ip) => ip.trim()) ?? [];
  if (configured.length === 0 || configured.some((ip) => isIP(ip) === 0)) {
    res.status(503).json({
      ResultCode: 1,
      ResultDesc: "M-Pesa callback IP allowlist is not configured.",
    });
    return;
  }

  const clientIp = req.ip ? normalizeIp(req.ip) : "";
  if (!configured.includes(clientIp)) {
    res.status(403).json({ ResultCode: 1, ResultDesc: "Forbidden." });
    return;
  }
  next();
};
