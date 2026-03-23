/**
 * Stats Routes
 * 
 * System statistics endpoints for the stats API
 */

import { Hono } from "hono";
import { collectSystemStats, getSystemInfo } from "../lib/system.js";

const stats = new Hono();

/**
 * GET /api/stats/current
 * Returns current system statistics (CPU, RAM, Disk, Network)
 * Requires authentication
 */
stats.get("/current", async (c) => {
  const startTime = Date.now();
  
  try {
    const systemStats = await collectSystemStats();
    const responseTime = Date.now() - startTime;
    
    return c.json({
      success: true,
      data: systemStats,
      meta: {
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to collect system stats",
      meta: {
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString()
      }
    }, 500);
  }
});

/**
 * GET /api/stats/system
 * Returns static system information (hardware, OS details)
 * Requires authentication
 */
stats.get("/system", async (c) => {
  const startTime = Date.now();
  
  try {
    const systemInfo = await getSystemInfo();
    const responseTime = Date.now() - startTime;
    
    return c.json({
      success: true,
      data: systemInfo,
      meta: {
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to get system info",
      meta: {
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString()
      }
    }, 500);
  }
});

/**
 * GET /api/stats/servers
 * List configured servers (for multi-server monitoring)
 * Currently returns only the local server
 */
stats.get("/servers", (c) => {
  const servers = [
    {
      id: "local",
      name: process.env.SERVER_NAME || "Local Server",
      hostname: process.env.HOSTNAME || "localhost",
      status: "online",
      lastSeen: new Date().toISOString(),
      capabilities: ["cpu", "memory", "disk", "network", "processes"]
    }
  ];
  
  return c.json({
    success: true,
    data: {
      servers,
      count: servers.length
    },
    meta: {
      timestamp: new Date().toISOString()
    }
  });
});

/**
 * GET /api/stats/servers/:id
 * Get stats for a specific server
 * Currently only supports 'local'
 */
stats.get("/servers/:id", async (c) => {
  const serverId = c.req.param("id");
  
  if (serverId !== "local") {
    return c.json({
      success: false,
      error: `Server '${serverId}' not found`
    }, 404);
  }
  
  const startTime = Date.now();
  
  try {
    const systemStats = await collectSystemStats();
    const responseTime = Date.now() - startTime;
    
    return c.json({
      success: true,
      data: {
        server: {
          id: "local",
          name: process.env.SERVER_NAME || "Local Server"
        },
        stats: systemStats
      },
      meta: {
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to collect server stats"
    }, 500);
  }
});

export default stats;
