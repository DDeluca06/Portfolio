<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import { browser } from '$app/environment';
  import { Terminal, X, Maximize2, Minimize2, Command } from 'lucide-svelte';
  
  let isOpen = $state(false);
  let isExpanded = $state(false);
  let command = $state('');
  let history = $state<{type: 'input' | 'output', content: string}[]>([
    { type: 'output', content: 'Welcome to the portfolio terminal!' },
    { type: 'output', content: 'Type "help" to see available commands.' },
    { type: 'output', content: '' }
  ]);
  let inputRef: HTMLInputElement | undefined = $state();
  let terminalRef: HTMLDivElement | undefined = $state();
  
  // Cleanup function for keyboard listener
  let keyboardCleanup: (() => void) | null = null;
  
  const commands: Record<string, { description: string; output: string }> = {
    help: {
      description: 'Show available commands',
      output: `Available commands:
  about      - Learn about me
  skills     - List technical skills
  experience - Show work history
  homelab    - View homelab stats
  contact    - Get contact information
  clear      - Clear terminal
  secret     - ???`
    },
    about: {
      description: 'About me',
      output: `Demitri DeLuca-Lyons
Software Engineer & Infrastructure Architect

Passionate about building scalable applications and 
robust infrastructure. Combining modern web development
with enterprise-grade homelab operations.

Location: Philadelphia, PA
Email: ddelucalyons@gmail.com`
    },
    skills: {
      description: 'Technical skills',
      output: `Development:
  - SvelteKit, Next.js, React, TypeScript
  - Python, Node.js, PostgreSQL
  - HTML5, CSS3, Tailwind CSS

Infrastructure:
  - Docker, Docker Swarm, Linux
  - Ubuntu/Debian, Windows Server
  - Cloudflare, Traefik, TCP/IP

AI & Automation:
  - OpenAI, Claude, Ollama
  - Prompt Engineering, n8n`
    },
    experience: {
      description: 'Work experience',
      output: `Current Positions:

1. Launchpad Philly - Associate
   Jan 2024 - Present
   - IT support for 30+ machines
   - OS imaging pipeline
   - LLM prototyping

2. Seer Interactive - AI & Innovation Intern
   Oct 2025 - Dec 2025
   - Google Cloud deployment
   - OpenAI integration`
    },
    homelab: {
      description: 'Homelab statistics',
      output: `Infrastructure Overview:
  Servers:    2 nodes (Docker Swarm)
  Services:   25+ containers
  Storage:    24TB raw (22TB effective)
  Uptime:     99.9%
  Networks:   6 overlay networks

Hardware:
  - server: Intel i7-7700, 15GB RAM, 24TB storage
  - eserver: Intel i5-9500T, 15GB RAM, 238GB NVMe`
    },
    contact: {
      description: 'Contact information',
      output: `Get in touch:

Email:    ddelucalyons@gmail.com
Phone:    (215) 645-2081
Location: Philadelphia, PA

LinkedIn: linkedin.com/in/demitri-deluca-lyons
GitHub:   github.com/DDeluca06`
    },
    secret: {
      description: 'Easter egg',
      output: `🎉 You found the secret command!

Here's a fun fact:
This portfolio is running on my homelab!
Built with SvelteKit 5, Tailwind CSS, and lots of ☕

Thanks for exploring! 🚀`
    },
    clear: {
      description: 'Clear terminal',
      output: ''
    }
  };
  
  function handleCommand() {
    const cmd = command.trim().toLowerCase();
    if (!cmd) return;
    
    const newHistory: typeof history = [
      ...history, 
      { type: 'input' as const, content: `> ${cmd}` }
    ];
    
    if (commands[cmd]) {
      if (cmd === 'clear') {
        newHistory.length = 0;
        newHistory.push(
          { type: 'output' as const, content: 'Terminal cleared.' },
          { type: 'output' as const, content: '' }
        );
      } else {
        const lines = commands[cmd].output.split('\n').map(line => ({
          type: 'output' as const,
          content: line
        }));
        newHistory.push(...lines);
      }
    } else {
      newHistory.push(
        { type: 'output' as const, content: `Command not found: ${cmd}` },
        { type: 'output' as const, content: 'Type "help" for available commands.' }
      );
    }
    
    newHistory.push({ type: 'output' as const, content: '' });
    history = newHistory;
    command = '';
    
    tick().then(() => {
      terminalRef?.scrollTo({ top: terminalRef.scrollHeight, behavior: 'smooth' });
    });
  }
  
  function toggleTerminal() {
    isOpen = !isOpen;
    if (isOpen) {
      tick().then(() => inputRef?.focus());
    }
  }
  
  onMount(() => {
    if (!browser) return;
    
    // Keyboard shortcut: Ctrl/Cmd + `
    const handleKeydown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '`') {
        e.preventDefault();
        toggleTerminal();
      }
    };
    
    window.addEventListener('keydown', handleKeydown);
    keyboardCleanup = () => window.removeEventListener('keydown', handleKeydown);
    
    return keyboardCleanup;
  });
  
  onDestroy(() => {
    keyboardCleanup?.();
  });
