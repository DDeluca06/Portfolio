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
