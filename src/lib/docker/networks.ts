/**
 * Network Operations
 *
 * Functions for managing Docker networks
 */
import { docker } from "./client";
import type { NetworkInfo } from "./types";

/**
 * Get all networks
 */
export async function getNetworks(): Promise<NetworkInfo[]> {
  const networks = await docker.listNetworks();
  return networks as unknown as NetworkInfo[];
}
