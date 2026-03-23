/**
 * Docker API Module
 *
 * Refactored from 894-line god file into focused modules
 */

// Re-export types
export type {
  ContainerInfo,
  ContainerStats,
  ComputedContainerStats,
  ServiceInfo,
  NodeInfo,
  NetworkInfo,
  TaskInfo,
  DockerEvent,
  DockerSystemInfo,
  DockerVersion,
  ConnectionCheckResult,
  EventFilters,
} from "./types";

// Client
export { docker } from "./client";

// Operations
export {
  getContainers,
  getContainerStats,
  getContainerStatsComputed,
} from "./containers";
export { getServices, getTasks } from "./services";
export { getNodes } from "./nodes";
export { getNetworks } from "./networks";
export {
  getDockerInfo,
  getDockerVersion,
  checkDockerConnection,
} from "./system";
export { subscribeToEvents } from "./events";
