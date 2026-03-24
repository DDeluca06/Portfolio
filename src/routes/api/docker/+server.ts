import type { RequestHandler } from './$types';
import { getContainers, getDockerInfo, checkDockerConnection } from '$lib/docker';
import { influxClient } from '$lib/db/influx';

export const prerender = false;

export const GET: RequestHandler = async ({ locals }) => {
  try {
    // Check Docker connection first
    const connection = await checkDockerConnection();
    if (!connection.connected) {
      return new Response(
        JSON.stringify({
          error: 'Docker connection failed',
          message: connection.error,
          requestId: locals.requestId,
          timestamp: new Date().toISOString()
        }),
        {
          status: 503,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store'
          }
        }
      );
    }

    // Get list of containers
    const containers = await getContainers(true);
    
    // Get Docker system info
    const info = await getDockerInfo();
    
    const dockerStats = {
      timestamp: new Date().toISOString(),
      requestId: locals.requestId,
      system: {
        name: info.name,
        serverVersion: info.serverVersion,
        architecture: info.architecture,
        osType: info.osType,
        kernelVersion: info.kernelVersion,
        cpus: info.cpus,
        memory: info.memory,
        containers: {
          running: info.containers.running,
          paused: info.containers.paused,
          stopped: info.containers.stopped,
          total: info.containers.total
        },
        images: info.images
      },
      containers: containers.map(container => ({
        id: container.id.substring(0, 12),
        names: container.names,
        image: container.image,
        state: container.state,
        status: container.status,
        ports: container.ports.map(port => ({
          private: port.privatePort,
          public: port.publicPort,
          type: port.type
        })),
        created: new Date(container.created * 1000).toISOString()
      }))
    };

    // Write to InfluxDB (non-blocking)
    influxClient.writeDockerStats(dockerStats);

    return new Response(
      JSON.stringify(dockerStats),
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
    console.error('Error fetching Docker stats:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch Docker statistics',
        message: error instanceof Error ? error.message : 'Unknown error',
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
