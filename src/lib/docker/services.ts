/**
 * Service Operations
 *
 * Functions for managing Docker Swarm services and tasks
 */
import { docker } from "./client";
import type { ServiceInfo, TaskInfo } from "./types";

/**
 * Handle Swarm-specific errors
 */
function handleSwarmError(error: unknown): [] {
  if ((error as Error).message?.includes("This node is not a swarm manager")) {
    return [];
  }
  throw error;
}

/**
 * Get all Swarm services
 */
export async function getServices(): Promise<ServiceInfo[]> {
  try {
    const services = await docker.listServices();
    return services as unknown as ServiceInfo[];
  } catch (error) {
    return handleSwarmError(error);
  }
}

/**
 * Get all Swarm tasks
 */
export async function getTasks(
  filters?: Record<string, string[]>,
): Promise<TaskInfo[]> {
  try {
    const tasks = await docker.listTasks({ filters });
    return tasks as unknown as TaskInfo[];
  } catch (error) {
    return handleSwarmError(error);
  }
}
