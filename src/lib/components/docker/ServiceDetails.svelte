<script lang="ts">
  import { onMount } from 'svelte';
  import { 
    Layers, 
    ArrowLeft, 
    Server, 
    Clock, 
    RefreshCw, 
    AlertCircle,
    CheckCircle,
    XCircle,
    Globe,
    HardDrive,
    Cpu,
    Terminal
  } from 'lucide-svelte';

  interface Task {
    id: string;
    state: string;
    desiredState: string;
    nodeId?: string;
    timestamp: string;
    message?: string;
    error?: string;
  }

  interface Service {
    id: string;
    fullId?: string;
    name: string;
    version: number;
    createdAt: string;
    updatedAt: string;
    image: string;
    command?: string[];
    args?: string[];
    env?: string[];
    labels: Record<string, string>;
    replicas: {
      desired: number;
      running: number;
      pending: number;
    };
    resources: {
      limits: {
        cpus: string;
        memory: string;
      } | null;
      reservations: {
        cpus: string;
        memory: string;
      } | null;
    };
    networks: string[];
    ports: Array<{
      name?: string;
      protocol?: string;
      target?: number;
      published?: number;
      mode?: string;
    }>;
    placement: {
      constraints: string[];
      preferences: any[];
    };
    updateStatus: {
      state: string;
      startedAt?: string;
      completedAt?: string;
      message?: string;
    } | null;
    status: {
      health: string;
      message: string;
    };
    tasks?: Task[];
  }

  export let serviceId: string;
  export let onBack: () => void;

  let service: Service | null = null;
  let loading = false;
  let error: string | null = null;

  async function fetchServiceDetails() {
    loading = true;
    error = null;

    try {
      const response = await fetch(`/api/docker/services?includeTasks=true`);
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to fetch service details');
      }

      const data = await response.json();
      const foundService = data.services?.find((s: Service) => 
        s.id === serviceId || s.fullId === serviceId
      );

      if (!foundService) {
        throw new Error('Service not found');
      }

      service = foundService;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error fetching service details:', err);
    } finally {
      loading = false;
    }
  }

  function getTaskStateColor(state: string): string {
    switch (state) {
      case 'running': return 'text-green-600';
      case 'complete': return 'text-blue-600';
      case 'failed': return 'text-red-600';
      case 'pending': return 'text-yellow-600';
      case 'assigned': return 'text-purple-600';
      case 'accepted': return 'text-indigo-600';
      case 'preparing': return 'text-orange-600';
      case 'starting': return 'text-cyan-600';
      case 'shutdown': return 'text-gray-600';
      default: return 'text-gray-500';
    }
  }

  function getTaskIcon(state: string) {
    switch (state) {
      case 'running': return CheckCircle;
      case 'failed': return XCircle;
      case 'pending': return Clock;
      default: return Server;
    }
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString();
  }

  onMount(() => {
    fetchServiceDetails();
  });
</script>

