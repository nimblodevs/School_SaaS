import { z } from "zod";
import { AppError } from "../../utils/error/AppError.js";

const kenyanPhone = z
  .string()
  .trim()
  .regex(/^254[17]\d{8}$/, "Phone must use the 2547XXXXXXXX or 2541XXXXXXXX format.");
const positiveAmount = z.coerce.number().int().positive();
const idempotencyKeySchema = z
  .string()
  .trim()
  .min(8)
  .max(128)
  .regex(/^[A-Za-z0-9._:-]+$/);
const callbackDate = z
  .string()
  .regex(/^\d{8}$/, "Date must use YYYYMMDD format.")
  .refine((value) => {
    const year = Number(value.slice(0, 4));
    const month = Number(value.slice(4, 6));
    const day = Number(value.slice(6, 8));
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    );
  }, "Date is not a valid calendar date.");

export const stkPushSchema = z.object({
  phone: kenyanPhone,
  amount: positiveAmount,
  accountReference: z.string().trim().min(1).max(12),
  transactionDesc: z.string().trim().min(1).max(20).default("School fees"),
});

export const stkQuerySchema = z.object({
  checkoutRequestId: z.string().trim().min(1).max(128),
});

export const b2cSchema = z.object({
  phone: kenyanPhone,
  amount: positiveAmount,
  remarks: z.string().trim().max(100).default("School payment"),
});

export const reversalSchema = z.object({
  transactionId: z.string().trim().min(1).max(32),
  amount: positiveAmount,
  remarks: z.string().trim().max(100).default("Customer refund"),
});

export const transactionStatusSchema = z.object({
  transactionId: z.string().trim().min(1).max(32),
  remarks: z.string().trim().max(100).default("Check transaction status"),
});

export const standingOrderSchema = z.object({
  phone: kenyanPhone,
  amount: positiveAmount,
  name: z.string().trim().min(1).max(80),
  startDate: callbackDate,
  endDate: callbackDate,
  frequency: z.enum(["Daily", "Weekly", "Monthly", "Quarterly", "Yearly"]),
  accountReference: z.string().trim().min(1).max(12).optional(),
  transactionType: z
    .enum([
      "Standing Order Customer Pay Bill",
      "Standing Order Customer Pay Merchant",
    ])
    .default("Standing Order Customer Pay Bill"),
}).refine(
  (value) => value.startDate < value.endDate,
  { path: ["endDate"], message: "End date must be after start date." },
);

export const accountBalanceSchema = z.object({
  remarks: z.string().trim().max(100).default("Balance check"),
});

export function parseRequestBody<T extends z.ZodType>(
  schema: T,
  body: unknown,
): z.infer<T> {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new AppError("Request body is invalid.", 400, {
      cause: parsed.error,
    });
  }
  return parsed.data;
}

export function parseIdempotencyKey(value: string | undefined): string {
  const parsed = idempotencyKeySchema.safeParse(value);
  if (!parsed.success) {
    throw new AppError(
      "Idempotency-Key header must contain 8-128 safe characters.",
      400,
      { cause: parsed.error },
    );
  }
  return parsed.data;
}
