<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { slide, fade } from 'svelte/transition';
  import { quartOut } from 'svelte/easing';
  import { StatsAPI, type StatsData, type ServerInfo } from '$lib/api/statsClient';
  import MetricCard from './MetricCard.svelte';
  import ServerStatusGrid from './ServerStatusGrid.svelte';
  import ConnectionStatus from './ConnectionStatus.svelte';
  import ResourceUsageChart from './ResourceUsageChart.svelte';
  import { Activity, RefreshCw, Server, Maximize2, Minimize2 } from 'lucide-svelte';

  interface Props {
    apiKey?: string;
    refreshInterval?: number;
    expanded?: boolean;
  }

  let { 
    apiKey = '', 
    refreshInterval = 5000,
    expanded = false
  }: Props = $props();

  // State
  let stats = $state<StatsData | null>(null);
  let connectionStatus = $state<'connecting' | 'connected' | 'error' | 'disconnected'>('connecting');
  let lastUpdated = $state<Date | null>(null);
  let error = $state<string | null>(null);
  let loading = $state(true);
  let selectedServer = $state<string | null>(null);
  let isExpanded = $state(expanded);
  let autoRefresh = $state(true);
  let refreshTimer: ReturnType<typeof setInterval> | null = null;

  // API client (using server-side proxy)
  const client = new StatsAPI(apiKey);

  async function fetchStats() {
    try {
      connectionStatus = 'connecting';
      error = null;
      
      const data = await client.getCurrentStats();
      stats = data;
      lastUpdated = new Date();
      connectionStatus = 'connected';
      loading = false;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to fetch stats';
      connectionStatus = 'error';
      console.error('Error fetching stats:', err);
    }
  }

  function startRefresh() {
    if (refreshTimer) {
      clearInterval(refreshTimer);
    }
    
    if (autoRefresh) {
      refreshTimer = setInterval(fetchStats, refreshInterval);
    }
  }

  function toggleAutoRefresh() {
    autoRefresh = !autoRefresh;
    startRefresh();
  }

  function handleRetry() {
    fetchStats();
    startRefresh();
  }

  function handleServerClick(server: ServerInfo) {
    selectedServer = selectedServer === server.id ? null : server.id;
  }

  function toggleExpanded() {
    isExpanded = !isExpanded;
  }

  // Derived values
  let globalStats = $derived(stats?.global);
  let servers = $derived(stats?.servers || []);
  let selectedServerData = $derived(servers.find((s: ServerInfo) => s.id === selectedServer));

  onMount(() => {
    fetchStats();
    startRefresh();
  });

  onDestroy(() => {
    if (refreshTimer) {
      clearInterval(refreshTimer);
    }
  });
</script>

<section 
  class="real-time-stats py-8 px-4 sm:px-6 lg:px-8" 
  id="live-stats"
  aria-label="Real-time server statistics"
