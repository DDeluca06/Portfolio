import type { RequestHandler } from './$types';
import si from 'systeminformation';
import { influxClient } from '$lib/db/influx';

export const prerender = false;

export const GET: RequestHandler = async ({ locals }) => {
  try {
    // Fetch system information in parallel
    const [
      cpuData,
      memData,
      diskData,
      osInfo
    ] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.fsSize(),
      si.osInfo()
    ]);

    const stats = {
      timestamp: new Date().toISOString(),
      requestId: locals.requestId,
      cpu: {
        usage: cpuData.currentLoad,
        cores: cpuData.cpus.length,
        loadAverage: cpuData.avgLoad
      },
      memory: {
        total: memData.total,
        used: memData.used,
        free: memData.free,
        usagePercent: ((memData.used / memData.total) * 100).toFixed(2)
      },
      disk: diskData.map(disk => ({
        filesystem: disk.fs,
        size: disk.size,
        used: disk.used,
        available: disk.available,
        usagePercent: disk.use,
        mount: disk.mount
      })),
      system: {
        platform: osInfo.platform,
        distro: osInfo.distro,
        release: osInfo.release,
        hostname: osInfo.hostname,
        uptime: Math.floor(process.uptime())
      }
    };

    // Write to InfluxDB (non-blocking)
    influxClient.writeSystemStats(stats);

    return new Response(
      JSON.stringify(stats),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
  } catch (error) {
    console.error('Error fetching system stats:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch system statistics',
        requestId: locals.requestId,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
};

export const OPTIONS: RequestHandler = async () => {
  return new Response(null, { status: 204 });
};
