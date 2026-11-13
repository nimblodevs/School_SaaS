# M-Pesa Gateway: Responses and Errors

This guide documents the response behavior implemented by this project under
`/api/v1/mpesa`. It separates this API's HTTP responses from Safaricom Daraja
response fields. The two code systems are not interchangeable.

## Authentication and idempotency

Client-initiated operations require the `x-mpesa-api-key` header. The API key
must be configured on the server and match the request value.

The following operation requests also require an `Idempotency-Key` header:

- `POST /api/v1/mpesa/stkpush`
- `POST /api/v1/mpesa/b2c`
- `POST /api/v1/mpesa/reversal`
- `POST /api/v1/mpesa/ratiba/create`

The key must contain 8–128 characters from `A-Z`, `a-z`, `0-9`, `.`, `_`, `:`,
or `-`. Repeating a key with the same request returns the existing operation;
reusing it with different request data returns `409 Conflict`.

## HTTP responses

| HTTP status | Meaning in this API | Typical response or action |
|---|---|---|
| `200 OK` | An immediate query completed (for example, STK query) or a callback was processed. | Check the JSON body for the operation status. |
| `202 Accepted` | An asynchronous M-Pesa operation was submitted. | This is not proof of payment. Track the operation until its callback updates the status. |
| `400 Bad Request` | The request body, idempotency key, or callback payload is invalid. | Correct the field values or payload and retry. |
| `401 Unauthorized` | `x-mpesa-api-key` is missing or incorrect. | Use the configured server API key. |
| `403 Forbidden` | In production, a callback came from an IP not in `MPESA_ALLOWED_IPS`. | Correct the allowlist and trusted-proxy configuration. |
| `404 Not Found` | A referenced transaction or checkout request was not found. | Check the receipt or checkout request ID and its operation type. |
| `409 Conflict` | An idempotency key was reused with different data, a reversal is already active, or a receipt is already associated with another operation. | Reconcile the existing operation before starting another. |
| `429 Too Many Requests` | A route rate limit was exceeded. | Wait before retrying; avoid automatic rapid retries. |
| `500 Internal Server Error` | An unexpected local or database error occurred. | Check server logs and operation status before retrying. |
| `502 Bad Gateway` | The M-Pesa API could not be reached, returned a non-success HTTP response, or returned an invalid response. | Treat the outcome as uncertain; reconcile before submitting a new operation. |
| `503 Service Unavailable` | Required M-Pesa configuration is missing/invalid, authorization is not configured, or a callback could not be matched. | Fix the named configuration issue or investigate the unmatched callback. |

For controller-handled M-Pesa operations, client errors (`4xx`) return an
`error` message, for example:

```json
{ "error": "Request body is invalid." }
```

Controller-handled server errors (`5xx`) intentionally return a generic message
to clients:

```json
{ "error": "M-Pesa request could not be completed." }
```

The server logs the failure details for diagnosis. Some middleware responses,
such as rate limiting and callback IP rejection, have their own response
formats.

## Accepted operation responses

Operation-creating endpoints return `202 Accepted`. The response contains an
operation ID, a reference, a status, and (when available) the Daraja response:

```json
{
  "operationId": "operation-id",
  "reference": "merchant-reference",
  "status": "PENDING",
  "data": {
    "ResponseCode": "0",
    "ResponseDescription": "Accepted"
  }
}
```

`202` means the request was accepted for processing; it does not mean the
customer paid. A non-zero Daraja `ResponseCode` can result in an operation
whose status is already `FAILED`, even though the local HTTP response is
`202`. Inspect `status` and `data.ResponseCode`.

The operation status values are:

| Status | Meaning |
|---|---|
| `PENDING` | Submitted or awaiting a callback. |
| `SUCCEEDED` | A callback reported a successful result. |
| `FAILED` | Daraja or a callback reported failure. |
| `TIMED_OUT` | A timeout callback was received. |
| `UNKNOWN` | The outbound result could not be determined, such as after a network failure. Reconcile before retrying. |

`POST /api/v1/mpesa/stkquery` returns `200 OK` with the stored status, receipt,
result code, and timestamps for a known checkout request ID.

## Callback responses and Daraja result codes

For a valid, matched callback, the API acknowledges receipt with HTTP `200` and
a Daraja-style body such as:

```json
{ "ResultCode": 0, "ResultDesc": "Accepted" }
```

`ResultCode: 0` here means **the callback was processed**, not that the
payment succeeded. The transaction outcome is recorded separately:

- Daraja callback `ResultCode: 0` → `SUCCEEDED`
- Non-zero callback `ResultCode` → `FAILED`
- A timeout callback → `TIMED_OUT`

For a failed STK callback, the provider's `ResultDesc` is stored and returned
as `resultDescription` by the STK query. The callback acknowledgement still
uses `ResultCode: 0` to acknowledge receipt, while its `ResultDesc` contains the
provider's failure message. If Daraja omits that message, the API provides a
fallback mentioning the result code. The failure is also logged in the server
console.

