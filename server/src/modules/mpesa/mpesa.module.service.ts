import { createHash, randomUUID } from "node:crypto";
import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { getDatabase } from "../../config/database.js";
import {
  mpesaOperations,
  type mpesaOperationStatusEnum,
  type mpesaOperationTypeEnum,
} from "../../db/schema.js";
import { env } from "../../config/env.js";
import { logger } from "../../utils/logger.js";
import { AppError } from "../../utils/error/AppError.js";
import {
  generateStkPassword,
  getSecurityCredential,
  postToMpesa,
} from "../../services/mpesa.service.js";
import type {
  accountBalanceSchema,
  b2cSchema,
  reversalSchema,
  standingOrderSchema,
  stkPushSchema,
  transactionStatusSchema,
} from "./mpesa.validation.js";
import type { z } from "zod";

type StkPushInput = z.infer<typeof stkPushSchema>;
type B2cInput = z.infer<typeof b2cSchema>;
type ReversalInput = z.infer<typeof reversalSchema>;
type TransactionStatusInput = z.infer<typeof transactionStatusSchema>;
type StandingOrderInput = z.infer<typeof standingOrderSchema>;
type AccountBalanceInput = z.infer<typeof accountBalanceSchema>;
type JsonRecord = Record<string, unknown>;

type MpesaOperationType =
  (typeof mpesaOperationTypeEnum.enumValues)[number];
type MpesaOperationStatus =
  (typeof mpesaOperationStatusEnum.enumValues)[number];
type MpesaOperation = typeof mpesaOperations.$inferSelect;

async function createOperation(
  input: typeof mpesaOperations.$inferInsert,
): Promise<MpesaOperation> {
  const [operation] = await getDatabase()
    .insert(mpesaOperations)
    .values(input)
    .returning();
  if (!operation) throw new Error("Could not save M-Pesa operation.");
  return operation;
}

async function updateOperation(
  id: string,
  values: Partial<typeof mpesaOperations.$inferInsert>,
): Promise<MpesaOperation | undefined> {
  const [operation] = await getDatabase()
    .update(mpesaOperations)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(mpesaOperations.id, id))
    .returning();
  return operation;
}

async function applyCallbackOnce(
  id: string,
  values: Partial<typeof mpesaOperations.$inferInsert>,
): Promise<boolean> {
  const [operation] = await getDatabase()
    .update(mpesaOperations)
    .set({
      ...values,
      callbackProcessedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(mpesaOperations.id, id),
        isNull(mpesaOperations.callbackProcessedAt),
      ),
    )
    .returning({ id: mpesaOperations.id });
  return Boolean(operation);
}

async function findOperationById(id: string) {
  const [operation] = await getDatabase()
    .select()
    .from(mpesaOperations)
    .where(eq(mpesaOperations.id, id))
    .limit(1);
  return operation;
}

async function findByCheckoutRequestId(checkoutRequestId: string) {
  const [operation] = await getDatabase()
    .select()
    .from(mpesaOperations)
    .where(eq(mpesaOperations.checkoutRequestId, checkoutRequestId))
    .limit(1);
  return operation;
}

async function findByReceiptNumber(mpesaReceiptNumber: string) {
  const [operation] = await getDatabase()
    .select()
    .from(mpesaOperations)
    .where(eq(mpesaOperations.mpesaReceiptNumber, mpesaReceiptNumber))
    .limit(1);
  return operation;
}

async function findByReference(reference: string) {
  const [operation] = await getDatabase()
    .select()
    .from(mpesaOperations)
    .where(eq(mpesaOperations.reference, reference))
    .limit(1);
  return operation;
}

async function findByIdempotencyKey(idempotencyKey: string) {
  const [operation] = await getDatabase()
    .select()
    .from(mpesaOperations)
    .where(eq(mpesaOperations.idempotencyKey, idempotencyKey))
    .limit(1);
  return operation;
}

