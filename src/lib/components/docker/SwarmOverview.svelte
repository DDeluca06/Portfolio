<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { 
    Server, 
    Layers, 
    Activity, 
    AlertCircle, 
    CheckCircle, 
    XCircle,
    RefreshCw,
    Network,
    Cpu,
    HardDrive
  } from 'lucide-svelte';

  interface Node {
    id: string;
    hostname: string;
    name: string;
    role: 'manager' | 'worker';
    availability: 'active' | 'pause' | 'drain';
    isManager: boolean;
    isLeader: boolean;
    status: {
      state: string;
      address?: string;
    };
    platform: {
      architecture: string;
      os: string;
    };
    resources: {
      cpus: string;
      memory: string;
    };
    engine: {
      version: string;
    };
    health: {
      status: string;
      reachable: boolean;
    };
  }

  interface Service {
    id: string;
    name: string;
    image: string;
    replicas: {
      desired: number;
      running: number;
      pending: number;
    };
    status: {
      health: string;
      message: string;
    };
  }

  const DEFAULT_REFRESH_INTERVAL = parseInt(import.meta.env.REFRESH_INTERVAL || '30000', 10);
  export let refreshInterval: number = DEFAULT_REFRESH_INTERVAL;

  let nodes: Node[] = [];
  let services: Service[] = [];
  let swarmMode = false;
  let loading = false;
  let error: string | null = null;
  let summary = {
    total: 0,
    managers: 0,
    workers: 0,
    healthy: 0,
    leader: null as string | null
  };
  let refreshTimer: ReturnType<typeof setInterval>;

  async function fetchData() {
    if (loading) return;
    loading = true;
    error = null;

    try {
      // Fetch nodes
      const nodesResponse = await fetch('/api/docker/nodes');
      if (!nodesResponse.ok) {
        const data = await nodesResponse.json();
        throw new Error(data.message || 'Failed to fetch nodes');
      }
      
      const nodesData = await nodesResponse.json();
      swarmMode = nodesData.swarmMode;
      nodes = nodesData.nodes || [];
      summary = nodesData.summary;

      // Fetch services
      if (swarmMode) {
        const servicesResponse = await fetch('/api/docker/services');
        if (servicesResponse.ok) {
          const servicesData = await servicesResponse.json();
          services = servicesData.services || [];
        }
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error fetching Swarm data:', err);
    } finally {
      loading = false;
    }
  }

  function getNodeIcon(role: string, isLeader: boolean) {
    if (role === 'manager') {
      return isLeader ? Server : Layers;
    }
    return Activity;
  }

  function getNodeColor(role: string, isLeader: boolean, health: string) {
    if (health !== 'healthy') return 'text-red-500';
    if (isLeader) return 'text-purple-600';
    if (role === 'manager') return 'text-blue-600';
    return 'text-green-600';
  }

  function getServiceHealthColor(health: string) {
    switch (health) {
      case 'healthy': return 'bg-green-100 text-green-800';
      case 'degraded': return 'bg-yellow-100 text-yellow-800';
      case 'unhealthy': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  function getReplicaBarColor(running: number, desired: number) {
    if (desired === 0) return 'bg-gray-300';
    const ratio = running / desired;
    if (ratio === 1) return 'bg-green-500';
    if (ratio >= 0.5) return 'bg-yellow-500';
    return 'bg-red-500';
  }

  onMount(() => {
    fetchData();
    refreshTimer = setInterval(fetchData, refreshInterval);
  });

  onDestroy(() => {
    clearInterval(refreshTimer);
  });
</script>

<div class="swarm-overview bg-white rounded-lg shadow-md">
  <!-- Header -->
  <div class="p-4 border-b border-gray-200">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-bold flex items-center gap-2">
        <Network class="w-6 h-6 text-indigo-600" />
        Swarm Overview
        {#if loading}
          <RefreshCw class="w-4 h-4 animate-spin" />
        {/if}
      </h2>
      <div class="flex items-center gap-2">
        {#if swarmMode}
          <span class="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium">
            Active
          </span>
        {:else}
          <span class="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
            Not in Swarm Mode
          </span>
        {/if}
        <button
          on:click={fetchData}
          class="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <RefreshCw class="w-4 h-4 {loading ? 'animate-spin' : ''}" />
        </button>
      </div>
    </div>
  </div>

  {#if error}
    <div class="p-4 bg-red-50 border-l-4 border-red-500">
      <div class="flex items-center gap-2 text-red-700">
        <AlertCircle class="w-5 h-5" />
        <span>{error}</span>
      </div>
    </div>
  {/if}

  {#if !swarmMode && !loading}
    <div class="p-8 text-center text-gray-500">
      <Server class="w-16 h-16 mx-auto mb-4 opacity-30" />
      <h3 class="text-lg font-medium mb-2">Swarm Mode Not Enabled</h3>
      <p class="text-sm max-w-md mx-auto">
        This Docker host is not running in Swarm mode. Initialize a Swarm to see node topology and service information.
      </p>
    </div>
  {:else if swarmMode}
    <!-- Summary Cards -->
    <div class="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="bg-blue-50 p-4 rounded-lg">
        <div class="text-2xl font-bold text-blue-700">{summary.total}</div>
        <div class="text-sm text-blue-600">Total Nodes</div>
      </div>
      <div class="bg-purple-50 p-4 rounded-lg">
        <div class="text-2xl font-bold text-purple-700">{summary.managers}</div>
        <div class="text-sm text-purple-600">Managers</div>
      </div>
      <div class="bg-green-50 p-4 rounded-lg">
        <div class="text-2xl font-bold text-green-700">{summary.workers}</div>
        <div class="text-sm text-green-600">Workers</div>
      </div>
      <div class="bg-emerald-50 p-4 rounded-lg">
        <div class="text-2xl font-bold text-emerald-700">{summary.healthy}</div>
        <div class="text-sm text-emerald-600">Healthy</div>
      </div>
    </div>

    <!-- Nodes Topology -->
    <div class="p-4 border-t border-gray-200">
      <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
        <Server class="w-5 h-5" />
        Node Topology
      </h3>
      
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {#each nodes as node (node.id)}
          <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow
            {node.health.status !== 'healthy' ? 'border-red-300 bg-red-50' : node.isLeader ? 'border-purple-300 bg-purple-50' : ''}">
            <div class="flex items-start gap-3">
              <div class="mt-1">
                <svelte:component 
                  this={getNodeIcon(node.role, node.isLeader)} 
                  class="w-8 h-8 {getNodeColor(node.role, node.isLeader, node.health.status)}" 
                />
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <h4 class="font-semibold text-gray-900 truncate">{node.hostname}</h4>
                  {#if node.isLeader}
                    <span class="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                      Leader
                    </span>
                  {/if}
                </div>
                <div class="text-sm text-gray-600 mt-1 space-y-1">
                  <p class="flex items-center gap-2">
                    <span class="capitalize font-medium">{node.role}</span>
                    <span class="text-gray-400">|</span>
                    <span class="capitalize">{node.availability}</span>
                  </p>
                  <p class="flex items-center gap-2">
                    <Cpu class="w-3 h-3" />
                    {node.resources.cpus}
                  </p>
                  <p class="flex items-center gap-2">
                    <HardDrive class="w-3 h-3" />
                    {node.resources.memory}
                  </p>
                </div>
                <div class="mt-2 flex items-center gap-2">
                  {#if node.health.status === 'healthy'}
                    <CheckCircle class="w-4 h-4 text-green-500" />
                    <span class="text-sm text-green-600">Healthy</span>
                  {:else}
                    <XCircle class="w-4 h-4 text-red-500" />
                    <span class="text-sm text-red-600">{node.status.state}</span>
                  {/if}
                  {#if node.status.address}
                    <span class="text-xs text-gray-400">({node.status.address})</span>
                  {/if}
                </div>
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>

    <!-- Services -->
    {#if services.length > 0}
      <div class="p-4 border-t border-gray-200">
        <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
          <Layers class="w-5 h-5" />
          Services ({services.length})
        </h3>
        
        <div class="space-y-3">
          {#each services as service (service.id)}
            <div class="border border-gray-200 rounded-lg p-4">
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-3">
                  <h4 class="font-semibold text-gray-900">{service.name}</h4>
                  <span class="px-2 py-0.5 text-xs rounded-full {getServiceHealthColor(service.status.health)}">
                    {service.status.health}
                  </span>
                </div>
                <div class="text-sm text-gray-600">
                  {service.replicas.running}/{service.replicas.desired} replicas
                </div>
              </div>
              
              <p class="text-sm text-gray-500 mb-2 truncate">
                {service.image}
              </p>
              
              <!-- Replica Bar -->
              {#if service.replicas.desired > 0}
                <div class="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    class="h-2 rounded-full transition-all duration-300 {getReplicaBarColor(service.replicas.running, service.replicas.desired)}"
                    style="width: {(service.replicas.running / service.replicas.desired) * 100}%"
                  />
                </div>
              {/if}
              
              {#if service.replicas.pending > 0}
                <p class="text-xs text-yellow-600 mt-1">
                  {service.replicas.pending} replica{service.replicas.pending === 1 ? '' : 's'} pending
                </p>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/if}
  {/if}
</div>
