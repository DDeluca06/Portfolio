import type { RequestHandler } from "./$types";
import {
  getContainers,
  checkDockerConnection,
  type ContainerInfo,
} from "$lib/docker";

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

    // Get all containers
    const containers = await getContainers(true);

    // Enhance with computed status info
    const enhancedContainers = containers.map((container: ContainerInfo) => ({
      id: container.id.substring(0, 12),
      fullId: container.id,
      names: container.names.map((name: string) => name.replace(/^\//, "")),
      image: container.image,
      imageId: container.imageId,
      command: container.command,
      created: new Date(container.created * 1000).toISOString(),
      state: container.state,
      status: container.status,
      ports: container.ports.map((port) => ({
        ip: port.ip,
        private: port.privatePort,
        public: port.publicPort,
        type: port.type,
      })),
      labels: container.labels,
      networkMode: container.hostConfig?.networkMode,
      networks: Object.keys(container.networkSettings?.networks || {}),
      mounts: container.mounts.map((mount) => ({
        type: mount.type,
        source: mount.source,
        destination: mount.destination,
        driver: mount.driver,
        mode: mount.mode,
        rw: mount.rw,
        propagation: mount.propagation,
      })),
      isRunning: container.state === "running",
      health: container.status.toLowerCase().includes("healthy")
        ? "healthy"
        : container.status.toLowerCase().includes("unhealthy")
          ? "unhealthy"
          : "unknown",
    }));

    return new Response(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        requestId: locals.requestId,
        count: enhancedContainers.length,
        running: enhancedContainers.filter((c) => c.isRunning).length,
        containers: enhancedContainers,
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
    console.error("Error fetching containers:", error);

    return new Response(
      JSON.stringify({
        error: "Failed to fetch containers",
        message: error instanceof Error ? error.message : "Unknown error",
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

export const OPTIONS: RequestHandler = async () => {
  return new Response(null, { status: 204 });
};
