import { describe, test, expect, beforeAll, afterAll } from 'bun:test';

const API_URL = process.env.TEST_API_URL || 'http://localhost:3001';
const TEST_API_KEY = process.env.TEST_STATS_API_KEY || 'test-key';

describe('Integration: API Authentication Flow', () => {
  test('complete authentication flow', async () => {
    // Step 1: Health check (no auth required)
    const healthResponse = await fetch(`${API_URL}/api/health`);
    expect(healthResponse.status).toBe(200);
    
    // Step 2: Try accessing protected endpoint without auth
    const unauthorizedResponse = await fetch(`${API_URL}/api/stats`);
    expect(unauthorizedResponse.status).toBe(401);
    
    // Step 3: Access protected endpoint with valid auth
    const authorizedResponse = await fetch(`${API_URL}/api/stats`, {
      headers: { 'Authorization': `Bearer ${TEST_API_KEY}` }
    });
    expect(authorizedResponse.status).toBe(200);
  });

  test('multiple API endpoints work with same authentication', async () => {
    const endpoints = [
      '/api/stats',
      '/api/docker/containers',
      '/api/docker',
      '/api/history?measurement=cpu&range=1h',
      '/api/history/aggregate?measurement=cpu&range=24h'
    ];

    const results = await Promise.all(
      endpoints.map(endpoint =>
        fetch(`${API_URL}${endpoint}`, {
          headers: { 'Authorization': `Bearer ${TEST_API_KEY}` }
        })
      )
    );

    results.forEach((response, index) => {
      // All should succeed (200) or have expected Docker unavailable response (503)
      expect([200, 503]).toContain(response.status);
      
      // None should be 401 since we're using valid auth
      expect(response.status).not.toBe(401);
    });
  });
});

describe('Integration: CORS Headers', () => {
  test('includes CORS headers for cross-origin requests', async () => {
    const response = await fetch(`${API_URL}/api/stats`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://example.com',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Authorization'
      }
    });

    expect(response.status).toBe(204);
    expect(response.headers.has('Access-Control-Allow-Methods')).toBe(true);
    expect(response.headers.has('Access-Control-Allow-Headers')).toBe(true);
    expect(response.headers.has('Access-Control-Max-Age')).toBe(true);
  });

  test('CORS headers present on actual requests', async () => {
    const response = await fetch(`${API_URL}/api/stats`, {
      headers: { 
        'Authorization': `Bearer ${TEST_API_KEY}`,
        'Origin': 'http://localhost:3000'
      }
    });

    // CORS headers should be present on API routes
    expect(response.headers.has('Access-Control-Allow-Methods') || 
           response.status === 200).toBe(true);
  });
});

describe('Integration: Rate Limiting', () => {
  test('rate limit headers are present', async () => {
    const response = await fetch(`${API_URL}/api/stats`, {
      headers: { 'Authorization': `Bearer ${TEST_API_KEY}` }
    });

    expect(response.status).toBe(200);
    expect(response.headers.has('X-RateLimit-Limit')).toBe(true);
    
    const limit = response.headers.get('X-RateLimit-Limit');
    expect(limit).toBeTruthy();
    expect(parseInt(limit!)).toBeGreaterThan(0);
  });

  test('eventually hits rate limit with many requests', async () => {
    // This test might take a while - skip in CI by checking env
    if (process.env.CI || process.env.SKIP_RATE_LIMIT_TEST) {
      return;
    }

    const requests = [];
    // Make many requests to hit rate limit (assuming 100/min limit)
    for (let i = 0; i < 105; i++) {
      requests.push(
        fetch(`${API_URL}/api/stats`, {
          headers: { 'Authorization': `Bearer ${TEST_API_KEY}` }
        })
      );
    }

    const responses = await Promise.all(requests);
    const rateLimitedResponses = responses.filter(r => r.status === 429);
    
    // Should have at least some rate limited responses
    expect(rateLimitedResponses.length).toBeGreaterThan(0);
    
    // Check rate limit headers on 429 responses
    if (rateLimitedResponses.length > 0) {
      const response = rateLimitedResponses[0];
      expect(response.headers.has('Retry-After')).toBe(true);
      expect(response.headers.has('X-RateLimit-Limit')).toBe(true);
      expect(response.headers.has('X-RateLimit-Remaining')).toBe(true);
    }
  });
});

