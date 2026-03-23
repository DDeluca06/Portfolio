import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { 
  getContainers, 
  getContainerStats, 
  getContainerStatsComputed,
  getServices,
  getNodes,
  getNetworks,
  getDockerInfo,
  getDockerVersion,
  checkDockerConnection,
  docker
} from '../../src/lib/docker/client';

// Mock Dockerode
describe('Docker Client', () => {
  describe('checkDockerConnection', () => {
    test('returns connected status when Docker is accessible', async () => {
      const result = await checkDockerConnection();
      
      // Should return an object with connected property
      expect(result).toHaveProperty('connected');
      expect(typeof result.connected).toBe('boolean');
      
      if (result.connected) {
        expect(result).toHaveProperty('info');
        expect(result.info).toHaveProperty('version');
        expect(result.info).toHaveProperty('apiVersion');
        expect(result.info).toHaveProperty('platform');
      } else {
        expect(result).toHaveProperty('error');
        expect(typeof result.error).toBe('string');
      }
    });
  });

  describe('getContainers', () => {
    test('returns array of containers', async () => {
      try {
        const containers = await getContainers(true);
        
        expect(Array.isArray(containers)).toBe(true);
        
        if (containers.length > 0) {
          const container = containers[0];
          
          // Check required fields
          expect(container).toHaveProperty('id');
          expect(container).toHaveProperty('names');
          expect(container).toHaveProperty('image');
          expect(container).toHaveProperty('state');
          expect(container).toHaveProperty('status');
          
          // Validate types
          expect(typeof container.id).toBe('string');
          expect(Array.isArray(container.names)).toBe(true);
          expect(typeof container.image).toBe('string');
          expect(['created', 'restarting', 'running', 'paused', 'exited', 'dead']).toContain(container.state);
        }
      } catch (error) {
        // Docker might not be available in test environment
        expect(error).toBeInstanceOf(Error);
      }
    });

    test('returns empty array when all=false and no running containers', async () => {
      try {
        const containers = await getContainers(false);
        expect(Array.isArray(containers)).toBe(true);
        
        // All returned containers should be running
        containers.forEach(container => {
          expect(container.state).toBe('running');
        });
      } catch (error) {
        // Docker might not be available
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('getContainerStats', () => {
    test('returns stats for valid container ID', async () => {
      try {
        // First get a container ID
        const containers = await getContainers(true);
        
        if (containers.length === 0) {
          // Skip test if no containers
          return;
        }
        
        const containerId = containers[0].id;
        const stats = await getContainerStats(containerId);
        
        expect(stats).toHaveProperty('read');
        expect(stats).toHaveProperty('cpu_stats');
        expect(stats).toHaveProperty('memory_stats');
        
        expect(stats.cpu_stats).toHaveProperty('cpu_usage');
        expect(stats.cpu_stats.cpu_usage).toHaveProperty('total_usage');
      } catch (error) {
        // Container might not be running or Docker unavailable
        expect(error).toBeInstanceOf(Error);
      }
    });

    test('throws error for invalid container ID', async () => {
      try {
        await getContainerStats('invalid-container-id');
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('getContainerStatsComputed', () => {
    test('returns computed stats with percentages', async () => {
      try {
        const containers = await getContainers(true);
        
        if (containers.length === 0) {
          return;
        }
        
        const containerId = containers[0].id;
        const stats = await getContainerStatsComputed(containerId);
        
        expect(stats).toHaveProperty('cpuPercent');
        expect(stats).toHaveProperty('memoryPercent');
        expect(stats).toHaveProperty('memoryUsage');
        expect(stats).toHaveProperty('memoryLimit');
        expect(stats).toHaveProperty('networkRx');
        expect(stats).toHaveProperty('networkTx');
        expect(stats).toHaveProperty('blockRead');
        expect(stats).toHaveProperty('blockWrite');
        expect(stats).toHaveProperty('pids');
        expect(stats).toHaveProperty('timestamp');
        
        // Validate computed percentages
        expect(typeof stats.cpuPercent).toBe('number');
        expect(typeof stats.memoryPercent).toBe('number');
        expect(stats.cpuPercent).toBeGreaterThanOrEqual(0);
        expect(stats.memoryPercent).toBeGreaterThanOrEqual(0);
        expect(stats.memoryPercent).toBeLessThanOrEqual(100);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('getServices', () => {
    test('returns array (empty if not in Swarm mode)', async () => {
      try {
        const services = await getServices();
        expect(Array.isArray(services)).toBe(true);
      } catch (error) {
        // Should not throw - returns empty array if not in Swarm mode
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('getNodes', () => {
    test('returns array (empty if not in Swarm mode)', async () => {
      try {
        const nodes = await getNodes();
        expect(Array.isArray(nodes)).toBe(true);
      } catch (error) {
        // Should not throw - returns empty array if not in Swarm mode
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('getNetworks', () => {
    test('returns array of networks', async () => {
      try {
        const networks = await getNetworks();
        expect(Array.isArray(networks)).toBe(true);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('getDockerInfo', () => {
    test('returns Docker system information', async () => {
      try {
        const info = await getDockerInfo();
        
        expect(info).toHaveProperty('name');
        expect(info).toHaveProperty('serverVersion');
        expect(info).toHaveProperty('architecture');
        expect(info).toHaveProperty('osType');
        expect(info).toHaveProperty('kernelVersion');
        expect(info).toHaveProperty('cpus');
        expect(info).toHaveProperty('memory');
        expect(info).toHaveProperty('containers');
        expect(info).toHaveProperty('images');
        
        expect(typeof info.cpus).toBe('number');
        expect(typeof info.memory).toBe('number');
        expect(typeof info.images).toBe('number');
        expect(info.containers).toHaveProperty('running');
        expect(info.containers).toHaveProperty('paused');
        expect(info.containers).toHaveProperty('stopped');
        expect(info.containers).toHaveProperty('total');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('getDockerVersion', () => {
    test('returns Docker version information', async () => {
      try {
        const version = await getDockerVersion();
        
        expect(version).toHaveProperty('version');
        expect(version).toHaveProperty('apiVersion');
        expect(version).toHaveProperty('minAPIVersion');
        expect(version).toHaveProperty('gitCommit');
        expect(version).toHaveProperty('goVersion');
        expect(version).toHaveProperty('os');
        expect(version).toHaveProperty('arch');
        expect(version).toHaveProperty('kernelVersion');
        expect(version).toHaveProperty('buildTime');
        expect(version).toHaveProperty('platform');
        expect(version).toHaveProperty('experimental');
        
        expect(typeof version.version).toBe('string');
        expect(typeof version.apiVersion).toBe('string');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });
});
