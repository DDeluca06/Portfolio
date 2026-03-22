/**
 * Docker API Client
 * 
 * Connects to Docker Socket Proxy for secure access to Docker API.
 * All write operations are disabled at the proxy level for security.
 */

import Docker from 'dockerode';

// Docker client configuration
const DOCKER_HOST = process.env.DOCKER_HOST || 'tcp://docker-proxy:2375';
const DOCKER_PORT = 2375;

// Parse Docker host from environment variable
function getDockerConfig(): { host: string; port: number } {
  if (DOCKER_HOST.startsWith('tcp://')) {
    const url = new URL(DOCKER_HOST);
    return {
      host: url.hostname,
      port: parseInt(url.port) || DOCKER_PORT
    };
  }
  return { host: 'docker-proxy', port: DOCKER_PORT };
}

const config = getDockerConfig();

// Initialize Docker client with proxy connection
export const docker = new Docker({
  host: config.host,
  port: config.port,
  protocol: 'http' // Internal network, proxy handles security
});

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
  state: 'created' | 'restarting' | 'running' | 'paused' | 'exited' | 'dead';
  status: string;
  hostConfig: {
    networkMode?: string;
  };
  networkSettings: {
    networks: Record<string, {
      networkID?: string;
      endpointId?: string;
      gateway?: string;
      ipAddress?: string;
      ipPrefixLen?: number;
      ipv6Gateway?: string;
      globalIPv6Address?: string;
      globalIPv6PrefixLen?: number;
      macAddress?: string;
    }>;
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
  networks?: Record<string, {
    rx_bytes: number;
    rx_packets: number;
    rx_errors: number;
    rx_dropped: number;
    tx_bytes: number;
    tx_packets: number;
    tx_errors: number;
    tx_dropped: number;
  }>;
}

// Service types
export interface ServiceInfo {
  id: string;
  version: {
    index: number;
  };
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
        limits?: {
          nanoCPUs?: number;
          memoryBytes?: number;
        };
        reservations?: {
          nanoCPUs?: number;
          memoryBytes?: number;
        };
      };
      restartPolicy?: {
        condition?: string;
        delay?: number;
        maxAttempts?: number;
        window?: number;
      };
      placement?: {
        constraints?: string[];
        preferences?: Array<{
          spread?: {
            spreadDescriptor?: string;
          };
        }>;
      };
      forceUpdate?: number;
      runtime?: string;
    };
    mode: {
      replicated?: {
        replicas: number;
      };
      global?: {};
      replicatedJob?: {
        maxConcurrent?: number;
        totalCompletions?: number;
      };
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
    networks?: Array<{
      target?: string;
      aliases?: string[];
    }>;
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
    virtualIPs?: Array<{
      networkID?: string;
      addr?: string;
    }>;
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
    jobIteration?: {
      index: number;
    };
    lastExecution?: string;
  };
}

// Node types
export interface NodeInfo {
  id: string;
  version: {
    index: number;
  };
  createdAt: string;
  updatedAt: string;
  spec: {
    name?: string;
    labels?: Record<string, string>;
    role?: 'worker' | 'manager';
    availability?: 'active' | 'pause' | 'drain';
  };
  description: {
    hostname: string;
    platform: {
      architecture: string;
      os: string;
    };
    resources: {
      nanoCPUs?: number;
      memoryBytes?: number;
      genericResources?: Array<{
        namedResourceSpec?: {
          kind?: string;
          value?: string;
        };
        discreteResourceSpec?: {
          kind?: string;
          value?: number;
        };
      }>;
    };
    engine: {
      engineVersion: string;
      labels?: Record<string, string>;
      plugins?: Array<{
        type: string;
        name: string;
      }>;
    };
    tlsInfo?: {
      trustRoot?: string;
      certIssuerSubject?: string;
      certIssuerPublicKey?: string;
    };
  };
  status: {
    state: 'unknown' | 'down' | 'ready' | 'disconnected';
    message?: string;
    addr?: string;
  };
  managerStatus?: {
    leader?: boolean;
    reachability?: 'unknown' | 'unreachable' | 'reachable';
    addr?: string;
  };
}

