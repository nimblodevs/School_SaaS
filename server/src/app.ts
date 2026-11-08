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

const app: Application = express();

// 1. Security & Core Middlewares
app.use(helmet());

const allowedOrigins = env.ALLOWED_ORIGINS 
  ? env.ALLOWED_ORIGINS.split(",") 
  : ["http://localhost:3000", "http://localhost:5173"];

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
  })
);

// 4. Health Check Endpoint
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() });
});

// 5. API Routes Registration (Placeholder for modular routes)
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