<div class="service-details bg-white rounded-lg shadow-md">
  <!-- Header -->
  <div class="p-4 border-b border-gray-200">
    <div class="flex items-center justify-between">
      <button
        on:click={onBack}
        class="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft class="w-5 h-5" />
        Back to Services
      </button>
      <button
        on:click={fetchServiceDetails}
        class="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        disabled={loading}
      >
          <RefreshCw class="w-4 h-4 {loading ? 'animate-spin' : ''}" />
      </button>
    </div>
  </div>

  {#if loading}
    <div class="p-8 text-center">
      <RefreshCw class="w-8 h-8 animate-spin mx-auto text-gray-400" />
      <p class="mt-4 text-gray-500">Loading service details...</p>
    </div>
  {:else if error}
    <div class="p-4 bg-red-50 border-l-4 border-red-500">
      <div class="flex items-center gap-2 text-red-700">
        <AlertCircle class="w-5 h-5" />
        <span>{error}</span>
      </div>
    </div>
  {:else if service}
    <!-- Service Header -->
    <div class="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-200">
      <div class="flex items-start justify-between">
        <div>
          <div class="flex items-center gap-3 mb-2">
            <Layers class="w-8 h-8 text-indigo-600" />
            <h1 class="text-2xl font-bold text-gray-900">{service.name}</h1>
          </div>
          <p class="text-sm text-gray-600 font-mono">{service.id}</p>
        </div>
        <div class="text-right">
          <span class="px-3 py-1 rounded-full text-sm font-medium
            {service.status.health === 'healthy' ? 'bg-green-100 text-green-800' : 
             service.status.health === 'degraded' ? 'bg-yellow-100 text-yellow-800' : 
             'bg-red-100 text-red-800'}">
            {service.status.health}
          </span>
          <p class="text-sm text-gray-500 mt-1">{service.status.message}</p>
        </div>
      </div>
    </div>

    <div class="p-4 space-y-6">
      <!-- Image & Command -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 class="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Terminal class="w-4 h-4" />
            Image
          </h3>
          <p class="text-sm font-mono bg-gray-50 p-3 rounded break-all">
            {service.image}
          </p>
        </div>
        {#if service.command}
          <div>
            <h3 class="text-sm font-medium text-gray-700 mb-2">Command</h3>
            <p class="text-sm font-mono bg-gray-50 p-3 rounded">
              {service.command.join(' ')}
            </p>
          </div>
        {/if}
      </div>

      <!-- Replicas Status -->
      <div class="bg-gray-50 p-4 rounded-lg">
        <h3 class="text-sm font-medium text-gray-700 mb-3">Replica Status</h3>
        <div class="grid grid-cols-3 gap-4 text-center">
          <div>
            <div class="text-2xl font-bold text-gray-900">{service.replicas.desired}</div>
            <div class="text-sm text-gray-600">Desired</div>
          </div>
          <div>
            <div class="text-2xl font-bold text-green-600">{service.replicas.running}</div>
            <div class="text-sm text-gray-600">Running</div>
          </div>
          <div>
            <div class="text-2xl font-bold {service.replicas.pending > 0 ? 'text-yellow-600' : 'text-gray-400'}">
              {service.replicas.pending}
            </div>
            <div class="text-sm text-gray-600">Pending</div>
          </div>
        </div>
        
        <!-- Replica Progress Bar -->
        {#if service.replicas.desired > 0}
          <div class="mt-4">
            <div class="w-full bg-gray-200 rounded-full h-3">
              <div 
                class="h-3 rounded-full transition-all duration-500
                  {service.replicas.running === service.replicas.desired ? 'bg-green-500' : 
                   service.replicas.running > 0 ? 'bg-yellow-500' : 'bg-red-500'}"
                style="width: {(service.replicas.running / service.replicas.desired) * 100}%"
              />
            </div>
          </div>
        {/if}
      </div>

      <!-- Resources -->
      {#if service.resources.limits || service.resources.reservations}
        <div>
          <h3 class="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <Cpu class="w-4 h-4" />
            Resources
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            {#if service.resources.limits}
              <div class="border border-gray-200 rounded-lg p-3">
                <h4 class="text-sm font-medium text-gray-600 mb-2">Limits</h4>
                <div class="space-y-1 text-sm">
                  <p class="flex items-center gap-2">
                    <Cpu class="w-3 h-3 text-gray-400" />
                    {service.resources.limits.cpus}
                  </p>
                  <p class="flex items-center gap-2">
                    <HardDrive class="w-3 h-3 text-gray-400" />
                    {service.resources.limits.memory}
                  </p>
                </div>
              </div>
            {/if}
            {#if service.resources.reservations}
              <div class="border border-gray-200 rounded-lg p-3">
                <h4 class="text-sm font-medium text-gray-600 mb-2">Reservations</h4>
                <div class="space-y-1 text-sm">
                  <p class="flex items-center gap-2">
                    <Cpu class="w-3 h-3 text-gray-400" />
                    {service.resources.reservations.cpus}
                  </p>
                  <p class="flex items-center gap-2">
                    <HardDrive class="w-3 h-3 text-gray-400" />
                    {service.resources.reservations.memory}
                  </p>
                </div>
              </div>
            {/if}
          </div>
        </div>
      {/if}

      <!-- Ports -->
      {#if service.ports.length > 0}
        <div>
          <h3 class="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <Globe class="w-4 h-4" />
            Ports
          </h3>
          <div class="flex flex-wrap gap-2">
            {#each service.ports as port}
              <div class="border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <span class="font-medium">{port.published || '*'}</span>
                <span class="text-gray-400">:</span>
                <span>{port.target}</span>
                <span class="text-gray-400">/{port.protocol || 'tcp'}</span>
                {#if port.name}
                  <span class="text-gray-500 ml-2">({port.name})</span>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Placement -->
      {#if service.placement.constraints.length > 0 || service.placement.preferences.length > 0}
        <div>
          <h3 class="text-sm font-medium text-gray-700 mb-3">Placement</h3>
          {#if service.placement.constraints.length > 0}
            <div class="mb-2">
              <h4 class="text-xs text-gray-600 mb-1">Constraints</h4>
              <div class="flex flex-wrap gap-2">
                {#each service.placement.constraints as constraint}
                  <span class="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                    {constraint}
                  </span>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      {/if}

      <!-- Update Status -->
      {#if service.updateStatus}
        <div>
          <h3 class="text-sm font-medium text-gray-700 mb-3">Update Status</h3>
          <div class="border border-gray-200 rounded-lg p-3">
            <div class="flex items-center gap-2 mb-2">
              {#if service.updateStatus.state === 'completed'}
                <CheckCircle class="w-4 h-4 text-green-500" />
              {:else if service.updateStatus.state === 'updating'}
                <RefreshCw class="w-4 h-4 text-blue-500 animate-spin" />
              {:else if service.updateStatus.state === 'paused'}
                <Clock class="w-4 h-4 text-yellow-500" />
              {:else}
                <AlertCircle class="w-4 h-4 text-red-500" />
              {/if}
              <span class="font-medium capitalize">{service.updateStatus.state}</span>
            </div>
            {#if service.updateStatus.startedAt}
              <p class="text-sm text-gray-600">
                Started: {formatDate(service.updateStatus.startedAt)}
              </p>
            {/if}
            {#if service.updateStatus.completedAt}
              <p class="text-sm text-gray-600">
                Completed: {formatDate(service.updateStatus.completedAt)}
              </p>
            {/if}
            {#if service.updateStatus.message}
              <p class="text-sm text-gray-600 mt-1">
                {service.updateStatus.message}
              </p>
            {/if}
          </div>
        </div>
      {/if}

      <!-- Labels -->
      {#if Object.keys(service.labels).length > 0}
        <div>
          <h3 class="text-sm font-medium text-gray-700 mb-3">Labels</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
            {#each Object.entries(service.labels) as [key, value]}
              <div class="text-sm">
                <span class="font-medium text-gray-600">{key}:</span>
                <span class="text-gray-800">{value}</span>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Tasks -->
      {#if service.tasks && service.tasks.length > 0}
        <div>
          <h3 class="text-sm font-medium text-gray-700 mb-3">Tasks ({service.tasks.length})</h3>
          <div class="space-y-2 max-h-64 overflow-y-auto">
            {#each service.tasks as task (task.id)}
              <div class="border border-gray-200 rounded-lg p-3 flex items-center gap-3">
                <svelte:component 
                  this={getTaskIcon(task.state)} 
                  class="w-5 h-5 {getTaskStateColor(task.state)}" 
                />
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="font-mono text-sm">{task.id}</span>
                    <span class="text-xs px-2 py-0.5 bg-gray-100 rounded capitalize {getTaskStateColor(task.state)}">
                      {task.state}
                    </span>
                  </div>
                  <p class="text-xs text-gray-500">
                    {formatDate(task.timestamp)}
                    {#if task.nodeId}
                      · Node: {task.nodeId.substring(0, 12)}
                    {/if}
                  </p>
                  {#if task.error}
                    <p class="text-xs text-red-600 mt-1">{task.error}</p>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>
