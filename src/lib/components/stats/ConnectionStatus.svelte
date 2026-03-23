<script lang="ts">
  import { Wifi, WifiOff, Loader2, AlertCircle, RefreshCw } from 'lucide-svelte';
  import { fade, scale } from 'svelte/transition';
  import { quartOut } from 'svelte/easing';

  interface Props {
    status: 'connecting' | 'connected' | 'error' | 'disconnected';
    lastUpdated?: Date | null;
    error?: string | null;
    onRetry?: () => void;
    showTimestamp?: boolean;
    compact?: boolean;
  }

  let { 
    status = 'connecting', 
    lastUpdated = null,
    error = null,
    onRetry,
    showTimestamp = true,
    compact = false
  }: Props = $props();

  // Format relative time
  function getRelativeTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 10) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // Status configurations
  const statusConfig = {
    connecting: {
      icon: Loader2,
      label: 'Connecting...',
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/30',
      dotClass: 'bg-amber-500 animate-pulse',
      animate: true
    },
    connected: {
      icon: Wifi,
      label: 'Live',
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30',
      dotClass: 'bg-green-500',
      animate: false
    },
    error: {
      icon: AlertCircle,
      label: 'Error',
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/10',
      borderColor: 'border-rose-500/30',
      dotClass: 'bg-rose-500',
      animate: false
    },
    disconnected: {
      icon: WifiOff,
      label: 'Offline',
      color: 'text-gray-400',
      bgColor: 'bg-gray-500/10',
      borderColor: 'border-gray-500/30',
      dotClass: 'bg-gray-500',
      animate: false
    }
  };

  let config = $derived(statusConfig[status]);
  let IconComponent = $derived(config.icon);
</script>

<div 
  class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full {config.bgColor} {config.borderColor} border transition-all duration-300"
  class:compact
  role="status"
  aria-live="polite"
  aria-atomic="true"
>
  <!-- Status Dot -->
  <div class="relative flex items-center justify-center">
    <span 
      class="w-2 h-2 rounded-full {config.dotClass}"
      transition:scale={{ duration: 200, easing: quartOut }}
    ></span>
    {#if status === 'connecting'}
      <span class="absolute w-3 h-3 rounded-full bg-amber-500/30 animate-ping"></span>
    {/if}
  </div>

  <!-- Icon -->
  <IconComponent 
    class="w-3.5 h-3.5 {config.color} {config.animate ? 'animate-spin' : ''}" 
  />

  <!-- Label -->
  <span class="text-xs font-medium {config.color}">
    {config.label}
  </span>

  <!-- Timestamp -->
  {#if showTimestamp && lastUpdated && status === 'connected'}
    <span class="text-xs text-gray-500 border-l border-dark-600/50 pl-2 ml-1">
      {getRelativeTime(lastUpdated)}
    </span>
  {/if}

  <!-- Retry Button -->
  {#if status === 'error' && onRetry}
    <button
      type="button"
      onclick={onRetry}
      class="ml-1 p-1 rounded-full hover:bg-dark-600/50 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500/50"
      aria-label="Retry connection"
    >
      <RefreshCw class="w-3 h-3 text-rose-400" />
    </button>
  {/if}
</div>

<!-- Error Message -->
{#if status === 'error' && error}
  <div 
    class="mt-2 text-xs text-rose-400 flex items-start gap-1.5"
    transition:fade={{ duration: 200 }}
  >
    <AlertCircle class="w-3 h-3 mt-0.5 flex-shrink-0" />
    <span>{error}</span>
  </div>
{/if}

<style>
  .compact {
    @apply px-2 py-1;
  }
</style>