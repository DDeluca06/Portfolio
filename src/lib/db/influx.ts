import { InfluxDB, Point, type QueryApi, type WriteApi } from '@influxdata/influxdb-client';

// InfluxDB configuration
const INFLUX_URL = process.env.INFLUX_URL || 'http://localhost:8086';
const INFLUX_TOKEN = process.env.INFLUX_TOKEN || '';
const INFLUX_ORG = process.env.INFLUX_ORG || 'homelab';
const INFLUX_BUCKET = process.env.INFLUX_BUCKET || 'metrics';

// Check if InfluxDB is configured
const isInfluxEnabled = !!(INFLUX_TOKEN && INFLUX_URL);

class InfluxClient {
  private client: InfluxDB | null = null;
  private writeApi: WriteApi | null = null;
  private queryApi: QueryApi | null = null;
  private batchQueue: Point[] = [];
  private batchTimer: ReturnType<typeof setInterval> | null = null;
  private readonly BATCH_SIZE = 100;
  private readonly FLUSH_INTERVAL = 5000; // 5 seconds

  constructor() {
    if (!isInfluxEnabled) {
      console.warn('[InfluxDB] Not configured - metrics persistence disabled');
      return;
    }

    try {
      this.client = new InfluxDB({ url: INFLUX_URL, token: INFLUX_TOKEN });
      this.writeApi = this.client.getWriteApi(INFLUX_ORG, INFLUX_BUCKET, 'ms');
      this.queryApi = this.client.getQueryApi(INFLUX_ORG);
      
      // Configure write options
      this.writeApi.useDefaultTags({ host: 'resufolio' });
      
      // Start batch timer
      this.batchTimer = setInterval(() => this.flushBatch(), this.FLUSH_INTERVAL);
      
      console.log('[InfluxDB] Client initialized successfully');
    } catch (error) {
      console.error('[InfluxDB] Failed to initialize:', error);
    }
  }

  /**
   * Write system stats to InfluxDB
   */
  writeSystemStats(stats: SystemStats): void {
    if (!this.writeApi || !isInfluxEnabled) return;

    const timestamp = new Date(stats.timestamp);

    // CPU metrics
    const loadAvg = Array.isArray(stats.cpu.loadAverage) 
      ? stats.cpu.loadAverage 
      : [stats.cpu.loadAverage, 0, 0];
    const cpuPoint = new Point('cpu')
      .timestamp(timestamp)
      .tag('server_id', stats.system.hostname)
      .tag('metric_type', 'usage')
      .floatField('usage', stats.cpu.usage)
      .intField('cores', stats.cpu.cores)
      .floatField('load_average_1m', loadAvg[0] || 0)
      .floatField('load_average_5m', loadAvg[1] || 0)
      .floatField('load_average_15m', loadAvg[2] || 0);

    // Memory metrics
    const memPoint = new Point('memory')
      .timestamp(timestamp)
      .tag('server_id', stats.system.hostname)
      .tag('metric_type', 'usage')
      .intField('total', stats.memory.total)
      .intField('used', stats.memory.used)
      .intField('free', stats.memory.free)
      .floatField('usage_percent', parseFloat(stats.memory.usagePercent));

    // Disk metrics (one point per filesystem)
    const diskPoints = stats.disk.map(disk =>
      new Point('disk')
        .timestamp(timestamp)
        .tag('server_id', stats.system.hostname)
        .tag('filesystem', disk.filesystem)
        .tag('mount', disk.mount)
        .intField('size', disk.size)
        .intField('used', disk.used)
        .intField('available', disk.available)
        .floatField('usage_percent', disk.usagePercent)
    );

    // System metrics
    const sysPoint = new Point('system')
      .timestamp(timestamp)
      .tag('server_id', stats.system.hostname)
      .tag('platform', stats.system.platform)
      .tag('distro', stats.system.distro)
      .intField('uptime', stats.system.uptime);

    // Queue points for batch write
    this.batchQueue.push(cpuPoint, memPoint, sysPoint, ...diskPoints);

    // Flush if batch size reached
    if (this.batchQueue.length >= this.BATCH_SIZE) {
      this.flushBatch();
    }
  }

  /**
   * Write Docker stats to InfluxDB
   */
  writeDockerStats(stats: DockerStats): void {
    if (!this.writeApi || !isInfluxEnabled) return;

    const timestamp = new Date(stats.timestamp);

    // Container counts
    const containersPoint = new Point('docker_containers')
      .timestamp(timestamp)
      .tag('server_id', stats.system.name)
      .intField('running', stats.system.containers.running)
      .intField('paused', stats.system.containers.paused)
      .intField('stopped', stats.system.containers.stopped)
      .intField('total', stats.system.containers.total);

    // Docker system info
    const sysPoint = new Point('docker_system')
      .timestamp(timestamp)
      .tag('server_id', stats.system.name)
      .tag('version', stats.system.serverVersion)
      .tag('os_type', stats.system.osType)
      .intField('cpus', stats.system.cpus)
      .intField('memory', stats.system.memory)
      .intField('images', stats.system.images);

    this.batchQueue.push(containersPoint, sysPoint);

    if (this.batchQueue.length >= this.BATCH_SIZE) {
      this.flushBatch();
    }
  }

