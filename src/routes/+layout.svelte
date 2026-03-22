<script lang="ts">
  import '../app.css';
  import Navigation from '$lib/components/Navigation.svelte';
  import Footer from '$lib/components/Footer.svelte';
  import NetworkBackground from '$lib/components/NetworkBackground.svelte';
  import Terminal from '$lib/components/Terminal.svelte';
</script>

<NetworkBackground />

<div class="relative z-10 min-h-screen flex flex-col">
  <Navigation />
  
  <main class="flex-1">
    <slot />
  </main>
  
  <Footer />
</div>

<Terminal />
