# Architecture Decision Record: Real-Time Server Stats Collection

**Status:** Accepted  
**Date:** 2025-03-22  
**Issue:** resufolio-9j5  
**Decision:** Option 2 - External Stats Microservice with Prometheus/Grafana Export

---

## Context

The Resufolio portfolio site currently uses hardcoded static data for homelab infrastructure display. We need to implement real-time server stats collection (RAM, CPU, Disk usage) from two Docker Swarm nodes:

- **eserver** (192.168.50.122): Edge & Ingress
- **server** (192.168.50.115): Storage & Applications

### Current Architecture
- SvelteKit 5 with `@sveltejs/adapter-static` (fully static generation)
- Bun runtime for build and runtime
- Docker Swarm deployment with Traefik reverse proxy
- System already has `systeminformation` and `dockerode` in dependencies (unused)

### Requirements
1. Display real-time metrics: CPU %, RAM usage %, Disk usage %
2. Show per-container stats (optional v2)
3. Maintain static site benefits (CDN-friendly, fast loads)
4. Minimal infrastructure changes to existing Docker Swarm
5. Secure access to homelab servers (private IPs: 192.168.50.x)

---

## Decision Drivers

| Driver | Weight | Description |
|--------|--------|-------------|
| Simplicity | High | Avoid over-engineering for 2 servers |
| Security | High | Private network access, no public exposure |
| Performance | Medium | Fast API responses (< 500ms) |
| Maintainability | High | Easy to debug and extend |
| Scalability | Low | Fixed 2-node setup, unlikely to grow |
| Cost | Medium | Minimize resource overhead |

---

## Options Considered

### Option 1: SvelteKit API Routes (Hybrid Adapter)

**Approach:** Convert from `@sveltejs/adapter-static` to `@sveltejs/adapter-auto` or `adapter-node`, then create `+server.ts` endpoints that use `systeminformation` library to fetch real-time data from both servers.

**Implementation:**
```typescript
// src/routes/api/stats/+server.ts
import { json } from '@sveltejs/kit';
import si from 'systeminformation';

export async function GET() {
  const stats = await Promise.all([
    fetch('http://192.168.50.122:3001/stats'),  // Need agent on each node
    fetch('http://192.168.50.115:3001/stats'),
  ]);
  return json(await Promise.all(stats.map(r => r.json())));
}
```

#### Pros
- Single codebase, no external services
- Can use SvelteKit's built-in data loading patterns
- Direct TypeScript types sharing between frontend and API
- SSR-capable for initial render with real data

#### Cons
- **Breaking change**: Loses static adapter benefits (CDN deployment, zero server costs)
- Requires running Node/Bun server (vs static file serving)
- SvelteKit becomes infrastructure-critical component
- Must handle secrets (SSH keys, API tokens) in container
- **Complexity**: Need to deploy stat collection agents on each homelab node anyway
- Docker Swarm networking complexity for cross-node communication
- **Security risk**: Portfolio container needs network access to private homelab IPs

**Dependencies to Add:**
- `@sveltejs/adapter-auto` or `@sveltejs/adapter-node`
- Remove `@sveltejs/adapter-static`

---

### Option 2: External Stats Microservice (Recommended)

**Approach:** Create a separate lightweight Bun service deployed as a Docker Swarm service alongside the portfolio. This microservice collects stats from homelab nodes via SSH or local Docker socket and exposes a simple REST API that the static frontend fetches.

**Architecture:**
```
┌─────────────────┐         ┌─────────────────┐
│   Portfolio     │         │  Stats API      │
│   (Static)      │◄────────│  (Bun Service)  │
│   Nginx/Bun     │   CORS  │  Docker Swarm   │
└─────────────────┘         └────────┬────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
              ┌─────▼─────┐    ┌─────▼─────┐    ┌─────▼─────┐
              │   eserver │    │   server  │    │  (future) │
              │  SSH/Docker│    │  SSH/Docker│   │           │
              └───────────┘    └───────────┘    └───────────┘
```

**Implementation Sketch:**
```typescript
// stats-service/src/index.ts
import si from 'systeminformation';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const SERVERS = [
  { name: 'eserver', ip: '192.168.50.122', sshKey: '/keys/eserver' },
  { name: 'server', ip: '192.168.50.115', sshKey: '/keys/server' },
];

async function getRemoteStats(server: typeof SERVERS[0]) {
  // Option A: SSH into node and run systeminformation
  const { stdout } = await execAsync(
    `ssh -i ${server.sshKey} root@${server.ip} "node -e 'const si=require(\"systeminformation\"); si.getAllData().then(console.log)'"`
  );
  return JSON.parse(stdout);
}

Bun.serve({
  port: 3000,
  async fetch(req) {
    if (req.url.endsWith('/api/stats')) {
      const stats = await Promise.all(SERVERS.map(getRemoteStats));
      return Response.json(stats);
    }
    return new Response('Not Found', { status: 404 });
  },
});
```

