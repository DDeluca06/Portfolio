# Stats API - Deployment Guide

This guide explains how to deploy the Stats API with proper security configuration.

## Prerequisites

- Node.js 18+ or Bun runtime
- Docker (optional, for container stats)
- Environment variables configured

## Quick Start

1. **Install dependencies:**
   ```bash
   bun install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

3. **Generate API key:**
   ```bash
   openssl rand -base64 32
   # Add to .env as STATS_API_KEY
   ```

4. **Development:**
   ```bash
   bun run dev
   ```

5. **Production build:**
   ```bash
   bun run build
   ```

## Environment Variables

```env
# Required
STATS_API_KEY=your-secure-api-key-here

# Optional but recommended
ALLOWED_ORIGINS=https://yourdomain.com
RATE_LIMIT_READS_PER_MINUTE=100
RATE_LIMIT_WRITES_PER_MINUTE=20
ENABLE_HSTS=true
```

## Testing the API

### 1. Health Check (No Auth)
```bash
curl http://localhost:5173/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "uptime": 3600
}
```

### 2. System Stats (With Auth)
```bash
curl -H "Authorization: Bearer $STATS_API_KEY" \
     http://localhost:5173/api/stats
```

Expected response:
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "requestId": "12345-abc",
  "cpu": { "usage": 45.2, "cores": 8, ... },
  "memory": { "total": 16777216000, "used": ..., ... },
  "disk": [...],
  "system": { "platform": "linux", ... }
}
```

### 3. Docker Stats (With Auth)
```bash
curl -H "Authorization: Bearer $STATS_API_KEY" \
     http://localhost:5173/api/docker
```

### 4. Unauthorized Request
```bash
curl http://localhost:5173/api/stats
```

Expected: `401 Unauthorized`

### 5. Rate Limiting Test
```bash
for i in {1..105}; do
  curl -s -H "Authorization: Bearer $STATS_API_KEY" \
       -o /dev/null \
       -w "%{http_code}\n" \
       http://localhost:5173/api/stats
done
```

Last requests should return `429`

### 6. CORS Test
```bash
curl -H "Origin: https://evil.com" \
     -H "Authorization: Bearer $STATS_API_KEY" \
     http://localhost:5173/api/stats
```

Expected: `403 Forbidden` (if evil.com not in ALLOWED_ORIGINS)

## Docker Deployment

### Using Docker Compose

```yaml
version: '3.8'
services:
  resufolio:
    build: .
    ports:
      - "3000:3000"
    environment:
      - STATS_API_KEY=${STATS_API_KEY}
      - ALLOWED_ORIGINS=${ALLOWED_ORIGINS}
      - RATE_LIMIT_READS_PER_MINUTE=100
      - ENABLE_HSTS=true
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock  # For Docker stats
    restart: unless-stopped
```

### Security Note

When mounting Docker socket, ensure:
1. Container runs as non-root user
2. Use Docker socket proxy for additional security
3. Restrict API key access

### Using Traefik Reverse Proxy

```yaml
services:
  resufolio:
    build: .
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.resufolio.rule=Host(`stats.yourdomain.com`)"
      - "traefik.http.routers.resufolio.tls=true"
      - "traefik.http.routers.resufolio.tls.certresolver=letsencrypt"
    environment:
      - STATS_API_KEY=${STATS_API_KEY}
      - ENABLE_HSTS=true
```

## Security Checklist

Before production deployment:

- [ ] Strong API key generated (32+ chars, random)
- [ ] `.env` file not committed to git
- [ ] CORS origins restricted to actual domains
- [ ] Rate limits configured for your use case
- [ ] HSTS enabled for HTTPS deployments
- [ ] Docker socket secured (if using)
- [ ] Health endpoint accessible for monitoring
- [ ] Logs reviewed for suspicious activity

## API Client Usage

### JavaScript/TypeScript

```typescript
import { StatsAPI } from '$lib/api/statsClient';

const api = new StatsAPI(process.env.STATS_API_KEY);

// Get system stats
const stats = await api.getSystemStats();
console.log(`CPU: ${stats.cpu.usage}%`);
console.log(`Memory: ${stats.memory.usagePercent}%`);

// Get Docker stats
const dockerStats = await api.getDockerStats();
console.log(`Containers: ${dockerStats.system.containers.running} running`);
```

### cURL

```bash
# Health check
curl http://localhost:5173/api/health

# System stats
curl -H "Authorization: Bearer $STATS_API_KEY" \
     http://localhost:5173/api/stats

# Docker stats
curl -H "Authorization: Bearer $STATS_API_KEY" \
     http://localhost:5173/api/docker
```

## Troubleshooting

### 401 Unauthorized
- Verify Authorization header format: `Bearer <key>`
- Check STATS_API_KEY environment variable is set
- Ensure no whitespace in key

### 403 CORS Error
- Add your domain to ALLOWED_ORIGINS
- Check protocol matches (http vs https)
- Verify Origin header is sent

### 429 Rate Limited
- Check Retry-After header
- Implement client-side throttling
- Adjust rate limits if needed

### 500 Server Error
- Check server logs
- Verify Docker socket access (for Docker stats)
- Ensure systeminformation permissions

## Monitoring

### Health Endpoint
Use for uptime monitoring:
```bash
curl -f http://localhost:5173/api/health || echo "DOWN"
```

### Prometheus/Grafana
Consider adding Prometheus metrics endpoint for:
- Request rates
- Response times
- Error rates
- System resource usage

## Support

For security issues, see [SECURITY.md](docs/SECURITY.md)
