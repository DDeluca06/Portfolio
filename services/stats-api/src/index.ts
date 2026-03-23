/**
 * Stats API Server
 * 
 * Hono-based HTTP server for system statistics collection
 */

import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { prettyJSON } from "hono/pretty-json";
import { HTTPException } from "hono/http-exception";

import healthRoutes from "./routes/health.js";
import statsRoutes from "./routes/stats.js";
import { authMiddleware } from "./middleware/auth.js";

const app = new Hono();

// Middleware
app.use(logger());
app.use(cors());
app.use(prettyJSON());

// Authentication middleware for protected routes
app.use("/api/*", authMiddleware);

// Health check routes (no auth required)
app.route("/health", healthRoutes);

// Stats API routes (auth required)
app.route("/api/stats", statsRoutes);

// Root endpoint
app.get("/", (c) => {
  return c.json({
    service: "stats-api",
    version: process.env.npm_package_version || "1.0.0",
    description: "System statistics collection API",
    endpoints: {
      health: {
        "GET /health": "Basic health check",
        "GET /health/detailed": "Detailed health with system info",
        "GET /health/ready": "Readiness probe",
        "GET /health/live": "Liveness probe"
      },
      stats: {
        "GET /api/stats/current": "Current CPU, RAM, Disk, Network stats",
        "GET /api/stats/system": "Static system information",
        "GET /api/stats/servers": "List configured servers",
        "GET /api/stats/servers/:id": "Stats for specific server"
      }
    }
  });
});

// Error handling
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({
      success: false,
      error: err.message,
      status: err.status
    }, err.status);
  }
  
  console.error("Unhandled error:", err);
  return c.json({
    success: false,
    error: "Internal server error"
  }, 500);
});

// 404 handler
app.notFound((c) => {
  return c.json({
    success: false,
    error: "Not found",
    path: c.req.path
  }, 404);
});

// Start server
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
const HOST = process.env.HOST || "0.0.0.0";

console.log(`Starting stats-api server on ${HOST}:${PORT}...`);

Bun.serve({
  port: PORT,
  hostname: HOST,
  fetch: app.fetch
});

console.log(`Stats API server running at http://${HOST}:${PORT}`);
console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
console.log(`Auth enabled: ${process.env.DISABLE_AUTH !== "true"}`);
