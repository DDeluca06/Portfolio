<script lang="ts">
  import Hero from '$lib/components/Hero.svelte';
  import Skills from '$lib/components/Skills.svelte';
  import Timeline from '$lib/components/Timeline.svelte';
  import Homelab from '$lib/components/Homelab.svelte';
  import { resumeData } from '$lib/data/resumeData';
  import { User, Quote } from 'lucide-svelte';
</script>

<svelte:head>
  <title>{resumeData.basics.name} - {resumeData.basics.headline}</title>
  <meta name="description" content={resumeData.basics.summary} />
</svelte:head>

<Hero />

<!-- About Section -->
<section id="about" class="py-20 px-4 sm:px-6 lg:px-8 relative">
  <div class="max-w-4xl mx-auto">
    <div class="glass rounded-2xl p-8 md:p-12">
      <div class="flex items-center mb-6">
        <div class="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center mr-4">
          <User class="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 class="text-2xl md:text-3xl font-bold text-white">About Me</h2>
          <p class="text-cyan-400">Software Engineer & Infrastructure Architect</p>
        </div>
      </div>
      
      <div class="prose prose-invert max-w-none">
        <p class="text-lg text-gray-300 leading-relaxed">
          {@html resumeData.basics.summary}
        </p>
      </div>
      
      <div class="mt-8 pt-8 border-t border-dark-600/30">
        <div class="flex items-start space-x-4">
          <Quote class="w-8 h-8 text-cyan-400 flex-shrink-0 mt-1" />
          <div>
            <p class="text-gray-300 italic">
              "Bridging the gap between elegant code and robust infrastructure. 
              I don't just build applications—I architect complete solutions 
              from the ground up."
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<Skills />
<Timeline />
<Homelab />
