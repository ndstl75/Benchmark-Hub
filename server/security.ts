import type { NextFunction, Request, Response } from "express";

const ADMIN_TOKEN_HEADER = "x-admin-token";

function configuredAdminToken(): string | null {
  const token = process.env.ADMIN_API_TOKEN?.trim();
  return token || null;
}

function requestAdminToken(req: Request): string | null {
  const headerToken = req.header(ADMIN_TOKEN_HEADER)?.trim();
  if (headerToken) return headerToken;

  const authHeader = req.header("authorization")?.trim();
  if (!authHeader) return null;

  const [scheme, token] = authHeader.split(/\s+/, 2);
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token.trim();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const expectedToken = configuredAdminToken();
  const suppliedToken = requestAdminToken(req);

  if (expectedToken && suppliedToken === expectedToken) {
    return next();
  }

  return res.status(403).json({ message: "Admin access required" });
}

export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (process.env.NODE_ENV === "production") {
    res.setHeader(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "base-uri 'self'",
        "frame-ancestors 'self' https://huggingface.co https://*.huggingface.co",
        "form-action 'self'",
        "img-src 'self' data:",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "connect-src 'self'",
      ].join("; "),
    );
  }

  if (req.secure || req.header("x-forwarded-proto") === "https") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  next();
}

export function apiRateLimit(req: Request, res: Response, next: NextFunction) {
  const now = Date.now();
  const windowMs = 60_000;
  const maxRequests = 300;
  const key = req.ip || req.socket.remoteAddress || "unknown";
  const bucket = rateLimitBuckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return next();
  }

  bucket.count += 1;
  if (bucket.count > maxRequests) {
    res.setHeader("Retry-After", Math.ceil((bucket.resetAt - now) / 1000).toString());
    return res.status(429).json({ message: "Too many requests" });
  }

  next();
}

const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();
