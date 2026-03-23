import { browser } from '$app/environment';

/**
 * API client for stats endpoints
 * 
 * Usage:
 * import { StatsAPI } from '$lib/api/statsClient';
 * 
 * const api = new StatsAPI('your-api-key');
 * const stats = await api.getSystemStats();
 */

export class StatsAPI {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl: string = '') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  /**
   * Make authenticated request to API
   */
  private async fetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.baseUrl}/api${endpoint}`;
    
    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${this.apiKey}`);
    headers.set('Content-Type', 'application/json');

    return fetch(url, {
      ...options,
      headers
    });
  }

  /**
   * Get health check status
   */
  async getHealth(): Promise<{ status: string; timestamp: string; uptime: number }> {
    const response = await fetch(`${this.baseUrl}/api/health`);
    
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }
    
    return response.json();
  }

  /**
   * Get system statistics (CPU, Memory, Disk)
   */
  async getSystemStats(): Promise<SystemStats> {
    const response = await this.fetch('/stats');
    
    if (response.status === 401) {
      throw new Error('Unauthorized: Invalid or missing API key');
    }
    
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      throw new Error(`Rate limit exceeded. Retry after ${retryAfter} seconds`);
    }
    
    if (!response.ok) {
      throw new Error(`Failed to fetch stats: ${response.status}`);
    }
    
    return response.json();
  }

  /**
   * Get Docker container statistics
   */
  async getDockerStats(): Promise<DockerStats> {
    const response = await this.fetch('/docker');
    
    if (response.status === 401) {
      throw new Error('Unauthorized: Invalid or missing API key');
    }
    
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      throw new Error(`Rate limit exceeded. Retry after ${retryAfter} seconds`);
    }
    
    if (!response.ok) {
      throw new Error(`Failed to fetch Docker stats: ${response.status}`);
    }
    
    return response.json();
  }

  /**
   * Get current stats from all servers
   */
  async getCurrentStats(): Promise<StatsData> {
    const response = await this.fetch('/stats/current');
    
    if (response.status === 401) {
      throw new Error('Unauthorized: Invalid or missing API key');
    }
    
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      throw new Error(`Rate limit exceeded. Retry after ${retryAfter} seconds`);
    }
    
    if (!response.ok) {
      throw new Error(`Failed to fetch current stats: ${response.status}`);
    }
    
    return response.json();
  }

  /**
   * Get list of monitored servers
   */
  async getServers(): Promise<ServerInfo[]> {
    const response = await this.fetch('/stats/servers');
    
    if (response.status === 401) {
      throw new Error('Unauthorized: Invalid or missing API key');
    }
    
    if (!response.ok) {
      throw new Error(`Failed to fetch servers: ${response.status}`);
    }
    
    const data = await response.json();
    return data.servers || [];
  }
}

// Type definitions
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
  role: 'manager' | 'worker' | 'edge' | 'storage';
  status: 'online' | 'offline' | 'maintenance';
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

/**
 * Environment-aware API client factory
 * 
 * Automatically uses the correct base URL based on environment
 */
export function createStatsClient(apiKey: string): StatsAPI {
  // In browser, use relative URLs
  // In server/SSR, you may need to provide the full URL
  const baseUrl = browser ? '' : (process.env.STATS_API_URL || '');
  return new StatsAPI(apiKey, baseUrl);
}