Malformed callbacks return `400`. A callback that cannot be matched to an
operation returns `503`. Duplicate callbacks are ignored and acknowledged
without applying the result a second time.

The Daraja request `ResponseCode` and callback `ResultCode` are provider
fields, not this API's HTTP status. For successful upstream HTTP responses,
provider fields are available in the operation's `data` or query result. A
non-success upstream HTTP response is mapped to local `502`; its full provider
error body is not returned to the client.

## Rate limits

The global M-Pesa limit applies to every route. The endpoint-specific limits
also apply where listed:

| Route group | Limit |
|---|---:|
| All M-Pesa routes | 30 requests per minute |
| STK Push | 5 requests per minute |
| Reversal | 3 requests per minute |
| Callback routes | 120 requests per minute, in addition to the global 30/minute limit |

## Validation errors

Common request validation requirements include:

- Phone numbers use `2547XXXXXXXX` or `2541XXXXXXXX`.
- Amounts are positive integers.
- STK account references contain 1–12 characters.
- STK transaction descriptions contain 1–20 characters.
- Transaction IDs and checkout request IDs must be provided for their
  corresponding query operations.

For the full request schemas, see
[`mpesa.validation.ts`](./server/src/modules/mpesa/mpesa.validation.ts).

## Daraja C2B result codes

These are C2B validation response codes from Daraja. They are included for
reference only; this project does not currently expose a C2B validation
endpoint.

| `ResultCode` | `ResultDesc` |
|---|---|
| `C2B00011` | Invalid MSISDN |
| `C2B00012` | Invalid Account Number |
| `C2B00013` | Invalid Amount |
| `C2B00014` | Invalid KYC Details |
| `C2B00015` | Invalid Short code |
| `C2B00016` | Other Error |

## Daraja HTTP error reference

The following provider error references can vary by Daraja product and
environment. The local API maps upstream non-success HTTP responses to `502`,
so these provider details may not be present in the client response. Use the
full Daraja response and Safaricom documentation when diagnosing an error.

| HTTP code | Error code/message | Possible cause | Mitigation |
|---|---|---|---|
| `500` | `500.003.1001` Internal Server Error | Provider server failure. | Confirm the request follows the API documentation, the endpoint is correct, and your server is running as expected. |
| `500` | `500.003.1001` URLs are already registered. | A URL is already registered. | To change it, request deletion of the existing URL, then register the new URL. |
| `400` | `400.003.01` Invalid Access Token | The access token is incorrect or expired. | Generate a new token and use it before it expires. If copying it manually, verify that it was copied correctly. |
| `400` | `400.003.02` Bad Request | Required request data may be missing. | Check the request setup and required fields against the API documentation. |
| `500` | `500.003.03` Error Occurred: Quota Violation | Requests exceed the M-Pesa transactions-per-second limit. | Send a reasonable number of test requests, preferably one at a time. |
| `500` | `500.003.02` Error Occurred: Spike Arrest Violation | Repeated endpoint errors are causing a spike that may affect M-Pesa performance. | Ensure your server is running, responding as expected, and accessible over the internet. |
| `404` | `404.003.01` Resource not found | The requested resource could not be found; it may become available later. | Verify that you are calling the correct M-Pesa API endpoint. |
| `404` | `404.001.04` Invalid Authentication Header | The request may use the wrong HTTP method or misplaced headers. Daraja APIs use `POST`, except the Authorization API, which uses `GET`. | Use the documented method and place the authorization headers correctly. |
| `400` | `400.002.05` Invalid Request Payload | The request body is malformed or does not match the expected payload. | Match the payload to the sample and API documentation, checking field names and typos. |
| `500` | `500.003.1001` Duplicate notification info (SP ID and correlator included in the message). | URLs are registered on the Aggregator platform (formerly Broker), which uses VPN/MPLS, so they cannot also be registered on Daraja. | Request deletion of the URLs from the Aggregator platform; after deletion, register them on Daraja. |
| `400` | `400.008.02` Invalid grant type | The OAuth grant type does not match the endpoint requirements. | Use the client-credentials grant for OAuth. |
| `400` | `400.008.01` Invalid authentication type | The authentication type does not match the endpoint requirements. | Use the authentication type required by the Daraja endpoint. |

## Transaction Status API codes

These provider codes apply to Daraja Transaction Status responses. They are
distinct from this API's HTTP statuses and from callback result codes. Depending
on the upstream response, provider details may not be forwarded to the client.

### Errors