  /**
   * Flush batched points to InfluxDB
   */
  private async flushBatch(): Promise<void> {
    if (!this.writeApi || this.batchQueue.length === 0) return;

    const points = [...this.batchQueue];
    this.batchQueue = [];

    try {
      this.writeApi.writePoints(points);
      await this.writeApi.flush();
    } catch (error) {
      console.error('[InfluxDB] Failed to write batch:', error);
      // Re-queue points for retry
      this.batchQueue.unshift(...points);
    }
  }

  /**
   * Query historical metrics
   */
  async queryHistory(
    measurement: string,
    range: string,
    serverId?: string,
    aggregate?: 'mean' | 'min' | 'max' | 'first' | 'last'
  ): Promise<HistoryPoint[]> {
    if (!this.queryApi || !isInfluxEnabled) {
      return [];
    }

    const aggFunction = aggregate || 'mean';
    const window = this.getWindowForRange(range);

    let filter = `r._measurement == "${measurement}"`;
    if (serverId) {
      filter += ` and r.server_id == "${serverId}"`;
    }

    const query = `
      from(bucket: "${INFLUX_BUCKET}")
        |> range(start: -${range})
        |> filter(fn: (r) => ${filter})
        |> aggregateWindow(every: ${window}, fn: ${aggFunction}, createEmpty: false)
        |> yield(name: "${aggFunction}")
    `;

    try {
      const result: HistoryPoint[] = [];
      
      await this.queryApi.queryRows(query, {
        next(row, tableMeta) {
          const data = tableMeta.toObject(row);
          result.push({
            time: data._time,
            value: data._value,
            field: data._field,
            tags: {
              server_id: data.server_id,
              metric_type: data.metric_type,
              filesystem: data.filesystem,
              mount: data.mount
            }
          });
        },
        error(error) {
          console.error('[InfluxDB] Query error:', error);
        },
        complete() {
          // Query complete
        }
      });

      return result;
    } catch (error) {
      console.error('[InfluxDB] Failed to query history:', error);
      return [];
    }
  }

  /**
   * Query aggregated statistics
   */
  async queryAggregate(
    measurement: string,
    range: string,
    serverId?: string
  ): Promise<AggregateStats> {
    if (!this.queryApi || !isInfluxEnabled) {
      return { min: 0, max: 0, avg: 0, count: 0 };
    }

    let filter = `r._measurement == "${measurement}"`;
    if (serverId) {
      filter += ` and r.server_id == "${serverId}"`;
    }

    const query = `
      from(bucket: "${INFLUX_BUCKET}")
        |> range(start: -${range})
        |> filter(fn: (r) => ${filter})
        |> filter(fn: (r) => r._field == "usage_percent" or r._field == "usage")
        |> aggregateWindow(every: 1h, fn: mean, createEmpty: false)
        |> yield(name: "mean")
    `;

    try {
      const values: number[] = [];
      
      await this.queryApi.queryRows(query, {
        next(row, tableMeta) {
          const data = tableMeta.toObject(row);
          if (data._value !== null && data._value !== undefined) {
            values.push(data._value);
          }
        },
        error(error) {
          console.error('[InfluxDB] Query error:', error);
        },
        complete() {
          // Query complete
        }
      });

      if (values.length === 0) {
        return { min: 0, max: 0, avg: 0, count: 0 };
      }

      const sum = values.reduce((a, b) => a + b, 0);
      return {
        min: Math.min(...values),
        max: Math.max(...values),
        avg: sum / values.length,
        count: values.length
      };
    } catch (error) {
      console.error('[InfluxDB] Failed to query aggregate:', error);
      return { min: 0, max: 0, avg: 0, count: 0 };
    }
  }

  /**
   * Get available time ranges
   */
  getAvailableRanges(): TimeRange[] {
    return [
      { value: '1h', label: 'Last Hour', window: '1m' },
      { value: '6h', label: 'Last 6 Hours', window: '5m' },
      { value: '24h', label: 'Last 24 Hours', window: '15m' },
      { value: '7d', label: 'Last 7 Days', window: '1h' },
      { value: '30d', label: 'Last 30 Days', window: '6h' }
    ];
  }

  /**
   * Get appropriate window size for range
   */
  private getWindowForRange(range: string): string {
    const windows: Record<string, string> = {
      '1h': '1m',
      '6h': '5m',
      '24h': '15m',
      '7d': '1h',
      '30d': '6h'
    };
    return windows[range] || '1h';
  }

  /**
   * Check if InfluxDB is enabled
   */
  isEnabled(): boolean {
    return isInfluxEnabled;
  }

  /**
   * Close connections
   */
  async close(): Promise<void> {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }
    await this.flushBatch();
    await this.writeApi?.close();
  }
}

// Interfaces
interface SystemStats {
  timestamp: string;
  cpu: {
    usage: number;
    cores: number;
    loadAverage: number | number[];
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
    hostname: string;
    platform: string;
    distro: string;
    uptime: number;
  };
}

interface DockerStats {
  timestamp: string;
  system: {
    name: string;
    serverVersion: string;
    osType: string;
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
}

export interface HistoryPoint {
  time: string;
  value: number;
  field: string;
  tags: {
    server_id?: string;
    metric_type?: string;
    filesystem?: string;
    mount?: string;
  };
}

export interface AggregateStats {
  min: number;
  max: number;
  avg: number;
  count: number;
}

export interface TimeRange {
  value: string;
  label: string;
  window: string;
}

// Singleton instance
export const influxClient = new InfluxClient();
