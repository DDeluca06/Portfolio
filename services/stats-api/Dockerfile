# Use the official Bun image
FROM oven/bun:1-alpine

# Set working directory
WORKDIR /app

# Install dependencies first for better caching
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# Copy source code
COPY . .

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0

# Expose the port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD bun -e "const r=await fetch('http://localhost:3001/health');process.exit(r.ok?0:1)"

# Run the application
CMD ["bun", "run", "src/index.ts"]
