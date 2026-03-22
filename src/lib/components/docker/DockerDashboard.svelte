<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import ContainerList from './ContainerList.svelte';
  import SwarmOverview from './SwarmOverview.svelte';
  import ServiceDetails from './ServiceDetails.svelte';
  import { Box, Activity, Terminal, Wifi, WifiOff } from 'lucide-svelte';

  type Tab = 'containers' | 'swarm';

  export let initialTab: Tab = 'containers';
  export let enableWebSocket: boolean = true;

  let activeTab: Tab = initialTab;
  let wsConnected = false;
  let ws: WebSocket | null = null;
  let recentEvents: Array<{
    type: string;
    action: string;
    actor: { id: string; attributes: Record<string, string> };
    time: number;
  }> = [];

  function connectWebSocket() {
    if (!enableWebSocket || typeof window === 'undefined') return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = protocol + '//' + window.location.host + '/ws/docker-events';
    
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      wsConnected = true;
      console.log('Docker events WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'docker-event') {
          recentEvents = [data.event, ...recentEvents].slice(0, 10);
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    };

    ws.onclose = () => {
      wsConnected = false;
      console.log('Docker events WebSocket disconnected');
      setTimeout(connectWebSocket, 5000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  onMount(() => {
    if (enableWebSocket) {
      connectWebSocket();
    }
  });

  onDestroy(() => {
    if (ws) {
      ws.close();
    }
  });
</script>

<div class="docker-dashboard">
  <div class="mb-6">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold flex items-center gap-3">
        <Terminal class="w-8 h-8 text-blue-600" />
        Docker Dashboard
      </h1>
      <div class="flex items-center gap-4">
        {#if enableWebSocket}
          <div class="flex items-center gap-2 text-sm" title="Real-time events">
            {#if wsConnected}
              <Wifi class="w-4 h-4 text-green-500" />
              <span class="text-green-600">Live</span>
            {:else}
              <WifiOff class="w-4 h-4 text-gray-400" />
              <span class="text-gray-500">Offline</span>
            {/if}
          </div>
        {/if}
      </div>
    </div>

    <div class="border-b border-gray-200">
      <nav class="flex space-x-8">
        <button
          on:click={() => { activeTab = 'containers'; }}
          class="flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
            {activeTab === 'containers' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
        >
          <Box class="w-4 h-4" />
          Containers
        </button>
        
        <button
          on:click={() => { activeTab = 'swarm'; }}
          class="flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
            {activeTab === 'swarm' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
        >
          <Activity class="w-4 h-4" />
          Swarm
        </button>
      </nav>
    </div>
  </div>

  <div class="tab-content">
    {#if activeTab === 'containers'}
      <ContainerList />
    {:else if activeTab === 'swarm'}
      <SwarmOverview />
    {/if}
  </div>

  {#if enableWebSocket && recentEvents.length > 0}
    <div class="mt-6 p-4 bg-gray-50 rounded-lg">
      <h3 class="text-sm font-medium text-gray-700 mb-2">Recent Events</h3>
      <div class="space-y-1 max-h-32 overflow-y-auto text-xs">
        {#each recentEvents as event}
          <div class="flex items-center gap-2 p-1 rounded hover:bg-gray-100">
            <span class="font-medium capitalize">{event.type}</span>
            <span class="text-gray-400">/</span>
            <span class="text-blue-600">{event.action}</span>
            <span class="text-gray-400 truncate">{event.actor.id.substring(0, 12)}</span>
            <span class="text-gray-400 ml-auto">
              {new Date(event.time * 1000).toLocaleTimeString()}
            </span>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>
