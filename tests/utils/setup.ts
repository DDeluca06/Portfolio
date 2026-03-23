/**
 * Test environment setup utilities
 */

// Set test environment variables
export function setupTestEnvironment(): void {
  // API configuration
  // TEST_API_URL should point to SvelteKit app (port 3000), not stats-api directly
  process.env.TEST_API_URL = process.env.TEST_API_URL || 'http://localhost:3000';
  process.env.STATS_API_URL = process.env.STATS_API_URL || 'http://localhost:3001';
  process.env.TEST_STATS_API_KEY = process.env.TEST_STATS_API_KEY || 'test-api-key-for-testing-only';
  
  // Server configuration for tests
  process.env.STATS_API_KEY = process.env.STATS_API_KEY || 'test-api-key-for-testing-only';
  process.env.ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:3001';
  process.env.RATE_LIMIT_READS_PER_MINUTE = process.env.RATE_LIMIT_READS_PER_MINUTE || '100';
  process.env.RATE_LIMIT_WRITES_PER_MINUTE = process.env.RATE_LIMIT_WRITES_PER_MINUTE || '20';
  
  // Disable HSTS in tests
  process.env.ENABLE_HSTS = 'false';
  
  // InfluxDB configuration (disabled for tests unless explicitly enabled)
  if (!process.env.TEST_INFLUX_ENABLED) {
    process.env.INFLUX_URL = '';
    process.env.INFLUX_TOKEN = '';
  }
  
  // Docker configuration
  process.env.DOCKER_HOST = process.env.DOCKER_HOST || 'tcp://localhost:2375';
}

// Wait for server to be ready
export async function waitForServer(url: string, timeoutMs: number = 30000): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    try {
      const response = await fetch(`${url}/api/health`);
      if (response.status === 200) {
        return true;
      }
    } catch {
      // Server not ready yet
    }
    
    await sleep(1000);
  }
  
  return false;
}

// Sleep utility
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Create test API key header
export function getAuthHeaders(apiKey?: string): Record<string, string> {
  const key = apiKey || process.env.TEST_STATS_API_KEY || 'test-api-key-for-testing-only';
  return {
    'Authorization': `Bearer ${key}`
  };
}

// Validate response structure
export function validateStatsResponse(data: unknown): boolean {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  
  const stats = data as Record<string, unknown>;
  
  return (
    'timestamp' in stats &&
    'cpu' in stats &&
    'memory' in stats &&
    'disk' in stats &&
    'system' in stats
  );
}

// Check if Docker is available
export async function isDockerAvailable(url: string): Promise<boolean> {
  try {
    const response = await fetch(`${url}/api/docker`, {
      headers: getAuthHeaders()
    });
    return response.status === 200;
  } catch {
    return false;
  }
}

// Generate test request ID
export function generateTestRequestId(): string {
  return `test-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

// Parse rate limit headers
export function parseRateLimitHeaders(headers: Headers): {
  limit: number | null;
  remaining: number | null;
  reset: number | null;
  retryAfter: number | null;
} {
  return {
    limit: headers.has('X-RateLimit-Limit') 
      ? parseInt(headers.get('X-RateLimit-Limit')!) 
      : null,
    remaining: headers.has('X-RateLimit-Remaining') 
      ? parseInt(headers.get('X-RateLimit-Remaining')!) 
      : null,
    reset: headers.has('X-RateLimit-Reset') 
      ? parseInt(headers.get('X-RateLimit-Reset')!) 
      : null,
    retryAfter: headers.has('Retry-After') 
      ? parseInt(headers.get('Retry-After')!) 
      : null,
  };
}

// Global test setup
export function globalSetup(): void {
  setupTestEnvironment();
  console.log('[Test Setup] Environment configured');
  console.log(`[Test Setup] API URL: ${process.env.TEST_API_URL}`);
}

// Global test teardown
export function globalTeardown(): void {
  console.log('[Test Teardown] Complete');
}