async function findByProviderConversation(
  conversationId?: string,
  originatorConversationId?: string,
) {
  const conditions = [
    ...(conversationId
      ? [eq(mpesaOperations.conversationId, conversationId)]
      : []),
    ...(originatorConversationId
      ? [eq(mpesaOperations.originatorConversationId, originatorConversationId)]
      : []),
  ];
  if (conditions.length === 0) return undefined;

  const [operation] = await getDatabase()
    .select()
    .from(mpesaOperations)
    .where(or(...conditions))
    .limit(1);
  return operation;
}

async function findLatestOperation(
  operationType: MpesaOperationType,
  phone: string,
  status: MpesaOperationStatus,
) {
  const [operation] = await getDatabase()
    .select()
    .from(mpesaOperations)
    .where(
      and(
        eq(mpesaOperations.operationType, operationType),
        eq(mpesaOperations.phone, phone),
        eq(mpesaOperations.status, status),
      ),
    )
    .orderBy(desc(mpesaOperations.createdAt))
    .limit(1);
  return operation;
}

async function findOriginalByReceipt(mpesaReceiptNumber: string) {
  const [operation] = await getDatabase()
    .select()
    .from(mpesaOperations)
    .where(
      and(
        eq(mpesaOperations.mpesaReceiptNumber, mpesaReceiptNumber),
        eq(mpesaOperations.status, "SUCCEEDED"),
      ),
    )
    .limit(1);
  return operation;
}

async function findActiveReversal(relatedTransactionId: string) {
  const [operation] = await getDatabase()
    .select()
    .from(mpesaOperations)
    .where(
      and(
        eq(mpesaOperations.operationType, "REVERSAL"),
        eq(mpesaOperations.relatedTransactionId, relatedTransactionId),
        inArray(mpesaOperations.status, [
          "PENDING",
          "UNKNOWN",
          "TIMED_OUT",
          "SUCCEEDED",
        ]),
      ),
    )
    .limit(1);
  return operation;
}

function required(value: string | undefined, variable: string): string {
  if (!value) {
    throw new AppError(`M-Pesa configuration is missing ${variable}.`, 503);
  }
  return value;
}

function record(value: unknown): JsonRecord | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as JsonRecord)
    : undefined;
}

function text(value: unknown): string | undefined {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const result = String(value).trim();
  return result.length > 0 ? result : undefined;
}

function number(value: unknown): number | undefined {
  if (typeof value !== "number" && typeof value !== "string") return undefined;
  const result = Number(value);
  return Number.isInteger(result) ? result : undefined;
}

function callbackResult(
  status: "SUCCEEDED" | "FAILED" | "TIMED_OUT",
  resultDesc?: string | null,
): { ResultCode: number; ResultDesc: string } {
  return {
    ResultCode: 0,
    ResultDesc:
      text(resultDesc) ??
      (status === "SUCCEEDED"
        ? "Accepted"
        : status === "TIMED_OUT"
          ? "Timeout received"
          : "Callback received"),
  };
}

function requiredCallbackUrl(value: string | undefined, variable: string) {
  const callbackUrl = required(value, variable);
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(callbackUrl);
  } catch {
    throw new AppError(
      `${variable} must be an absolute URL. Configure NGROK_URL or a public callback URL.`,
      503,
    );
  }
  if (
    env.NODE_ENV === "production" &&
    parsedUrl.protocol !== "https:"
  ) {
    throw new AppError(`${variable} must use HTTPS in production.`, 503);
  }
  return callbackUrl;
}

function providerFields(response: JsonRecord) {
  return {
    merchantRequestId: text(response.MerchantRequestID) ?? null,
    checkoutRequestId: text(response.CheckoutRequestID) ?? null,
    conversationId: text(response.ConversationID) ?? null,
    originatorConversationId:
      text(response.OriginatorConversationID) ?? null,
    resultCode: number(response.ResponseCode),
    resultDesc: text(response.ResponseDescription) ?? null,
  };
}

