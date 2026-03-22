<script lang="ts">
  import { Menu, X, Terminal, Github, Linkedin } from 'lucide-svelte';
  
  let isMenuOpen = $state(false);
  let isScrolled = $state(false);
  
  const navItems = [
    { label: 'About', href: '#about' },
    { label: 'Skills', href: '#skills' },
    { label: 'Experience', href: '#experience' },
    { label: 'Homelab', href: '#homelab' },
    { label: 'Contact', href: '#contact' }
  ];
  
  function handleScroll() {
    isScrolled = window.scrollY > 50;
  }
  
  function scrollToSection(href: string) {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    isMenuOpen = false;
  }
</script>

<svelte:window onscroll={handleScroll} />

<nav class="fixed top-0 left-0 right-0 z-50 transition-all duration-300 {isScrolled ? 'glass py-3' : 'bg-transparent py-5'}">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex items-center justify-between">
      <!-- Logo -->
      <button 
        onclick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        class="text-xl font-bold text-gradient cursor-pointer"
      >
        DDL
      </button>
      
      <!-- Desktop Navigation -->
      <div class="hidden md:flex items-center space-x-8">
        {#each navItems as item}
          <button
            onclick={() => scrollToSection(item.href)}
            class="text-sm text-gray-400 hover:text-cyan-400 transition-colors cursor-pointer"
          >
            {item.label}
          </button>
        {/each}
        
        <a
          href="https://github.com/DDeluca06"
          target="_blank"
          rel="noopener noreferrer"
          class="text-gray-400 hover:text-cyan-400 transition-colors"
        >
          <Github class="w-5 h-5" />
        </a>
        
        <a
          href="https://www.linkedin.com/in/demitri-deluca-lyons-747312319/"
          target="_blank"
          rel="noopener noreferrer"
          class="text-gray-400 hover:text-cyan-400 transition-colors"
        >
          <Linkedin class="w-5 h-5" />
        </a>
      </div>
      
      <!-- Mobile Menu Button -->
      <button
        onclick={() => isMenuOpen = !isMenuOpen}
        class="md:hidden text-gray-300 hover:text-white transition-colors"
      >
        {#if isMenuOpen}
          <X class="w-6 h-6" />
        {:else}
          <Menu class="w-6 h-6" />
        {/if}
      </button>
    </div>
    
    <!-- Mobile Menu -->
    {#if isMenuOpen}
      <div class="md:hidden mt-4 pb-4 border-t border-dark-600/50 pt-4 animate-fade-in">
        <div class="flex flex-col space-y-3">
          {#each navItems as item}
            <button
              onclick={() => scrollToSection(item.href)}
              class="text-left text-gray-400 hover:text-cyan-400 transition-colors py-2 cursor-pointer"
            >
              {item.label}
            </button>
          {/each}
          
          <div class="flex space-x-4 pt-2 border-t border-dark-600/30">
            <a
              href="https://github.com/DDeluca06"
              target="_blank"
              rel="noopener noreferrer"
              class="text-gray-400 hover:text-cyan-400 transition-colors"
            >
              <Github class="w-5 h-5" />
            </a>
            <a
              href="https://www.linkedin.com/in/demitri-deluca-lyons-747312319/"
              target="_blank"
              rel="noopener noreferrer"
              class="text-gray-400 hover:text-cyan-400 transition-colors"
            >
              <Linkedin class="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    {/if}
  </div>
</nav>
