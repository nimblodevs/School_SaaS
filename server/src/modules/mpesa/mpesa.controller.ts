import type { Request, RequestHandler } from "express";
import { logger } from "../../utils/logger.js";
import { AppError } from "../../utils/error/AppError.js";
import {
  createStandingOrder,
  initiateB2c,
  initiateReversal,
  initiateStkPush,
  processAccountBalanceCallback,
  processAccountBalanceTimeout,
  processB2cCallback,
  processB2cTimeout,
  processReversalCallback,
  processReversalTimeout,
  processStandingOrderCallback,
  processStandingOrderExecutionCallback,
  processStkCallback,
  processTransactionStatusCallback,
  processTransactionStatusTimeout,
  queryStkPush,
  requestAccountBalance,
  requestTransactionStatus,
} from "./mpesa.module.service.js";
import {
  accountBalanceSchema,
  b2cSchema,
  parseRequestBody,
  parseIdempotencyKey,
  reversalSchema,
  standingOrderSchema,
  stkPushSchema,
  stkQuerySchema,
  transactionStatusSchema,
} from "./mpesa.validation.js";

function handler(
  action: (req: Request) => Promise<unknown>,
  accepted = false,
): RequestHandler {
  return async (req, res) => {
    try {
      const result = await action(req);
      res.status(accepted ? 202 : 200).json(result);
    } catch (error) {
      const statusCode = error instanceof AppError ? error.statusCode : 500;
      const message =
        error instanceof AppError && statusCode < 500
          ? error.message
          : "M-Pesa request could not be completed.";
      logger.error(
        {
          error: error instanceof Error ? error.message : "Unknown error",
          statusCode,
          path: req.path,
        },
        "M-Pesa request failed.",
      );
      res.status(statusCode).json({ error: message });
    }
  };
}

export const stkPush: RequestHandler = handler((req) =>
  initiateStkPush(
    parseRequestBody(stkPushSchema, req.body),
    parseIdempotencyKey(req.get("Idempotency-Key")),
  ),
  true,
);

export const stkQuery: RequestHandler = handler((req) => {
  const input = parseRequestBody(stkQuerySchema, req.body);
  return queryStkPush(input.checkoutRequestId);
});

export const b2cPayment: RequestHandler = handler((req) =>
  initiateB2c(
    parseRequestBody(b2cSchema, req.body),
    parseIdempotencyKey(req.get("Idempotency-Key")),
  ),
  true,
);

export const reversal: RequestHandler = handler((req) =>
  initiateReversal(
    parseRequestBody(reversalSchema, req.body),
    parseIdempotencyKey(req.get("Idempotency-Key")),
  ),
  true,
);

export const transactionStatus: RequestHandler = handler((req) =>
  requestTransactionStatus(
    parseRequestBody(transactionStatusSchema, req.body),
  ),
  true,
);

export const createStandingOrderHandler: RequestHandler = handler((req) =>
  createStandingOrder(
    parseRequestBody(standingOrderSchema, req.body),
    parseIdempotencyKey(req.get("Idempotency-Key")),
  ),
  true,
);

export const requestAccountBalanceHandler: RequestHandler = handler((req) =>
  requestAccountBalance(parseRequestBody(accountBalanceSchema, req.body)),
  true,
);

function callback(
  action: (payload: unknown) => Promise<unknown>,
): RequestHandler {
  return handler((req) => action(req.body));
}

export const stkCallback = callback(processStkCallback);
export const b2cCallback = callback(processB2cCallback);
export const b2cTimeout = callback(processB2cTimeout);
export const reversalCallback = callback(processReversalCallback);
export const reversalTimeout = callback(processReversalTimeout);
export const transactionStatusCallback = callback(
  processTransactionStatusCallback,
);
export const transactionStatusTimeout = callback(
  processTransactionStatusTimeout,
);
export const standingOrderCallback = callback(processStandingOrderCallback);
export const standingOrderExecutionCallback = callback(
  processStandingOrderExecutionCallback,
);
export const accountBalanceCallback = callback(processAccountBalanceCallback);
export const accountBalanceTimeout = callback(processAccountBalanceTimeout);