>
  <div class="max-w-7xl mx-auto">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
      <div class="flex items-center gap-3">
        <div class="p-2 rounded-lg bg-cyan-500/10">
          <Activity class="w-6 h-6 text-cyan-400" />
        </div>
        <div>
          <h2 class="text-2xl font-bold text-white">Real-Time Stats</h2>
          <p class="text-sm text-gray-400">Live server metrics and performance monitoring</p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <!-- Auto-refresh toggle -->
        <label class="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={autoRefresh}
            onchange={toggleAutoRefresh}
            class="rounded bg-dark-700 border-dark-600 text-cyan-500 focus:ring-cyan-500/50"
          />
          <span>Auto-refresh</span>
        </label>

        <!-- Expand/Collapse button -->
        <button
          type="button"
          onclick={toggleExpanded}
          class="p-2 rounded-lg bg-dark-700/50 hover:bg-dark-600/50 transition-colors"
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          {#if isExpanded}
            <Minimize2 class="w-4 h-4 text-gray-400" />
          {:else}
            <Maximize2 class="w-4 h-4 text-gray-400" />
          {/if}
        </button>

        <!-- Connection Status -->
        <ConnectionStatus 
          status={connectionStatus} 
          {lastUpdated}
          {error}
          onRetry={handleRetry}
        />
      </div>
    </div>

    <!-- Loading state -->
    {#if loading}
      <div class="glass rounded-xl p-8 text-center" transition:fade>
        <div class="inline-flex items-center gap-3">
          <RefreshCw class="w-6 h-6 text-cyan-400 animate-spin" />
          <span class="text-gray-400">Loading server statistics...</span>
        </div>
      </div>
    {:else}
      <!-- Global Stats Overview -->
      {#if globalStats}
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8" transition:slide={{ duration: 300, easing: quartOut }}>
          <div class="glass rounded-xl p-4 sm:p-6 text-center hover-glow">
            <Server class="w-8 h-8 text-cyan-400 mx-auto mb-2" />
            <div class="text-3xl font-bold text-white">{globalStats.activeServers}</div>
            <div class="text-sm text-gray-400">Active Servers</div>
          </div>
          
          <MetricCard
            title="Total CPU"
            value={globalStats.totalCpu / globalStats.activeServers}
            unit="% avg"
            color="cyan"
            icon="cpu"
            compact
          />
          
          <MetricCard
            title="Total Memory"
            value={globalStats.totalMemory / globalStats.activeServers}
            unit="% avg"
            color="teal"
            icon="memory"
            compact
          />
          
          <div class="glass rounded-xl p-4 sm:p-6 text-center hover-glow">
            <Activity class="w-8 h-8 text-teal-400 mx-auto mb-2" />
            <div class="text-3xl font-bold text-white">{globalStats.totalContainers}</div>
            <div class="text-sm text-gray-400">Containers</div>
          </div>
        </div>
      {/if}

      <!-- Server Grid -->
      <div class="mb-8">
        <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Server class="w-5 h-5 text-cyan-400" />
          Server Status
        </h3>
        <ServerStatusGrid 
          {servers} 
          {loading}
          selectedServerId={selectedServer}
          onServerClick={handleServerClick}
        />
      </div>

      <!-- Charts Section (Expanded view) -->
      {#if isExpanded}
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6" transition:slide={{ duration: 300, easing: quartOut }}>
          <ResourceUsageChart
            measurement="cpu"
            title="CPU Usage History"
            serverId={selectedServer || undefined}
            refreshInterval={30000}
          />
          
          <ResourceUsageChart
            measurement="memory"
            title="Memory Usage History"
            serverId={selectedServer || undefined}
            refreshInterval={30000}
          />
        </div>

        <!-- Selected Server Details -->
        {#if selectedServerData}
          <div class="mt-8 glass rounded-xl p-6" transition:slide={{ duration: 300, easing: quartOut }}>
            <h3 class="text-lg font-semibold text-white mb-4">
              {selectedServerData.name} Details
            </h3>
            
            {#if selectedServerData.stats}
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard
                  title="CPU Usage"
                  value={selectedServerData.stats.cpu.usage}
                  unit="%"
                  trend={selectedServerData.stats.cpu.usage > 70 ? 'up' : 'neutral'}
                  color="cyan"
                  icon="cpu"
                />
                
                <MetricCard
                  title="Memory Usage"
                  value={parseFloat(selectedServerData.stats.memory.usagePercent)}
                  unit="%"
                  trend={parseFloat(selectedServerData.stats.memory.usagePercent) > 70 ? 'up' : 'neutral'}
                  color="teal"
                  icon="memory"
                />
                
                <MetricCard
                  title="Disk Usage"
                  value={selectedServerData.stats.disk[0]?.usagePercent || 0}
                  unit="%"
                  color="purple"
                  icon="disk"
                />
              </div>
            {:else}
              <p class="text-gray-500 text-center py-8">No detailed statistics available for this server.</p>
            {/if}
          </div>
        {/if}
      {/if}
    {/if}
  </div>
</section>

<style>
  .glass {
    @apply bg-dark-800/80 backdrop-blur-xl border border-dark-600/50;
  }
  
  .hover-glow {
    @apply transition-all duration-300 hover:shadow-[0_0_25px_rgba(34,211,238,0.3)] hover:border-cyan-500/50;
  }
</style>