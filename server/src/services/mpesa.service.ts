import { readFileSync } from "node:fs";
import {
  constants,
  publicEncrypt,
  X509Certificate,
} from "node:crypto";
import { AppError } from "../utils/error/AppError.js";
import { env } from "../config/env.js";

const requestTimeoutMs = 15_000;
const isDevelopment = env.NODE_ENV === "development";

let cachedAccessToken: { value: string; expiresAt: number } | undefined;
let tokenRequest: Promise<string> | undefined;

function required(value: string | undefined, variable: string): string {
  if (!value) {
    throw new AppError(`M-Pesa configuration is missing ${variable}.`, 503);
  }
  return value;
}

export function getMpesaBaseUrl(): string {
  return env.MPESA_ENVIRONMENT === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";
}

function readJsonRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new AppError("M-Pesa returned an invalid response.", 502);
  }
  return value as Record<string, unknown>;
}

async function readResponse(
  response: Response,
  requestType: "authentication" | "API",
): Promise<Record<string, unknown>> {
  if (isDevelopment) {
    console.log("[M-Pesa]", "Received M-Pesa response", {
      requestType,
      status: response.status,
      ok: response.ok,
    });
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (cause) {
    if (isDevelopment) {
      console.log("[M-Pesa]", "M-Pesa response was not valid JSON", {
        requestType,
        errorName: cause instanceof Error ? cause.name : "UnknownError",
      });
    }
    throw new AppError("M-Pesa returned an invalid response.", 502, { cause });
  }

  const record = readJsonRecord(payload);
  if (!response.ok) {
    throw new AppError(
      `M-Pesa request failed with HTTP ${response.status}.`,
      502,
    );
  }
  return record;
}

async function requestAccessToken(): Promise<string> {
  const consumerKey = required(env.MPESA_CONSUMER_KEY, "MPESA_CONSUMER_KEY");
  const consumerSecret = required(
    env.MPESA_CONSUMER_SECRET,
    "MPESA_CONSUMER_SECRET",
  );
  const authorization = Buffer.from(
    `${consumerKey}:${consumerSecret}`,
    "utf8",
  ).toString("base64");

  let response: Response;
  try {
    if (isDevelopment) {
      console.log("[M-Pesa]", "Requesting M-Pesa OAuth token", {
        environment: env.MPESA_ENVIRONMENT,
      });
    }
    response = await fetch(
      `${getMpesaBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`,
      {
        headers: { Authorization: `Basic ${authorization}` },
        signal: AbortSignal.timeout(requestTimeoutMs),
      },
    );
  } catch (cause) {
    if (isDevelopment) {
      console.log("[M-Pesa]", "M-Pesa OAuth request failed", {
        errorName: cause instanceof Error ? cause.name : "UnknownError",
      });
    }
    throw new AppError(
      "Could not reach the M-Pesa authentication service.",
      502,
      { cause },
    );
  }

  const body = await readResponse(response, "authentication");
  if (typeof body.access_token !== "string" || body.access_token.length === 0) {
    throw new AppError("M-Pesa authentication returned no access token.", 502);
  }

  const expiresIn = Number(body.expires_in);
  const tokenLifetimeMs =
    Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn * 1000 : 300_000;
  cachedAccessToken = {
    value: body.access_token,
    expiresAt: Date.now() + Math.max(tokenLifetimeMs - 30_000, 1_000),
  };
  return body.access_token;
}

export async function getMpesaAccessToken(): Promise<string> {
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now()) {
    if (isDevelopment) {
      console.log("[M-Pesa]", "Using cached M-Pesa OAuth token");
    }
    return cachedAccessToken.value;
  }

  if (isDevelopment) {
    console.log("[M-Pesa]", "Requesting a new M-Pesa OAuth token", {
      requestAlreadyInFlight: Boolean(tokenRequest),
    });
  }
  tokenRequest ??= requestAccessToken().finally(() => {
    tokenRequest = undefined;
  });
  return tokenRequest;
}

export function generateStkPassword(now = new Date()): {
  timestamp: string;
  password: string;
} {
  const shortcode = required(env.MPESA_SHORTCODE, "MPESA_SHORTCODE");
  const passkey = required(env.MPESA_PASSKEY, "MPESA_PASSKEY");
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((value) => value.type === type)?.value ?? "";
  const timestamp = `${part("year")}${part("month")}${part("day")}${part("hour")}${part("minute")}${part("second")}`;
  const password = Buffer.from(
    `${shortcode}${passkey}${timestamp}`,
    "utf8",
  ).toString("base64");
  if (isDevelopment) {
    console.log("[M-Pesa]", "Generated STK password", { timestamp });
  }
  return { timestamp, password };
}

export function getSecurityCredential(): string {
  if (env.MPESA_SECURITY_CREDENTIAL) {
    if (isDevelopment) {
      console.log("[M-Pesa]", "Using configured M-Pesa security credential");
    }
    return env.MPESA_SECURITY_CREDENTIAL;
  }

  const password = required(
    env.MPESA_INITIATOR_PASSWORD,
    "MPESA_INITIATOR_PASSWORD or MPESA_SECURITY_CREDENTIAL",
  );
  const certificatePath = required(env.MPESA_CERT_PATH, "MPESA_CERT_PATH");
  let certificate: Buffer;
  try {
    if (isDevelopment) {
      console.log("[M-Pesa]", "Reading M-Pesa certificate for security credential");
    }
    certificate = readFileSync(certificatePath);
  } catch (cause) {
    if (isDevelopment) {
      console.log("[M-Pesa]", "Could not read M-Pesa certificate", {
        errorName: cause instanceof Error ? cause.name : "UnknownError",
      });
    }
    throw new AppError("Could not read the configured M-Pesa certificate.", 503, {
      cause,
    });
  }

  try {
    if (isDevelopment) {
      console.log("[M-Pesa]", "Generating M-Pesa security credential");
    }
    const publicKey = new X509Certificate(certificate).publicKey;
    return publicEncrypt(
      {
        key: publicKey,
        padding: constants.RSA_PKCS1_PADDING,
      },
      Buffer.from(password, "utf8"),
    ).toString("base64");
  } catch (cause) {
    if (isDevelopment) {
      console.log("[M-Pesa]", "Could not generate M-Pesa security credential", {
        errorName: cause instanceof Error ? cause.name : "UnknownError",
      });
    }
    throw new AppError(
      "Could not generate the M-Pesa security credential.",
      503,
      { cause },
    );
  }
}

export async function postToMpesa(
  path: string,
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const token = await getMpesaAccessToken();
  let response: Response;
  try {
    if (isDevelopment) {
      console.log("[M-Pesa]", "Sending M-Pesa API request", {
        method: "POST",
        path,
      });
    }
    response = await fetch(`${getMpesaBaseUrl()}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(requestTimeoutMs),
    });
  } catch (cause) {
    if (isDevelopment) {
      console.log("[M-Pesa]", "M-Pesa API request failed", {
        path,
        errorName: cause instanceof Error ? cause.name : "UnknownError",
      });
    }
    throw new AppError("Could not reach the M-Pesa API.", 502, { cause });
  }

  return readResponse(response, "API");
}
