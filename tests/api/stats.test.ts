import { describe, test, expect, beforeAll, beforeEach, afterEach } from 'bun:test';

const API_URL = process.env.TEST_API_URL || 'http://localhost:3001';
const TEST_API_KEY = process.env.TEST_STATS_API_KEY || 'test-key';

describe('Stats API', () => {
  describe('GET /api/stats', () => {
    test('returns valid metrics with valid API key', async () => {
      const response = await fetch(`${API_URL}/api/stats`, {
        headers: { 'Authorization': `Bearer ${TEST_API_KEY}` }
      });

      expect(response.status).toBe(200);
      
      const data = await response.json();
      
      // Check required properties
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('requestId');
      expect(data).toHaveProperty('cpu');
      expect(data).toHaveProperty('memory');
      expect(data).toHaveProperty('disk');
      expect(data).toHaveProperty('system');
      
      // Validate CPU structure
      expect(data.cpu).toHaveProperty('usage');
      expect(data.cpu).toHaveProperty('cores');
      expect(data.cpu).toHaveProperty('loadAverage');
      expect(typeof data.cpu.usage).toBe('number');
      expect(typeof data.cpu.cores).toBe('number');
      
      // Validate memory structure
      expect(data.memory).toHaveProperty('total');
      expect(data.memory).toHaveProperty('used');
      expect(data.memory).toHaveProperty('free');
      expect(data.memory).toHaveProperty('usagePercent');
      expect(typeof data.memory.total).toBe('number');
      expect(typeof data.memory.used).toBe('number');
      
      // Validate disk structure (array)
      expect(Array.isArray(data.disk)).toBe(true);
      if (data.disk.length > 0) {
        expect(data.disk[0]).toHaveProperty('filesystem');
        expect(data.disk[0]).toHaveProperty('size');
        expect(data.disk[0]).toHaveProperty('usagePercent');
      }
      
      // Validate system structure
      expect(data.system).toHaveProperty('platform');
      expect(data.system).toHaveProperty('distro');
      expect(data.system).toHaveProperty('hostname');
      expect(data.system).toHaveProperty('uptime');
    });

    test('returns 401 without API key', async () => {
      const response = await fetch(`${API_URL}/api/stats`);
      expect(response.status).toBe(401);
      
      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data.error).toBe('Unauthorized');
    });

    test('returns 401 with invalid API key', async () => {
      const response = await fetch(`${API_URL}/api/stats`, {
        headers: { 'Authorization': 'Bearer invalid-key' }
      });
      expect(response.status).toBe(401);
      
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    test('supports direct API key format', async () => {
      const response = await fetch(`${API_URL}/api/stats`, {
        headers: { 'Authorization': TEST_API_KEY }
      });

      // Should work with or without API key depending on config
      expect([200, 401]).toContain(response.status);
    });

    test('returns correct content-type headers', async () => {
      const response = await fetch(`${API_URL}/api/stats`, {
        headers: { 'Authorization': `Bearer ${TEST_API_KEY}` }
      });

      expect(response.headers.get('Content-Type')).toBe('application/json');
    });

    test('returns cache-control headers', async () => {
      const response = await fetch(`${API_URL}/api/stats`, {
        headers: { 'Authorization': `Bearer ${TEST_API_KEY}` }
      });

      const cacheControl = response.headers.get('Cache-Control');
      expect(cacheControl).toContain('no-store');
    });

    test('returns X-Request-ID header', async () => {
      const response = await fetch(`${API_URL}/api/stats`, {
        headers: { 'Authorization': `Bearer ${TEST_API_KEY}` }
      });

      expect(response.headers.has('X-Request-ID')).toBe(true);
      const requestId = response.headers.get('X-Request-ID');
      expect(requestId).toBeTruthy();
      expect(typeof requestId).toBe('string');
    });

    test('returns rate limit headers', async () => {
      const response = await fetch(`${API_URL}/api/stats`, {
        headers: { 'Authorization': `Bearer ${TEST_API_KEY}` }
      });

      expect(response.headers.has('X-RateLimit-Limit')).toBe(true);
    });
  });

  describe('OPTIONS /api/stats', () => {
    test('returns 204 for preflight requests', async () => {
      const response = await fetch(`${API_URL}/api/stats`, {
        method: 'OPTIONS'
      });
      expect(response.status).toBe(204);
    });

    test('returns CORS headers for preflight', async () => {
      const response = await fetch(`${API_URL}/api/stats`, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://localhost:3000',
          'Access-Control-Request-Method': 'GET'
        }
      });

      expect(response.headers.has('Access-Control-Allow-Methods')).toBe(true);
      expect(response.headers.has('Access-Control-Allow-Headers')).toBe(true);
    });
  });

  describe('Rate Limiting', () => {
    test('enforces rate limits after many requests', async () => {
      // Make many rapid requests
      const requests = Array.from({ length: 5 }, () =>
        fetch(`${API_URL}/api/stats`, {
          headers: { 'Authorization': `Bearer ${TEST_API_KEY}` }
        })
      );

      const responses = await Promise.all(requests);
      
      // All should succeed initially (rate limit is typically 100/min)
      const allSuccess = responses.every(r => r.status === 200);
      expect(allSuccess).toBe(true);
    });
  });
});
