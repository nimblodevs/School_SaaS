import "./instrumentation.js";
import {
  errorTrackingMiddleware,
  requestTracingMiddleware,
} from "./config/tracing.js";
import express, { Application, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import { originGuard } from "./middlewares/originGuard.middleware.js";
import { env } from "./config/env.js";
import mpesaRoutes, {
  legacyStkCallbackRouter,
} from "./modules/mpesa/mpesa.routes.js";
import filesRoutes from "./modules/files/files.routes.js";

const app: Application = express();
app.set("trust proxy", env.TRUST_PROXY);

// 1. Security & Core Middlewares
app.use(helmet());

const allowedOrigins = env.ALLOWED_ORIGINS 
  ? env.ALLOWED_ORIGINS.split(",") 
  : ["http://localhost:3000", "http://localhost:5173"];
const mpesaCallbackPaths = [
  "/api/v1/fees/mpesa/callback",
  "/api/v1/mpesa/stkpush/callback",
  "/api/v1/mpesa/b2c/callback",
  "/api/v1/mpesa/b2c/timeout",
  "/api/v1/mpesa/reversal/result",
  "/api/v1/mpesa/reversal/queue",
  "/api/v1/mpesa/transaction/status/callback",
  "/api/v1/mpesa/transaction/status/timeout",
  "/api/v1/mpesa/ratiba/callback",
  "/api/v1/mpesa/ratiba/execution/callback",
  "/api/v1/mpesa/account/balance/result",
  "/api/v1/mpesa/account/balance/timeout",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// 2. Request tracing and structured request logging
app.use(requestTracingMiddleware);

// 3. OriginGuard Middleware for State-Changing Requests
app.use(
  originGuard({
    allowedOrigins,
    allowNoOrigin: env.NODE_ENV === "development",
    allowNoOriginPaths: mpesaCallbackPaths,
  })
);

// 4. Health Check Endpoint
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() });
});

// 5. API Routes Registration (Placeholder for modular routes)
// M-Pesa requests use a service key; provider callbacks use an IP allowlist.
app.use("/api/v1/mpesa", mpesaRoutes);
app.use("/api/v1/fees/mpesa", legacyStkCallbackRouter);
app.use("/api/v1/files", filesRoutes);
// app.use("/api/v1/auth", authRoutes);
// app.use("/api/v1/schools", schoolRoutes);

// 6. 404 Not Found Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: "Not Found",
    message: `Route ${req.method} ${req.originalUrl} does not exist.`,
  });
});

// 7. Global error tracking middleware
app.use(errorTrackingMiddleware);

export default app;