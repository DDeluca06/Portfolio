<script lang="ts">
  import { resumeData } from '$lib/data/resumeData';
  import { Briefcase, Calendar, MapPin, ChevronRight, Sparkles } from 'lucide-svelte';
  
  let expandedExperience = $state<string | null>(null);
  
  function toggleExperience(id: string) {
    expandedExperience = expandedExperience === id ? null : id;
  }
</script>

<section id="experience" class="py-20 px-4 sm:px-6 lg:px-8">
  <div class="max-w-4xl mx-auto">
    <div class="text-center mb-12">
      <h2 class="text-3xl sm:text-4xl font-bold text-white mb-4">Professional Experience</h2>
      <p class="text-gray-400">Building expertise across IT support, development, and AI innovation</p>
    </div>
    
    <div class="relative">
      <!-- Timeline Line -->
      <div class="absolute left-4 md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-cyan-500/50 via-teal-500/50 to-transparent md:-translate-x-1/2"></div>
      
      {#each resumeData.experience as job, index}
        <div class="relative mb-8 md:mb-12">
          <!-- Timeline Dot -->
          <div class="absolute left-4 md:left-1/2 w-4 h-4 bg-cyan-500 rounded-full border-4 border-dark-900 md:-translate-x-1/2 z-10"></div>
          
          <!-- Content Card -->
          <div class="ml-12 md:ml-0 {index % 2 === 0 ? 'md:mr-[50%] md:pr-12' : 'md:ml-[50%] md:pl-12'}">
            <button
              type="button"
              class="w-full text-left glass rounded-xl p-6 cursor-pointer transition-all hover:border-cyan-500/30 {expandedExperience === job.id ? 'border-cyan-500/50' : ''}"
              onclick={() => toggleExperience(job.id)}
              aria-expanded={expandedExperience === job.id}
            >
              <!-- Header -->
              <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4">
                <div>
                  <h3 class="text-xl font-bold text-white">{job.position}</h3>
                  <div class="flex items-center text-cyan-400 mt-1">
                    <Briefcase class="w-4 h-4 mr-1" />
                    <span class="font-medium">{job.company}</span>
                  </div>
                </div>
                <div class="flex flex-col items-start sm:items-end mt-2 sm:mt-0 text-sm text-gray-500">
                  <div class="flex items-center">
                    <Calendar class="w-4 h-4 mr-1" />
                    <span>{job.period}</span>
                  </div>
                  <div class="flex items-center mt-1">
                    <MapPin class="w-4 h-4 mr-1" />
                    <span>{job.location}</span>
                  </div>
                </div>
              </div>
              
              <!-- Highlights -->
              <div class="flex flex-wrap gap-2 mb-4">
                {#each job.highlights as highlight}
                  <span class="px-3 py-1 bg-cyan-500/10 text-cyan-400 text-xs rounded-full border border-cyan-500/20">
                    {highlight}
                  </span>
                {/each}
              </div>
              
              <!-- Expandable Content -->
              <div class="overflow-hidden transition-all duration-300 {expandedExperience === job.id ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}">
                <ul class="space-y-2 mt-4 pt-4 border-t border-dark-600/30">
                  {#each job.description as item}
                    <li class="flex items-start text-sm text-gray-400">
                      <ChevronRight class="w-4 h-4 text-cyan-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  {/each}
                </ul>
              </div>
              
              <!-- Expand Indicator -->
              <div class="flex items-center justify-center mt-4 text-gray-500 text-sm">
                <span>{expandedExperience === job.id ? 'Show less' : 'Show more'}</span>
                <ChevronRight class="w-4 h-4 ml-1 transform transition-transform {expandedExperience === job.id ? 'rotate-90' : ''}" />
              </div>
            </button>
          </div>
        </div>
      {/each}
    </div>
    
    <!-- Education & Certifications -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
      <!-- Education -->
      <div class="glass rounded-xl p-6">
        <h3 class="text-xl font-bold text-white mb-4">Education</h3>
        {#each resumeData.education as edu}
          <div class="border-l-2 border-teal-500/50 pl-4">
            <h4 class="font-semibold text-white">{edu.school}</h4>
            <p class="text-sm text-gray-500">{edu.period}</p>
            <p class="text-sm text-gray-400 mt-1">{edu.description}</p>
          </div>
        {/each}
      </div>
      
      <!-- Certifications -->
      <div class="glass rounded-xl p-6">
        <h3 class="text-xl font-bold text-white mb-4 flex items-center">
          <Sparkles class="w-5 h-5 text-yellow-400 mr-2" />
          Certifications
        </h3>
        {#each resumeData.certifications as cert}
          <div class="border-l-2 border-yellow-500/50 pl-4">
            <h4 class="font-semibold text-white">{cert.title}</h4>
            <p class="text-sm text-cyan-400">{cert.issuer}</p>
            <p class="text-sm text-gray-500">{cert.date}</p>
            <p class="text-sm text-gray-400 mt-1">{cert.description}</p>
          </div>
        {/each}
      </div>
    </div>
  </div>
</section>
