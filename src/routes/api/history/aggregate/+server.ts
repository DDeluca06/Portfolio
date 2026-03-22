import type { RequestHandler } from './$types';
import { influxClient } from '$lib/db/influx';

export const prerender = false;

/**
 * GET /api/history/aggregate?measurement=cpu&range=7d&server_id=xxx
 * 
 * Query aggregated statistics (min, max, avg)
 */
export const GET: RequestHandler = async ({ url, locals }) => {
  try {
    if (!influxClient.isEnabled()) {
      return new Response(
        JSON.stringify({
          error: 'InfluxDB not configured',
          message: 'Metrics persistence is disabled. Set INFLUX_TOKEN to enable.'
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse query parameters
    const measurement = url.searchParams.get('measurement') || 'cpu';
    const range = url.searchParams.get('range') || '24h';
    const serverId = url.searchParams.get('server_id') || undefined;

    // Validate range
    const validRanges = ['1h', '6h', '24h', '7d', '30d'];
    if (!validRanges.includes(range)) {
      return new Response(
        JSON.stringify({
          error: 'Invalid range',
          validRanges,
          message: `Range must be one of: ${validRanges.join(', ')}`
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate measurement
    const validMeasurements = ['cpu', 'memory', 'disk', 'system', 'docker_containers', 'docker_system'];
    if (!validMeasurements.includes(measurement)) {
      return new Response(
        JSON.stringify({
          error: 'Invalid measurement',
          validMeasurements,
          message: `Measurement must be one of: ${validMeasurements.join(', ')}`
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const startTime = Date.now();
    const stats = await influxClient.queryAggregate(measurement, range, serverId);
    const queryTime = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        measurement,
        range,
        serverId,
        queryTimeMs: queryTime,
        requestId: locals.requestId,
        timestamp: new Date().toISOString(),
        stats
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300'
        }
      }
    );
  } catch (error) {
    console.error('Error querying aggregate:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Failed to query aggregate data',
        requestId: locals.requestId,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};

export const OPTIONS: RequestHandler = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
};
