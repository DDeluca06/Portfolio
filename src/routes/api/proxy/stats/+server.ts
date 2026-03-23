import type { RequestHandler } from './$types';
import { StatsAPI } from '$lib/api/statsClient';

/**
 * Proxy endpoint for client-side stats access
 * 
 * This endpoint proxies requests to the stats API with the server-side API key,
 * preventing exposure of credentials to the client.
 */

export const GET: RequestHandler = async ({ locals }) => {
  try {
    // Get API key from environment (server-side only)
    // Use fallback for development if not configured
    const apiKey = process.env.STATS_API_KEY || 
      (process.env.NODE_ENV === 'development' ? 'dev-api-key-not-for-production' : '');
    
    if (!apiKey) {
      console.error('[proxy/stats] STATS_API_KEY not configured');
      return new Response(
        JSON.stringify({
          error: 'Server configuration error - STATS_API_KEY not set',
          requestId: locals.requestId
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Create API client
    const api = new StatsAPI(apiKey);
    
    // Fetch stats (bypasses auth since we're on the server)
    // In production, you might want to call the actual API endpoint internally
    const stats = await api.getSystemStats();
    
    return new Response(
      JSON.stringify(stats),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        }
      }
    );
  } catch (error) {
    console.error('Error fetching stats:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch stats',
        requestId: locals.requestId
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};

export const OPTIONS: RequestHandler = async () => {
  return new Response(null, { status: 204 });
};
