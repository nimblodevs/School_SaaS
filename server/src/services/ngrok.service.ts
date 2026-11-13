import ngrok, { type Listener } from "@ngrok/ngrok";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

let ngrokListener: Listener | undefined;
let ngrokStartup: Promise<void> | undefined;
let isShuttingDown = false;

export function startNgrok(): void {
  if (!env.USE_NGROK || isShuttingDown) return;

  if (env.NGROK_URL) {
    configureMpesaCallbackUrls(env.NGROK_URL);
    logger.info(
      {
        publicUrl: env.NGROK_URL,
        localPort: env.PORT,
        stkCallbackUrl: env.MPESA_CALLBACK_URL,
      },
      "Using configured Ngrok URL for M-Pesa callbacks",
    );
    return;
  }

  ngrokStartup = startNgrokTunnel();
}

export async function stopNgrok(): Promise<void> {
  isShuttingDown = true;

  if (ngrokStartup) await ngrokStartup;

  if (ngrokListener) {
    try {
      await ngrokListener.close();
      ngrokListener = undefined;
      logger.info("Ngrok tunnel shut down");
    } catch (error) {
      logger.error({ err: error }, "Ngrok tunnel failed to close");
      process.exitCode = 1;
    }
  }
}

function getCallbackUrl(
  publicUrl: string,
  configuredUrl: string | undefined,
  defaultPath: string,
): string {
  const callbackUrl = new URL(configuredUrl ?? defaultPath, publicUrl);
  return new URL(
    `${callbackUrl.pathname}${callbackUrl.search}${callbackUrl.hash}`,
    publicUrl,
  ).toString();
}

function configureMpesaCallbackUrls(publicUrl: string): void {
  env.MPESA_CALLBACK_URL = getCallbackUrl(
    publicUrl,
    env.MPESA_CALLBACK_URL,
    "/api/v1/mpesa/stkpush/callback",
  );
  env.MPESA_B2C_RESULT_URL = getCallbackUrl(
    publicUrl,
    undefined,
    "/api/v1/mpesa/b2c/callback",
  );
  env.MPESA_B2C_TIMEOUT_URL = getCallbackUrl(
    publicUrl,
    undefined,
    "/api/v1/mpesa/b2c/timeout",
  );
  env.MPESA_REVERSAL_RESULT_URL = getCallbackUrl(
    publicUrl,
    undefined,
    "/api/v1/mpesa/reversal/result",
  );
  env.MPESA_REVERSAL_TIMEOUT_URL = getCallbackUrl(
    publicUrl,
    undefined,
    "/api/v1/mpesa/reversal/queue",
  );
  env.MPESA_TRANSACTIONSTATUS_RESULT_URL = getCallbackUrl(
    publicUrl,
    undefined,
    "/api/v1/mpesa/transaction/status/callback",
  );
  env.MPESA_TRANSACTIONSTATUS_TIMEOUT_URL = getCallbackUrl(
    publicUrl,
    undefined,
    "/api/v1/mpesa/transaction/status/timeout",
  );
  env.MPESA_RATIBA_CALLBACK_URL = getCallbackUrl(
    publicUrl,
    undefined,
    "/api/v1/mpesa/ratiba/callback",
  );
  env.MPESA_QUEUE_TIMEOUT_URL = getCallbackUrl(
    publicUrl,
    undefined,
    "/api/v1/mpesa/account/balance/timeout",
  );
  env.MPESA_RESULT_URL = getCallbackUrl(
    publicUrl,
    undefined,
    "/api/v1/mpesa/account/balance/result",
  );
}

async function startNgrokTunnel(): Promise<void> {
  try {
    const authtoken = env.NGROK_AUTHTOKEN;
    if (!authtoken) {
      throw new Error("NGROK_AUTHTOKEN is required when USE_NGROK=true.");
    }

    const listener = await ngrok.forward({
      addr: env.PORT,
      authtoken,
    });
    const publicUrl = listener.url();
    if (!publicUrl) {
      await listener.close();
      throw new Error("Ngrok did not provide a public URL.");
    }
    if (isShuttingDown) {
      await listener.close();
      return;
    }

    ngrokListener = listener;
    configureMpesaCallbackUrls(publicUrl);
    logger.info(
      {
        publicUrl,
        stkCallbackUrl: env.MPESA_CALLBACK_URL,
        b2cResultUrl: env.MPESA_B2C_RESULT_URL,
        reversalResultUrl: env.MPESA_REVERSAL_RESULT_URL,
      },
      "Ngrok tunnel started",
    );
  } catch (error) {
    logger.error({ err: error }, "Failed to start Ngrok tunnel");
    if (env.MPESA_CALLBACK_URL) {
      logger.warn(
        { callbackUrl: env.MPESA_CALLBACK_URL },
        "Using the configured static M-Pesa callback URL",
      );
    } else {
      logger.warn(
        "No static M-Pesa callback URL is configured; STK Push callbacks are unavailable.",
      );
    }
  }
}
