/**
 * Mock data generators for tests
 */

import type {
  ContainerInfo,
  ContainerStats,
  ServiceInfo,
  NodeInfo,
} from "../../src/lib/docker";

export function generateMockContainerInfo(
  overrides?: Partial<ContainerInfo>,
): ContainerInfo {
  return {
    id: "abc123def456",
    names: ["/test-container"],
    image: "nginx:latest",
    imageId: "sha256:abc123",
    command: "nginx -g daemon off;",
    created: Math.floor(Date.now() / 1000) - 3600,
    ports: [{ ip: "0.0.0.0", privatePort: 80, publicPort: 8080, type: "tcp" }],
    labels: {
      "com.docker.compose.project": "test",
      "com.docker.compose.service": "nginx",
    },
    state: "running",
    status: "Up 1 hour",
    hostConfig: { networkMode: "bridge" },
    networkSettings: {
      networks: {
        bridge: {
          networkID: "abc123",
          endpointId: "def456",
          gateway: "172.17.0.1",
          ipAddress: "172.17.0.2",
          ipPrefixLen: 16,
          macAddress: "02:42:ac:11:00:02",
        },
      },
    },
    mounts: [
      {
        type: "bind",
        source: "/host/path",
        destination: "/container/path",
        mode: "rw",
        rw: true,
        propagation: "rprivate",
      },
    ],
    ...overrides,
  };
}

export function generateMockContainerStats(
  overrides?: Partial<ContainerStats>,
): ContainerStats {
  return {
    read: new Date().toISOString(),
    pids_stats: {
      current: 10,
      limit: 100,
    },
    blkio_stats: {
      io_service_bytes_recursive: [
        { major: 8, minor: 0, op: "read", value: 1024000 },
        { major: 8, minor: 0, op: "write", value: 512000 },
      ],
    },
    cpu_stats: {
      cpu_usage: {
        total_usage: 1000000000,
        percpu_usage: [500000000, 500000000],
        usage_in_kernelmode: 200000000,
        usage_in_usermode: 800000000,
      },
      system_cpu_usage: 5000000000,
      online_cpus: 2,
      throttling_data: {
        periods: 0,
        throttled_periods: 0,
        throttled_time: 0,
      },
    },
    precpu_stats: {
      cpu_usage: {
        total_usage: 950000000,
      },
      system_cpu_usage: 4900000000,
    },
    memory_stats: {
      usage: 134217728,
      max_usage: 167772160,
      limit: 268435456,
      stats: {
        cache: 67108864,
        rss: 67108864,
      },
    },
    networks: {
      eth0: {
        rx_bytes: 1048576,
        rx_packets: 1024,
        rx_errors: 0,
        rx_dropped: 0,
        tx_bytes: 2097152,
        tx_packets: 2048,
        tx_errors: 0,
        tx_dropped: 0,
      },
    },
    ...overrides,
  };
}

export function generateMockServiceInfo(
  overrides?: Partial<ServiceInfo>,
): ServiceInfo {
  return {
    id: "service123",
    version: { index: 1 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    spec: {
      name: "test-service",
      labels: {},
      taskTemplate: {
        containerSpec: {
          image: "nginx:latest",
        },
      },
      mode: {
        replicated: {
          replicas: 3,
        },
      },
    },
    serviceStatus: {
      runningTasks: 3,
      desiredTasks: 3,
    },
    ...overrides,
  };
}

export function generateMockNodeInfo(overrides?: Partial<NodeInfo>): NodeInfo {
  return {
    id: "node123",
    version: { index: 1 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    spec: {
      name: "test-node",
      role: "worker",
      availability: "active",
    },
    description: {
      hostname: "test-host",
      platform: {
        architecture: "x86_64",
        os: "linux",
      },
      resources: {
        nanoCPUs: 2000000000,
        memoryBytes: 8589934592,
      },
      engine: {
        engineVersion: "24.0.0",
      },
    },
    status: {
      state: "ready",
    },
    ...overrides,
  };
}

export function generateMockSystemStats() {
  return {
    timestamp: new Date().toISOString(),
    cpu: {
      usage: 45.5,
      cores: 4,
      loadAverage: [1.5, 1.2, 1.0],
    },
    memory: {
      total: 8589934592,
      used: 4294967296,
      free: 4294967296,
      usagePercent: "50.00",
    },
    disk: [
      {
        filesystem: "/dev/sda1",
        size: 100000000000,
        used: 50000000000,
        available: 50000000000,
        usagePercent: 50,
        mount: "/",
      },
    ],
    system: {
      hostname: "test-host",
      platform: "linux",
      distro: "Ubuntu",
      uptime: 3600,
    },
  };
}

export function generateMockDockerInfo() {
  return {
    name: "test-docker",
    serverVersion: "24.0.0",
    architecture: "x86_64",
    osType: "linux",
    kernelVersion: "5.15.0",
    cpus: 4,
    memory: 8589934592,
    containers: {
      running: 5,
      paused: 0,
      stopped: 2,
      total: 7,
    },
    images: 10,
  };
}

export function generateMockHistoryPoint() {
  return {
    time: new Date().toISOString(),
    value: Math.random() * 100,
    field: "usage_percent",
    tags: {
      server_id: "test-host",
      metric_type: "usage",
    },
  };
}

export function generateMockAggregateStats() {
  return {
    min: 10.5,
    max: 95.2,
    avg: 52.3,
    count: 144,
  };
}