async function performOperation(input: {
  operationType: MpesaOperationType;
  path: string;
  payload: (reference: string) => JsonRecord;
  requestFingerprint: unknown;
  idempotencyKey?: string;
  beforeCreate?: () => Promise<void>;
  phone?: string;
  amount?: number;
  merchantReference?: string;
  relatedTransactionId?: string;
}) {
  const fingerprint = createHash("sha256")
    .update(
      JSON.stringify({
        operationType: input.operationType,
        request: input.requestFingerprint,
      }),
    )
    .digest("hex");
  if (input.idempotencyKey) {
    const existing = await findByIdempotencyKey(input.idempotencyKey);
    if (existing) {
      if (existing.requestFingerprint !== fingerprint) {
        throw new AppError(
          "Idempotency-Key was already used with different request data.",
          409,
        );
      }
      return {
        operationId: existing.id,
        reference: existing.reference,
        status: existing.status,
        data: existing.providerResponse,
      };
    }
  }
  await input.beforeCreate?.();

  const id = randomUUID();
  const reference = randomUUID().replaceAll("-", "");
  const operation = await createOperation({
    id,
    reference,
    idempotencyKey: input.idempotencyKey ?? null,
    requestFingerprint: input.idempotencyKey ? fingerprint : null,
    operationType: input.operationType,
    status: "PENDING",
    phone: input.phone ?? null,
    amount: input.amount ?? null,
    merchantReference: input.merchantReference ?? null,
    relatedTransactionId: input.relatedTransactionId ?? null,
  });

  try {
    const response = await postToMpesa(input.path, input.payload(reference));
    const fields = providerFields(response);
    const accepted =
      fields.resultCode === undefined || fields.resultCode === 0;
    const updated = await updateOperation(id, {
      ...fields,
      providerResponse: response,
      status: accepted ? "PENDING" : "FAILED",
      completedAt: accepted ? null : new Date(),
    });
    if (!updated) throw new Error("M-Pesa operation record disappeared.");

    return {
      operationId: operation.id,
      reference: operation.reference,
      status: updated.status,
      data: response,
    };
  } catch (error) {
    const isConfigurationError =
      error instanceof AppError && error.statusCode === 503;
    await updateOperation(id, {
      status: isConfigurationError ? "FAILED" : "UNKNOWN",
      resultDesc: isConfigurationError
        ? "M-Pesa configuration is incomplete."
        : "M-Pesa request outcome is unknown.",
      completedAt: isConfigurationError ? new Date() : null,
    });
    throw error;
  }
}

export async function initiateStkPush(
  input: StkPushInput,
  idempotencyKey: string,
) {
  const shortcode = required(env.MPESA_SHORTCODE, "MPESA_SHORTCODE");
  return performOperation({
    operationType: "STK_PUSH",
    path: "/mpesa/stkpush/v1/processrequest",
    requestFingerprint: input,
    idempotencyKey,
    phone: input.phone,
    amount: input.amount,
    merchantReference: input.accountReference,
    payload: () => {
      const { timestamp, password } = generateStkPassword();
      const payload = {
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: input.amount,
        PartyA: input.phone,
        PartyB: shortcode,
        PhoneNumber: input.phone,
        CallBackURL: requiredCallbackUrl(
          env.MPESA_CALLBACK_URL,
          "MPESA_CALLBACK_URL",
        ),
        AccountReference: input.accountReference,
        TransactionDesc: input.transactionDesc,
      };
      if (env.NODE_ENV === "development") {
        const maskedPhone = `${input.phone.slice(0, 4)}***${input.phone.slice(-3)}`;
        logger.info(
          {
            payload: {
              ...payload,
              Password: "[REDACTED]",
              PartyA: maskedPhone,
              PhoneNumber: maskedPhone,
            },
          },
          "Initiating M-Pesa STK push with payload.",
        );
      }
      return payload;
    },
  });
}

export async function queryStkPush(checkoutRequestId: string) {
  const operation = await findByCheckoutRequestId(checkoutRequestId);
  if (!operation || operation.operationType !== "STK_PUSH") {
    throw new AppError("STK transaction was not found.", 404);
  }

  return {
    operationId: operation.id,
    status: operation.status,
    amount: operation.amount,
    phone: operation.phone,
    receiptNumber: operation.mpesaReceiptNumber,
    resultCode: operation.resultCode,
    resultDescription: operation.resultDesc,
    requestedAt: operation.requestedAt,
    completedAt: operation.completedAt,
  };
}

