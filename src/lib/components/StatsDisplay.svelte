<script lang="ts">
  import { onMount } from 'svelte';
  import { StatsAPI, type SystemStats, type DockerStats } from '$lib/api/statsClient';
  import HistoryChart from './HistoryChart.svelte';
  
  // API key should be loaded from environment variables in production
  // For client-side, you might use a server endpoint to proxy requests
  const STATS_API_KEY = import.meta.env.VITE_STATS_API_KEY || '';
  
  let systemStats: SystemStats | null = null;
  let dockerStats: DockerStats | null = null;
  let loading = false;
  let error: string | null = null;
  let activeTab: 'current' | 'history' = 'current';
  
  // Note: In production, you should not expose API keys in client-side code
  // Instead, create a server-side endpoint that proxies requests with the API key
  
  async function fetchStats() {
    loading = true;
    error = null;
    
    try {
      // Example 1: Server-side fetch (recommended approach)
      // Create a +server.ts endpoint that proxies the request
      const response = await fetch('/api/proxy/stats');
      systemStats = await response.json();
      
      // Example 2: Direct API client usage (if you have a secure way to store API key)
      // const api = new StatsAPI(STATS_API_KEY);
      // systemStats = await api.getSystemStats();
      // dockerStats = await api.getDockerStats();
      
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
    } finally {
      loading = false;
    }
  }
  
  const REFRESH_INTERVAL = parseInt(import.meta.env.REFRESH_INTERVAL || '30000', 10);

  onMount(() => {
    fetchStats();
    
    // Refresh every 30 seconds (configurable via REFRESH_INTERVAL env var)
    const interval = setInterval(fetchStats, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  });
  
  function formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
</script>

<div class="stats-container">
  <h2>System Statistics</h2>
  
  <!-- Tab Navigation -->
  <div class="tabs">
    <button 
      class="tab-button" 
      class:active={activeTab === 'current'}
      on:click={() => activeTab = 'current'}
    >
      Current
    </button>
    <button 
      class="tab-button" 
      class:active={activeTab === 'history'}
      on:click={() => activeTab = 'history'}
    >
      History
    </button>
  </div>
  
  {#if loading && !systemStats}
    <p>Loading...</p>
  {/if}
  
  {#if error}
    <div class="error">
      <p>Error: {error}</p>
      <button on:click={fetchStats}>Retry</button>
    </div>
  {/if}
  
  {#if activeTab === 'current'}
    {#if systemStats}
      <div class="stats-grid">
        <div class="stat-card">
          <h3>CPU</h3>
          <p class="stat-value">{systemStats.cpu.usage.toFixed(1)}%</p>
          <p class="stat-detail">{systemStats.cpu.cores} cores</p>
        </div>
        
        <div class="stat-card">
          <h3>Memory</h3>
          <p class="stat-value">{systemStats.memory.usagePercent}%</p>
          <p class="stat-detail">
            {formatBytes(systemStats.memory.used)} / {formatBytes(systemStats.memory.total)}
          </p>
        </div>
        
        <div class="stat-card">
          <h3>System</h3>
          <p class="stat-value">{systemStats.system.platform}</p>
          <p class="stat-detail">{systemStats.system.distro}</p>
        </div>
      </div>
      
      <h3>Disk Usage</h3>
      <div class="disk-list">
        {#each systemStats.disk as disk}
          <div class="disk-item">
            <span class="disk-mount">{disk.mount}</span>
            <div class="disk-bar">
              <div 
                class="disk-fill" 
                style="width: {disk.usagePercent}%"
                class:critical={disk.usagePercent > 90}
                class:warning={disk.usagePercent > 70 && disk.usagePercent <= 90}
              ></div>
            </div>
            <span class="disk-percent">{disk.usagePercent}%</span>
          </div>
        {/each}
      </div>
    {/if}
  {:else if activeTab === 'history'}
    <HistoryChart measurement="cpu" title="CPU Usage History" />
    <HistoryChart measurement="memory" title="Memory Usage History" />
  {/if}
  
  {#if dockerStats}
    <h3>Docker Containers</h3>
    <div class="docker-stats">
      <p>Running: {(dockerStats as any).system?.containers?.running || 0}</p>
      <p>Total: {(dockerStats as any).system?.containers?.total || 0}</p>
      <p>Images: {(dockerStats as any).system?.images || 0}</p>
    </div>
    
    {#if (dockerStats as any).containers}
      <div class="container-list">
        {#each (dockerStats as any).containers as container (container.id)}
          <div class="container-item" class:running={container.state === 'running'}>
            <span class="container-name">{container.names?.[0]?.replace('/', '') || 'unnamed'}</span>
            <span class="container-status">{container.status}</span>
            <span class="container-image">{container.image}</span>
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>

<style>
  .stats-container {
    padding: 1rem;
    max-width: 800px;
    margin: 0 auto;
  }
  
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin: 1rem 0;
  }
  
  .stat-card {
    background: #f5f5f5;
    border-radius: 8px;
    padding: 1rem;
    text-align: center;
  }
  
  .stat-card h3 {
    margin: 0 0 0.5rem 0;
    color: #666;
    font-size: 0.9rem;
    text-transform: uppercase;
  }
  
  .stat-value {
    font-size: 2rem;
    font-weight: bold;
    margin: 0;
    color: #333;
  }
  
  .stat-detail {
    margin: 0.5rem 0 0 0;
    color: #888;
    font-size: 0.85rem;
  }
  
  .disk-list {
    margin: 1rem 0;
  }
  
  .disk-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.5rem 0;
  }
  
  .disk-mount {
    width: 80px;
    font-weight: bold;
  }
  
  .disk-bar {
    flex: 1;
    height: 20px;
    background: #e0e0e0;
    border-radius: 10px;
    overflow: hidden;
  }
  
  .disk-fill {
    height: 100%;
    background: #4caf50;
    transition: width 0.3s ease;
  }
  
  .disk-fill.warning {
    background: #ff9800;
  }
  
  .disk-fill.critical {
    background: #f44336;
  }
  
  .disk-percent {
    width: 50px;
    text-align: right;
    font-weight: bold;
  }
  
  .container-list {
    margin: 1rem 0;
  }
  
  .container-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem;
    border-bottom: 1px solid #eee;
  }
  
  .container-item.running {
    border-left: 4px solid #4caf50;
  }
  
  .container-name {
    font-weight: bold;
    min-width: 150px;
  }
  
  .container-status {
    color: #666;
    font-size: 0.9rem;
  }
  
  .container-image {
    color: #888;
    font-size: 0.85rem;
    margin-left: auto;
  }
  
  .error {
    background: #ffebee;
    color: #c62828;
    padding: 1rem;
    border-radius: 4px;
    margin: 1rem 0;
  }
  
  button {
    background: #1976d2;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
  }
  
  button:hover {
    background: #1565c0;
  }
  
  .tabs {
    display: flex;
    gap: 0.5rem;
    margin: 1rem 0;
    border-bottom: 2px solid #e0e0e0;
  }
  
  .tab-button {
    padding: 0.75rem 1.5rem;
    border: none;
    background: transparent;
    color: #666;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    margin-bottom: -2px;
    font-size: 1rem;
  }
  
  .tab-button:hover {
    background: #f5f5f5;
  }
  
  .tab-button.active {
    color: #1976d2;
    border-bottom-color: #1976d2;
    background: transparent;
  }
  
  .tab-button.active:hover {
    background: transparent;
  }
</style>
