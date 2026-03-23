import { describe, test, expect, beforeAll } from 'bun:test';

const API_URL = process.env.TEST_API_URL || 'http://localhost:3001';
const TEST_API_KEY = process.env.TEST_STATS_API_KEY || 'test-key';

describe('Health Check API', () => {
  describe('GET /api/health', () => {
    test('returns healthy status without authentication', async () => {
      const response = await fetch(`${API_URL}/api/health`);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('status');
      expect(data.status).toBe('healthy');
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('uptime');
      expect(typeof data.uptime).toBe('number');
    });

    test('returns JSON content type', async () => {
      const response = await fetch(`${API_URL}/api/health`);
      expect(response.headers.get('Content-Type')).toBe('application/json');
    });

    test('health check is fast', async () => {
      const start = Date.now();
      await fetch(`${API_URL}/api/health`);
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(1000); // Should respond within 1 second
    });
  });

  describe('OPTIONS /api/health', () => {
    test('returns 204 for preflight', async () => {
      const response = await fetch(`${API_URL}/api/health`, {
        method: 'OPTIONS'
      });
      expect(response.status).toBe(204);
    });
  });
});

describe('History API', () => {
  describe('GET /api/history', () => {
    test('returns historical data with valid API key', async () => {
      const response = await fetch(`${API_URL}/api/history?measurement=cpu&range=1h`, {
        headers: { 'Authorization': `Bearer ${TEST_API_KEY}` }
      });

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('requestId');
      expect(data).toHaveProperty('measurement');
      expect(data).toHaveProperty('range');
      expect(data).toHaveProperty('data');
      expect(Array.isArray(data.data)).toBe(true);
    });

    test('returns 401 without API key', async () => {
      const response = await fetch(`${API_URL}/api/history?measurement=cpu&range=1h`);
      expect(response.status).toBe(401);
    });

    test('supports different time ranges', async () => {
      const ranges = ['1h', '6h', '24h', '7d', '30d'];
      
      for (const range of ranges) {
        const response = await fetch(`${API_URL}/api/history?measurement=cpu&range=${range}`, {
          headers: { 'Authorization': `Bearer ${TEST_API_KEY}` }
        });
        
        expect(response.status).toBe(200);
        
        const data = await response.json();
        expect(data.range).toBe(range);
      }
    });
  });
});

describe('Aggregate API', () => {
  describe('GET /api/history/aggregate', () => {
    test('returns aggregated statistics', async () => {
      const response = await fetch(`${API_URL}/api/history/aggregate?measurement=cpu&range=24h`, {
        headers: { 'Authorization': `Bearer ${TEST_API_KEY}` }
      });

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('requestId');
      expect(data).toHaveProperty('measurement');
      expect(data).toHaveProperty('range');
      expect(data).toHaveProperty('aggregate');
      expect(data.aggregate).toHaveProperty('min');
      expect(data.aggregate).toHaveProperty('max');
      expect(data.aggregate).toHaveProperty('avg');
      expect(data.aggregate).toHaveProperty('count');
    });

    test('returns 401 without API key', async () => {
      const response = await fetch(`${API_URL}/api/history/aggregate?measurement=cpu&range=24h`);
      expect(response.status).toBe(401);
    });
  });
});
