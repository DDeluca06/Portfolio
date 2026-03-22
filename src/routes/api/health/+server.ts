import type { RequestHandler } from './$types';

export const prerender = false;

export const GET: RequestHandler = async () => {
  return new Response(
    JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );
};

export const OPTIONS: RequestHandler = async () => {
  return new Response(null, { status: 204 });
};
