<script lang="ts">
  import { Github, Linkedin, Mail, MapPin, Heart } from 'lucide-svelte';
  import { resumeData } from '$lib/data/resumeData';
</script>

<footer id="contact" class="bg-dark-800/50 border-t border-dark-600/30">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
      <!-- Contact Info -->
      <div>
        <h3 class="text-lg font-semibold text-white mb-4">Get In Touch</h3>
        <div class="space-y-3">
          <a
            href="mailto:{resumeData.basics.email}"
            class="flex items-center space-x-3 text-gray-400 hover:text-cyan-400 transition-colors"
          >
            <Mail class="w-5 h-5" />
            <span>{resumeData.basics.email}</span>
          </a>
          <div class="flex items-center space-x-3 text-gray-400">
            <MapPin class="w-5 h-5" />
            <span>{resumeData.basics.location}</span>
          </div>
        </div>
      </div>
      
      <!-- Quick Links -->
      <div>
        <h3 class="text-lg font-semibold text-white mb-4">Quick Links</h3>
        <div class="space-y-2">
          <a href="#about" class="block text-gray-400 hover:text-cyan-400 transition-colors">About</a>
          <a href="#skills" class="block text-gray-400 hover:text-cyan-400 transition-colors">Skills</a>
          <a href="#experience" class="block text-gray-400 hover:text-cyan-400 transition-colors">Experience</a>
          <a href="#homelab" class="block text-gray-400 hover:text-cyan-400 transition-colors">Homelab</a>
        </div>
      </div>
      
      <!-- Social -->
      <div>
        <h3 class="text-lg font-semibold text-white mb-4">Connect</h3>
        <div class="flex space-x-4">
          <a
            href="https://github.com/DDeluca06"
            target="_blank"
            rel="noopener noreferrer"
            class="p-2 bg-dark-700 rounded-lg text-gray-400 hover:text-cyan-400 hover:bg-dark-600 transition-all"
          >
            <Github class="w-5 h-5" />
          </a>
          <a
            href="https://www.linkedin.com/in/demitri-deluca-lyons-747312319/"
            target="_blank"
            rel="noopener noreferrer"
            class="p-2 bg-dark-700 rounded-lg text-gray-400 hover:text-cyan-400 hover:bg-dark-600 transition-all"
          >
            <Linkedin class="w-5 h-5" />
          </a>
        </div>
      </div>
    </div>
    
    <div class="mt-8 pt-8 border-t border-dark-600/30 text-center">
      <p class="text-gray-500 text-sm flex items-center justify-center gap-1">
        Built with <Heart class="w-4 h-4 text-red-500 inline" /> using SvelteKit & Tailwind CSS
      </p>
      <p class="text-gray-600 text-xs mt-2">
        &copy; {new Date().getFullYear()} {resumeData.basics.name}. All rights reserved.
      </p>
    </div>
  </div>
</footer>
