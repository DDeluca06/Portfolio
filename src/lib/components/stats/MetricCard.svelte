<script lang="ts">
  import { Cpu, HardDrive, MemoryStick, Network, Activity } from 'lucide-svelte';
  import { slide } from 'svelte/transition';
  import { quartOut } from 'svelte/easing';

  interface Props {
    title: string;
    value: number;
    unit?: string;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
    color?: 'cyan' | 'teal' | 'purple' | 'amber' | 'rose';
    icon?: 'cpu' | 'memory' | 'disk' | 'network' | 'activity';
    threshold?: {
      warning: number;
      critical: number;
    };
    loading?: boolean;
    compact?: boolean;
  }

  let { 
    title, 
    value, 
    unit = '%', 
    trend = 'neutral', 
    trendValue,
    color = 'cyan',
    icon = 'activity',
    threshold = { warning: 70, critical: 90 },
    loading = false,
    compact = false
  }: Props = $props();

  // Icon mapping
  const iconComponents = {
    cpu: Cpu,
    memory: MemoryStick,
    disk: HardDrive,
    network: Network,
    activity: Activity
  };

  // Color mappings
  const colorClasses: Record<string, { text: string; bg: string; border: string; bar: string; glow: string }> = {
    cyan: {
      text: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/30',
      bar: 'bg-cyan-500',
      glow: 'shadow-cyan-500/30'
    },
    teal: {
      text: 'text-teal-400',
      bg: 'bg-teal-500/10',
      border: 'border-teal-500/30',
      bar: 'bg-teal-500',
      glow: 'shadow-teal-500/30'
    },
    purple: {
      text: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/30',
      bar: 'bg-purple-500',
      glow: 'shadow-purple-500/30'
    },
    amber: {
      text: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      bar: 'bg-amber-500',
      glow: 'shadow-amber-500/30'
    },
    rose: {
      text: 'text-rose-400',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/30',
      bar: 'bg-rose-500',
      glow: 'shadow-rose-500/30'
    }
  };

  // Determine status color based on value
  function getStatusColor(val: number): string {
    if (val >= threshold.critical) return 'rose';
    if (val >= threshold.warning) return 'amber';
    return color;
  }

  // Get trend icon
  function getTrendIcon(): string {
    switch (trend) {
      case 'up': return '↑';
      case 'down': return '↓';
      default: return '→';
    }
  }

  function getTrendColor(): string {
    switch (trend) {
      case 'up': return 'text-rose-400';
      case 'down': return 'text-green-400';
      default: return 'text-gray-400';
    }
  }

  let IconComponent = $derived(iconComponents[icon]);
  let statusColor = $derived(getStatusColor(value));
  let colors = $derived(colorClasses[statusColor]);
</script>

<div 
  class="glass rounded-xl p-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg {colors.glow} {compact ? 'p-3' : 'p-4 sm:p-6'}"
  transition:slide={{ duration: 300, easing: quartOut }}
  role="article"
  aria-label="{title} metric card"
>
  <div class="flex items-start justify-between mb-3">
    <div class="flex items-center gap-3">
      <div class="p-2 rounded-lg {colors.bg} {colors.text}">
        <IconComponent class="w-5 h-5" />
      </div>
      <span class="text-sm text-gray-400 font-medium">{title}</span>
    </div>
    {#if trendValue}
      <div class="flex items-center gap-1 text-xs {getTrendColor()}">
        <span>{getTrendIcon()}</span>
        <span>{trendValue}</span>
      </div>
    {/if}
  </div>

  <div class="flex items-baseline gap-1 mb-3">
    {#if loading}
      <div class="h-8 w-20 bg-dark-700/50 rounded animate-pulse"></div>
    {:else}
      <span class="text-3xl sm:text-4xl font-bold text-white tabular-nums">
        {value.toFixed(1)}
      </span>
      <span class="text-sm text-gray-500">{unit}</span>
    {/if}
  </div>

  <!-- Progress bar -->
  <div class="relative">
    <div class="h-2 w-full bg-dark-700/50 rounded-full overflow-hidden">
      <div 
        class="h-full {colors.bar} rounded-full transition-all duration-500 ease-out"
        style="width: {Math.min(value, 100)}%"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
      ></div>
    </div>
    
    <!-- Threshold markers -->
    <div class="absolute top-0 left-[70%] h-2 w-0.5 bg-amber-500/50" style="left: {threshold.warning}%"></div>
    <div class="absolute top-0 left-[90%] h-2 w-0.5 bg-rose-500/50" style="left: {threshold.critical}%"></div>
  </div>

  <!-- Status indicator -->
  {#if value >= threshold.critical}
    <div class="mt-3 flex items-center gap-2 text-xs text-rose-400">
      <span class="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
      <span>Critical</span>
    </div>
  {:else if value >= threshold.warning}
    <div class="mt-3 flex items-center gap-2 text-xs text-amber-400">
      <span class="w-2 h-2 rounded-full bg-amber-500"></span>
      <span>Warning</span>
    </div>
  {:else}
    <div class="mt-3 flex items-center gap-2 text-xs text-green-400">
      <span class="w-2 h-2 rounded-full bg-green-500"></span>
      <span>Normal</span>
    </div>
  {/if}
</div>

<style>
  .glass {
    @apply bg-dark-800/80 backdrop-blur-xl border border-dark-600/50;
  }
  
  /* Smooth value transition */
  .tabular-nums {
    transition: all 0.3s ease;
  }
</style>