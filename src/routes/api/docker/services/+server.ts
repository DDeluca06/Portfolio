import type { RequestHandler } from "./$types";
import {
  getServices,
  getTasks,
  checkDockerConnection,
  type ServiceInfo,
} from "$lib/docker";

export const prerender = false;

export const GET: RequestHandler = async ({ locals, url }) => {
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

    // Get all services
    const services = await getServices();

    // Check if Swarm is enabled
    if (services.length === 0) {
      return new Response(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          requestId: locals.requestId,
          swarmMode: false,
          message: "Swarm mode not enabled or no services found",
          services: [],
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

    // Get all tasks for status calculation
    const includeTasks = url.searchParams.get("includeTasks") === "true";
    const tasks = includeTasks ? await getTasks() : [];

    // Enhance service data
    const enhancedServices = services.map((service: ServiceInfo) => {
      const serviceTasks = tasks.filter((t) => t.serviceId === service.id);
      const runningTasks = serviceTasks.filter(
        (t) => t.status.state === "running",
      ).length;
      const desiredReplicas = service.spec.mode?.replicated?.replicas || 0;

      return {
        id: service.id.substring(0, 12),
        fullId: service.id,
        name: service.spec.name,
        version: service.version.index,
        createdAt: service.createdAt,
        updatedAt: service.updatedAt,
        image: service.spec.taskTemplate.containerSpec.image,
        command: service.spec.taskTemplate.containerSpec.command,
        args: service.spec.taskTemplate.containerSpec.args,
        env: service.spec.taskTemplate.containerSpec.env,
        labels: service.spec.labels,
        replicas: {
          desired: desiredReplicas,
          running: runningTasks,
          pending: desiredReplicas - runningTasks,
        },
        resources: {
          limits: service.spec.taskTemplate.resources?.limits
            ? {
                cpus: service.spec.taskTemplate.resources.limits.nanoCPUs
                  ? (
                      service.spec.taskTemplate.resources.limits.nanoCPUs / 1e9
                    ).toFixed(2) + " CPUs"
                  : "unlimited",
                memory: service.spec.taskTemplate.resources.limits.memoryBytes
                  ? formatBytes(
                      service.spec.taskTemplate.resources.limits.memoryBytes,
                    )
                  : "unlimited",
              }
            : null,
          reservations: service.spec.taskTemplate.resources?.reservations
            ? {
                cpus: service.spec.taskTemplate.resources.reservations.nanoCPUs
                  ? (
                      service.spec.taskTemplate.resources.reservations
                        .nanoCPUs / 1e9
                    ).toFixed(2) + " CPUs"
                  : "none",
                memory: service.spec.taskTemplate.resources.reservations
                  .memoryBytes
                  ? formatBytes(
                      service.spec.taskTemplate.resources.reservations
                        .memoryBytes,
                    )
                  : "none",
              }
            : null,
        },
        networks: service.spec.networks?.map((n) => n.target) || [],
        ports:
          service.spec.endpointSpec?.ports?.map((p) => ({
            name: p.name,
            protocol: p.protocol,
            target: p.targetPort,
            published: p.publishedPort,
            mode: p.publishMode,
          })) || [],
        placement: {
          constraints: service.spec.taskTemplate.placement?.constraints || [],
          preferences: service.spec.taskTemplate.placement?.preferences || [],
        },
        updateStatus: service.updateStatus
          ? {
              state: service.updateStatus.state,
              startedAt: service.updateStatus.startedAt,
              completedAt: service.updateStatus.completedAt,
              message: service.updateStatus.message,
            }
          : null,
        status: {
          health:
            runningTasks === desiredReplicas && desiredReplicas > 0
              ? "healthy"
              : runningTasks > 0
                ? "degraded"
                : desiredReplicas > 0
                  ? "unhealthy"
                  : "stopped",
          message: `${runningTasks}/${desiredReplicas} replicas running`,
        },
        tasks: includeTasks
          ? serviceTasks.map((t) => ({
              id: t.id.substring(0, 12),
              state: t.status.state,
              desiredState: t.desiredState,
              nodeId: t.nodeId,
              timestamp: t.status.timestamp,
              message: t.status.message,
              error: t.status.err,
            }))
          : undefined,
      };
    });

    return new Response(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        requestId: locals.requestId,
        swarmMode: true,
        count: enhancedServices.length,
        services: enhancedServices,
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
    console.error("Detailed error fetching services:", error);

    return new Response(
      JSON.stringify({
        error: "Failed to fetch services",
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
