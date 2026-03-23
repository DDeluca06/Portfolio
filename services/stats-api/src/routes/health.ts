/**
 * Health Check Routes
 */

import { Hono } from "hono";
import { collectQuickStats } from "../lib/system.js";

const health = new Hono();

/**
 * Basic health check
 * Returns 200 OK if service is running
 */
health.get("/", (c) => {
  return c.json({
    status: "healthy",
    service: "stats-api",
    version: process.env.npm_package_version || "1.0.0",
    timestamp: new Date().toISOString()
  });
});

/**
 * Detailed health check with system info
 */
health.get("/detailed", async (c) => {
  const startTime = Date.now();
  
  try {
    const stats = await collectQuickStats();
    const responseTime = Date.now() - startTime;
    
    return c.json({
      status: "healthy",
      service: "stats-api",
      version: process.env.npm_package_version || "1.0.0",
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      system: {
        cpu: {
          usage: stats.cpu.usage,
          cores: stats.cpu.cores
        },
        memory: {
          percentage: stats.memory.percentage,
          used: stats.memory.used,
          total: stats.memory.total
        }
      }
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return c.json({
      status: "degraded",
      service: "stats-api",
      version: process.env.npm_package_version || "1.0.0",
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      error: error instanceof Error ? error.message : "Unknown error"
    }, 503);
  }
});

/**
 * Readiness probe
 * Checks if the service is ready to accept traffic
 */
health.get("/ready", async (c) => {
  try {
    // Quick check that system info can be collected
    await collectQuickStats();
    return c.json({ ready: true });
  } catch {
    return c.json({ ready: false }, 503);
  }
});

/**
 * Liveness probe
 * Simple check that the process is running
 */
health.get("/live", (c) => {
  return c.json({ alive: true });
});

export default health;
