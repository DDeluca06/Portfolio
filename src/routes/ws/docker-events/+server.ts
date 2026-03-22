import type { RequestHandler } from './$types';
import { subscribeToEvents, checkDockerConnection, type DockerEvent } from '$lib/docker/client';

export const prerender = false;

// Track active WebSocket connections
const connections = new Set<WebSocket>();
let eventCleanup: (() => void) | null = null;
let eventSubscriptionActive = false;

/**
 * Start Docker events subscription (singleton)
 */
function startEventSubscription() {
  if (eventSubscriptionActive) return;
  
  eventCleanup = subscribeToEvents(
    (event: DockerEvent) => {
      // Broadcast event to all connected clients
      const message = JSON.stringify({
        type: 'docker-event',
        timestamp: new Date().toISOString(),
        event: {
          type: event.type,
          action: event.action,
          actor: event.actor,
          time: event.time,
          timeNano: event.timeNano,
          scope: event.scope
        }
      });

      connections.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
        }
      });
    },
    {
      type: ['container', 'service', 'node', 'network', 'task'],
      event: ['create', 'start', 'stop', 'die', 'destroy', 'update', 'remove']
    }
  );

  eventSubscriptionActive = true;
}

/**
 * Stop Docker events subscription
 */
function stopEventSubscription() {
  if (!eventSubscriptionActive || connections.size > 0) return;
  
  if (eventCleanup) {
    eventCleanup();
    eventCleanup = null;
  }
  eventSubscriptionActive = false;
}

/**
 * Send initial state to a new connection
 */
async function sendInitialState(ws: WebSocket) {
  try {
    const connection = await checkDockerConnection();
    
    ws.send(JSON.stringify({
      type: 'connection',
      status: 'connected',
      timestamp: new Date().toISOString(),
      docker: connection.connected ? {
        version: connection.info?.version,
        apiVersion: connection.info?.apiVersion,
        platform: connection.info?.platform
      } : null,
      error: connection.error
    }));
  } catch (error) {
    ws.send(JSON.stringify({
      type: 'connection',
      status: 'error',
      timestamp: new Date().toISOString(),
      error: (error as Error).message
    }));
  }
}

export const GET: RequestHandler = async ({ request }) => {
  // Check if this is a WebSocket upgrade request
  const upgrade = request.headers.get('upgrade');
  if (upgrade !== 'websocket') {
    return new Response(
      JSON.stringify({
        error: 'WebSocket upgrade required',
        message: 'This endpoint requires a WebSocket connection'
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }

  try {
    // Check Docker connection before accepting
    const connection = await checkDockerConnection();
    if (!connection.connected) {
      return new Response(
        JSON.stringify({
          error: 'Docker connection failed',
          message: connection.error
        }),
        {
          status: 503,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // Create WebSocket
    const { socket, response } = await upgradeWebSocket(request);
    
    // Add to connections
    connections.add(socket);

    // Handle connection open
    socket.addEventListener('open', () => {
      sendInitialState(socket);
    });

    // Handle messages from client
    socket.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Handle ping/pong for keepalive
        if (data.type === 'ping') {
          socket.send(JSON.stringify({
            type: 'pong',
            timestamp: new Date().toISOString()
          }));
        }
        
        // Handle subscription filters
        if (data.type === 'subscribe') {
          socket.send(JSON.stringify({
            type: 'subscribed',
            filters: data.filters || 'all',
            timestamp: new Date().toISOString()
          }));
        }
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
      }
    });

    // Handle connection close
    socket.addEventListener('close', () => {
      connections.delete(socket);
      stopEventSubscription();
    });

    // Handle errors
    socket.addEventListener('error', (error) => {
      console.error('WebSocket error:', error);
      connections.delete(socket);
    });

    // Start event subscription if not already active
    startEventSubscription();

    return response;
  } catch (error) {
    console.error('WebSocket setup error:', error);
    return new Response(
      JSON.stringify({
        error: 'WebSocket setup failed',
        message: error instanceof Error ? error.message : 'Unknown error'
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

/**
 * Upgrade HTTP request to WebSocket
 * Bun-specific implementation
 */
async function upgradeWebSocket(request: Request): Promise<{ socket: WebSocket; response: Response }> {
  // @ts-ignore - Bun specific API
  if (typeof Bun !== 'undefined') {
    // @ts-ignore
    const upgraded = await Bun.upgrade(request, {
      data: { timestamp: Date.now() }
    });
    return { socket: upgraded, response: new Response(null, { status: 101 }) };
  }
  
  // Fallback for non-Bun environments
  throw new Error('WebSocket upgrade requires Bun runtime');
}

export const OPTIONS: RequestHandler = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Upgrade'
    }
  });
};
