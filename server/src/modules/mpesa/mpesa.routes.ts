import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  accountBalanceCallback,
  accountBalanceTimeout,
  b2cCallback,
  b2cPayment,
  b2cTimeout,
  createStandingOrderHandler,
  requestAccountBalanceHandler,
  reversal,
  reversalCallback,
  reversalTimeout,
  standingOrderCallback,
  standingOrderExecutionCallback,
  stkCallback,
  stkPush,
  stkQuery,
  transactionStatus,
  transactionStatusCallback,
  transactionStatusTimeout,
} from "./mpesa.controller.js";
import {
  requireMpesaApiKey,
  requireMpesaCallbackIp,
} from "../../middlewares/mpesa.middleware.js";

const apiLimiter = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});
const stkLimiter = rateLimit({
  windowMs: 60_000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});
const reversalLimiter = rateLimit({
  windowMs: 60_000,
  limit: 3,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});
const callbackLimiter = rateLimit({
  windowMs: 60_000,
  limit: 120,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

const router = Router();

router.use(apiLimiter);

router.post("/stkpush", requireMpesaApiKey, stkLimiter, stkPush);
router.post(
  "/stkpush/callback",
  callbackLimiter,
  requireMpesaCallbackIp,
  stkCallback,
);
router.post("/stkquery", requireMpesaApiKey, stkQuery);

router.post("/b2c", requireMpesaApiKey, b2cPayment);
router.post(
  "/b2c/callback",
  callbackLimiter,
  requireMpesaCallbackIp,
  b2cCallback,
);
router.post(
  "/b2c/timeout",
  callbackLimiter,
  requireMpesaCallbackIp,
  b2cTimeout,
);

router.post("/reversal", requireMpesaApiKey, reversalLimiter, reversal);
router.post(
  "/reversal/result",
  callbackLimiter,
  requireMpesaCallbackIp,
  reversalCallback,
);
router.post(
  "/reversal/queue",
  callbackLimiter,
  requireMpesaCallbackIp,
  reversalTimeout,
);

router.post("/transaction/status", requireMpesaApiKey, transactionStatus);
router.post(
  "/transaction/status/callback",
  callbackLimiter,
  requireMpesaCallbackIp,
  transactionStatusCallback,
);
router.post(
  "/transaction/status/timeout",
  callbackLimiter,
  requireMpesaCallbackIp,
  transactionStatusTimeout,
);

router.post("/ratiba/create", requireMpesaApiKey, createStandingOrderHandler);
router.post(
  "/ratiba/callback",
  callbackLimiter,
  requireMpesaCallbackIp,
  standingOrderCallback,
);
router.post(
  "/ratiba/execution/callback",
  callbackLimiter,
  requireMpesaCallbackIp,
  standingOrderExecutionCallback,
);

router.post(
  "/account/balance/request",
  requireMpesaApiKey,
  requestAccountBalanceHandler,
);
router.post(
  "/account/balance/result",
  callbackLimiter,
  requireMpesaCallbackIp,
  accountBalanceCallback,
);
router.post(
  "/account/balance/timeout",
  callbackLimiter,
  requireMpesaCallbackIp,
  accountBalanceTimeout,
);

export const legacyStkCallbackRouter = Router();
legacyStkCallbackRouter.use(apiLimiter);
legacyStkCallbackRouter.post(
  "/callback",
  callbackLimiter,
  requireMpesaCallbackIp,
  stkCallback,
);

export default router;
