<script lang="ts">
  import type { Server } from '$lib/utils/types';
  import { Cpu, HardDrive, MemoryStick, Server as ServerIcon, Container, Layers, X } from 'lucide-svelte';
  import { createEventDispatcher } from 'svelte';
  
  let { server }: { server: Server } = $props();
  let activeStack = $state<string | null>(null);
  
  const dispatch = createEventDispatcher();
</script>

<div class="glass rounded-xl p-6 relative">
  <button 
    type="button"
    onclick={() => dispatch('close')}
    class="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
    aria-label="Close server details"
  >
    <X class="w-5 h-5" />
  </button>
  
  <!-- Server Header -->
  <div class="flex flex-col md:flex-row md:items-center justify-between mb-6 pb-6 border-b border-dark-600/30">
    <div>
      <h3 class="text-2xl font-bold text-white flex items-center">
        <ServerIcon class="w-6 h-6 text-cyan-400 mr-2" />
        {server.name}
      </h3>
      <p class="text-cyan-400 text-sm mt-1">{server.ip} • {server.role}</p>
    </div>
    <div class="mt-4 md:mt-0 flex items-center space-x-4">
      <span class="px-3 py-1 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-500/30">
        Online
      </span>
    </div>
  </div>
  
  <!-- Hardware Specs -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
    <div class="bg-dark-700/50 rounded-lg p-4 border border-dark-600/30">
      <div class="flex items-center space-x-3 mb-2">
        <Cpu class="w-5 h-5 text-cyan-400" />
        <span class="text-sm text-gray-400">CPU</span>
      </div>
      <p class="text-white font-medium">{server.hardware.cpu}</p>
      <p class="text-xs text-gray-500 mt-1">{server.hardware.cores}C / {server.hardware.threads}T</p>
    </div>
    
    <div class="bg-dark-700/50 rounded-lg p-4 border border-dark-600/30">
      <div class="flex items-center space-x-3 mb-2">
        <MemoryStick class="w-5 h-5 text-teal-400" />
        <span class="text-sm text-gray-400">Memory</span>
      </div>
      <p class="text-white font-medium">{server.hardware.memory}</p>
      <p class="text-xs text-gray-500 mt-1">DDR4</p>
    </div>
    
    <div class="bg-dark-700/50 rounded-lg p-4 border border-dark-600/30">
      <div class="flex items-center space-x-3 mb-2">
        <Layers class="w-5 h-5 text-cyan-400" />
        <span class="text-sm text-gray-400">Software</span>
      </div>
      <p class="text-white font-medium">{server.software.os}</p>
      <p class="text-xs text-gray-500 mt-1">Docker {server.software.docker}</p>
    </div>
  </div>
  
  <!-- Storage -->
  <div class="mb-8">
    <h4 class="text-lg font-semibold text-white mb-4 flex items-center">
      <HardDrive class="w-5 h-5 text-teal-400 mr-2" />
      Storage Configuration
    </h4>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
      {#each server.hardware.storage as drive}
        <div class="bg-dark-700/50 rounded-lg p-3 border border-dark-600/30 text-center">
          <div class="text-lg font-bold text-white">{drive.size}</div>
          <div class="text-xs text-gray-400">{drive.device}</div>
          <div class="text-xs text-cyan-400">{drive.type}</div>
        </div>
      {/each}
    </div>
    {#if server.software.storageStrategy}
      <p class="text-sm text-gray-400 mt-3">
        <span class="text-teal-400">Strategy:</span> {server.software.storageStrategy}
      </p>
    {/if}
  </div>
  
  <!-- Service Stacks -->
  <div>
    <h4 class="text-lg font-semibold text-white mb-4 flex items-center">
      <Container class="w-5 h-5 text-cyan-400 mr-2" />
      Service Stacks
    </h4>
    
    <div class="space-y-4">
      {#each server.stacks as stack}
        <div class="bg-dark-700/30 rounded-lg overflow-hidden border border-dark-600/30">
          <button
            type="button"
            onclick={() => activeStack = activeStack === stack.name ? null : stack.name}
            class="w-full px-4 py-3 flex items-center justify-between hover:bg-dark-600/30 transition-colors"
            aria-expanded={activeStack === stack.name}
          >
            <span class="font-medium text-white">{stack.name}</span>
            <span class="text-sm text-gray-500">{stack.services.length} services</span>
          </button>
          
          {#if activeStack === stack.name}
            <div class="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 animate-fade-in">
              {#each stack.services as service}
                <div class="bg-dark-800/50 rounded-lg p-3 border border-dark-600/30 hover:border-cyan-500/30 transition-colors">
                  <div class="flex items-center space-x-2 mb-1">
                    <div class="w-2 h-2 rounded-full bg-green-500"></div>
                    <span class="font-medium text-white text-sm">{service.name}</span>
                  </div>
                  <p class="text-xs text-gray-500">{service.description}</p>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </div>
</div>
