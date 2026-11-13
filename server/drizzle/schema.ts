import { pgEnum, pgTable, uuid, text, integer, jsonb, timestamp, uniqueIndex, index, primaryKey } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const mpesaOperationType = pgEnum("MpesaOperationType", ["STK_PUSH", "STK_QUERY", "B2C", "REVERSAL", "TRANSACTION_STATUS", "STANDING_ORDER", "STANDING_ORDER_EXECUTION", "ACCOUNT_BALANCE"])
export const mpesaOperationStatus = pgEnum("MpesaOperationStatus", ["PENDING", "SUCCEEDED", "FAILED", "TIMED_OUT", "UNKNOWN", "ACTIVE"])


export const mpesaOperations = pgTable("mpesa_operations", {
	id: uuid().primaryKey(),
	reference: text().notNull(),
	idempotencyKey: text("idempotency_key"),
	requestFingerprint: text("request_fingerprint"),
	operationType: mpesaOperationType("operation_type").notNull(),
	status: mpesaOperationStatus().default("PENDING").notNull(),
	phone: text(),
	amount: integer(),
	merchantReference: text("merchant_reference"),
	relatedTransactionId: text("related_transaction_id"),
	checkoutRequestId: text("checkout_request_id"),
	merchantRequestId: text("merchant_request_id"),
	conversationId: text("conversation_id"),
	originatorConversationId: text("originator_conversation_id"),
	mpesaReceiptNumber: text("mpesa_receipt_number"),
	resultCode: integer("result_code"),
	resultDesc: text("result_desc"),
	currency: text().default("KES").notNull(),
	providerResponse: jsonb("provider_response"),
	callbackPayload: jsonb("callback_payload"),
	callbackProcessedAt: timestamp("callback_processed_at", { withTimezone: true }),
	requestedAt: timestamp("requested_at", { withTimezone: true }).default(sql`now()`).notNull(),
	completedAt: timestamp("completed_at", { withTimezone: true }),
	createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`now()`).notNull(),
}, (table) => [
	uniqueIndex("mpesa_operations_active_reversal_unique").using("btree", table.relatedTransactionId.asc().nullsLast()).where(sql`((operation_type = 'REVERSAL'::"MpesaOperationType") AND (status = ANY (ARRAY['PENDING'::"MpesaOperationStatus", 'UNKNOWN'::"MpesaOperationStatus", 'TIMED_OUT'::"MpesaOperationStatus", 'SUCCEEDED'::"MpesaOperationStatus"])))`),
	uniqueIndex("mpesa_operations_checkout_request_id_unique").using("btree", table.checkoutRequestId.asc().nullsLast()),
	index("mpesa_operations_conversation_id_idx").using("btree", table.conversationId.asc().nullsLast()),
	uniqueIndex("mpesa_operations_idempotency_key_unique").using("btree", table.idempotencyKey.asc().nullsLast()),
	index("mpesa_operations_originator_conversation_id_idx").using("btree", table.originatorConversationId.asc().nullsLast()),
	index("mpesa_operations_phone_created_idx").using("btree", table.phone.asc().nullsLast(), table.createdAt.asc().nullsLast()),
	index("mpesa_operations_receipt_idx").using("btree", table.mpesaReceiptNumber.asc().nullsLast()),
	uniqueIndex("mpesa_operations_reference_unique").using("btree", table.reference.asc().nullsLast()),
	index("mpesa_operations_type_status_idx").using("btree", table.operationType.asc().nullsLast(), table.status.asc().nullsLast()),
]);
