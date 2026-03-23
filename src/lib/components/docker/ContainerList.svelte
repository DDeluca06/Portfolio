<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Activity, Box, Pause, Power, Search, Filter, RefreshCw, AlertCircle } from 'lucide-svelte';

  interface Container {
    id: string;
    fullId: string;
    names: string[];
    image: string;
    state: 'created' | 'restarting' | 'running' | 'paused' | 'exited' | 'dead';
    status: string;
    ports: Array<{
      ip?: string;
      private: number;
      public?: number;
      type: string;
    }>;
    networks: string[];
    mounts: Array<{
      type: string;
      source?: string;
      destination: string;
    }>;
    isRunning: boolean;
    health: 'healthy' | 'unhealthy' | 'unknown';
    created: string;
  }

  interface ContainerStats {
    cpu: { percent: number; status: string };
    memory: { 
      percent: number; 
      usageFormatted: string;
      limitFormatted: string;
    };
  }

  const DEFAULT_REFRESH_INTERVAL = parseInt(import.meta.env.REFRESH_INTERVAL || '30000', 10);
  export let refreshInterval: number = DEFAULT_REFRESH_INTERVAL;
  export let showFilters: boolean = true;
  export let maxHeight: string = '600px';

  let containers: Container[] = [];
  let containerStats: Map<string, ContainerStats> = new Map();
  let loading = false;
  let error: string | null = null;
  let filterText = '';
  let stateFilter: 'all' | 'running' | 'stopped' = 'all';
  let autoRefresh = true;
  let refreshTimer: ReturnType<typeof setInterval>;
  let expandedContainers: Set<string> = new Set();

  async function fetchContainers() {
    if (loading) return;
    loading = true;
    error = null;

    try {
      const response = await fetch('/api/docker/containers');
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to fetch containers');
      }

      const data = await response.json();
      containers = data.containers || [];
      
      await fetchContainerStats();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error fetching containers:', err);
    } finally {
      loading = false;
    }
  }

  async function fetchContainerStats() {
    const runningContainers = containers.filter(c => c.isRunning);
    
    await Promise.all(
      runningContainers.map(async (container) => {
        try {
          const response = await fetch(`/api/docker/containers/${container.id}/stats`);
          if (response.ok) {
            const data = await response.json();
            containerStats.set(container.id, data.stats);
          }
        } catch (err) {
          console.error(`Error fetching stats for ${container.id}:`, err);
        }
      })
    );
    
    containerStats = containerStats;
  }

  function toggleExpand(containerId: string) {
    if (expandedContainers.has(containerId)) {
      expandedContainers.delete(containerId);
    } else {
      expandedContainers.add(containerId);
    }
    expandedContainers = expandedContainers;
  }

  $: filteredContainers = containers.filter(container => {
    const matchesText = 
      container.names.some(n => n.toLowerCase().includes(filterText.toLowerCase())) ||
      container.image.toLowerCase().includes(filterText.toLowerCase()) ||
      container.id.toLowerCase().includes(filterText.toLowerCase());
    
    const matchesState = 
      stateFilter === 'all' ||
      (stateFilter === 'running' && container.isRunning) ||
      (stateFilter === 'stopped' && !container.isRunning);
    
    return matchesText && matchesState;
  });

  function getStateColor(state: string): string {
    switch (state) {
      case 'running': return 'bg-green-500';
      case 'paused': return 'bg-yellow-500';
      case 'exited': return 'bg-gray-500';
      case 'dead': return 'bg-red-500';
      case 'restarting': return 'bg-blue-500';
      default: return 'bg-gray-400';
    }
  }

  function getHealthColor(health: string): string {
    switch (health) {
      case 'healthy': return 'text-green-600';
      case 'unhealthy': return 'text-red-600';
      default: return 'text-gray-500';
    }
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  }

  onMount(() => {
    fetchContainers();
    
    if (autoRefresh) {
      refreshTimer = setInterval(fetchContainers, refreshInterval);
    }
  });

  onDestroy(() => {
    if (refreshTimer) {
      clearInterval(refreshTimer);
    }
  });
</script>

