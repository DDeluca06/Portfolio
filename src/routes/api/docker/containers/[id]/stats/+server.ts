import type { RequestHandler } from "./$types";
import { getContainerStatsComputed, checkDockerConnection } from "$lib/docker";

export const prerender = false;

export const GET: RequestHandler = async ({ params, locals }) => {
  const { id } = params;

  try {
    // Check Docker connection first
    const connection = await checkDockerConnection();
    if (!connection.connected) {
      return new Response(
        JSON.stringify({
          error: "Docker connection failed",
          message: connection.error,
          requestId: locals.requestId,
          timestamp: new Date().toISOString(),
        }),
        {
          status: 503,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
          },
        },
      );
    }

    // Get container stats
    const stats = await getContainerStatsComputed(id);

    // Format bytes helper
    const formatBytes = (bytes: number): string => {
      if (bytes === 0) return "0 B";
      const k = 1024;
      const sizes = ["B", "KB", "MB", "GB", "TB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    return new Response(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        requestId: locals.requestId,
        containerId: id,
        stats: {
          cpu: {
            percent: stats.cpuPercent,
            status:
              stats.cpuPercent > 80
                ? "high"
                : stats.cpuPercent > 50
                  ? "medium"
                  : "normal",
          },
          memory: {
            usage: stats.memoryUsage,
            limit: stats.memoryLimit,
            percent: stats.memoryPercent,
            usageFormatted: formatBytes(stats.memoryUsage),
            limitFormatted: formatBytes(stats.memoryLimit),
            status:
              stats.memoryPercent > 90
                ? "critical"
                : stats.memoryPercent > 75
                  ? "warning"
                  : "normal",
          },
          network: {
            rx: stats.networkRx,
            tx: stats.networkTx,
            rxFormatted: formatBytes(stats.networkRx),
            txFormatted: formatBytes(stats.networkTx),
          },
          block: {
            read: stats.blockRead,
            write: stats.blockWrite,
            readFormatted: formatBytes(stats.blockRead),
            writeFormatted: formatBytes(stats.blockWrite),
          },
          pids: stats.pids,
          collectedAt: stats.timestamp,
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    );
  } catch (error) {
    console.error("Detailed error fetching container stats:", error);

    // Check if container not found
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const isNotFound = errorMessage.toLowerCase().includes("no such container");

    return new Response(
      JSON.stringify({
        error: isNotFound
          ? "Container not found"
          : "Failed to fetch container stats",
        containerId: id,
        requestId: locals.requestId,
        timestamp: new Date().toISOString(),
      }),
      {
        status: isNotFound ? 404 : 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }
};

export const OPTIONS: RequestHandler = async () => {
  return new Response(null, { status: 204 });
};
