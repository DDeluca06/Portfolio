<script lang="ts">
  import { homelabData } from '$lib/data/homelabData';
  import ServerCard from './ServerCard.svelte';
  import { RealTimeStats } from './stats';
  import { ContainerList, SwarmOverview } from './docker';
  import { Server, Network, Database, Activity, BarChart3, Box, Layers } from 'lucide-svelte';
  
  let activeServer = $state<string | null>(null);
  let activeTab = $state<'overview' | 'containers' | 'swarm'>('overview');
</script>

<section id="homelab" class="py-20 px-4 sm:px-6 lg:px-8">
  <div class="max-w-6xl mx-auto">
    <div class="text-center mb-12">
      <h2 class="text-3xl sm:text-4xl font-bold text-white mb-4">Homelab Infrastructure</h2>
      <p class="text-gray-400 max-w-2xl mx-auto">
        A production-grade self-hosted environment showcasing enterprise-level infrastructure skills
      </p>
    </div>
    
    <!-- Stats Overview -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
      <div class="glass rounded-xl p-6 text-center hover-glow">
        <Server class="w-8 h-8 text-cyan-400 mx-auto mb-2" />
        <div class="text-3xl font-bold text-white">{homelabData.overview.servers}</div>
        <div class="text-sm text-gray-400">Docker Swarm Nodes</div>
      </div>
      <div class="glass rounded-xl p-6 text-center hover-glow">
        <Activity class="w-8 h-8 text-teal-400 mx-auto mb-2" />
        <div class="text-3xl font-bold text-white">{homelabData.overview.totalServices}+</div>
        <div class="text-sm text-gray-400">Active Services</div>
      </div>
      <div class="glass rounded-xl p-6 text-center hover-glow">
        <Database class="w-8 h-8 text-cyan-400 mx-auto mb-2" />
        <div class="text-3xl font-bold text-white">{homelabData.overview.effectiveStorage}</div>
        <div class="text-sm text-gray-400">Storage Pool</div>
      </div>
      <div class="glass rounded-xl p-6 text-center hover-glow">
        <Network class="w-8 h-8 text-teal-400 mx-auto mb-2" />
        <div class="text-3xl font-bold text-white">{homelabData.overview.networks}</div>
        <div class="text-sm text-gray-400">Overlay Networks</div>
      </div>
    </div>
    
    <!-- Architecture Overview -->
    <div class="glass rounded-xl p-6 mb-8">
      <h3 class="text-xl font-bold text-white mb-6">Network Architecture</h3>
      
      <div class="flex flex-col md:flex-row items-center justify-center gap-8">
        <!-- Internet -->
        <div class="flex flex-col items-center">
          <div class="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
            <span class="text-white font-bold text-xs">WAN</span>
          </div>
          <span class="text-xs text-gray-400 mt-2">Internet</span>
        </div>
        
        <!-- Arrow -->
        <div class="hidden md:block w-16 h-0.5 bg-gradient-to-r from-blue-500 to-teal-500"></div>
        
        <!-- Cloudflare -->
        <div class="flex flex-col items-center">
          <div class="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg">
            <span class="text-white font-bold text-xs">CF</span>
          </div>
          <span class="text-xs text-gray-400 mt-2">Cloudflare</span>
        </div>
        
        <!-- Arrow -->
        <div class="hidden md:block w-16 h-0.5 bg-gradient-to-r from-orange-500 to-cyan-500"></div>
        
        <!-- Edge Server -->
        <button
          type="button"
          class="flex flex-col items-center"
          onclick={() => activeServer = activeServer === 'eserver' ? null : 'eserver'}
          aria-pressed={activeServer === 'eserver'}
        >
          <div class="w-20 h-20 rounded-xl bg-gradient-to-br from-cyan-600 to-cyan-700 flex items-center justify-center shadow-lg hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] transition-all {activeServer === 'eserver' ? 'ring-2 ring-cyan-400' : ''}">
            <Server class="w-10 h-10 text-white" />
          </div>
          <span class="text-xs text-gray-400 mt-2">eserver (Edge)</span>
          <span class="text-xs text-cyan-400">192.168.50.122</span>
        </button>
        
        <!-- Arrow -->
        <div class="hidden md:block w-16 h-0.5 bg-gradient-to-r from-cyan-500 to-teal-500"></div>
        
        <!-- Storage Server -->
        <button
          type="button"
          class="flex flex-col items-center"
          onclick={() => activeServer = activeServer === 'server' ? null : 'server'}
          aria-pressed={activeServer === 'server'}
        >
          <div class="w-20 h-20 rounded-xl bg-gradient-to-br from-teal-600 to-teal-700 flex items-center justify-center shadow-lg hover:shadow-[0_0_30px_rgba(45,212,191,0.4)] transition-all {activeServer === 'server' ? 'ring-2 ring-teal-400' : ''}">
            <Database class="w-10 h-10 text-white" />
          </div>
          <span class="text-xs text-gray-400 mt-2">server (Storage)</span>
          <span class="text-xs text-teal-400">192.168.50.115</span>
        </button>
      </div>
      
      <!-- Network Legend -->
      <div class="mt-8 flex flex-wrap justify-center gap-4 text-xs">
        {#each homelabData.networks as network}
          <div class="flex items-center space-x-2 px-3 py-1 bg-dark-700/50 rounded-full">
            <div class="w-2 h-2 rounded-full bg-cyan-500"></div>
            <span class="text-gray-300">{network.name}</span>
            <span class="text-gray-500">({network.type})</span>
          </div>
        {/each}
      </div>
    </div>
    
    <!-- Server Details -->
    {#if activeServer}
      <div class="animate-fade-in">
        {#each homelabData.servers as server}
          {#if server.id === activeServer}
            <ServerCard {server} />
          {/if}
        {/each}
      </div>
    {:else}
      <div class="text-center py-12 text-gray-500">
        <p>Click on a server node above to view detailed configuration</p>
      </div>
    {/if}

    <!-- Real-Time Stats Section -->
    <div class="mt-16">
      <RealTimeStats expanded={true} />
    </div>

    <!-- Docker Dashboard Section -->
    <div class="mt-16">
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
          <div class="p-2 rounded-lg bg-teal-500/10">
            <Box class="w-6 h-6 text-teal-400" />
          </div>
          <div>
            <h2 class="text-2xl font-bold text-white">Docker Dashboard</h2>
            <p class="text-sm text-gray-400">Container and Swarm monitoring</p>
          </div>
        </div>

        <!-- Tab Navigation -->
        <div class="flex items-center gap-2 bg-dark-800/50 rounded-lg p-1">
          <button
            type="button"
            onclick={() => activeTab = 'overview'}
            class="px-4 py-2 rounded-md text-sm font-medium transition-all {activeTab === 'overview' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400 hover:text-white'}"
          >
            <BarChart3 class="w-4 h-4 inline mr-2" />
            Overview
          </button>
          <button
            type="button"
            onclick={() => activeTab = 'containers'}
            class="px-4 py-2 rounded-md text-sm font-medium transition-all {activeTab === 'containers' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400 hover:text-white'}"
          >
            <Box class="w-4 h-4 inline mr-2" />
            Containers
          </button>
          <button
            type="button"
            onclick={() => activeTab = 'swarm'}
            class="px-4 py-2 rounded-md text-sm font-medium transition-all {activeTab === 'swarm' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400 hover:text-white'}"
          >
            <Layers class="w-4 h-4 inline mr-2" />
            Swarm
          </button>
        </div>
      </div>

      <!-- Tab Content -->
      <div class="glass rounded-xl p-6">
        {#if activeTab === 'overview'}
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Box class="w-5 h-5 text-cyan-400" />
                Active Containers
              </h3>
              <ContainerList refreshInterval={30000} showFilters={true} maxHeight="400px" />
            </div>
            <div>
              <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Layers class="w-5 h-5 text-teal-400" />
                Swarm Status
              </h3>
              <SwarmOverview refreshInterval={30000} />
            </div>
          </div>
        {:else if activeTab === 'containers'}
          <ContainerList refreshInterval={30000} showFilters={true} maxHeight="600px" />
        {:else if activeTab === 'swarm'}
          <SwarmOverview refreshInterval={30000} />
        {/if}
      </div>
    </div>
  </div>
</section>
