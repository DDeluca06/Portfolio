import type { RequestHandler } from './$types';
import Docker from 'dockerode';
import { influxClient } from '$lib/db/influx';

export const prerender = false;

const docker = new Docker();

export const GET: RequestHandler = async ({ locals }) => {
  try {
    // Get list of containers
    const containers = await docker.listContainers({ all: true });
    
    // Get Docker system info
    const info = await docker.info();
    
    const dockerStats = {
      timestamp: new Date().toISOString(),
      requestId: locals.requestId,
      system: {
        name: info.Name,
        serverVersion: info.ServerVersion,
        architecture: info.Architecture,
        osType: info.OSType,
        kernelVersion: info.KernelVersion,
        cpus: info.NCPU,
        memory: info.MemTotal,
        containers: {
          running: info.ContainersRunning,
          paused: info.ContainersPaused,
          stopped: info.ContainersStopped,
          total: info.Containers
        },
        images: info.Images
      },
      containers: containers.map(container => ({
        id: container.Id.substring(0, 12),
        names: container.Names,
        image: container.Image,
        state: container.State,
        status: container.Status,
        ports: container.Ports.map(port => ({
          private: port.PrivatePort,
          public: port.PublicPort,
          type: port.Type
        })),
        created: new Date(container.Created * 1000).toISOString()
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
