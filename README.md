# Resufolio

A modern, reactive portfolio built with SvelteKit 5, showcasing software engineering and IT infrastructure expertise.

## Features

- **Reactive Design**: Built with SvelteKit 5 runes for optimal performance
- **Interactive Network Background**: Canvas-based particle system
- **Skills Visualization**: Dual-track development and infrastructure skills
- **Homelab Architecture Showcase**: Interactive server diagrams
- **Terminal Easter Egg**: Hidden command-line interface (Ctrl+`)
- **Mobile-First**: Fully responsive design
- **Self-Hosted Ready**: Dockerized with production optimizations

## Tech Stack

- **Framework**: SvelteKit 5
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide Svelte
- **Animations**: Custom CSS + Svelte transitions
- **Build**: Vite

## Quick Start

### Development

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build
```

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build manually
docker build -t resufolio .
docker run -p 3000:80 resufolio
```

## Project Structure

```
src/
├── lib/
│   ├── components/     # Svelte components
│   ├── data/          # Resume & homelab data
│   ├── utils/         # Types and utilities
│   └── stores/        # Svelte stores
├── routes/            # SvelteKit routes
├── app.html           # HTML template
└── app.css            # Global styles
```

## Customization

Edit the data files to personalize:
- `src/lib/data/resumeData.ts` - Your resume information
- `src/lib/data/homelabData.ts` - Your homelab infrastructure
- `tailwind.config.js` - Colors and theme

## Terminal Commands

Press `Ctrl+\`` to open the terminal. Available commands:
- `help` - Show all commands
- `about` - About me
- `skills` - Technical skills
- `experience` - Work history
- `homelab` - Infrastructure stats
- `contact` - Contact information
- `secret` - ???

## License

MIT