<div class="container-list bg-white rounded-lg shadow-md">
  <div class="p-4 border-b border-gray-200">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-xl font-bold flex items-center gap-2">
        <Box class="w-6 h-6 text-blue-600" />
        Docker Containers
        {#if loading}
          <RefreshCw class="w-4 h-4 animate-spin" />
        {/if}
      </h2>
      <div class="flex items-center gap-2">
        <span class="text-sm text-gray-600">
          {filteredContainers.length} of {containers.length}
        </span>
        <button
          on:click={fetchContainers}
          class="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          title="Refresh"
        >
          <RefreshCw class="w-4 h-4 {loading ? 'animate-spin' : ''}" />
        </button>
      </div>
    </div>

    {#if showFilters}
      <div class="flex flex-wrap gap-3">
        <div class="flex-1 min-w-[200px] relative">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search containers..."
            bind:value={filterText}
            class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          bind:value={stateFilter}
          class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All States</option>
          <option value="running">Running</option>
          <option value="stopped">Stopped</option>
        </select>
        <label class="flex items-center gap-2 px-4 py-2 cursor-pointer">
          <input
            type="checkbox"
            bind:checked={autoRefresh}
            on:change={() => {
              if (autoRefresh) {
                refreshTimer = setInterval(fetchContainers, refreshInterval);
              } else {
                clearInterval(refreshTimer);
              }
            }}
            class="rounded"
          />
          <span class="text-sm">Auto-refresh</span>
        </label>
      </div>
    {/if}
  </div>

  {#if error}
    <div class="p-4 bg-red-50 border-l-4 border-red-500">
      <div class="flex items-center gap-2 text-red-700">
        <AlertCircle class="w-5 h-5" />
        <span>{error}</span>
      </div>
    </div>
  {/if}

  <div class="overflow-auto" style="max-height: {maxHeight}">
    {#if filteredContainers.length === 0}
      <div class="p-8 text-center text-gray-500">
        <Box class="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No containers found</p>
      </div>
    {:else}
      <div class="divide-y divide-gray-200">
        {#each filteredContainers as container (container.id)}
          <div class="p-4 hover:bg-gray-50 transition-colors">
            <div 
              class="flex items-center gap-4 cursor-pointer"
              on:click={() => toggleExpand(container.id)}
              on:keypress={(e) => e.key === 'Enter' && toggleExpand(container.id)}
              role="button"
              tabindex="0"
            >
              <div 
                class="w-3 h-3 rounded-full flex-shrink-0 {getStateColor(container.state)}"
                title={container.state}
              />
              
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <h3 class="font-semibold text-gray-900 truncate">
                    {container.names[0] || container.id}
                  </h3>
                  {#if container.health !== 'unknown'}
                    <Activity class="w-4 h-4 {getHealthColor(container.health)}" />
                  {/if}
                </div>
                <p class="text-sm text-gray-600 truncate">
                  {container.image}
                </p>
              </div>

              {#if container.isRunning && containerStats.has(container.id)}
                {@const stats = containerStats.get(container.id)}
                {#if stats}
                  <div class="hidden md:flex items-center gap-4 text-sm">
                    <div class="text-right">
                      <div class="text-gray-600">CPU</div>
                      <div class="font-medium {stats.cpu.percent > 80 ? 'text-red-600' : 'text-gray-900'}">
                        {stats.cpu.percent}%
                      </div>
                    </div>
                    <div class="text-right">
                      <div class="text-gray-600">Memory</div>
                      <div class="font-medium {stats.memory.percent > 90 ? 'text-red-600' : 'text-gray-900'}">
                        {stats.memory.percent}%
                      </div>
                    </div>
                  </div>
                {/if}
              {/if}

              <div class="text-right text-sm">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                  {container.isRunning ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
                  {#if container.isRunning}
                    <Power class="w-3 h-3 mr-1" />
                  {:else}
                    <Pause class="w-3 h-3 mr-1" />
                  {/if}
                  {container.state}
                </span>
                <div class="text-xs text-gray-500 mt-1">
                  {container.status}
                </div>
              </div>
            </div>

            {#if expandedContainers.has(container.id)}
              <div class="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 class="font-medium text-gray-700 mb-2">Details</h4>
                  <div class="space-y-1 text-gray-600">
                    <p><span class="font-medium">ID:</span> {container.fullId}</p>
                    <p><span class="font-medium">Created:</span> {formatDate(container.created)}</p>
                    <p><span class="font-medium">Image:</span> {container.image}</p>
                  </div>
                </div>

                {#if container.ports.length > 0}
                  <div>
                    <h4 class="font-medium text-gray-700 mb-2">Ports</h4>
                    <div class="flex flex-wrap gap-2">
                      {#each container.ports as port}
                        <span class="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                          {port.public || ''}{port.public ? ':' : ''}{port.private}/{port.type}
                        </span>
                      {/each}
                    </div>
                  </div>
                {/if}

                {#if container.networks.length > 0}
                  <div>
                    <h4 class="font-medium text-gray-700 mb-2">Networks</h4>
                    <div class="flex flex-wrap gap-2">
                      {#each container.networks as network}
                        <span class="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs">
                          {network}
                        </span>
                      {/each}
                    </div>
                  </div>
                {/if}

                {#if container.mounts.length > 0}
                  <div class="md:col-span-2">
                    <h4 class="font-medium text-gray-700 mb-2">Mounts</h4>
                    <div class="space-y-1">
                      {#each container.mounts as mount}
                        <div class="flex items-center gap-2 text-gray-600">
                          <span class="text-xs px-2 py-0.5 bg-gray-100 rounded">{mount.type}</span>
                          <span class="font-mono text-xs">
                            {mount.source || 'anonymous'} → {mount.destination}
                          </span>
                        </div>
                      {/each}
                    </div>
                  </div>
                {/if}

                {#if containerStats.has(container.id)}
                  {@const stats = containerStats.get(container.id)}
                  {#if stats}
                    <div class="md:col-span-2">
                      <h4 class="font-medium text-gray-700 mb-2">Statistics</h4>
                      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div class="p-3 bg-gray-50 rounded">
                          <div class="text-xs text-gray-500">CPU Usage</div>
                          <div class="text-lg font-semibold {stats.cpu.percent > 80 ? 'text-red-600' : 'text-gray-900'}">
                            {stats.cpu.percent}%
                          </div>
                        </div>
                        <div class="p-3 bg-gray-50 rounded">
                          <div class="text-xs text-gray-500">Memory</div>
                          <div class="text-lg font-semibold {stats.memory.percent > 90 ? 'text-red-600' : 'text-gray-900'}">
                            {stats.memory.percent}%
                          </div>
                          <div class="text-xs text-gray-500">
                            {stats.memory.usageFormatted} / {stats.memory.limitFormatted}
                          </div>
                        </div>
                      </div>
                    </div>
                  {/if}
                {/if}
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
