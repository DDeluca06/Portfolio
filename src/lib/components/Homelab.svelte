<script lang="ts">
  import { homelabData } from '$lib/data/homelabData';
  import ServerCard from './ServerCard.svelte';
  import { Server, Network, Database, Activity } from 'lucide-svelte';
  
  let activeServer = $state<string | null>(null);
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
  </div>
</section>
