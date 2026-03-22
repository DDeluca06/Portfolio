<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let animationId: number;
  let particles: Particle[] = [];
  let mouse = { x: 0, y: 0 };
  let isAnimating = false;
  
  const PARTICLE_COUNT = 60;
  const CONNECTION_DISTANCE = 150;
  const MOUSE_DISTANCE = 200;
  
  class Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    
    constructor(canvasWidth: number, canvasHeight: number) {
      this.x = Math.random() * canvasWidth;
      this.y = Math.random() * canvasHeight;
      this.vx = (Math.random() - 0.5) * 0.5;
      this.vy = (Math.random() - 0.5) * 0.5;
      this.radius = Math.random() * 2 + 1;
    }
    
    update(canvasWidth: number, canvasHeight: number) {
      this.x += this.vx;
      this.y += this.vy;
      
      // Bounce off edges
      if (this.x < 0 || this.x > canvasWidth) this.vx *= -1;
      if (this.y < 0 || this.y > canvasHeight) this.vy *= -1;
      
      // Mouse interaction
      const dx = mouse.x - this.x;
      const dy = mouse.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < MOUSE_DISTANCE && distance > 0) {
        const force = (MOUSE_DISTANCE - distance) / MOUSE_DISTANCE;
        this.vx -= (dx / distance) * force * 0.02;
        this.vy -= (dy / distance) * force * 0.02;
      }
    }
    
    draw(context: CanvasRenderingContext2D) {
      context.beginPath();
      context.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      context.fillStyle = 'rgba(34, 211, 238, 0.5)';
      context.fill();
    }
  }
  
  function resize() {
    if (!canvas || !browser) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    initParticles();
  }
  
  function initParticles() {
    if (!canvas) return;
    particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push(new Particle(canvas.width, canvas.height));
    }
  }
  
  function drawConnections(context: CanvasRenderingContext2D) {
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < CONNECTION_DISTANCE) {
          const opacity = (1 - distance / CONNECTION_DISTANCE) * 0.3;
          context.beginPath();
          context.moveTo(particles[i].x, particles[i].y);
          context.lineTo(particles[j].x, particles[j].y);
          context.strokeStyle = `rgba(34, 211, 238, ${opacity})`;
          context.lineWidth = 1;
          context.stroke();
        }
      }
      
      // Connect to mouse
      const dx = mouse.x - particles[i].x;
      const dy = mouse.y - particles[i].y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < MOUSE_DISTANCE) {
        const opacity = (1 - distance / MOUSE_DISTANCE) * 0.4;
        context.beginPath();
        context.moveTo(particles[i].x, particles[i].y);
        context.lineTo(mouse.x, mouse.y);
        context.strokeStyle = `rgba(45, 212, 191, ${opacity})`;
        context.lineWidth = 1;
        context.stroke();
      }
    }
  }
  
  function animate() {
    if (!ctx || !canvas || !isAnimating) return;
    
    try {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach(particle => {
        particle.update(canvas.width, canvas.height);
        particle.draw(ctx!);
      });
      
      drawConnections(ctx);
      
      if (browser) {
        animationId = requestAnimationFrame(animate);
      }
    } catch (error) {
      console.error('Animation error:', error);
      stopAnimation();
    }
  }
  
  function startAnimation() {
    if (!isAnimating) {
      isAnimating = true;
      animate();
    }
  }
  
  function stopAnimation() {
    isAnimating = false;
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
  }
  
  function handleMouseMove(e: MouseEvent) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  }
  
  onMount(() => {
    if (!browser) return;
    
    // Initialize canvas context with null check
    const context = canvas.getContext('2d');
    if (!context) {
      console.error('Failed to get canvas 2D context');
      return;
    }
    ctx = context;
    
    resize();
    startAnimation();
    
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove);
  });
  
  onDestroy(() => {
    if (browser) {
      stopAnimation();
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
    }
  });
</script>

<canvas
  bind:this={canvas}
  class="fixed inset-0 pointer-events-none z-0"
  style="background: linear-gradient(to bottom, #0a0a0f 0%, #12121a 100%);"
  aria-hidden="true"
></canvas>
