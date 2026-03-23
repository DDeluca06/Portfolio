<script lang="ts">
  import { Server, Cpu, HardDrive, MemoryStick, Activity, ChevronRight } from 'lucide-svelte';
  import { slide, fade } from 'svelte/transition';
  import { quartOut } from 'svelte/easing';
  import type { ServerInfo } from '$lib/api/statsClient';

  interface Props {
    servers: ServerInfo[];
    loading?: boolean;
    onServerClick?: (server: ServerInfo) => void;
    selectedServerId?: string | null;
  }

  let { 
    servers = [], 
    loading = false,
    onServerClick,
    selectedServerId = null
  }: Props = $props();

  // Get status color
  function getStatusColor(status: string): string {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'offline': return 'bg-red-500';
      case 'maintenance': return 'bg-amber-500';
      default: return 'bg-gray-500';
    }
  }

  // Get resource color based on usage
  function getResourceColor(usage: number): string {
    if (usage >= 90) return 'text-rose-400';
    if (usage >= 70) return 'text-amber-400';
    return 'text-cyan-400';
  }

  function getResourceBgColor(usage: number): string {
    if (usage >= 90) return 'bg-rose-500';
    if (usage >= 70) return 'bg-amber-500';
    return 'bg-cyan-500';
  }

  // Format bytes
  function formatBytes(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  // Format uptime
  function formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  }

  // Get server role badge
  function getRoleBadge(role: string): { text: string; color: string } {
    switch (role) {
      case 'manager': return { text: 'Manager', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' };
      case 'worker': return { text: 'Worker', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
      case 'edge': return { text: 'Edge', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' };
      case 'storage': return { text: 'Storage', color: 'bg-teal-500/20 text-teal-400 border-teal-500/30' };
      default: return { text: role, color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' };
    }
  }
</script>

<div class="server-grid" role="region" aria-label="Server status grid">
  {#if loading}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {#each Array(3) as _, i}
        <div class="glass rounded-xl p-4 animate-pulse" transition:fade={{ delay: i * 100 }}>
          <div class="h-6 w-32 bg-dark-700/50 rounded mb-4"></div>
          <div class="space-y-3">
            <div class="h-4 w-full bg-dark-700/50 rounded"></div>
            <div class="h-4 w-3/4 bg-dark-700/50 rounded"></div>
            <div class="h-8 w-full bg-dark-700/50 rounded"></div>
          </div>
        </div>
      {/each}
    </div>
  {:else if servers.length === 0}
    <div class="text-center py-12 text-gray-500" transition:fade>
      <Server class="w-12 h-12 mx-auto mb-4 opacity-50" />
      <p>No servers configured</p>
    </div>
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {#each servers as server, index (server.id)}
        {@const role = getRoleBadge(server.role)}
        <button
          type="button"
          class="glass rounded-xl p-4 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/50 group {selectedServerId === server.id ? 'ring-2 ring-cyan-500/50 border-cyan-500/50' : ''}"
          onclick={() => onServerClick?.(server)}
          transition:slide={{ delay: index * 50, duration: 300, easing: quartOut }}
          aria-pressed={selectedServerId === server.id}
        >
          <!-- Header -->
          <div class="flex items-start justify-between mb-4">
            <div class="flex items-center gap-3">
              <div class="relative">
                <div class="p-2 rounded-lg bg-dark-700/50">
                  <Server class="w-5 h-5 text-gray-400" />
                </div>
                <span 
                  class="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-dark-800 {getStatusColor(server.status)}"
                  title={server.status}
                ></span>
              </div>
              <div>
                <h3 class="font-semibold text-white">{server.name}</h3>
                <p class="text-xs text-gray-500 font-mono">{server.ip}</p>
              </div>
            </div>
            <span class="px-2 py-0.5 rounded-full text-xs border {role.color}">
              {role.text}
            </span>
          </div>

          <!-- Stats -->
          {#if server.stats}
            {@const cpu = server.stats.cpu.usage}
            {@const mem = parseFloat(server.stats.memory.usagePercent)}
            {@const disk = server.stats.disk[0]?.usagePercent || 0}
            
            <div class="space-y-3">
              <!-- CPU -->
              <div class="flex items-center gap-3">
                <Cpu class="w-4 h-4 text-gray-500" />
                <div class="flex-1">
                  <div class="flex items-center justify-between mb-1">
                    <span class="text-xs text-gray-400">CPU</span>
                    <span class="text-xs font-medium {getResourceColor(cpu)}">{cpu.toFixed(1)}%</span>
                  </div>
                  <div class="h-1.5 w-full bg-dark-700/50 rounded-full overflow-hidden">
                    <div 
                      class="h-full {getResourceBgColor(cpu)} rounded-full transition-all duration-500"
                      style="width: {cpu}%"
                    ></div>
                  </div>
                </div>
              </div>

              <!-- Memory -->
              <div class="flex items-center gap-3">
                <MemoryStick class="w-4 h-4 text-gray-500" />
                <div class="flex-1">
                  <div class="flex items-center justify-between mb-1">
                    <span class="text-xs text-gray-400">Memory</span>
                    <span class="text-xs font-medium {getResourceColor(mem)}">{mem.toFixed(1)}%</span>
                  </div>
                  <div class="h-1.5 w-full bg-dark-700/50 rounded-full overflow-hidden">
                    <div 
                      class="h-full {getResourceBgColor(mem)} rounded-full transition-all duration-500"
                      style="width: {mem}%"
                    ></div>
                  </div>
                </div>
              </div>

              <!-- Disk -->
              <div class="flex items-center gap-3">
                <HardDrive class="w-4 h-4 text-gray-500" />
                <div class="flex-1">
                  <div class="flex items-center justify-between mb-1">
                    <span class="text-xs text-gray-400">Disk</span>
                    <span class="text-xs font-medium {getResourceColor(disk)}">{disk.toFixed(1)}%</span>
                  </div>
                  <div class="h-1.5 w-full bg-dark-700/50 rounded-full overflow-hidden">
                    <div 
                      class="h-full {getResourceBgColor(disk)} rounded-full transition-all duration-500"
                      style="width: {disk}%"
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div class="mt-4 pt-3 border-t border-dark-600/30 flex items-center justify-between text-xs text-gray-500">
              <div class="flex items-center gap-1">
                <Activity class="w-3 h-3" />
                <span>Uptime: {formatUptime(server.stats.system.uptime)}</span>
              </div>
              <ChevronRight class="w-4 h-4 text-gray-600 group-hover:text-cyan-400 transition-colors" />
            </div>
          {:else}
            <div class="py-4 text-center text-xs text-gray-500">
              <Activity class="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No stats available</p>
            </div>
          {/if}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .glass {
    @apply bg-dark-800/80 backdrop-blur-xl border border-dark-600/50;
  }
</style>