// Network types
export interface NetworkInfo {
  name: string;
  id: string;
  created: string;
  scope: 'swarm' | 'local' | 'global';
  driver: string;
  enableIPv6: boolean;
  internal: boolean;
  attachable: boolean;
  ingress: boolean;
  configOnly: boolean;
  configFrom?: {
    network?: string;
  };
  containers?: Record<string, {
    name: string;
    endpointId: string;
    macAddress: string;
    ipv4Address: string;
    ipv6Address: string;
  }>;
  options?: Record<string, string>;
  labels?: Record<string, string>;
  peers?: Array<{
    name: string;
    ip: string;
  }>;
}

// Task types
export interface TaskInfo {
  id: string;
  version: {
    index: number;
  };
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
      limits?: {
        nanoCPUs?: number;
        memoryBytes?: number;
      };
      reservations?: {
        nanoCPUs?: number;
        memoryBytes?: number;
      };
    };
    restartPolicy?: {
      condition?: string;
      delay?: number;
      maxAttempts?: number;
      window?: number;
    };
    placement?: {
      constraints?: string[];
    };
    forceUpdate?: number;
    runtime?: string;
    networks?: Array<{
      target?: string;
      aliases?: string[];
    }>;
    logDriver?: {
      name?: string;
      options?: Record<string, string>;
    };
  };
  serviceId?: string;
  slot?: number;
  nodeId?: string;
  assignedGenericResources?: Array<{
    namedResourceSpec?: {
      kind?: string;
      value?: string;
    };
    discreteResourceSpec?: {
      kind?: string;
      value?: number;
    };
  }>;
  status: {
    timestamp: string;
    state: 'new' | 'allocated' | 'pending' | 'assigned' | 'accepted' | 'preparing' | 'ready' | 'starting' | 'running' | 'complete' | 'shutdown' | 'failed' | 'rejected' | 'remove' | 'orphaned';
    message?: string;
    err?: string;
    containerStatus?: {
      containerId?: string;
      pid?: number;
      exitCode?: number;
    };
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
  desiredState: 'running' | 'shutdown' | 'accepted';
  jobIteration?: {
    index: number;
  };
}

// Event types
export interface DockerEvent {
  type: 'container' | 'image' | 'volume' | 'network' | 'daemon' | 'node' | 'service' | 'secret' | 'config';
  action: string;
  actor: {
    id: string;
    attributes: Record<string, string>;
  };
  time: number;
  timeNano: number;
  scope?: 'local' | 'swarm';
}

// Docker API functions

/**
 * Get all containers (running and stopped)
 */
export async function getContainers(all: boolean = true): Promise<ContainerInfo[]> {
  const containers = await docker.listContainers({ all });
  return containers.map(container => ({
    id: container.Id,
    names: container.Names,
    image: container.Image,
    imageId: container.ImageID,
    command: container.Command,
    created: container.Created,
    ports: container.Ports.map(port => ({
      ip: port.IP,
      privatePort: port.PrivatePort,
      publicPort: port.PublicPort,
      type: port.Type
    })),
    labels: container.Labels || {},
    state: container.State as ContainerInfo['state'],
    status: container.Status,
    hostConfig: container.HostConfig || {},
    networkSettings: {
      networks: Object.fromEntries(
        Object.entries(container.NetworkSettings?.Networks || {}).map(([name, network]) => [
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
            macAddress: network.MacAddress
          }
        ])
      )
    },
    mounts: container.Mounts || []
  }));
}

/**
 * Get detailed stats for a specific container
 */
export async function getContainerStats(containerId: string): Promise<ContainerStats> {
  const container = docker.getContainer(containerId);
  const stats = await container.stats({ stream: false });
  return stats as ContainerStats;
}

/**
 * Get computed container stats with percentages
 */
