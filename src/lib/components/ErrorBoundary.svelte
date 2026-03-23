<script lang="ts">
  import { AlertTriangle, RefreshCw } from 'lucide-svelte';
  
  interface Props {
    componentName?: string;
    onReset?: () => void;
  }
  
  let { componentName = 'Component', onReset }: Props = $props();
  let error: Error | null = $state(null);
  
  export function handleError(err: unknown) {
    error = err instanceof Error ? err : new Error(String(err));
    console.error(`Error in ${componentName}:`, err);
  }
  
  function reset() {
    error = null;
    onReset?.();
  }
</script>

{#if error}
  <div class="error-boundary" role="alert">
    <AlertTriangle />
    <h3>{componentName} Error</h3>
    <p>{error.message}</p>
    <button onclick={reset}>Retry</button>
  </div>
{:else}
  <slot {handleError} />
{/if}
