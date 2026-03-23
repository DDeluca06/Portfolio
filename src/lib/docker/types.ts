/**
 * Docker API Types
 *
 * Type definitions for Docker API responses
 */

// Container types
export interface ContainerInfo {
  id: string;
  names: string[];
  image: string;
  imageId: string;
  command: string;
  created: number;
  ports: Array<{
    ip?: string;
    privatePort: number;
    publicPort?: number;
    type: string;
  }>;
  labels: Record<string, string>;
  state: "created" | "restarting" | "running" | "paused" | "exited" | "dead";
  status: string;
  hostConfig: {
    networkMode?: string;
  };
  networkSettings: {
    networks: Record<
      string,
      {
        networkID?: string;
        endpointId?: string;
        gateway?: string;
        ipAddress?: string;
        ipPrefixLen?: number;
        ipv6Gateway?: string;
        globalIPv6Address?: string;
        globalIPv6PrefixLen?: number;
        macAddress?: string;
      }
    >;
  };
  mounts: Array<{
    type: string;
    name?: string;
    source?: string;
    destination: string;
    driver?: string;
    mode: string;
    rw: boolean;
    propagation: string;
  }>;
}

// Container stats types
export interface ContainerStats {
  read: string;
  preread?: string;
  pids_stats?: {
    current?: number;
    limit?: number;
  };
  blkio_stats?: {
    io_service_bytes_recursive?: Array<{
      major: number;
      minor: number;
      op: string;
      value: number;
    }>;
  };
  num_procs?: number;
  storage_stats?: Record<string, unknown>;
  cpu_stats: {
    cpu_usage: {
      total_usage: number;
      percpu_usage?: number[];
      usage_in_kernelmode?: number;
      usage_in_usermode?: number;
    };
    system_cpu_usage?: number;
    online_cpus?: number;
    throttling_data?: {
      periods?: number;
      throttled_periods?: number;
      throttled_time?: number;
    };
  };
  precpu_stats?: {
    cpu_usage?: {
      total_usage: number;
    };
    system_cpu_usage?: number;
  };
  memory_stats: {
    usage?: number;
    max_usage?: number;
    stats?: Record<string, number>;
    limit?: number;
  };
  networks?: Record<
    string,
    {
      rx_bytes: number;
      rx_packets: number;
      rx_errors: number;
      rx_dropped: number;
      tx_bytes: number;
      tx_packets: number;
      tx_errors: number;
      tx_dropped: number;
    }
  >;
}

// Computed stats type
export interface ComputedContainerStats {
  cpuPercent: number;
  memoryPercent: number;
  memoryUsage: number;
  memoryLimit: number;
  networkRx: number;
  networkTx: number;
  blockRead: number;
  blockWrite: number;
  pids: number;
  timestamp: string;
}

