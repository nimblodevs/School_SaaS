import { Request, Response, NextFunction } from "express";

interface OriginGuardOptions {
  allowedOrigins: string[];
  // Whether to allow requests with no Origin/Referer header (e.g., mobile apps, Postman, server-to-server)
  allowNoOrigin?: boolean;
  allowNoOriginPaths?: string[];
}

export const originGuard = (options: OriginGuardOptions) => {
  const { allowedOrigins, allowNoOrigin = false } = options;
  const allowNoOriginPaths = new Set(options.allowNoOriginPaths ?? []);

  return (req: Request, res: Response, next: NextFunction): void => {
    // 1. Skip check for safe, non-state-changing methods
    const safeMethods = ["GET", "HEAD", "OPTIONS"];
    if (safeMethods.includes(req.method)) {
      return next();
    }

    const origin = req.headers.origin;
    const referer = req.headers.referer;
    const secFetchSite = req.headers["sec-fetch-site"];

    // 2. Handle clients that do not send Origin or Referer (Non-browser clients)
    if (!origin && !referer) {
      if (allowNoOrigin || allowNoOriginPaths.has(req.path)) {
        return next();
      }
      res.status(403).json({
        error: "Forbidden",
        message: "Missing origin and referer headers.",
        traceId: req.headers["x-trace-id"] || null,
      });
      return;
    }

    // 3. Validate Origin header if present
    let isOriginAllowed = false;
    if (origin) {
      isOriginAllowed = allowedOrigins.some((allowed) => {
        // Support exact match or wildcard subdomains if needed
        return origin === allowed;
      });
    }

    // 4. Fallback validation via Referer header if Origin is absent
    let isRefererAllowed = false;
    if (!isOriginAllowed && referer) {
      isRefererAllowed = allowedOrigins.some((allowed) => {
        try {
          const refererUrl = new URL(referer);
          const allowedUrl = new URL(allowed);
          return refererUrl.origin === allowedUrl.origin;
        } catch {
          return false;
        }
      });
    }

    if (!isOriginAllowed && !isRefererAllowed) {
      res.status(403).json({
        error: "Forbidden",
        message: "OriginGuard blocked request due to untrusted origin or referer.",
      });
      return;
    }

    // 5. Optional: Inspect Fetch Metadata (`Sec-Fetch-Site`) if provided by modern browsers
    // 'same-origin' or 'same-site' are inherently safe; 'cross-site' requires strict origin matching.
    if (secFetchSite === "cross-site" && !isOriginAllowed) {
      res.status(403).json({
        error: "Forbidden",
        message: "OriginGuard blocked cross-site request.",
      });
      return;
    }

    return next();
  };
};