export async function initiateB2c(input: B2cInput, idempotencyKey: string) {
  const shortcode = required(env.MPESA_SHORTCODE, "MPESA_SHORTCODE");
  const initiator = required(
    env.MPESA_INITIATOR_NAME,
    "MPESA_INITIATOR_NAME",
  );
  const credential = getSecurityCredential();
  return performOperation({
    operationType: "B2C",
    path: "/mpesa/b2c/v1/paymentrequest",
    requestFingerprint: input,
    idempotencyKey,
    phone: input.phone,
    amount: input.amount,
    payload: (reference) => ({
      InitiatorName: initiator,
      SecurityCredential: credential,
      CommandID: "BusinessPayment",
      Amount: input.amount,
      PartyA: shortcode,
      PartyB: input.phone,
      Remarks: input.remarks,
      QueueTimeOutURL: requiredCallbackUrl(
        env.MPESA_B2C_TIMEOUT_URL,
        "MPESA_B2C_TIMEOUT_URL",
      ),
      ResultURL: requiredCallbackUrl(
        env.MPESA_B2C_RESULT_URL,
        "MPESA_B2C_RESULT_URL",
      ),
      Occasion: reference,
    }),
  });
}

export async function initiateReversal(
  input: ReversalInput,
  idempotencyKey: string,
) {
  const original = await findOriginalByReceipt(input.transactionId);
  if (!original) {
    throw new AppError("A successful matching M-Pesa transaction is required.", 404);
  }
  if (original.amount !== null && input.amount > original.amount) {
    throw new AppError("Reversal amount exceeds the original payment.", 400);
  }

  const shortcode = required(env.MPESA_SHORTCODE, "MPESA_SHORTCODE");
  const initiator = required(
    env.MPESA_INITIATOR_NAME,
    "MPESA_INITIATOR_NAME",
  );
  const credential = getSecurityCredential();
  return performOperation({
    operationType: "REVERSAL",
    path: "/mpesa/reversal/v1/request",
    requestFingerprint: input,
    idempotencyKey,
    beforeCreate: async () => {
      if (await findActiveReversal(original.id)) {
        throw new AppError(
          "A reversal is already pending or has succeeded.",
          409,
        );
      }
    },
    amount: input.amount,
    merchantReference: input.transactionId,
    relatedTransactionId: original.id,
    payload: (reference) => ({
      Initiator: initiator,
      SecurityCredential: credential,
      CommandID: "TransactionReversal",
      TransactionID: input.transactionId,
      Amount: input.amount,
      ReceiverParty: shortcode,
      RecieverIdentifierType: "11",
      Remarks: input.remarks,
      ResultURL: requiredCallbackUrl(
        env.MPESA_REVERSAL_RESULT_URL,
        "MPESA_REVERSAL_RESULT_URL",
      ),
      QueueTimeOutURL: requiredCallbackUrl(
        env.MPESA_REVERSAL_TIMEOUT_URL,
        "MPESA_REVERSAL_TIMEOUT_URL",
      ),
      Occasion: reference,
    }),
  });
}