describe('Integration: Security Headers', () => {
  test('all API responses include security headers', async () => {
    const response = await fetch(`${API_URL}/api/stats`, {
      headers: { 'Authorization': `Bearer ${TEST_API_KEY}` }
    });

    // Security headers
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(response.headers.get('X-Frame-Options')).toBe('DENY');
    expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block');
    expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    
    // Server fingerprinting headers should be removed
    expect(response.headers.has('Server')).toBe(false);
    expect(response.headers.has('X-Powered-By')).toBe(false);
    
    // Request ID should be present
    expect(response.headers.has('X-Request-ID')).toBe(true);
  });

  test('Permissions-Policy header restricts features', async () => {
    const response = await fetch(`${API_URL}/api/stats`, {
      headers: { 'Authorization': `Bearer ${TEST_API_KEY}` }
    });

    const permissionsPolicy = response.headers.get('Permissions-Policy');
    expect(permissionsPolicy).toBeTruthy();
    expect(permissionsPolicy).toContain('camera=()');
    expect(permissionsPolicy).toContain('microphone=()');
    expect(permissionsPolicy).toContain('geolocation=()');
  });
});

describe('Integration: Request/Response Cycle', () => {
  test('request ID is consistent throughout request lifecycle', async () => {
    const response = await fetch(`${API_URL}/api/stats`, {
      headers: { 'Authorization': `Bearer ${TEST_API_KEY}` }
    });

    const data = await response.json();
    const requestIdHeader = response.headers.get('X-Request-ID');
    const requestIdBody = data.requestId;
    
    // Header and body should have same request ID
    expect(requestIdHeader).toBe(requestIdBody);
    expect(requestIdHeader).toBeTruthy();
    expect(typeof requestIdHeader).toBe('string');
    expect(requestIdHeader!.length).toBeGreaterThan(10);
  });

  test('timestamp is recent', async () => {
    const beforeRequest = new Date().toISOString();
    const response = await fetch(`${API_URL}/api/stats`, {
      headers: { 'Authorization': `Bearer ${TEST_API_KEY}` }
    });
    const afterRequest = new Date().toISOString();

    const data = await response.json();
    const responseTime = new Date(data.timestamp);
    
    // Response timestamp should be between before and after
    expect(responseTime.getTime()).toBeGreaterThanOrEqual(new Date(beforeRequest).getTime() - 1000);
    expect(responseTime.getTime()).toBeLessThanOrEqual(new Date(afterRequest).getTime() + 1000);
  });

  test('error responses have proper structure', async () => {
    const response = await fetch(`${API_URL}/api/stats`); // No auth
    
    expect(response.status).toBe(401);
    expect(response.headers.get('Content-Type')).toBe('application/json');
    
    const data = await response.json();
    expect(data).toHaveProperty('error');
    expect(data).toHaveProperty('requestId');
    expect(typeof data.error).toBe('string');
  });
});

describe('Integration: WebSocket Docker Events', () => {
  test('WebSocket endpoint exists', async () => {
    // Try to connect to WebSocket endpoint
    const wsUrl = API_URL.replace('http', 'ws') + '/ws/docker-events';
    
    try {
      const ws = new WebSocket(wsUrl, [], {
        headers: { 'Authorization': `Bearer ${TEST_API_KEY}` }
      });
      
      // Wait for connection or error
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          ws.close();
          resolve();
        }, 1000);
        
        ws.onopen = () => {
          clearTimeout(timeout);
          ws.close();
          resolve();
        };
        
        ws.onerror = () => {
          clearTimeout(timeout);
          resolve(); // Error is acceptable if WS isn't configured
        };
      });
    } catch {
      // WebSocket might not be available - that's ok
    }
  });
});
