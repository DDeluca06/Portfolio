/**
 * Node Operations
 *
 * Functions for managing Docker Swarm nodes
 */
import { docker } from "./client";
import type { NodeInfo } from "./types";

/**
 * Get all Swarm nodes
 */
export async function getNodes(): Promise<NodeInfo[]> {
  try {
    const nodes = await docker.listNodes();
    return nodes as unknown as NodeInfo[];
  } catch (error) {
    // Return empty array if not in Swarm mode
    if (
      (error as Error).message?.includes("This node is not a swarm manager")
    ) {
      return [];
    }
    throw error;
  }
}
