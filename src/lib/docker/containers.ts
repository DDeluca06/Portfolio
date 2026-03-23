/**
 * Container Operations
 *
 * Functions for managing and monitoring Docker containers
 */
import { docker } from "./client";
import type {
  ContainerInfo,
  ContainerStats,
  ComputedContainerStats,
} from "./types";

/**
 * Get all containers (running and stopped)
 */
export async function getContainers(
  all: boolean = true,
): Promise<ContainerInfo[]> {
  const containers = await docker.listContainers({ all });
  return containers.map((container) => ({
    id: container.Id,
    names: container.Names,
    image: container.Image,
    imageId: container.ImageID,
    command: container.Command,
    created: container.Created,
    ports: container.Ports.map((port) => ({
      ip: port.IP,
      privatePort: port.PrivatePort,
      publicPort: port.PublicPort,
      type: port.Type,
    })),
    labels: container.Labels || {},
    state: container.State as ContainerInfo["state"],
    status: container.Status,
    hostConfig: {
      networkMode: container.HostConfig?.NetworkMode,
    },
    networkSettings: {
      networks: Object.fromEntries(
        Object.entries(container.NetworkSettings?.Networks || {}).map(
          ([name, network]) => [
            name,
            {
              networkID: network.NetworkID,
              endpointId: network.EndpointID,
              gateway: network.Gateway,
              ipAddress: network.IPAddress,
              ipPrefixLen: network.IPPrefixLen,
              ipv6Gateway: network.IPv6Gateway,
              globalIPv6Address: network.GlobalIPv6Address,
              globalIPv6PrefixLen: network.GlobalIPv6PrefixLen,
              macAddress: network.MacAddress,
            },
          ],
        ),
      ),
    },
    mounts: (container.Mounts || []).map((m) => ({
      type: m.Type,
      name: m.Name,
      source: m.Source,
      destination: m.Destination,
      driver: m.Driver,
      mode: m.Mode,
      rw: m.RW,
      propagation: m.Propagation,
    })),
  }));
}

/**
 * Get detailed stats for a specific container
 */
export async function getContainerStats(
  containerId: string,
): Promise<ContainerStats> {
  const container = docker.getContainer(containerId);
  const stats = await container.stats({ stream: false });
  return stats as ContainerStats;
}

/**
 * Get computed container stats with percentages
 */
export async function getContainerStatsComputed(
  containerId: string,
): Promise<ComputedContainerStats> {
  const stats = await getContainerStats(containerId);

  // Calculate CPU percentage
  let cpuPercent = 0;
  if (stats.cpu_stats && stats.precpu_stats) {
    const cpuDelta =
      stats.cpu_stats.cpu_usage.total_usage -
      (stats.precpu_stats.cpu_usage?.total_usage || 0);
    const systemDelta =
      (stats.cpu_stats.system_cpu_usage || 0) -
      (stats.precpu_stats.system_cpu_usage || 0);

    if (systemDelta > 0 && cpuDelta > 0) {
      cpuPercent =
        (cpuDelta / systemDelta) * (stats.cpu_stats.online_cpus || 1) * 100;
    }
  }

  // Calculate memory percentage
  const memoryUsage = stats.memory_stats?.usage || 0;
  const memoryLimit = stats.memory_stats?.limit || 1;
  const memoryPercent = (memoryUsage / memoryLimit) * 100;

  // Calculate network I/O
  let networkRx = 0;
  let networkTx = 0;
  if (stats.networks) {
    for (const network of Object.values(stats.networks)) {
      networkRx += network.rx_bytes;
      networkTx += network.tx_bytes;
    }
  }

  // Calculate block I/O
  let blockRead = 0;
  let blockWrite = 0;
  if (stats.blkio_stats?.io_service_bytes_recursive) {
    for (const entry of stats.blkio_stats.io_service_bytes_recursive) {
      if (entry.op === "read") {
        blockRead += entry.value;
      } else if (entry.op === "write") {
        blockWrite += entry.value;
      }
    }
  }

  return {
    cpuPercent: parseFloat(cpuPercent.toFixed(2)),
    memoryPercent: parseFloat(memoryPercent.toFixed(2)),
    memoryUsage,
    memoryLimit,
    networkRx,
    networkTx,
    blockRead,
    blockWrite,
    pids: stats.pids_stats?.current || 0,
    timestamp: stats.read,
  };
}
