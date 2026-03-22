<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { HistoryPoint, AggregateStats, TimeRange } from '$lib/db/influx';
  
  export let measurement: 'cpu' | 'memory' | 'disk' = 'cpu';
  export let title: string = 'History';
  
  let historyData: HistoryPoint[] = [];
  let aggregateStats: AggregateStats = { min: 0, max: 0, avg: 0, count: 0 };
  let loading = false;
  let error: string | null = null;
  let selectedRange: string = '1h';
  
  const ranges: TimeRange[] = [
    { value: '1h', label: '1 Hour', window: '1m' },
    { value: '6h', label: '6 Hours', window: '5m' },
    { value: '24h', label: '24 Hours', window: '15m' },
    { value: '7d', label: '7 Days', window: '1h' },
    { value: '30d', label: '30 Days', window: '6h' }
  ];
  
  let refreshInterval: ReturnType<typeof setInterval>;
  
  async function fetchHistory() {
    loading = true;
    error = null;
    
    try {
      const [historyRes, aggregateRes] = await Promise.all([
        fetch(`/api/history?measurement=${measurement}&range=${selectedRange}&aggregate=mean`),
        fetch(`/api/history/aggregate?measurement=${measurement}&range=${selectedRange}`)
      ]);
      
      if (!historyRes.ok) {
        const err = await historyRes.json();
        throw new Error(err.error || 'Failed to fetch history');
      }
      
      if (!aggregateRes.ok) {
        const err = await aggregateRes.json();
        throw new Error(err.error || 'Failed to fetch aggregate');
      }
      
      const historyJson = await historyRes.json();
      const aggregateJson = await aggregateRes.json();
      
      historyData = historyJson.data || [];
      aggregateStats = aggregateJson.stats || { min: 0, max: 0, avg: 0, count: 0 };
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
      historyData = [];
    } finally {
      loading = false;
    }
  }
  
  function handleRangeChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    selectedRange = target.value;
    fetchHistory();
  }
  
  onMount(() => {
    fetchHistory();
    
    // Refresh every 30 seconds
    refreshInterval = setInterval(fetchHistory, 30000);
  });
  
  onDestroy(() => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }
  });
  
  // Simple SVG chart generation
  $: chartPath = generateChartPath(historyData);
  $: chartArea = generateChartArea(historyData);
  
  function generateChartPath(data: HistoryPoint[]): string {
    if (data.length < 2) return '';
    
    const width = 600;
    const height = 150;
    const padding = 20;
    
    const values = data.map(d => d.value).filter(v => v !== null && v !== undefined);
    if (values.length === 0) return '';
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    
    const points = data.map((point, index) => {
      const x = padding + (index / (data.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((point.value - min) / range) * (height - 2 * padding);
      return `${x},${y}`;
    });
    
    return `M ${points.join(' L ')}`;
  }
  
  function generateChartArea(data: HistoryPoint[]): string {
    if (data.length < 2) return '';
    
    const width = 600;
    const height = 150;
    const padding = 20;
    
    const values = data.map(d => d.value).filter(v => v !== null && v !== undefined);
    if (values.length === 0) return '';
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    
    const points = data.map((point, index) => {
      const x = padding + (index / (data.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((point.value - min) / range) * (height - 2 * padding);
      return `${x},${y}`;
    });
    
    // Close the path for area fill
    const firstX = padding;
    const lastX = width - padding;
    const bottomY = height - padding;
    
    return `M ${firstX},${bottomY} L ${points.join(' L ')} L ${lastX},${bottomY} Z`;
  }
  
  function formatTime(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  function formatValue(value: number): string {
    if (measurement === 'memory') {
      return `${(value / 1024 / 1024 / 1024).toFixed(2)} GB`;
    }
    return `${value.toFixed(1)}%`;
  }
</script>

<div class="history-container">
  <div class="header">
    <h3>{title}</h3>
    
    <div class="controls">
      <select value={selectedRange} on:change={handleRangeChange} disabled={loading}>
        {#each ranges as range}
          <option value={range.value}>{range.label}</option>
        {/each}
      </select>
      
      <button on:click={fetchHistory} disabled={loading}>
        {loading ? 'Loading...' : 'Refresh'}
      </button>
    </div>
  </div>
  
  {#if error}
    <div class="error">
      <p>{error}</p>
      {#if error.includes('not configured')}
        <p class="hint">InfluxDB is not configured. Set INFLUX_TOKEN to enable metrics persistence.</p>
      {/if}
    </div>
  {:else if historyData.length > 0}
    <div class="chart-container">
      <svg viewBox="0 0 600 150" class="chart">
        <!-- Grid lines -->
        <line x1="20" y1="20" x2="580" y2="20" class="grid-line" />
        <line x1="20" y1="75" x2="580" y2="75" class="grid-line" />
        <line x1="20" y1="130" x2="580" y2="130" class="grid-line" />
        
        <!-- Area fill -->
        <path d={chartArea} class="chart-area" />
        
        <!-- Line -->
        <path d={chartPath} class="chart-line" fill="none" />
        
        <!-- Axes -->
        <line x1="20" y1="130" x2="580" y2="130" class="axis" />
        <line x1="20" y1="20" x2="20" y2="130" class="axis" />
      </svg>
      
      {#if historyData.length > 0}
        <div class="time-labels">
          <span>{formatTime(historyData[0].time)}</span>
          <span>{formatTime(historyData[Math.floor(historyData.length / 2)].time)}</span>
          <span>{formatTime(historyData[historyData.length - 1].time)}</span>
        </div>
      {/if}
    </div>
    
    <div class="stats-row">
      <div class="stat-box">
        <span class="stat-label">Min</span>
        <span class="stat-value">{formatValue(aggregateStats.min)}</span>
      </div>
      <div class="stat-box">
        <span class="stat-label">Avg</span>
        <span class="stat-value">{formatValue(aggregateStats.avg)}</span>
      </div>
      <div class="stat-box">
        <span class="stat-label">Max</span>
        <span class="stat-value">{formatValue(aggregateStats.max)}</span>
      </div>
      <div class="stat-box">
        <span class="stat-label">Samples</span>
        <span class="stat-value">{aggregateStats.count}</span>
      </div>
    </div>
  {:else}
    <div class="no-data">
      <p>No historical data available</p>
      <p class="hint">Data will appear after metrics are collected</p>
    </div>
  {/if}
</div>

<style>
  .history-container {
    background: #f8f9fa;
    border-radius: 8px;
    padding: 1rem;
    margin: 1rem 0;
  }
  
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }
  
  .header h3 {
    margin: 0;
    font-size: 1.1rem;
    color: #333;
  }
  
  .controls {
    display: flex;
    gap: 0.5rem;
  }
  
  select {
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: white;
    cursor: pointer;
  }
  
  button {
    padding: 0.5rem 1rem;
    background: #1976d2;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
  }
  
  button:hover:not(:disabled) {
    background: #1565c0;
  }
  
  button:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
  
  .chart-container {
    background: white;
    border-radius: 4px;
    padding: 1rem;
    margin-bottom: 1rem;
  }
  
  .chart {
    width: 100%;
    height: auto;
    max-width: 600px;
    display: block;
    margin: 0 auto;
  }
  
  .chart-line {
    stroke: #1976d2;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  
  .chart-area {
    fill: rgba(25, 118, 210, 0.1);
  }
  
  .grid-line {
    stroke: #e0e0e0;
    stroke-width: 1;
    stroke-dasharray: 4;
  }
  
  .axis {
    stroke: #999;
    stroke-width: 1;
  }
  
  .time-labels {
    display: flex;
    justify-content: space-between;
    margin-top: 0.5rem;
    font-size: 0.8rem;
    color: #666;
  }
  
  .stats-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
  }
  
  .stat-box {
    background: white;
    border-radius: 4px;
    padding: 0.75rem;
    text-align: center;
  }
  
  .stat-label {
    display: block;
    font-size: 0.8rem;
    color: #666;
    text-transform: uppercase;
    margin-bottom: 0.25rem;
  }
  
  .stat-value {
    display: block;
    font-size: 1.25rem;
    font-weight: bold;
    color: #333;
  }
  
  .error {
    background: #ffebee;
    color: #c62828;
    padding: 1rem;
    border-radius: 4px;
  }
  
  .error .hint {
    font-size: 0.9rem;
    color: #666;
    margin-top: 0.5rem;
  }
  
  .no-data {
    text-align: center;
    padding: 2rem;
    color: #666;
  }
  
  .no-data .hint {
    font-size: 0.9rem;
    color: #999;
    margin-top: 0.5rem;
  }
  
  @media (max-width: 600px) {
    .stats-row {
      grid-template-columns: repeat(2, 1fr);
    }
    
    .header {
      flex-direction: column;
      gap: 0.5rem;
      align-items: flex-start;
    }
  }
</style>