</script>

<!-- Terminal Toggle Button -->
<button
  type="button"
  onclick={toggleTerminal}
  class="fixed bottom-6 right-6 z-50 p-4 bg-dark-800 border border-cyan-500/30 rounded-full shadow-lg hover:shadow-[0_0_30px_rgba(34,211,238,0.3)] hover:border-cyan-500/50 transition-all group"
  title="Toggle Terminal (Ctrl+`)"
  aria-label="Toggle terminal"
>
  <Terminal class="w-6 h-6 text-cyan-400 group-hover:scale-110 transition-transform" aria-hidden="true" />
</button>

<!-- Terminal Window -->
{#if isOpen}
  <div 
    class="fixed z-50 bg-dark-900 border border-cyan-500/30 rounded-lg shadow-2xl overflow-hidden transition-all {isExpanded ? 'inset-4' : 'bottom-20 right-6 w-96 h-96'}"
    role="dialog"
    aria-label="Terminal"
  >
    <!-- Terminal Header -->
    <div class="flex items-center justify-between px-4 py-2 bg-dark-800 border-b border-dark-600/50">
      <div class="flex items-center space-x-2">
        <Command class="w-4 h-4 text-cyan-400" aria-hidden="true" />
        <span class="text-sm text-gray-300 font-mono">portfolio@homelab:~$</span>
      </div>
      <div class="flex items-center space-x-2">
        <button 
          type="button"
          onclick={() => isExpanded = !isExpanded}
          class="p-1 text-gray-500 hover:text-white transition-colors"
          aria-label={isExpanded ? 'Minimize terminal' : 'Maximize terminal'}
        >
          {#if isExpanded}
            <Minimize2 class="w-4 h-4" aria-hidden="true" />
          {:else}
            <Maximize2 class="w-4 h-4" aria-hidden="true" />
          {/if}
        </button>
        <button 
          type="button"
          onclick={() => isOpen = false}
          class="p-1 text-gray-500 hover:text-white transition-colors"
          aria-label="Close terminal"
        >
          <X class="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>
    
    <!-- Terminal Content -->
    <div 
      bind:this={terminalRef}
      class="p-4 font-mono text-sm overflow-y-auto bg-dark-900/95"
      style="height: calc(100% - 40px);"
      role="log"
      aria-live="polite"
      aria-label="Terminal output"
    >
      {#each history as item}
        {#if item.type === 'input'}
          <div class="text-cyan-400 mb-1">{item.content}</div>
        {:else}
          <div class="text-gray-300 mb-1 whitespace-pre-wrap">{item.content}</div>
        {/if}
      {/each}
      
      <!-- Input Line -->
      <div class="flex items-center mt-2">
        <span class="text-cyan-400 mr-2" aria-hidden="true">></span>
        <input
          bind:this={inputRef}
          bind:value={command}
          onkeydown={(e: KeyboardEvent) => e.key === 'Enter' && handleCommand()}
          type="text"
          class="flex-1 bg-transparent border-none outline-none text-white font-mono"
          placeholder="Type a command..."
          autocomplete="off"
          spellcheck="false"
          aria-label="Terminal input"
        />
        <span class="terminal-cursor text-cyan-400" aria-hidden="true">|</span>
      </div>
    </div>
  </div>
{/if}
