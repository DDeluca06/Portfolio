import { describe, test, expect, beforeAll } from 'bun:test';

const API_URL = process.env.TEST_API_URL || 'http://localhost:3001';
const TEST_API_KEY = process.env.TEST_STATS_API_KEY || 'test-key';

describe('Docker Containers API', () => {
  describe('GET /api/docker/containers', () => {
    test('returns container list with valid API key', async () => {
      const response = await fetch(`${API_URL}/api/docker/containers`, {
        headers: { 'Authorization': `Bearer ${TEST_API_KEY}` }
      });

      // May return 200 or 503 depending on Docker availability
      expect([200, 503]).toContain(response.status);

      if (response.status === 200) {
        const data = await response.json();
        
        expect(data).toHaveProperty('timestamp');
        expect(data).toHaveProperty('requestId');
        expect(data).toHaveProperty('count');
        expect(data).toHaveProperty('running');
        expect(data).toHaveProperty('containers');
        expect(Array.isArray(data.containers)).toBe(true);
        expect(typeof data.count).toBe('number');
        expect(typeof data.running).toBe('number');
      } else {
        const data = await response.json();
        expect(data).toHaveProperty('error');
        expect(data.error).toBe('Docker connection failed');
      }
    });

    test('returns enhanced container data structure', async () => {
      const response = await fetch(`${API_URL}/api/docker/containers`, {
        headers: { 'Authorization': `Bearer ${TEST_API_KEY}` }
      });

      if (response.status === 200) {
        const data = await response.json();
        
        if (data.containers.length > 0) {
          const container = data.containers[0];
          
          expect(container).toHaveProperty('id');
          expect(container).toHaveProperty('fullId');
          expect(container).toHaveProperty('names');
          expect(container).toHaveProperty('image');
          expect(container).toHaveProperty('state');
          expect(container).toHaveProperty('status');
          expect(container).toHaveProperty('isRunning');
          expect(container).toHaveProperty('health');
          expect(container).toHaveProperty('ports');
          expect(container).toHaveProperty('mounts');
          expect(container).toHaveProperty('networks');
          
          expect(typeof container.id).toBe('string');
          expect(container.id.length).toBe(12);
          expect(typeof container.fullId).toBe('string');
          expect(Array.isArray(container.names)).toBe(true);
          expect(typeof container.isRunning).toBe('boolean');
          expect(['healthy', 'unhealthy', 'unknown']).toContain(container.health);
        }
      }
    });

    test('returns 401 without API key', async () => {
      const response = await fetch(`${API_URL}/api/docker/containers`);
      expect(response.status).toBe(401);
      
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    test('returns security headers', async () => {
      const response = await fetch(`${API_URL}/api/docker/containers`, {
        headers: { 'Authorization': `Bearer ${TEST_API_KEY}` }
      });

      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
    });
  });

  describe('GET /api/docker/containers/:id/stats', () => {
    test('requires container ID parameter', async () => {
      const response = await fetch(`${API_URL}/api/docker/containers/test-container-id/stats`, {
        headers: { 'Authorization': `Bearer ${TEST_API_KEY}` }
      });

      // May return 200, 404, or 503 depending on Docker state
      expect([200, 404, 503]).toContain(response.status);
    });
  });
});

describe('Docker Info API', () => {
  describe('GET /api/docker', () => {
    test('returns Docker system info', async () => {
      const response = await fetch(`${API_URL}/api/docker`, {
        headers: { 'Authorization': `Bearer ${TEST_API_KEY}` }
      });

      expect([200, 503]).toContain(response.status);

      if (response.status === 200) {
        const data = await response.json();
        
        expect(data).toHaveProperty('name');
        expect(data).toHaveProperty('serverVersion');
        expect(data).toHaveProperty('architecture');
        expect(data).toHaveProperty('osType');
        expect(data).toHaveProperty('cpus');
        expect(data).toHaveProperty('memory');
        expect(data).toHaveProperty('containers');
        expect(data).toHaveProperty('images');
        
        expect(typeof data.cpus).toBe('number');
        expect(typeof data.memory).toBe('number');
        expect(typeof data.images).toBe('number');
      }
    });
  });
});

describe('Docker Services API', () => {
  describe('GET /api/docker/services', () => {
    test('returns services list', async () => {
      const response = await fetch(`${API_URL}/api/docker/services`, {
        headers: { 'Authorization': `Bearer ${TEST_API_KEY}` }
      });

      expect([200, 503]).toContain(response.status);

      if (response.status === 200) {
        const data = await response.json();
        
        expect(data).toHaveProperty('timestamp');
        expect(data).toHaveProperty('requestId');
        expect(data).toHaveProperty('count');
        expect(data).toHaveProperty('services');
        expect(Array.isArray(data.services)).toBe(true);
      }
    });
  });
});

describe('Docker Nodes API', () => {
  describe('GET /api/docker/nodes', () => {
    test('returns nodes list', async () => {
      const response = await fetch(`${API_URL}/api/docker/nodes`, {
        headers: { 'Authorization': `Bearer ${TEST_API_KEY}` }
      });

      expect([200, 503]).toContain(response.status);

      if (response.status === 200) {
        const data = await response.json();
        
        expect(data).toHaveProperty('timestamp');
        expect(data).toHaveProperty('requestId');
        expect(data).toHaveProperty('count');
        expect(data).toHaveProperty('nodes');
        expect(Array.isArray(data.nodes)).toBe(true);
      }
    });
  });
});
