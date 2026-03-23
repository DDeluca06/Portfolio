/**
 * Rate Limiting Middleware
 * 
 * Simple in-memory rate limiter for API endpoints
 */

import type { MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const store = new Map<string, RateLimitEntry>();

// Default rate limit: 100 requests per minute
const DEFAULT_WINDOW_MS = 60 * 1000; // 1 minute
const DEFAULT_MAX_REQUESTS = 100;

// Stricter limits for specific endpoints
const ENDPOINT_LIMITS: Record<string, { windowMs: number; maxRequests: number }> = {
  "/stats/current": { windowMs: 10 * 1000, maxRequests: 30 }, // 30 requests per 10 seconds
  "/stats/quick": { windowMs: 5 * 1000, maxRequests: 20 },    // 20 requests per 5 seconds
  "/stats/history": { windowMs: 60 * 1000, maxRequests: 10 }, // 10 requests per minute
};

function getClientIdentifier(c: { req: { header: (name: string) => string | undefined } }): string {
  // Use X-Forwarded-For header if behind a proxy
  const forwarded = c.req.header("x-forwarded-for");
  if (forwarded) {
    const firstIp = forwarded.split(",")[0];
    if (firstIp) {
      return firstIp.trim();
    }
  }
  
  // Use X-Real-IP header
  const realIp = c.req.header("x-real-ip");
  if (realIp) {
    return realIp;
  }
  
  return "unknown";
}

function getRateLimitConfig(path: string): { windowMs: number; maxRequests: number } {
  // Check for exact endpoint match first
  for (const [endpoint, config] of Object.entries(ENDPOINT_LIMITS)) {
    if (path.startsWith(endpoint)) {
      return config;
    }
  }
  
  // Return default config
  return {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || String(DEFAULT_WINDOW_MS)),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || String(DEFAULT_MAX_REQUESTS))
  };
}

function cleanupExpiredEntries(now: number): void {
  for (const [key, entry] of store.entries()) {
    if (entry.resetTime <= now) {
      store.delete(key);
    }
  }
}

/**
 * Rate limiting middleware
 */
export const rateLimitMiddleware: MiddlewareHandler = async (c, next) => {
  // Skip rate limiting if disabled
  if (process.env.DISABLE_RATE_LIMIT === "true") {
    return next();
  }

  const clientId = getClientIdentifier(c);
  const path = c.req.path;
  const key = `${clientId}:${path}`;
  const now = Date.now();
  
  const config = getRateLimitConfig(path);
  
  // Cleanup expired entries occasionally (1% chance)
  if (Math.random() < 0.01) {
    cleanupExpiredEntries(now);
  }
  
  // Get or create rate limit entry
  let entry = store.get(key);
  
  if (!entry || entry.resetTime <= now) {
    entry = {
      count: 1,
      resetTime: now + config.windowMs
    };
    store.set(key, entry);
  } else {
    entry.count++;
  }
  
  // Set rate limit headers
  c.header("X-RateLimit-Limit", String(config.maxRequests));
  c.header("X-RateLimit-Remaining", String(Math.max(0, config.maxRequests - entry.count)));
  c.header("X-RateLimit-Reset", String(Math.ceil(entry.resetTime / 1000)));
  
  // Check if rate limit exceeded
  if (entry.count > config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    c.header("Retry-After", String(retryAfter));
    throw new HTTPException(429, { 
      message: `Rate limit exceeded. Try again in ${retryAfter} seconds.` 
    });
  }
  
  await next();
};

/**
 * Get current rate limit status for a client
 */
export function getRateLimitStatus(clientId: string, path: string) {
  const key = `${clientId}:${path}`;
  const entry = store.get(key);
  const config = getRateLimitConfig(path);
  
  if (!entry) {
    return {
      limit: config.maxRequests,
      remaining: config.maxRequests,
      reset: Date.now() + config.windowMs
    };
  }
  
  return {
    limit: config.maxRequests,
    remaining: Math.max(0, config.maxRequests - entry.count),
    reset: entry.resetTime
  };
}
