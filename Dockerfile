FROM oven/bun:1-alpine AS builder
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

FROM oven/bun:1-alpine
RUN addgroup -g 1001 -S bunjs && adduser -S bunjs -u 1001
COPY --from=builder --chown=bunjs:bunjs /app/build /app
USER bunjs
WORKDIR /app
EXPOSE 51337
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun -e "const r=await fetch('http://localhost:51337');process.exit(r.ok?0:1)"
CMD ["bun", "run", "index.js"]