export async function requestTransactionStatus(input: TransactionStatusInput) {
  const original = await findByReceiptNumber(input.transactionId);
  if (!original) {
    throw new AppError("M-Pesa transaction was not found.", 404);
  }

  const shortcode = required(env.MPESA_SHORTCODE, "MPESA_SHORTCODE");
  const initiator = required(
    env.MPESA_INITIATOR_NAME,
    "MPESA_INITIATOR_NAME",
  );
  const credential = getSecurityCredential();
  return performOperation({
    operationType: "TRANSACTION_STATUS",
    path: "/mpesa/transactionstatus/v1/query",
    requestFingerprint: input,
    merchantReference: input.transactionId,
    relatedTransactionId: original.id,
    payload: (reference) => ({
      Initiator: initiator,
      SecurityCredential: credential,
      CommandID: "TransactionStatusQuery",
      TransactionID: input.transactionId,
      PartyA: shortcode,
      IdentifierType: "4",
      ResultURL: requiredCallbackUrl(
        env.MPESA_TRANSACTIONSTATUS_RESULT_URL,
        "MPESA_TRANSACTIONSTATUS_RESULT_URL",
      ),
      QueueTimeOutURL: requiredCallbackUrl(
        env.MPESA_TRANSACTIONSTATUS_TIMEOUT_URL,
        "MPESA_TRANSACTIONSTATUS_TIMEOUT_URL",
      ),
      Remarks: input.remarks,
      Occasion: reference,
    }),
  });
}

export async function createStandingOrder(
  input: StandingOrderInput,
  idempotencyKey: string,
) {
  const shortcode = required(env.MPESA_SHORTCODE, "MPESA_SHORTCODE");
  const callbackUrl = requiredCallbackUrl(
    env.MPESA_RATIBA_CALLBACK_URL,
    "MPESA_RATIBA_CALLBACK_URL",
  );
  const frequencyCodes = {
    Daily: "1",
    Weekly: "2",
    Monthly: "2",
    Quarterly: "3",
    Yearly: "4",
  } as const;
  return performOperation({
    operationType: "STANDING_ORDER",
    path: "/standingorder/v1/createStandingOrderExternal",
    requestFingerprint: input,
    idempotencyKey,
    phone: input.phone,
    amount: input.amount,
    merchantReference: input.name,
    payload: (reference) => {
      const safeName = input.name.replace(/[^A-Za-z0-9]/g, "") || "School";
      const standingOrderName = `${safeName}${reference.slice(0, 6)}`.slice(
        0,
        15,
      );
      return {
        StandingOrderName: standingOrderName,
        ReceiverPartyIdentifierType: "2",
        TransactionType: input.transactionType,
        BusinessShortCode: shortcode,
        PartyA: input.phone,
        Amount: input.amount,
        StartDate: input.startDate,
        EndDate: input.endDate,
        Frequency: frequencyCodes[input.frequency],
        AccountReference: input.accountReference ?? standingOrderName,
        TransactionDesc: input.name,
        CallBackURL: callbackUrl,
      };
    },
  });
}

export async function requestAccountBalance(input: AccountBalanceInput) {
  const shortcode = required(env.MPESA_SHORTCODE, "MPESA_SHORTCODE");
  const initiator = required(
    env.MPESA_INITIATOR_NAME,
    "MPESA_INITIATOR_NAME",
  );
  const credential = getSecurityCredential();
  return performOperation({
    operationType: "ACCOUNT_BALANCE",
    path: "/mpesa/accountbalance/v1/query",
    requestFingerprint: input,
    payload: () => ({
      Initiator: initiator,
      SecurityCredential: credential,
      CommandID: "AccountBalance",
      PartyA: shortcode,
      IdentifierType: "4",
      Remarks: input.remarks,
      QueueTimeOutURL: requiredCallbackUrl(
        env.MPESA_QUEUE_TIMEOUT_URL,
        "MPESA_QUEUE_TIMEOUT_URL",
      ),
      ResultURL: requiredCallbackUrl(env.MPESA_RESULT_URL, "MPESA_RESULT_URL"),
    }),
  });
}

function statusFromResultCode(resultCode: number): "SUCCEEDED" | "FAILED" {
  return resultCode === 0 ? "SUCCEEDED" : "FAILED";
}

async function updateFromCallback(
  operation: MpesaOperation | undefined,
  values: Partial<typeof mpesaOperations.$inferInsert>,
) {
  if (!operation) {
    logger.error("Received M-Pesa callback for an unknown operation.");
    throw new AppError(
      "M-Pesa callback could not be matched to a pending operation.",
      503,
    );
  }
  const updated = await applyCallbackOnce(operation.id, values);
  if (!updated) {
    logger.info(
      { operationId: operation.id },
      "Duplicate M-Pesa callback ignored.",
    );
  }
  return updated;
}