#### Pros
- **Portfolio remains static** - keep CDN deployment, fast builds, simple hosting
- **Separation of concerns** - stats collection is isolated from presentation
- **Single point of maintenance** - one service for all stat collection logic
- **Scalable architecture** - can add more servers by updating config
- **Security** - portfolio doesn't need homelab network access; stats service can be restricted
- **Technology consistency** - uses Bun like the rest of the project
- Can cache responses (e.g., 5-10 second cache) to reduce load on homelab nodes
- Easy to extend: add Prometheus export, alerting, etc.

#### Cons
- Additional service to maintain (1 container)
- Requires SSH key management or Docker socket access
- Network hop adds latency (~10-50ms)
- Need CORS configuration or same-domain proxy

**Dependencies:**
- `systeminformation` (already in package.json)
- `ssh2` or native `child_process` for SSH

---

### Option 3: Client-Side Direct Queries

**Approach:** Frontend JavaScript directly queries homelab servers from the browser using fetch() to exposed endpoints on each node.

**Implementation:**
```typescript
// src/lib/components/Homelab.svelte
async function fetchStats() {
  const [eserverStats, serverStats] = await Promise.all([
    fetch('http://192.168.50.122:3001/stats'),
    fetch('http://192.168.50.115:3001/stats'),
  ]);
  return {
    eserver: await eserverStats.json(),
    server: await serverStats.json(),
  };
}
```

#### Pros
- No backend service needed
- Direct connection = lowest latency
- Simplest architecture (just frontend + agents)

#### Cons
- **Security risk**: Homelab servers must expose ports to browser
- **CORS complexity**: Each homelab node needs CORS headers configured
- **Authentication challenge**: Need to secure endpoints accessible from browser
- **Network visibility**: Client must be on same network as homelab (or expose publicly)
- **No caching**: Every client hits homelab servers directly
- **Mixed content issues**: If portfolio is HTTPS, homelab endpoints must also be HTTPS
- **VPN requirement**: External visitors can't see stats without VPN

**This option is rejected** due to security and networking constraints.

---

## Decision

**Select Option 2: External Stats Microservice**

### Rationale

1. **Maintains Static Site Benefits**: The portfolio stays fully static - we keep fast CDN deployment, simple hosting, and zero server-side rendering complexity.

2. **Security Best Practice**: The static portfolio has no network access to private homelab IPs. The stats microservice runs within the trusted Docker Swarm network and can securely reach homelab nodes.

3. **Clean Architecture**: Separation of concerns - presentation (portfolio) is decoupled from data collection (stats service).

4. **Future-Proof**: Easy to add features like:
   - Prometheus metrics export for monitoring
   - Historical data storage (SQLite/Redis)
   - Alerting when resources exceed thresholds
   - Support for additional homelab nodes

5. **Technology Stack Alignment**: Uses Bun like the main project, minimal new dependencies.

6. **Cost Efficiency**: Single additional lightweight container (< 50MB RAM estimated).

---

## Implementation Plan

### Phase 1: Stats Microservice (Week 1)

```
stats-service/
├── Dockerfile
├── src/
│   ├── index.ts          # Bun server entry
│   ├── collectors/
│   │   ├── ssh.ts        # SSH-based collection
│   │   └── docker.ts     # Docker socket collection (future)
│   ├── types.ts          # Shared types
│   └── config.ts         # Server configurations
├── package.json
└── docker-compose.yml    # For local dev
```

**Key Implementation Details:**
- SSH key-based authentication to homelab nodes
- 10-second cache to prevent overwhelming homelab servers
- Simple REST API: `GET /api/stats` returns consolidated data
- CORS enabled for portfolio domain
- Health check endpoint for Docker Swarm

### Phase 2: Portfolio Integration (Week 2)

1. Add Svelte store for reactive stats:
```typescript
// src/lib/stores/stats.ts
import { writable } from 'svelte/store';

function createStatsStore() {
  const { subscribe, set } = writable(null);
  
  async function fetchStats() {
    const res = await fetch('https://stats.your-domain.com/api/stats');
    set(await res.json());
  }
  
  // Poll every 30 seconds
  setInterval(fetchStats, 30000);
  fetchStats();
  
  return { subscribe, refresh: fetchStats };
}

export const serverStats = createStatsStore();
```

2. Update `Homelab.svelte` to use real data with fallback to static
3. Add loading states and error handling

### Phase 3: Deployment (Week 2)

Update Docker Swarm configuration:
```yaml
# docker-compose.yml additions
services:
  portfolio:
    # ... existing config
    
  stats-service:
    build: ./stats-service
    container_name: resufolio-stats
    restart: unless-stopped
    environment:
      - SERVERS_CONFIG=/config/servers.json
    volumes:
      - ./stats-service/keys:/keys:ro
      - ./stats-service/config:/config:ro
    networks:
      - web
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.stats.rule=Host(`stats.your-domain.com`)"
      - "traefik.http.routers.stats.tls=true"
      - "traefik.http.routers.stats.tls.certresolver=le"
```

---

## Dependencies Summary

### New Dependencies

**Stats Microservice:**
- `systeminformation` ^5.31.5 (already in root package.json)
- `ssh2` ^1.16.0 - SSH client for connecting to homelab nodes
- `@types/ssh2` - TypeScript definitions