export async function getContainerStatsComputed(containerId: string): Promise<{
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
}> {
  const stats = await getContainerStats(containerId);

  // Calculate CPU percentage
  let cpuPercent = 0;
  if (stats.cpu_stats && stats.precpu_stats) {
    const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - (stats.precpu_stats.cpu_usage?.total_usage || 0);
    const systemDelta = (stats.cpu_stats.system_cpu_usage || 0) - (stats.precpu_stats.system_cpu_usage || 0);

    if (systemDelta > 0 && cpuDelta > 0) {
      cpuPercent = (cpuDelta / systemDelta) * (stats.cpu_stats.online_cpus || 1) * 100;
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
      if (entry.op === 'read') {
        blockRead += entry.value;
      } else if (entry.op === 'write') {
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
    timestamp: stats.read
  };
}

/**
 * Get all Swarm services
 */
export async function getServices(): Promise<ServiceInfo[]> {
  try {
    const services = await docker.listServices();
    return services as ServiceInfo[];
  } catch (error) {
    // Return empty array if not in Swarm mode
    if ((error as Error).message?.includes('This node is not a swarm manager')) {
      return [];
    }
    throw error;
  }
}

/**
 * Get all Swarm nodes
 */
export async function getNodes(): Promise<NodeInfo[]> {
  try {
    const nodes = await docker.listNodes();
    return nodes as NodeInfo[];
  } catch (error) {
    // Return empty array if not in Swarm mode
    if ((error as Error).message?.includes('This node is not a swarm manager')) {
      return [];
    }
    throw error;
  }
}

/**
 * Get all networks
 */
export async function getNetworks(): Promise<NetworkInfo[]> {
  const networks = await docker.listNetworks();
  return networks as NetworkInfo[];
}

/**
 * Get all Swarm tasks
 */
export async function getTasks(filters?: Record<string, string[]>): Promise<TaskInfo[]> {
  try {
    const tasks = await docker.listTasks({ filters });
    return tasks as TaskInfo[];
  } catch (error) {
    // Return empty array if not in Swarm mode
    if ((error as Error).message?.includes('This node is not a swarm manager')) {
      return [];
    }
    throw error;
  }
}

/**
 * Get Docker system info
 */
export async function getDockerInfo(): Promise<{
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
    remoteManagers?: Array<{
      nodeId?: string;
      addr?: string;
    }>;
    nodes?: number;
    managers?: number;
    cluster?: {
      id: string;
      version?: {
        index: number;
      };
      createdAt?: string;
      updatedAt?: string;
      spec?: {
        name?: string;
        labels?: Record<string, string>;
        orchestration?: {
          taskHistoryRetentionLimit?: number;
        };
        raft?: {
          snapshotInterval?: number;
          keepOldSnapshots?: number;
          logEntriesForSlowFollowers?: number;
          electionTick?: number;
          heartbeatTick?: number;
        };
        dispatcher?: {
          heartbeatPeriod?: number;
        };
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
        encryptionConfig?: {
          autoLockManagers?: boolean;
        };
        taskDefaults?: {
          logDriver?: {
            name?: string;
            options?: Record<string, string>;
          };
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
}> {
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
      total: info.Containers
    },
    images: info.Images,
    swarm: info.Swarm
  };
}

/**
 * Get Docker version
 */
export async function getDockerVersion(): Promise<{
  version: string;
  apiVersion: string;
  minAPIVersion: string;
  gitCommit: string;
  goVersion: string;
  os: string;
  arch: string;
  kernelVersion: string;
  buildTime: string;
  platform: {
    name: string;
  };
  experimental: boolean;
}> {
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
    buildTime: version.BuildTime,
    platform: version.Platform,
    experimental: version.Experimental
  };
}

/**
 * Subscribe to Docker events
 * Returns a function to stop the event stream
 */
export function subscribeToEvents(
  onEvent: (event: DockerEvent) => void,
  filters?: {
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
): () => void {
  const eventStream = docker.getEvents({
    filters: filters ? { ...filters } : undefined
  });

  const handleEvent = (chunk: Buffer) => {
    try {
      const event = JSON.parse(chunk.toString()) as DockerEvent;
      onEvent(event);
    } catch (error) {
      console.error('Error parsing Docker event:', error);
    }
  };

  eventStream.then(stream => {
    stream.on('data', handleEvent);
    stream.on('error', (error: Error) => {
      console.error('Docker events stream error:', error);
    });
  });

  // Return cleanup function
  return () => {
    eventStream.then(stream => {
      stream.removeListener('data', handleEvent);
      stream.destroy();
    });
  };
}

/**
 * Check if Docker is accessible
 */
export async function checkDockerConnection(): Promise<{
  connected: boolean;
  error?: string;
  info?: {
    version: string;
    apiVersion: string;
    platform: string;
  };
}> {
  try {
    const version = await getDockerVersion();
    return {
      connected: true,
      info: {
        version: version.version,
        apiVersion: version.apiVersion,
        platform: version.platform.name
      }
    };
  } catch (error) {
    return {
      connected: false,
      error: (error as Error).message
    };
  }
}
