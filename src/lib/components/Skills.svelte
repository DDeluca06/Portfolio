<script lang="ts">
  import { resumeData } from '$lib/data/resumeData';
  import { Code2, Server, Brain, Terminal } from 'lucide-svelte';
  
  let activeCategory = $state('development');
  let hoveredSkill = $state<string | null>(null);
  
  const categories = [
    { id: 'development', label: 'Development', icon: Code2 },
    { id: 'infrastructure', label: 'Infrastructure', icon: Server },
    { id: 'ai', label: 'AI & LLMs', icon: Brain }
  ];
  
  const categoryStyles: Record<string, { 
    gradient: string; 
    bg: string; 
    text: string; 
    border: string;
    accent: string;
  }> = {
    development: {
      gradient: 'from-cyan-500 to-blue-500',
      bg: 'bg-cyan-500/20',
      text: 'text-cyan-300',
      border: 'border-cyan-500/30',
      accent: 'text-cyan-400'
    },
    infrastructure: {
      gradient: 'from-teal-500 to-emerald-500',
      bg: 'bg-teal-500/20',
      text: 'text-teal-300',
      border: 'border-teal-500/30',
      accent: 'text-teal-400'
    },
    ai: {
      gradient: 'from-purple-500 to-pink-500',
      bg: 'bg-purple-500/20',
      text: 'text-purple-300',
      border: 'border-purple-500/30',
      accent: 'text-purple-400'
    }
  };
  
  const categoryDescriptions: Record<string, { title: string; content: string }> = {
    development: {
      title: 'Full-stack development',
      content: 'with modern frameworks. Specializing in SvelteKit and Next.js for performant, reactive web applications. Experienced in TypeScript, Python, and database design.'
    },
    infrastructure: {
      title: 'Infrastructure architecture',
      content: 'with Docker Swarm, Linux server administration, and network management. Building resilient, scalable systems with 24TB+ storage and 99.9% uptime.'
    },
    ai: {
      title: 'AI integration',
      content: 'and LLM deployment. Experienced with OpenAI, Claude, Ollama, and OpenWebUI. Proven track record implementing AI solutions for business automation and data processing.'
    }
  };
  
  let currentStyle = $derived(categoryStyles[activeCategory]);
  let currentDescription = $derived(categoryDescriptions[activeCategory]);
</script>

<section id="skills" class="py-20 px-4 sm:px-6 lg:px-8">
  <div class="max-w-6xl mx-auto">
    <div class="text-center mb-12">
      <h2 class="text-3xl sm:text-4xl font-bold text-white mb-4">Skills & Expertise</h2>
      <p class="text-gray-400 max-w-2xl mx-auto">
        A unique blend of software development and infrastructure management capabilities
      </p>
    </div>
    
    <!-- Category Tabs -->
    <div class="flex flex-wrap justify-center gap-2 mb-10" role="tablist" aria-label="Skill categories">
      {#each categories as category}
        <button
          type="button"
          role="tab"
          aria-selected={activeCategory === category.id}
          aria-controls="skills-panel"
          onclick={() => activeCategory = category.id}
          class="flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all {activeCategory === category.id ? 'bg-dark-700 text-cyan-400 border border-cyan-500/30' : 'bg-dark-800/50 text-gray-400 hover:text-white border border-transparent'}"
        >
          <category.icon class="w-5 h-5" aria-hidden="true" />
          <span>{category.label}</span>
        </button>
      {/each}
    </div>
    
    <!-- Skills Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8" id="skills-panel" role="tabpanel">
      <!-- Skill Bars -->
      <div class="glass rounded-xl p-6">
        <h3 class="text-xl font-semibold text-white mb-6 flex items-center">
          <Terminal class="w-5 h-5 text-cyan-400 mr-2" aria-hidden="true" />
          Proficiency Levels
        </h3>
        
        <div class="space-y-4">
          {#each resumeData.skills[activeCategory as keyof typeof resumeData.skills] as skill, index}
            <div 
              class="group"
              role="region"
              aria-label="{skill.name} skill level: {skill.level}%"
              onmouseenter={() => hoveredSkill = skill.name}
              onmouseleave={() => hoveredSkill = null}
            >
              <div class="flex justify-between items-center mb-1">
                <span class="text-sm font-medium text-gray-300">{skill.name}</span>
                <span class="text-xs text-gray-500">{skill.category}</span>
              </div>
              <div class="h-2 bg-dark-700 rounded-full overflow-hidden">
                <div
                  class="h-full bg-gradient-to-r {currentStyle.gradient} rounded-full transition-all duration-1000 ease-out"
                  style="width: {skill.level}%; transition-delay: {index * 50}ms;"
                ></div>
              </div>
            </div>
          {/each}
        </div>
      </div>
      
      <!-- Skill Tags -->
      <div class="glass rounded-xl p-6">
        <h3 class="text-xl font-semibold text-white mb-6">Technology Stack</h3>
        
        <div class="flex flex-wrap gap-2">
          {#each resumeData.skills[activeCategory as keyof typeof resumeData.skills] as skill}
            <span 
              class="px-4 py-2 rounded-full text-sm font-medium transition-all cursor-default hover:scale-105 {currentStyle.bg} {currentStyle.text} border {currentStyle.border}"
            >
              {skill.name}
            </span>
          {/each}
        </div>
        
        <!-- Category Description -->
        <div class="mt-8 p-4 bg-dark-700/50 rounded-lg border border-dark-600/30">
          <p class="text-gray-300 text-sm">
            <strong class="{currentStyle.accent}">{currentDescription.title}</strong> {currentDescription.content}
          </p>
        </div>
      </div>
    </div>
  </div>
</section>