function metadataValue(items: unknown, name: string): unknown {
  if (!Array.isArray(items)) return undefined;
  const item = items.find((value) => {
    const entry = record(value);
    return entry?.Name === name;
  });
  return record(item)?.Value;
}

export async function processStkCallback(payload: unknown) {
  if (env.NODE_ENV === "development") {
    logger.info(
      { callbackData: payload },
      "Received M-Pesa STK callback data.",
    );
  }

  const body = record(payload);
  const callback = record(record(body?.Body)?.stkCallback);
  const checkoutRequestId = text(callback?.CheckoutRequestID);
  const resultCode = number(callback?.ResultCode);
  if (!callback || !checkoutRequestId || resultCode === undefined) {
    throw new AppError("M-Pesa STK callback is malformed.", 400);
  }

  const operation = await findByCheckoutRequestId(checkoutRequestId);
  if (!operation) {
    logger.error(
      { checkoutRequestId },
      "M-Pesa STK callback did not match an operation.",
    );
    throw new AppError(
      "M-Pesa callback could not be matched to a pending operation.",
      503,
    );
  }

  const status = statusFromResultCode(resultCode);
  const resultDesc =
    text(callback.ResultDesc) ??
    (resultCode === 0
      ? null
      : `M-Pesa reported a failed STK transaction (result code ${resultCode}).`);
  const metadataItems = record(callback.CallbackMetadata)?.Item;
  const receiptNumber = text(metadataValue(metadataItems, "MpesaReceiptNumber"));
  const phone = text(metadataValue(metadataItems, "PhoneNumber"));
  const amount = number(metadataValue(metadataItems, "Amount"));
  const updated = await updateFromCallback(operation, {
    status,
    resultCode,
    resultDesc,
    mpesaReceiptNumber: receiptNumber ?? null,
    phone: phone ?? operation.phone ?? null,
    amount: amount ?? operation.amount ?? null,
    callbackPayload: body ?? {},
    completedAt: new Date(),
  });
  logger.info(
    {
      operationId: operation.id,
      checkoutRequestId,
      resultCode,
      status,
      updated,
    },
    "Processed M-Pesa STK callback.",
  );
  if (resultCode !== 0 && updated) {
    logger.warn(
      { checkoutRequestId, resultCode, resultDesc },
      "M-Pesa STK callback reported a non-success result.",
    );
  }
  return callbackResult(status, resultDesc);
}

async function findCallbackOperation(
  result: JsonRecord,
  operationType: MpesaOperationType,
) {
  const byConversation = await findByProviderConversation(
    text(result.ConversationID),
    text(result.OriginatorConversationID),
  );
  if (byConversation?.operationType === operationType) return byConversation;
  const reference = text(result.Occasion) ?? text(result.Occassion);
  const byReference = reference ? await findByReference(reference) : undefined;
  return byReference?.operationType === operationType ? byReference : undefined;
}

export async function processB2cCallback(payload: unknown) {
  const body = record(payload);
  const result = record(body?.Result);
  const resultCode = number(result?.ResultCode);
  if (!result || resultCode === undefined) {
    throw new AppError("M-Pesa B2C callback is malformed.", 400);
  }

  const operation = await findCallbackOperation(result, "B2C");
  const status = statusFromResultCode(resultCode);
  await updateFromCallback(operation, {
    status,
    resultCode,
    resultDesc: text(result.ResultDesc) ?? null,
    mpesaReceiptNumber: text(result.TransactionID) ?? null,
    conversationId: text(result.ConversationID) ?? null,
    originatorConversationId:
      text(result.OriginatorConversationID) ?? null,
    callbackPayload: body ?? {},
    completedAt: new Date(),
  });
  return callbackResult(status);
}