// Service types
export interface ServiceInfo {
  id: string;
  version: { index: number };
  createdAt: string;
  updatedAt: string;
  spec: {
    name: string;
    labels: Record<string, string>;
    taskTemplate: {
      containerSpec: {
        image: string;
        labels?: Record<string, string>;
        command?: string[];
        args?: string[];
        env?: string[];
        dir?: string;
        user?: string;
        groups?: string[];
        hostname?: string;
        mounts?: Array<{
          type: string;
          source?: string;
          target: string;
          readOnly?: boolean;
          consistency?: string;
        }>;
      };
      resources?: {
        limits?: { nanoCPUs?: number; memoryBytes?: number };
        reservations?: { nanoCPUs?: number; memoryBytes?: number };
      };
      restartPolicy?: {
        condition?: string;
        delay?: number;
        maxAttempts?: number;
        window?: number;
      };
      placement?: {
        constraints?: string[];
        preferences?: Array<{ spread?: { spreadDescriptor?: string } }>;
      };
      forceUpdate?: number;
      runtime?: string;
    };
    mode: {
      replicated?: { replicas: number };
      global?: {};
      replicatedJob?: { maxConcurrent?: number; totalCompletions?: number };
      globalJob?: {};
    };
    updateConfig?: {
      parallelism?: number;
      delay?: number;
      failureAction?: string;
      monitor?: number;
      maxFailureRatio?: number;
      order?: string;
    };
    rollbackConfig?: {
      parallelism?: number;
      delay?: number;
      failureAction?: string;
      monitor?: number;
      maxFailureRatio?: number;
      order?: string;
    };
    networks?: Array<{ target?: string; aliases?: string[] }>;
    endpointSpec?: {
      mode?: string;
      ports?: Array<{
        name?: string;
        protocol?: string;
        targetPort?: number;
        publishedPort?: number;
        publishMode?: string;
      }>;
    };
  };
  previousSpec?: unknown;
  endpoint?: {
    spec?: {
      mode?: string;
      ports?: Array<{
        name?: string;
        protocol?: string;
        targetPort?: number;
        publishedPort?: number;
        publishMode?: string;
      }>;
    };
    ports?: Array<{
      name?: string;
      protocol?: string;
      targetPort?: number;
      publishedPort?: number;
      publishMode?: string;
    }>;
    virtualIPs?: Array<{ networkID?: string; addr?: string }>;
  };
  updateStatus?: {
    state?: string;
    startedAt?: string;
    completedAt?: string;
    message?: string;
  };
  serviceStatus?: {
    runningTasks: number;
    desiredTasks: number;
    completedTasks?: number;
  };
  jobStatus?: {
    jobIteration?: { index: number };
    lastExecution?: string;
  };
}

// Node types
export interface NodeInfo {
  id: string;
  version: { index: number };
  createdAt: string;
  updatedAt: string;
  spec: {
    name?: string;
    labels?: Record<string, string>;
    role?: "worker" | "manager";
    availability?: "active" | "pause" | "drain";
  };
  description: {
    hostname: string;
    platform: { architecture: string; os: string };
    resources: {
      nanoCPUs?: number;
      memoryBytes?: number;
      genericResources?: Array<{
        namedResourceSpec?: { kind?: string; value?: string };
        discreteResourceSpec?: { kind?: string; value?: number };
      }>;
    };
    engine: {
      engineVersion: string;
      labels?: Record<string, string>;
      plugins?: Array<{ type: string; name: string }>;
    };
    tlsInfo?: {
      trustRoot?: string;
      certIssuerSubject?: string;
      certIssuerPublicKey?: string;
    };
  };
  status: {
    state: "unknown" | "down" | "ready" | "disconnected";
    message?: string;
    addr?: string;
  };
  managerStatus?: {
    leader?: boolean;
    reachability?: "unknown" | "unreachable" | "reachable";
    addr?: string;
  };
}

// Network types
export interface NetworkInfo {
  name: string;
  id: string;
  created: string;
  scope: "swarm" | "local" | "global";
  driver: string;
  enableIPv6: boolean;
  internal: boolean;
  attachable: boolean;
  ingress: boolean;
  configOnly: boolean;
  configFrom?: { network?: string };
  containers?: Record<
    string,
    {
      name: string;
      endpointId: string;
      macAddress: string;
      ipv4Address: string;
      ipv6Address: string;
    }
  >;
  options?: Record<string, string>;
  labels?: Record<string, string>;
  peers?: Array<{ name: string; ip: string }>;
}

