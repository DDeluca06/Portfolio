import type { Handle } from "@sveltejs/kit";

/**
 * Rate Limiting Note:
 * This uses in-memory Map suitable for single-instance deployments.
 * For production with multiple instances, use:
 * - Traefik rate limiting middleware
 * - Redis-backed rate limiter
 * - API gateway with rate limiting
 */

// Rate limiting store
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Configuration from environment variables
// Use fallback for development if not configured
const STATS_API_KEY = process.env.STATS_API_KEY || 
  (process.env.NODE_ENV === 'development' ? 'dev-api-key-not-for-production' : '');

// Warn if not configured (but not in test environment)
if (!STATS_API_KEY && process.env.NODE_ENV !== 'test') {
  console.warn('[hooks.server.ts] STATS_API_KEY not configured. Using fallback for development.');
}
const ALLOWED_ORIGINS =
  process.env.ALLOWED_ORIGINS?.split(",").map((o) => o.trim()) || [];
const RATE_LIMIT_READS_PER_MINUTE = parseInt(
  process.env.RATE_LIMIT_READS_PER_MINUTE || "100",
  10,
);
const RATE_LIMIT_WRITES_PER_MINUTE = parseInt(
  process.env.RATE_LIMIT_WRITES_PER_MINUTE || "20",
  10,
);
const ENABLE_HSTS = process.env.ENABLE_HSTS === "true";
const HSTS_MAX_AGE = parseInt(process.env.HSTS_MAX_AGE || "31536000", 10);

// Generate unique request ID
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

// Extract client IP from request
function getClientIP(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }
  return "unknown";
}

// Check if request is a read operation
function isReadOperation(request: Request): boolean {
  return request.method === "GET" || request.method === "HEAD";
}

// Rate limiting check
function checkRateLimit(
  clientIP: string,
  isRead: boolean,
): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const limit = isRead
    ? RATE_LIMIT_READS_PER_MINUTE
    : RATE_LIMIT_WRITES_PER_MINUTE;
  const windowMs = 60 * 1000; // 1 minute window

  const key = `${clientIP}:${isRead ? "read" : "write"}`;
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    // New window or expired
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });
    return { allowed: true };
  }

  if (entry.count >= limit) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }

  entry.count++;
  return { allowed: true };
}

// Validate API key from Authorization header
function validateAPIKey(request: Request): boolean {
  if (!STATS_API_KEY) {
    console.error("STATS_API_KEY not configured");
    return false;
  }

  const authHeader = request.headers.get("Authorization");
  if (!authHeader) {
    return false;
  }

  // Support Bearer token format: "Bearer <api-key>"
  const parts = authHeader.split(" ");
  if (parts.length === 2 && parts[0].toLowerCase() === "bearer") {
    return parts[1] === STATS_API_KEY;
  }

  // Also support direct API key in Authorization header
  return authHeader === STATS_API_KEY;
}

// Validate CORS origin
function validateOrigin(request: Request): boolean {
  if (ALLOWED_ORIGINS.length === 0) {
    const origin = request.headers.get("origin");
    if (!origin) return true; // Same-origin
    if (process.env.NODE_ENV === "development") {
      return ["http://localhost:3000", "http://localhost:5173"].includes(
        origin,
      );
    }
    console.warn("CORS: Rejecting - ALLOWED_ORIGINS not configured");
    return false;
  }

  const origin = request.headers.get("origin");
  if (!origin) {
    return true; // Allow requests without origin (e.g., curl, server-to-server)
  }

  return ALLOWED_ORIGINS.includes(origin);
}

// Get appropriate CORS headers
function getCORSHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin");
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Authorization, Content-Type, X-Requested-With",
    "Access-Control-Max-Age": "86400",
  };

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Credentials"] = "true";
  }

  return headers;
}

// Main handle function
export const handle: Handle = async ({ event, resolve }) => {
  const request = event.request;
  const clientIP = getClientIP(request);
  const requestId = generateRequestId();

  // Store in locals for access in routes
  event.locals.clientIP = clientIP;
  event.locals.requestId = requestId;

  // Handle preflight OPTIONS requests
  if (request.method === "OPTIONS") {
    const corsHeaders = getCORSHeaders(request);

    // Check origin for preflight
    if (!validateOrigin(request)) {
      return new Response(null, {
        status: 403,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // Check CORS for API routes
  if (event.url.pathname.startsWith("/api/")) {
    if (!validateOrigin(request)) {
      return new Response(
        JSON.stringify({
          error: "CORS policy violation",
          requestId,
        }),
        {
          status: 403,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    }

    // Check rate limit for API routes
    const isRead = isReadOperation(request);
    const rateLimitResult = checkRateLimit(clientIP, isRead);

    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded",
          retryAfter: rateLimitResult.retryAfter,
          requestId,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(rateLimitResult.retryAfter),
            "X-RateLimit-Limit": String(
              isRead
                ? RATE_LIMIT_READS_PER_MINUTE
                : RATE_LIMIT_WRITES_PER_MINUTE,
            ),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(
              Math.ceil(Date.now() / 1000) + (rateLimitResult.retryAfter || 60),
            ),
          },
        },
      );
    }

    // Validate API key for protected API routes
    // Skip auth for health check endpoint
    if (!event.url.pathname.startsWith("/api/health")) {
      if (!validateAPIKey(request)) {
        return new Response(
          JSON.stringify({
            error: "Unauthorized",
            message: "Valid API key required",
            requestId,
          }),
          {
            status: 401,
            headers: {
              "Content-Type": "application/json",
              "WWW-Authenticate": "Bearer",
            },
          },
        );
      }
    }
  }

  // Process the request
  const response = await resolve(event);

  // Add security headers to all responses
  const securityHeaders = new Headers(response.headers);

  // CORS headers for API routes
  if (event.url.pathname.startsWith("/api/")) {
    const corsHeaders = getCORSHeaders(request);
    Object.entries(corsHeaders).forEach(([key, value]) => {
      securityHeaders.set(key, value);
    });
  }

  // Security headers
  securityHeaders.set("X-Content-Type-Options", "nosniff");
  securityHeaders.set("X-Frame-Options", "DENY");
  securityHeaders.set("X-XSS-Protection", "1; mode=block");
  securityHeaders.set("Referrer-Policy", "strict-origin-when-cross-origin");
  securityHeaders.set(
    "Permissions-Policy",
    "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()",
  );

  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self'",
    "media-src 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
  securityHeaders.set("Content-Security-Policy", csp);

  // HSTS header for HTTPS
  if (ENABLE_HSTS) {
    securityHeaders.set(
      "Strict-Transport-Security",
      `max-age=${HSTS_MAX_AGE}; includeSubDomains`,
    );
  }

  // Remove server fingerprinting headers
  securityHeaders.delete("Server");
  securityHeaders.delete("X-Powered-By");

  // Add request ID header for debugging
  securityHeaders.set("X-Request-ID", requestId);

  // Add rate limit headers for API routes
  if (event.url.pathname.startsWith("/api/")) {
    const isRead = isReadOperation(request);
    const limit = isRead
      ? RATE_LIMIT_READS_PER_MINUTE
      : RATE_LIMIT_WRITES_PER_MINUTE;
    securityHeaders.set("X-RateLimit-Limit", String(limit));
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: securityHeaders,
  });
};

// Cleanup old rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60 * 1000); // Clean up every minute