export async function processReversalCallback(payload: unknown) {
  const body = record(payload);
  const result = record(body?.Result);
  const resultCode = number(result?.ResultCode);
  if (!result || resultCode === undefined) {
    throw new AppError("M-Pesa reversal callback is malformed.", 400);
  }

  const operation = await findCallbackOperation(result, "REVERSAL");
  const status = statusFromResultCode(resultCode);
  await updateFromCallback(operation, {
    status,
    resultCode,
    resultDesc: text(result.ResultDesc) ?? null,
    conversationId: text(result.ConversationID) ?? null,
    originatorConversationId:
      text(result.OriginatorConversationID) ?? null,
    callbackPayload: body ?? {},
    completedAt: new Date(),
  });
  return callbackResult(status);
}

function transactionStatus(value: unknown, resultCode: number) {
  const normalized = text(value)?.toLowerCase();
  if (normalized?.includes("complete") || normalized?.includes("success")) {
    return "SUCCEEDED" as const;
  }
  if (
    normalized?.includes("fail") ||
    normalized?.includes("reverse") ||
    normalized?.includes("cancel")
  ) {
    return "FAILED" as const;
  }
  return resultCode === 0 ? "PENDING" as const : "FAILED" as const;
}

export async function processTransactionStatusCallback(payload: unknown) {
  const body = record(payload);
  const result = record(body?.Result);
  const resultCode = number(result?.ResultCode);
  if (!result || resultCode === undefined) {
    throw new AppError("M-Pesa transaction-status callback is malformed.", 400);
  }

  const operation = await findCallbackOperation(result, "TRANSACTION_STATUS");
  const status = statusFromResultCode(resultCode);
  if (operation?.relatedTransactionId) {
    const original = await findOperationById(operation.relatedTransactionId);
    if (original) {
      const currentStatus = transactionStatus(
        result.TransactionStatus,
        resultCode,
      );
      await updateOperation(original.id, {
        status: currentStatus,
        resultCode,
        resultDesc: text(result.ResultDesc) ?? null,
        callbackPayload: body ?? {},
        completedAt: currentStatus === "PENDING" ? null : new Date(),
      });
    }
  }
  await updateFromCallback(operation, {
    status,
    resultCode,
    resultDesc: text(result.ResultDesc) ?? null,
    callbackPayload: body ?? {},
    completedAt: new Date(),
  });
  return callbackResult(status);
}

export async function processReversalTimeout(payload: unknown) {
  return processTimeout(payload, "REVERSAL");
}

export async function processTransactionStatusTimeout(payload: unknown) {
  return processTimeout(payload, "TRANSACTION_STATUS");
}

export async function processB2cTimeout(payload: unknown) {
  return processTimeout(payload, "B2C");
}

export async function processAccountBalanceTimeout(payload: unknown) {
  return processTimeout(payload, "ACCOUNT_BALANCE");
}

async function processTimeout(
  payload: unknown,
  operationType: MpesaOperationType,
) {
  const body = record(payload);
  const result = record(body?.Result) ?? body;
  if (!result) throw new AppError("M-Pesa timeout callback is malformed.", 400);
  const operation = await findCallbackOperation(result, operationType);
  if (!operation) {
    logger.error("Received M-Pesa timeout for an unknown operation.");
    throw new AppError(
      "M-Pesa timeout could not be matched to a pending operation.",
      503,
    );
  }
  if (operation.status !== "SUCCEEDED" && operation.status !== "FAILED") {
    await updateOperation(operation.id, {
      status: "TIMED_OUT",
      resultCode: number(result.ResultCode) ?? null,
      resultDesc: text(result.ResultDesc) ?? "M-Pesa request timed out.",
      callbackPayload: body ?? {},
      completedAt: null,
    });
  }
  return callbackResult("TIMED_OUT");
}

function ratibaResponse(payload: JsonRecord) {
  const responseBody = record(payload.responseBody);
  const responseData = responseBody?.responseData;
  if (!Array.isArray(responseData)) return undefined;
  const values: JsonRecord = {};
  for (const item of responseData) {
    const entry = record(item);
    const name = text(entry?.name);
    if (name) values[name] = entry?.value;
  }
  return values;
}

