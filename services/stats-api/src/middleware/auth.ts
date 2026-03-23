/**
 * Authentication Middleware
 * 
 * API key authentication for stats endpoints
 */

import type { MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";

const API_KEYS = (process.env.STATS_API_KEY || process.env.API_KEYS || "")
  .split(",")
  .map(key => key.trim())
  .filter(Boolean);

const PUBLIC_PATHS = ["/health", "/health/detailed"];

/**
 * Authentication middleware
 * Validates API key from header or query parameter
 */
export const authMiddleware: MiddlewareHandler = async (c, next) => {
  // Allow public paths without authentication
  const path = c.req.path;
  if (PUBLIC_PATHS.some(publicPath => path.startsWith(publicPath))) {
    return next();
  }

  // Check if auth is disabled (development mode)
  if (process.env.DISABLE_AUTH === "true") {
    c.set("auth", { authenticated: true, bypass: true });
    return next();
  }

  // Get API key from header or query
  const apiKey = 
    c.req.header("x-api-key") || 
    c.req.header("authorization")?.replace("Bearer ", "") ||
    c.req.query("api_key");

  if (!apiKey) {
    throw new HTTPException(401, { message: "API key required" });
  }

  // Validate API key
  if (!API_KEYS.includes(apiKey)) {
    throw new HTTPException(401, { message: "Invalid API key" });
  }

  c.set("auth", { authenticated: true, apiKey: apiKey.slice(0, 8) + "..." });
  await next();
};

/**
 * Get authentication context
 */
export function getAuth(c: {
  get: <T>(key: string) => T | undefined;
}): { authenticated: boolean; bypass?: boolean; apiKey?: string } {
  return c.get("auth") || { authenticated: false };
}
