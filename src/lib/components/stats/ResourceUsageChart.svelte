<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Cpu, MemoryStick, HardDrive, Clock, ChevronDown } from 'lucide-svelte';
  import { fade, slide } from 'svelte/transition';
  import { quartOut } from 'svelte/easing';
  import type { HistoryPoint, TimeRange } from '$lib/db/influx';

  interface Props {
    measurement?: 'cpu' | 'memory' | 'disk';
    title?: string;
    serverId?: string;
    refreshInterval?: number;
    height?: number;
  }

  let { 
    measurement = 'cpu', 
    title = 'Resource Usage',
    serverId,
    refreshInterval = 30000,
    height = 200
  }: Props = $props();

  let historyData: HistoryPoint[] = $state([]);
  let loading = $state(false);
  let error: string | null = $state(null);
  let selectedRange = $state('1h');
  let showRangeDropdown = $state(false);
  let refreshTimer: ReturnType<typeof setInterval> | null = null;
  let containerRef: HTMLDivElement | null = $state(null);

  const ranges: TimeRange[] = [
    { value: '1h', label: '1 Hour', window: '1m' },
    { value: '6h', label: '6 Hours', window: '5m' },
    { value: '24h', label: '24 Hours', window: '15m' },
    { value: '7d', label: '7 Days', window: '1h' },
    { value: '30d', label: '30 Days', window: '6h' }
  ];

  const config = {
    cpu: {
      icon: Cpu,
      color: '#22d3ee',
      fillColor: 'rgba(34, 211, 238, 0.1)',
      unit: '%',
      max: 100
    },
    memory: {
      icon: MemoryStick,
      color: '#2dd4bf',
      fillColor: 'rgba(45, 212, 191, 0.1)',
      unit: '%',
      max: 100
    },
    disk: {
      icon: HardDrive,
      color: '#a78bfa',
      fillColor: 'rgba(167, 139, 250, 0.1)',
      unit: '%',
      max: 100
    }
  };

  let IconComponent = $derived(config[measurement].icon);
  let chartColor = $derived(config[measurement].color);

  async function fetchHistory() {
    if (loading) return;
    loading = true;
    error = null;

    try {
      const params = new URLSearchParams({
        measurement,
        range: selectedRange,
        aggregate: 'mean'
      });
      
      if (serverId) {
        params.set('serverId', serverId);
      }

      const response = await fetch(`/api/history?${params.toString()}`);
      
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to fetch history');
      }

      const data = await response.json();
      historyData = data.data || [];
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error fetching history:', err);
    } finally {
      loading = false;
    }
  }

  function handleRangeChange(range: string) {
    selectedRange = range;
    showRangeDropdown = false;
    fetchHistory();
  }

  // Generate SVG path for line chart
  function generateChartPath(data: HistoryPoint[], width: number, height: number): string {
    if (data.length < 2) return '';
    
    const padding = 20;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;
    
    const values = data.map(d => d.value).filter(v => v !== null && v !== undefined);
    if (values.length === 0) return '';
    
    const min = 0;
    const max = config[measurement].max;
    
    const points = data.map((point, index) => {
      const x = padding + (index / (data.length - 1)) * chartWidth;
      const y = padding + chartHeight - ((point.value - min) / (max - min)) * chartHeight;
      return `${x},${y}`;
    });
    
    return `M ${points.join(' L ')}`;
  }

  // Generate SVG path for area fill
  function generateAreaPath(data: HistoryPoint[], width: number, height: number): string {
    if (data.length < 2) return '';
    
    const padding = 20;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;
    
    const values = data.map(d => d.value).filter(v => v !== null && v !== undefined);
    if (values.length === 0) return '';
    
    const min = 0;
    const max = config[measurement].max;
    
    const points = data.map((point, index) => {
      const x = padding + (index / (data.length - 1)) * chartWidth;
      const y = padding + chartHeight - ((point.value - min) / (max - min)) * chartHeight;
      return `${x},${y}`;
    });
    
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
    return `${value.toFixed(1)}${config[measurement].unit}`;
  }

  // Get current stats
  let currentValue = $derived(historyData.length > 0 ? historyData[historyData.length - 1].value : 0);
  let minValue = $derived(historyData.length > 0 ? Math.min(...historyData.map(d => d.value)) : 0);
  let maxValue = $derived(historyData.length > 0 ? Math.max(...historyData.map(d => d.value)) : 0);
  let avgValue = $derived(historyData.length > 0 
    ? historyData.reduce((sum, d) => sum + d.value, 0) / historyData.length 
    : 0
  );

  // Close dropdown when clicking outside
  function handleClickOutside(event: MouseEvent) {
    if (containerRef && !containerRef.contains(event.target as Node)) {
      showRangeDropdown = false;
    }
  }

  onMount(() => {
    fetchHistory();
    refreshTimer = setInterval(fetchHistory, refreshInterval);
    document.addEventListener('click', handleClickOutside);
  });

  onDestroy(() => {
    if (refreshTimer) {
      clearInterval(refreshTimer);
    }
    document.removeEventListener('click', handleClickOutside);
  });
</script>