export async function processStandingOrderCallback(payload: unknown) {
  const body = record(payload);
  const data = body && ratibaResponse(body);
  if (!body || !data) {
    throw new AppError("M-Pesa standing-order callback is malformed.", 400);
  }
  const phone = text(data.Msisdn);
  if (!phone) throw new AppError("Standing-order callback has no phone.", 400);

  const operation = await findLatestOperation("STANDING_ORDER", phone, "PENDING");
  const succeeded = data.Status === "OKAY" && text(data.responseCode) === "0";
  const status = succeeded ? "ACTIVE" : "FAILED";
  await updateFromCallback(operation, {
    status,
    resultCode: number(data.responseCode) ?? null,
    resultDesc:
      text(data.ResultDesc) ??
      text(record(body.responseHeader)?.responseDescription) ??
      null,
    conversationId: text(data.TransactionID) ?? null,
    callbackPayload: body,
    completedAt: new Date(),
  });
  return callbackResult(succeeded ? "SUCCEEDED" : "FAILED");
}

export async function processStandingOrderExecutionCallback(payload: unknown) {
  const body = record(payload);
  const data = body && ratibaResponse(body);
  if (!body || !data) {
    throw new AppError("M-Pesa standing-order execution callback is malformed.", 400);
  }
  const phone = text(data.Msisdn);
  const receiptNumber = text(data.TransactionID);
  if (!phone) {
    throw new AppError("Standing-order execution callback has no phone.", 400);
  }
  if (receiptNumber) {
    const existing = await findByReceiptNumber(receiptNumber);
    if (existing?.operationType === "STANDING_ORDER_EXECUTION") {
      return callbackResult("SUCCEEDED");
    }
    if (existing) {
      throw new AppError("Receipt is already associated with another operation.", 409);
    }
  }

  const standingOrder = await findLatestOperation(
    "STANDING_ORDER",
    phone,
    "ACTIVE",
  );
  if (!standingOrder) {
    throw new AppError("Standing order was not found for this callback.", 503);
  }
  const resultCode = number(data.responseCode) ?? -1;
  const status = data.Status === "OKAY" && resultCode === 0
    ? "SUCCEEDED"
    : "FAILED";
  await createOperation({
    id: randomUUID(),
    reference: randomUUID().replaceAll("-", ""),
    operationType: "STANDING_ORDER_EXECUTION",
    status,
    phone,
    amount: number(data.Amount) ?? standingOrder?.amount ?? null,
    merchantReference: standingOrder?.merchantReference ?? null,
    relatedTransactionId: standingOrder?.id ?? null,
    mpesaReceiptNumber: receiptNumber ?? null,
    resultCode,
    resultDesc: text(data.ResultDesc) ?? null,
    callbackPayload: body,
    callbackProcessedAt: new Date(),
    completedAt: new Date(),
  });
  return callbackResult(status);
}

export async function processAccountBalanceCallback(payload: unknown) {
  const body = record(payload);
  const result = record(body?.Result);
  const resultCode = number(result?.ResultCode);
  if (!result || resultCode === undefined) {
    throw new AppError("M-Pesa account-balance callback is malformed.", 400);
  }
  const operation = await findCallbackOperation(result, "ACCOUNT_BALANCE");
  const status = statusFromResultCode(resultCode);
  const resultParameters = record(result.ResultParameters)?.ResultParameter;
  let accountBalance: string | undefined;
  if (Array.isArray(resultParameters)) {
    for (const parameter of resultParameters) {
      const entry = record(parameter);
      if (entry?.Key === "AccountBalance") {
        accountBalance = text(entry.Value);
        break;
      }
    }
  }
  await updateFromCallback(operation, {
    status,
    resultCode,
    resultDesc: text(result.ResultDesc) ?? null,
    callbackPayload: body ?? {},
    providerResponse: accountBalance
      ? { AccountBalance: accountBalance }
      : undefined,
    completedAt: new Date(),
  });
  return callbackResult(status);
}
