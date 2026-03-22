<script lang="ts">
  import { onMount } from 'svelte';
  import { resumeData } from '$lib/data/resumeData';
  import { ChevronDown, Server, Cpu, Database } from 'lucide-svelte';
  
  let displayText = $state('');
  let fullText = resumeData.basics.name;
  let currentIndex = $state(0);
  let showCursor = $state(true);
  let isVisible = $state(false);
  
  onMount(() => {
    isVisible = true;
    
    // Typing animation
    const typeInterval = setInterval(() => {
      if (currentIndex < fullText.length) {
        displayText = fullText.slice(0, currentIndex + 1);
        currentIndex++;
      } else {
        clearInterval(typeInterval);
      }
    }, 100);
    
    // Cursor blink
    const cursorInterval = setInterval(() => {
      showCursor = !showCursor;
    }, 500);
    
    return () => {
      clearInterval(typeInterval);
      clearInterval(cursorInterval);
    };
  });
  
  function scrollToAbout() {
    document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' });
  }
</script>

<section class="relative min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 overflow-hidden">
  <div class="max-w-4xl mx-auto text-center z-10">
    <!-- Name with typing effect -->
    <div class="mb-6" class:opacity-0={!isVisible} class:animate-fade-in={isVisible}>
      <h1 class="text-4xl sm:text-6xl lg:text-7xl font-bold text-white mb-2 font-mono">
        {displayText}<span class="text-cyan-400" class:opacity-0={!showCursor}>|</span>
      </h1>
    </div>
    
    <!-- Headline -->
    <div 
      class="mb-8 opacity-0"
      class:opacity-100={currentIndex >= fullText.length}
      style="transition: opacity 0.5s ease-out 0.5s;"
    >
      <p class="text-xl sm:text-2xl lg:text-3xl text-gray-300 font-light">
        {resumeData.basics.headline}
      </p>
    </div>
    
    <!-- Quick Stats -->
    <div 
      class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10 opacity-0"
      class:opacity-100={currentIndex >= fullText.length}
      style="transition: opacity 0.5s ease-out 0.8s;"
    >
      <div class="glass rounded-lg p-4 hover-glow">
        <Server class="w-6 h-6 text-cyan-400 mx-auto mb-2" />
        <div class="text-2xl font-bold text-white">25+</div>
        <div class="text-xs text-gray-400">Self-hosted Services</div>
      </div>
      <div class="glass rounded-lg p-4 hover-glow">
        <Database class="w-6 h-6 text-teal-400 mx-auto mb-2" />
        <div class="text-2xl font-bold text-white">24TB</div>
        <div class="text-xs text-gray-400">Homelab Storage</div>
      </div>
      <div class="glass rounded-lg p-4 hover-glow">
        <Cpu class="w-6 h-6 text-cyan-400 mx-auto mb-2" />
        <div class="text-2xl font-bold text-white">2</div>
        <div class="text-xs text-gray-400">Docker Swarm Nodes</div>
      </div>
    </div>
    
    <!-- CTA Buttons -->
    <div 
      class="flex flex-col sm:flex-row gap-4 justify-center opacity-0"
      class:opacity-100={currentIndex >= fullText.length}
      style="transition: opacity 0.5s ease-out 1s;"
    >
      <button
        onclick={scrollToAbout}
        class="px-8 py-3 bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-medium rounded-lg hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] transition-all transform hover:scale-105"
      >
        Explore My Work
      </button>
      <a
        href="mailto:{resumeData.basics.email}"
        class="px-8 py-3 glass text-cyan-400 font-medium rounded-lg hover:border-cyan-500/50 hover:text-cyan-300 transition-all"
      >
        Get In Touch
      </a>
    </div>
  </div>
  
  <!-- Scroll indicator -->
  <div 
    class="absolute bottom-8 left-1/2 transform -translate-x-1/2 opacity-0"
    class:opacity-100={currentIndex >= fullText.length}
    style="transition: opacity 0.5s ease-out 1.2s;"
  >
    <button onclick={scrollToAbout} class="text-gray-500 hover:text-cyan-400 transition-colors animate-bounce">
      <ChevronDown class="w-8 h-8" />
    </button>
  </div>
</section>