| Error | Possible cause | Mitigation |
|---|---|---|
| `500.003.1001` Internal Server Error | Provider server failure. | Confirm your setup follows the API documentation, the endpoint is correct, and your server is running as expected. |
| `400.003.01` Invalid Access Token | The access token is incorrect or expired. | Generate a new token and use it before it expires. If copying it manually, verify that it was copied correctly. |
| `400.003.02` Bad Request | Required request data may be missing. | Check your setup and required fields against the API documentation. |
| `500.003.03` Error Occurred: Quota Violation | Requests exceed the M-Pesa transactions-per-second limit. | Send a reasonable number of test requests, preferably one at a time. |
| `500.003.02` Error Occurred: Spike Arrest Violation | Repeated endpoint errors are causing a spike that may affect M-Pesa performance. | Ensure your server is running, responding as expected, and accessible over the internet. |
| `404.003.01` Resource not found | The requested resource could not be found; it may become available later. | Verify that you are calling the correct M-Pesa API endpoint. |
| `404.001.04` Invalid Authentication Header | The request may use the wrong HTTP method or misplaced headers. Daraja APIs use `POST`, except the Authorization API, which uses `GET`. | Use the documented method and place the authorization headers correctly. |
| `400.002.05` Invalid Request Payload | The request body is malformed or does not match the expected payload. | Match the payload to the sample and API documentation, checking field names and typos. |

### Response codes

| Response code | Response description |
|---|---|
| `0` | Success |

### Result codes

| Result code | Result description |
|---|---|
| `0` | Success |
| `SFC_IC0003` | The operator does not exist. |

## Account Balance API error codes

These are provider error codes for Daraja Account Balance responses. They are
not local HTTP statuses. `ApiResponse` and `ApiResult` identify the message type
in which Daraja reports the error; the exact response can vary by environment.

| Error code | Description | Message type | Details |
|---|---|---|---|
| `15` | Duplicate Detected | `ApiResult` | Requests with an originator conversation ID that has already been seen are rejected. This check is performed early by the transaction processor, along with message expiry. The duplicate rule may need reconsideration for multi-stage conversations or multiple callers. |
| `17` | Internal Failure | `ApiResult` | A catch-all for failures not identified more specifically. It can occur in `ApiResponse` or `ApiResult`; the intent is to replace it with a more precise error. |
| `18` | Initiator Credential Check Failure | `ApiResult` | The initiator password is wrong, or an encryption/decryption step failed. This is issued before a financial transaction is created. |
| `19` | Message Sequencing Failure | `ApiResult` | - |
| `20` | Unresolved Initiator | `ApiResult` | The initiator username in the request cannot be found. |
| `21` | Initiator to Primary Party Permission Failure | `ApiResult` | The initiator does not have permission to issue requests for the specified primary party, as configured for that initiator. This is determined before a financial transaction is issued. |
| `22` | Initiator to Receiver Party Permission Failure | `ApiResult` | The initiator can receive requests but is not currently active. |
| `24` | Missing mandatory fields | `ApiResponse` | Required parameters depend on the operation. Missing parameter names are included in the result parameters field. |
| `25` | InvalidRequestParameters | `ApiResponse` | Supplied parameters failed validation or could not be converted to their expected types. Details are included in the result parameters. |
| `26` | Traffic blocking condition in place | `ApiResponse` | `SystemTooBusy`: a traffic blocking condition is in place. |
| `29` | InvalidCommand | `ApiResponse` | The command in the request is not defined. |
| `100000000` | Request was cached, waiting for resending | `ApiResponse` | - |
| `100000001` | The system is overloaded | `ApiResponse` | - |
| `100000002` | Throttling error | `ApiResponse` | - |
| `100000004` | Internal Server Error | `ApiResponse` | - |
| `100000005` | Invalid input value: `%1` | `ApiResponse` | `%1` indicates the parameter's name. |
| `100000007` | Service status is abnormal | `ApiResponse` | - |
| `100000009` | API status is abnormal | `ApiResponse` | - |
| `100000010` | Insufficient permissions | `ApiResponse` | - |
| `100000011` | Exceeded the request-rate limit | `ApiResponse` | - |
| `00.002.1001` | Service is currently under maintenance. Please try again later. | - | - |

The supplied reference labels codes `24` and `25` as `ApiResponse`, while their
details say the validation result is reported in `ApiResult`. Confirm the
message type against the current Daraja documentation for your environment.

## Retry and reconciliation guidance

1. For `400`, `401`, or `503`, correct the request or configuration before
   retrying.
2. For `429`, back off and send requests sequentially.
3. For `502`, timeouts, or an operation in `UNKNOWN`, do not create a new
   payment with a new idempotency key until the previous outcome is reconciled.
   Reuse the original key for an identical retry.
4. For `202`/`PENDING`, wait for the callback and then query the transaction
   using its checkout request ID.

Implementation references:
[`mpesa.routes.ts`](./server/src/modules/mpesa/mpesa.routes.ts),
[`mpesa.controller.ts`](./server/src/modules/mpesa/mpesa.controller.ts),
[`mpesa.module.service.ts`](./server/src/modules/mpesa/mpesa.module.service.ts),
[`mpesa.service.ts`](./server/src/services/mpesa.service.ts), and
[`mpesa.middleware.ts`](./server/src/middlewares/mpesa.middleware.ts).
