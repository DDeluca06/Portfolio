import type { RequestHandler } from "./$types";
import { getNodes, checkDockerConnection, type NodeInfo } from "$lib/docker";

export const prerender = false;

export const GET: RequestHandler = async ({ locals }) => {
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

    // Get all nodes
    const nodes = await getNodes();

    // Check if Swarm is enabled
    if (nodes.length === 0) {
      return new Response(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          requestId: locals.requestId,
          swarmMode: false,
          message: "Swarm mode not enabled or no nodes found",
          nodes: [],
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
          },
        },
      );
    }

    // Enhance node data
    const enhancedNodes = nodes.map((node: NodeInfo) => ({
      id: node.id.substring(0, 12),
      fullId: node.id,
      hostname: node.description.hostname,
      name: node.spec.name || node.description.hostname,
      version: node.version.index,
      createdAt: node.createdAt,
      updatedAt: node.updatedAt,
      role: node.spec.role || "worker",
      availability: node.spec.availability || "active",
      isManager: node.spec.role === "manager",
      isLeader: node.managerStatus?.leader || false,
      status: {
        state: node.status.state,
        message: node.status.message,
        address: node.status.addr,
      },
      managerStatus: node.managerStatus
        ? {
            leader: node.managerStatus.leader,
            reachability: node.managerStatus.reachability,
            address: node.managerStatus.addr,
          }
        : null,
      platform: {
        architecture: node.description.platform.architecture,
        os: node.description.platform.os,
      },
      resources: {
        cpus: node.description.resources.nanoCPUs
          ? (node.description.resources.nanoCPUs / 1e9).toFixed(2) + " CPUs"
          : "unknown",
        memory: node.description.resources.memoryBytes
          ? formatBytes(node.description.resources.memoryBytes)
          : "unknown",
        genericResources: node.description.resources.genericResources || [],
      },
      engine: {
        version: node.description.engine.engineVersion,
        labels: node.description.engine.labels || {},
        plugins: node.description.engine.plugins || [],
      },
      labels: node.spec.labels || {},
      tlsInfo: node.description.tlsInfo
        ? {
            trustRoot: node.description.tlsInfo.trustRoot,
            certIssuerSubject: node.description.tlsInfo.certIssuerSubject,
            certIssuerPublicKey: node.description.tlsInfo.certIssuerPublicKey,
          }
        : null,
      health: {
        status:
          node.status.state === "ready"
            ? "healthy"
            : node.status.state === "down"
              ? "down"
              : "degraded",
        reachable:
          node.managerStatus?.reachability === "reachable" ||
          !node.managerStatus,
      },
    }));

    // Calculate cluster summary
    const managers = enhancedNodes.filter((n) => n.isManager);
    const workers = enhancedNodes.filter((n) => !n.isManager);
    const healthyNodes = enhancedNodes.filter(
      (n) => n.health.status === "healthy",
    );

    return new Response(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        requestId: locals.requestId,
        swarmMode: true,
        summary: {
          total: enhancedNodes.length,
          managers: managers.length,
          workers: workers.length,
          healthy: healthyNodes.length,
          leader: managers.find((n) => n.isLeader)?.hostname || null,
        },
        nodes: enhancedNodes,
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
    console.error("Detailed error fetching nodes:", error);

    return new Response(
      JSON.stringify({
        error: "Failed to fetch nodes",
        requestId: locals.requestId,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }
};

// Helper function to format bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export const OPTIONS: RequestHandler = async () => {
  return new Response(null, { status: 204 });
};
