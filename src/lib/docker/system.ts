/**
 * System Operations
 *
 * Functions for Docker system information and version
 */
import { docker } from "./client";
import type {
  DockerSystemInfo,
  DockerVersion,
  ConnectionCheckResult,
} from "./types";

/**
 * Get Docker system info
 */
export async function getDockerInfo(): Promise<DockerSystemInfo> {
  const info = await docker.info();
  return {
    name: info.Name,
    serverVersion: info.ServerVersion,
    architecture: info.Architecture,
    osType: info.OSType,
    kernelVersion: info.KernelVersion,
    cpus: info.NCPU,
    memory: info.MemTotal,
    containers: {
      running: info.ContainersRunning,
      paused: info.ContainersPaused,
      stopped: info.ContainersStopped,
      total: info.Containers,
    },
    images: info.Images,
    swarm: info.Swarm,
  };
}

/**
 * Get Docker version
 */
export async function getDockerVersion(): Promise<DockerVersion> {
  const version = await docker.version();
  return {
    version: version.Version,
    apiVersion: version.ApiVersion,
    minAPIVersion: version.MinAPIVersion,
    gitCommit: version.GitCommit,
    goVersion: version.GoVersion,
    os: version.Os,
    arch: version.Arch,
    kernelVersion: version.KernelVersion,
    buildTime:
      version.BuildTime instanceof Date
        ? version.BuildTime.toISOString()
        : String(version.BuildTime),
    platform: { name: (version.Platform as { Name: string }).Name },
    experimental: false,
  };
}

/**
 * Check if Docker is accessible
 */
export async function checkDockerConnection(): Promise<ConnectionCheckResult> {
  try {
    const version = await getDockerVersion();
    return {
      connected: true,
      info: {
        version: version.version,
        apiVersion: version.apiVersion,
        platform: version.platform.name,
      },
    };
  } catch (error) {
    return {
      connected: false,
      error: (error as Error).message,
    };
  }
}