**Portfolio Frontend:**
- No new dependencies (using native fetch + Svelte stores)

### Infrastructure Requirements

1. **SSH Access**: Stats service needs SSH key pairs for each homelab node
2. **Network**: Stats service must be on network that can reach 192.168.50.x
3. **Traefik**: Route `stats.your-domain.com` to stats service
4. **Docker Secrets** (optional): Store SSH keys as Docker secrets

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Docker Swarm                             │
│                                                                 │
│  ┌──────────────────┐        ┌──────────────────────────┐      │
│  │  Traefik (Edge)  │        │   Stats Microservice     │      │
│  │  Reverse Proxy   │        │   (Bun + systeminfo)     │      │
│  └────────┬─────────┘        └───────────┬──────────────┘      │
│           │                              │                     │
│           │      ┌───────────────────────┘                     │
│           │      │                                              │
│           ▼      ▼                                              │
│  ┌──────────────────┐        ┌──────────────────────────┐      │
│  │   Portfolio      │◄───────│   CORS / JSON API        │      │
│  │   (Static Files) │        │   GET /api/stats         │      │
│  │   Nginx/Bun      │        │   (Cached 10s)           │      │
│  └──────────────────┘        └───────────┬──────────────┘      │
│                                          │                     │
│                         ┌────────────────┼────────────────┐    │
│                         │                │                │    │
│                    ┌────▼────┐      ┌────▼────┐      ┌────▼───┐│
│                    │  SSH    │      │  SSH    │      │ Future ││
│                    │Tunnel   │      │Tunnel   │      │ Nodes  ││
│                    └────┬────┘      └────┬────┘      └────────┘│
└─────────────────────────┼────────────────┼─────────────────────┘
                          │                │
          ┌───────────────┘                └───────────────┐
          │                                                │
   ┌──────▼──────┐                                  ┌──────▼──────┐
   │   eserver   │                                  │   server    │
   │192.168.50.122│                                  │192.168.50.115│
   │             │                                  │             │
   │ System Info │                                  │ System Info │
   │ Docker API  │                                  │ Docker API  │
   └─────────────┘                                  └─────────────┘
```

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| SSH connection failures | Medium | Medium | Implement retry logic; graceful degradation to static data |
| Homelab node downtime | Low | Low | Show last-known stats with timestamp; indicate offline status |
| Rate limiting homelab | Low | Medium | 10-second cache; debounce rapid page reloads |
| Stats service crashes | Low | High | Docker Swarm auto-restart; health checks |
| Network latency | Low | Low | Async loading with skeleton UI; cache aggressively |

---

## Alternatives Not Chosen

### Prometheus + Grafana (Overkill)
While Prometheus is the industry standard for metrics, it's overkill for a 2-node display on a portfolio site. Adds significant complexity (Prometheus server, exporters, Grafana instance) for simple real-time stats.

**Reconsider if:** Need historical data, alerting, or multi-node monitoring dashboard.

### Server-Sent Events / WebSockets (Unnecessary)
Real-time push updates would be nice but aren't critical for portfolio visitors. Polling every 30 seconds is sufficient and simpler to implement.

**Reconsider if:** Building a live monitoring dashboard with sub-second updates.

### Direct Docker Socket Mount (Security Risk)
Mounting Docker socket from homelab nodes into stats service is simpler than SSH but exposes container control surface. SSH provides read-only access.

---

## Future Considerations

1. **Prometheus Export**: Add `/metrics` endpoint compatible with Prometheus for professional monitoring integration
2. **Historical Data**: Store 24h/7d/30d aggregates in SQLite for trend graphs
3. **Alerting**: Webhook notifications when CPU/RAM exceeds thresholds
4. **Multi-Region**: If portfolio moves to edge network, deploy stats service as close to homelab as possible

---

## Existing Code Context

The repository currently contains `src/routes/api/stats/+server.ts` and `src/routes/api/health/+server.ts` which were created as part of an earlier Option 1 exploration. These files:
- Use `systeminformation` library to collect local system stats
- Are currently **non-functional** because the project uses `@sveltejs/adapter-static`
- Will be removed as part of implementing Option 2
- Logic may be reused in the external stats microservice

## References

- [systeminformation documentation](https://systeminformation.io/)
- [SvelteKit server endpoints](https://kit.svelte.dev/docs/routing#server)
- [Bun HTTP server](https://bun.sh/docs/api/http)
- [SSH2 Node.js library](https://github.com/mscdex/ssh2)
- [Docker Swarm secrets](https://docs.docker.com/engine/swarm/secrets/)

---

## Decision Log

| Date | Decision | Author | Rationale |
|------|----------|--------|-----------|
| 2025-03-22 | Choose Option 2 | AI Architect | Best balance of simplicity, security, and maintainability |

---

**Next Steps:**
1. Create `stats-service/` directory with Bun microservice
2. Set up SSH key authentication for homelab nodes
3. Update Docker Swarm compose configuration
4. Integrate real-time stats into portfolio frontend
