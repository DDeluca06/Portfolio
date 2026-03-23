#!/usr/bin/env bun
/**
 * Health monitoring script for the stats system
 * Run this script to continuously monitor system health
 * 
 * Usage: bun run scripts/monitor.ts
 */

const API_URL = process.env.API_URL || 'http://localhost:3001';
const API_KEY = process.env.STATS_API_KEY || '';
const INTERVAL = parseInt(process.env.MONITOR_INTERVAL || '30000', 10); // 30 seconds
const ALERT_THRESHOLD = parseInt(process.env.ALERT_THRESHOLD || '3', 10);

interface HealthStatus {
  timestamp: string;
  status: 'healthy' | 'degraded' | 'down';
  responseTime: number;
  error?: string;
}

class HealthMonitor {
  private consecutiveFailures = 0;
  private lastStatus: HealthStatus | null = null;
  private history: HealthStatus[] = [];

  async checkHealth(): Promise<HealthStatus> {
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${API_URL}/api/health`, {
        signal: AbortSignal.timeout(5000)
      });
      
      const responseTime = Date.now() - startTime;
      
      if (response.status === 200) {
        const data = await response.json();
        
        this.consecutiveFailures = 0;
        
        return {
          timestamp: new Date().toISOString(),
          status: data.status === 'healthy' ? 'healthy' : 'degraded',
          responseTime
        };
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      this.consecutiveFailures++;
      
      return {
        timestamp: new Date().toISOString(),
        status: 'down',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async checkStats(): Promise<void> {
    try {
      const headers: Record<string, string> = {};
      if (API_KEY) {
        headers['Authorization'] = `Bearer ${API_KEY}`;
      }
      
      const response = await fetch(`${API_URL}/api/stats`, {
        headers,
        signal: AbortSignal.timeout(10000)
      });
      
      if (response.status === 200) {
        const data = await response.json();
        
        // Check for high resource usage
        const cpuUsage = data.cpu?.usage;
        const memoryUsage = parseFloat(data.memory?.usagePercent);
        
        if (cpuUsage > 90) {
          console.warn(`⚠️  High CPU usage: ${cpuUsage.toFixed(1)}%`);
        }
        
        if (memoryUsage > 90) {
          console.warn(`⚠️  High memory usage: ${memoryUsage.toFixed(1)}%`);
        }
        
        console.log(`📊 CPU: ${cpuUsage?.toFixed(1)}% | Memory: ${memoryUsage?.toFixed(1)}%`);
      }
    } catch (error) {
      console.error('❌ Stats check failed:', error);
    }
  }

  async checkDocker(): Promise<void> {
    try {
      const headers: Record<string, string> = {};
      if (API_KEY) {
        headers['Authorization'] = `Bearer ${API_KEY}`;
      }
      
      const response = await fetch(`${API_URL}/api/docker`, {
        headers,
        signal: AbortSignal.timeout(5000)
      });
      
      if (response.status === 200) {
        const data = await response.json();
        console.log(`🐳 Docker: ${data.containers?.running || 0} containers running`);
      } else if (response.status === 503) {
        console.log('🐳 Docker: Not available');
      }
    } catch (error) {
      console.error('❌ Docker check failed:', error);
    }
  }

  async run(): Promise<void> {
    console.log('🔍 Starting health monitor...');
    console.log(`   API URL: ${API_URL}`);
    console.log(`   Interval: ${INTERVAL}ms`);
    console.log('');

    // Initial check
    await this.performChecks();

    // Schedule regular checks
    setInterval(() => this.performChecks(), INTERVAL);
  }

  private async performChecks(): Promise<void> {
    const health = await this.checkHealth();
    this.history.push(health);
    
    // Keep last 100 entries
    if (this.history.length > 100) {
      this.history.shift();
    }

    // Display status
    const statusIcon = health.status === 'healthy' ? '✅' : 
                       health.status === 'degraded' ? '⚠️' : '❌';
    
    console.log(`${statusIcon} ${health.timestamp} - Status: ${health.status.toUpperCase()} (${health.responseTime}ms)`);
    
    if (health.error) {
      console.error(`   Error: ${health.error}`);
    }

    // Alert on threshold
    if (this.consecutiveFailures >= ALERT_THRESHOLD) {
      console.error(`🚨 ALERT: ${this.consecutiveFailures} consecutive failures!`);
    }

    // Check stats and Docker
    await this.checkStats();
    await this.checkDocker();
    
    console.log('');
  }

  getUptime(): number {
    if (this.history.length < 2) return 100;
    
    const healthyCount = this.history.filter(h => h.status === 'healthy').length;
    return (healthyCount / this.history.length) * 100;
  }

  printSummary(): void {
    console.log('\n📈 Summary:');
    console.log(`   Total checks: ${this.history.length}`);
    console.log(`   Uptime: ${this.getUptime().toFixed(2)}%`);
    console.log(`   Current status: ${this.lastStatus?.status || 'unknown'}`);
  }
}

// Run monitor
const monitor = new HealthMonitor();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down monitor...');
  monitor.printSummary();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down monitor...');
  monitor.printSummary();
  process.exit(0);
});

// Start monitoring
monitor.run().catch(error => {
  console.error('Monitor failed:', error);
  process.exit(1);
});
