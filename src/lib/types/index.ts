/**
 * Centralized Type Definitions
 * Single source of truth for types used across the application
 */

export interface SystemStats {
  timestamp: string;
  requestId: string;
  cpu: {
    usage: number;
    cores: number;
    loadAverage: number[];
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usagePercent: string;
  };
  disk: Array<{
    filesystem: string;
    size: number;
    used: number;
    available: number;
    usagePercent: number;
    mount: string;
  }>;
  system: {
    platform: string;
    distro: string;
    release: string;
    hostname: string;
    uptime: number;
  };
  network?: {
    rxSec: number;
    txSec: number;
    rxTotal: number;
    txTotal: number;
  };
}

export interface DockerStats {
  timestamp: string;
  requestId: string;
  system: {
    name: string;
    serverVersion: string;
    architecture: string;
    osType: string;
    kernelVersion: string;
    cpus: number;
    memory: number;
    containers: {
      running: number;
      paused: number;
      stopped: number;
      total: number;
    };
    images: number;
  };
  containers: Array<{
    id: string;
    names: string[];
    image: string;
    state: string;
    status: string;
    ports: Array<{
      private: number;
      public: number | null;
      type: string;
    }>;
    created: string;
  }>;
}

export interface ServerInfo {
  id: string;
  name: string;
  hostname: string;
  ip: string;
  role: "manager" | "worker" | "edge" | "storage";
  status: "online" | "offline" | "maintenance";
  stats?: SystemStats;
  lastSeen: string;
}

export interface StatsData {
  servers: ServerInfo[];
  timestamp: string;
  global: {
    totalCpu: number;
    totalMemory: number;
    totalDisk: number;
    activeServers: number;
    totalContainers: number;
  };
}

export interface HistoryPoint {
  time: string;
  value: number;
  field: string;
  tags: {
    server_id?: string;
    metric_type?: string;
    filesystem?: string;
    mount?: string;
  };
}

export interface AggregateStats {
  min: number;
  max: number;
  avg: number;
  count: number;
}

export interface TimeRange {
  value: string;
  label: string;
  window: string;
}