// Task types
export interface TaskInfo {
  id: string;
  version: { index: number };
  createdAt: string;
  updatedAt: string;
  spec: {
    containerSpec: {
      image: string;
      labels?: Record<string, string>;
      command?: string[];
      args?: string[];
      env?: string[];
    };
    resources?: {
      limits?: { nanoCPUs?: number; memoryBytes?: number };
      reservations?: { nanoCPUs?: number; memoryBytes?: number };
    };
    restartPolicy?: {
      condition?: string;
      delay?: number;
      maxAttempts?: number;
      window?: number;
    };
    placement?: { constraints?: string[] };
    forceUpdate?: number;
    runtime?: string;
    networks?: Array<{ target?: string; aliases?: string[] }>;
    logDriver?: { name?: string; options?: Record<string, string> };
  };
  serviceId?: string;
  slot?: number;
  nodeId?: string;
  assignedGenericResources?: Array<{
    namedResourceSpec?: { kind?: string; value?: string };
    discreteResourceSpec?: { kind?: string; value?: number };
  }>;
  status: {
    timestamp: string;
    state:
      | "new"
      | "allocated"
      | "pending"
      | "assigned"
      | "accepted"
      | "preparing"
      | "ready"
      | "starting"
      | "running"
      | "complete"
      | "shutdown"
      | "failed"
      | "rejected"
      | "remove"
      | "orphaned";
    message?: string;
    err?: string;
    containerStatus?: { containerId?: string; pid?: number; exitCode?: number };
    portStatus?: {
      ports?: Array<{
        name?: string;
        protocol?: string;
        targetPort?: number;
        publishedPort?: number;
        publishMode?: string;
      }>;
    };
  };
  desiredState: "running" | "shutdown" | "accepted";
  jobIteration?: { index: number };
}

// Event types
export interface DockerEvent {
  type:
    | "container"
    | "image"
    | "volume"
    | "network"
    | "daemon"
    | "node"
    | "service"
    | "secret"
    | "config";
  action: string;
  actor: { id: string; attributes: Record<string, string> };
  time: number;
  timeNano: number;
  scope?: "local" | "swarm";
}

// System info types
export interface DockerSystemInfo {
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
  swarm?: {
    nodeId: string;
    nodeAddr: string;
    localNodeState: string;
    controlAvailable: boolean;
    error: string;
    remoteManagers?: Array<{ nodeId?: string; addr?: string }>;
    nodes?: number;
    managers?: number;
    cluster?: {
      id: string;
      version?: { index: number };
      createdAt?: string;
      updatedAt?: string;
      spec?: {
        name?: string;
        labels?: Record<string, string>;
        orchestration?: { taskHistoryRetentionLimit?: number };
        raft?: {
          snapshotInterval?: number;
          keepOldSnapshots?: number;
          logEntriesForSlowFollowers?: number;
          electionTick?: number;
          heartbeatTick?: number;
        };
        dispatcher?: { heartbeatPeriod?: number };
        caConfig?: {
          nodeCertExpiry?: number;
          externalCAs?: Array<{
            protocol?: string;
            url: string;
            options?: Record<string, string>;
            caCert?: string;
          }>;
          signingCACert?: string;
          signingCAKey?: string;
          forceRotate?: number;
        };
        encryptionConfig?: { autoLockManagers?: boolean };
        taskDefaults?: {
          logDriver?: { name?: string; options?: Record<string, string> };
        };
      };
      tlsInfo?: {
        trustRoot?: string;
        certIssuerSubject?: string;
        certIssuerPublicKey?: string;
      };
      rootRotationInProgress?: boolean;
      defaultAddrPool?: string[];
      subnetSize?: number;
      dataPathPort?: number;
    };
  };
}

export interface DockerVersion {
  version: string;
  apiVersion: string;
  minAPIVersion: string;
  gitCommit: string;
  goVersion: string;
  os: string;
  arch: string;
  kernelVersion: string;
  buildTime: string;
  platform: { name: string };
  experimental: boolean;
}

export interface ConnectionCheckResult {
  connected: boolean;
  error?: string;
  info?: { version: string; apiVersion: string; platform: string };
}

// Event filters type
export interface EventFilters {
  type?: string[];
  event?: string[];
  image?: string[];
  container?: string[];
  volume?: string[];
  network?: string[];
  daemon?: string[];
  node?: string[];
  service?: string[];
  secret?: string[];
  config?: string[];
}