<div class="glass rounded-xl p-4 sm:p-6" bind:this={containerRef}>
  <!-- Header -->
  <div class="flex items-center justify-between mb-6">
    <div class="flex items-center gap-3">
      <div class="p-2 rounded-lg bg-dark-700/50">
        <IconComponent class="w-5 h-5" style="color: {chartColor}" />
      </div>
      <div>
        <h3 class="font-semibold text-white">{title}</h3>
        {#if currentValue > 0}
          <p class="text-2xl font-bold" style="color: {chartColor}">
            {formatValue(currentValue)}
          </p>
        {/if}
      </div>
    </div>

    <!-- Range Selector -->
    <div class="relative">
      <button
        type="button"
        onclick={() => showRangeDropdown = !showRangeDropdown}
        class="flex items-center gap-2 px-3 py-1.5 bg-dark-700/50 rounded-lg text-sm text-gray-300 hover:bg-dark-600/50 transition-colors"
      >
        <Clock class="w-4 h-4" />
        <span>{ranges.find(r => r.value === selectedRange)?.label}</span>
        <ChevronDown class="w-4 h-4 transition-transform duration-200 {showRangeDropdown ? 'rotate-180' : ''}" />
      </button>

      {#if showRangeDropdown}
        <div 
          class="absolute right-0 mt-2 w-40 bg-dark-800 rounded-lg shadow-xl border border-dark-600/50 overflow-hidden z-10"
          transition:slide={{ duration: 150, easing: quartOut }}
        >
          {#each ranges as range}
            <button
              type="button"
              class="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-dark-700/50 transition-colors {selectedRange === range.value ? 'bg-dark-700/50 text-cyan-400' : ''}"
              onclick={() => handleRangeChange(range.value)}
            >
              {range.label}
            </button>
          {/each}
        </div>
      {/if}
    </div>
  </div>

  <!-- Chart -->
  {#if loading && historyData.length === 0}
    <div class="h-[200px] flex items-center justify-center">
      <div class="animate-pulse flex space-x-2">
        <div class="w-2 h-2 bg-cyan-500 rounded-full animate-bounce"></div>
        <div class="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
        <div class="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
      </div>
    </div>
  {:else if error}
    <div class="h-[200px] flex flex-col items-center justify-center text-center">
      <p class="text-rose-400 mb-2">{error}</p>
      <button
        type="button"
        onclick={fetchHistory}
        class="px-4 py-2 bg-dark-700/50 rounded-lg text-sm text-gray-300 hover:bg-dark-600/50 transition-colors"
      >
        Retry
      </button>
    </div>
  {:else if historyData.length > 0}
    <div class="relative" transition:fade>
      <!-- SVG Chart -->
      <svg viewBox="0 0 600 {height}" class="w-full h-auto">
        <!-- Grid lines -->
        {#each [0.25, 0.5, 0.75] as y}
          <line 
            x1="20" 
            y1={20 + (height - 40) * y} 
            x2="580" 
            y2={20 + (height - 40) * y}
            stroke="#333344"
            stroke-width="1"
            stroke-dasharray="4"
          />
        {/each}

        <!-- Area fill -->
        <path 
          d={generateAreaPath(historyData, 600, height)} 
          fill={config[measurement].fillColor}
        />

        <!-- Line -->
        <path 
          d={generateChartPath(historyData, 600, height)}
          fill="none"
          stroke={chartColor}
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />

        <!-- Current value dot -->
        {#if historyData.length > 0}
          {@const lastPoint = historyData[historyData.length - 1]}
          {@const x = 580}
          {@const y = 20 + (height - 40) - ((lastPoint.value / config[measurement].max) * (height - 40))}
          <circle cx={x} cy={y} r="4" fill={chartColor} class="animate-pulse" />
        {/if}
      </svg>

      <!-- Time labels -->
      <div class="flex justify-between text-xs text-gray-500 mt-2 px-5">
        <span>{formatTime(historyData[0].time)}</span>
        <span>{formatTime(historyData[Math.floor(historyData.length / 2)].time)}</span>
        <span>{formatTime(historyData[historyData.length - 1].time)}</span>
      </div>
    </div>

    <!-- Stats summary -->
    <div class="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-dark-600/30">
      <div class="text-center">
        <div class="text-xs text-gray-500 mb-1">Min</div>
        <div class="text-lg font-semibold text-gray-300">{formatValue(minValue)}</div>
      </div>
      <div class="text-center">
        <div class="text-xs text-gray-500 mb-1">Avg</div>
        <div class="text-lg font-semibold text-cyan-400">{formatValue(avgValue)}</div>
      </div>
      <div class="text-center">
        <div class="text-xs text-gray-500 mb-1">Max</div>
        <div class="text-lg font-semibold text-gray-300">{formatValue(maxValue)}</div>
      </div>
    </div>
  {:else}
    <div class="h-[200px] flex flex-col items-center justify-center text-center">
      <IconComponent class="w-12 h-12 text-gray-600 mb-3" />
      <p class="text-gray-500">No data available for this time range</p>
    </div>
  {/if}
</div>

<style>
  .glass {
    @apply bg-dark-800/80 backdrop-blur-xl border border-dark-600/50;
  }
</style>