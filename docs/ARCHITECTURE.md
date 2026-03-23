# Architecture Documentation

## System Overview

Resufolio is a modern, reactive portfolio application with real-time server monitoring capabilities. The architecture follows a clean separation between frontend presentation, API services, and infrastructure integration.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         CLIENT                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Browser    │  │   Terminal   │  │    Mobile    │       │
│  │   (Svelte)   │  │   (Easter    │  │  (Responsive)│       │
│  │              │  │     Egg)     │  │              │       │
│  └──────┬───────┘  └──────────────┘  └──────────────┘       │
└─────────┼────────────────────────────────────────────────────┘
          │ HTTPS/WSS
┌─────────┼────────────────────────────────────────────────────┐
│         ▼                    SERVER                          │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              SvelteKit Application                   │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │    │
│  │  │    Routes    │  │  Components  │  │  Hooks    │ │    │
│  │  │  (Pages)     │  │  (Svelte)    │  │(Server)   │ │    │
│  │  └──────┬───────┘  └──────────────┘  └─────┬─────┘ │    │
│  │         │                                   │       │    │
│  │  ┌──────▼───────────────────────────────────▼─────┐ │    │
│  │  │              API Layer (Hono)                  │ │    │
│  │  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐  │ │    │
│  │  │  │ Stats  │ │ Docker │ │History │ │ Health │  │ │    │
│  │  │  │  API   │ │  API   │ │  API   │ │ Check  │  │ │    │
│  │  │  └────┬───┘ └────┬───┘ └────┬───┘ └────────┘  │ │    │
│  │  │       │          │          │                │ │    │
│  │  │  ┌────▼──────────▼──────────▼────────────────┐ │    │
│  │  │  │         Docker Client (9 Modules)         │ │    │
│  │  │  │  types, client, containers, services,    │ │    │
│  │  │  │  nodes, networks, system, events         │ │    │
│  │  │  └─────────────────┬─────────────────────────┘ │    │
│  │  └────────────────────┼───────────────────────────┘    │
│  └───────────────────────┼────────────────────────────────┘
│                          │
│  ┌───────────────────────▼────────────────────────────────┐
│  │              Infrastructure Layer                       │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  │    Docker    │  │   InfluxDB   │  │  Docker Sock │ │
│  │  │   Engine     │  │  (Metrics)   │  │    Proxy     │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘ │
│  └────────────────────────────────────────────────────────┘
└────────────────────────────────────────────────────────────┘
```

## Frontend Architecture

### SvelteKit 5 with Runes

The frontend is built with SvelteKit 5, utilizing the new runes system for reactive state management:

```typescript
// State management with runes
let stats = $state<ServerStats | null>(null);
let loading = $state(true);

// Derived state
let cpuPercent = $derived(stats?.cpu.usage ?? 0);

// Effects for side effects
$effect(() => {
  if (browser) {
    const interval = setInterval(fetchStats, refreshInterval);
    return () => clearInterval(interval);
  }
});
```

### Component Structure

```
src/lib/components/
├── stats/                    # Real-time statistics
│   ├── RealTimeStats.svelte  # Main stats dashboard
│   ├── ResourceUsageChart.svelte
│   ├── ConnectionStatus.svelte
│   └── ServerStatusGrid.svelte
├── docker/                   # Docker management
│   ├── ContainerList.svelte
│   ├── SwarmOverview.svelte
│   ├── ServiceDetails.svelte
│   └── DockerDashboard.svelte
├── ErrorBoundary.svelte      # Error handling wrapper
└── [other components]
```

### State Management Patterns

1. **Local Component State**: Using `$state` for component-specific data
2. **Derived State**: Using `$derived` for computed values
3. **Effects**: Using `$effect` for side effects (timers, subscriptions)
4. **Props**: Using `$props` for component inputs

### Routing

SvelteKit's file-based routing with server-side rendering:

- `/` - Home/Portfolio page
- `/api/*` - API endpoints (server routes)
- `/ws/*` - WebSocket endpoints

## Backend Architecture

### API Routes Structure

```
src/routes/
├── api/
│   ├── stats/
│   │   ├── +server.ts              # GET /api/stats
│   │   └── current/+server.ts      # GET /api/stats/current
│   ├── docker/
│   │   ├── containers/+server.ts
│   │   ├── containers/[id]/stats/+server.ts
│   │   ├── services/+server.ts
│   │   ├── nodes/+server.ts
│   │   └── networks/+server.ts
│   ├── history/+server.ts
│   ├── history/aggregate/+server.ts
│   └── health/+server.ts
└── ws/
    └── docker-events/+server.ts     # WebSocket endpoint
```

### Middleware Pipeline

```
Request → CORS → Rate Limit → Auth → Handler → Response
                ↓
         Security Headers
```

1. **CORS Validation**: Origin whitelist check
2. **Rate Limiting**: Per-IP request throttling
3. **Authentication**: API key validation (Bearer token)
4. **Handler**: Route-specific business logic
5. **Security Headers**: CSP, HSTS, XSS protection

### Docker Client Architecture

Refactored from 894-line god file to 9 focused modules:

```
src/lib/docker/
├── types.ts        # Type definitions (516 lines)
├── client.ts       # Docker client initialization (28 lines)
├── containers.ts   # Container operations (147 lines)
├── services.ts     # Swarm services (43 lines)
├── nodes.ts        # Swarm nodes (25 lines)
├── networks.ts     # Docker networks (15 lines)
├── system.ts       # System info (80 lines)
├── events.ts       # Event streaming (61 lines)
└── index.ts        # Barrel exports (40 lines)
```

### Type System Organization

```
src/lib/
├── types/
│   └── index.ts     # Centralized type definitions
│                      - SystemStats
│                      - DockerStats
│                      - ServerInfo
│                      - StatsData
├── docker/types.ts  # Docker-specific types
│                      - ContainerInfo
│                      - ServiceInfo
│                      - NodeInfo
│                      - DockerEvent
└── errors/
    └── index.ts     # Error types
                       - APIError
                       - createErrorResponse
```

## Real-Time Systems

### WebSocket Implementation

**Protocol**: WebSocket over HTTP/HTTPS
**Endpoint**: `/ws/docker-events`
**Features**:
- Real-time Docker event streaming
- Connection management
- Auto-reconnection with backoff
- Event filtering by type

```typescript
// Client-side WebSocket
const ws = new WebSocket('wss://host/ws/docker-events');
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'docker-event') {
    handleDockerEvent(data.event);
  }
};
```

### Live Stats Updates

**Mechanism**: HTTP polling with configurable intervals
**Default**: 30 seconds
**Configurable**: Via `REFRESH_INTERVAL` environment variable

```typescript
$effect(() => {
  const interval = setInterval(fetchStats, refreshInterval);
  return () => clearInterval(interval);
});
```

## Data Layer

### InfluxDB Integration

**Purpose**: Time-series metrics storage
**Schema**:
- Measurements: cpu, memory, disk, system, docker_containers, docker_system
- Retention: 30 days raw, 1 year aggregated
- Downsampling: 5-minute and 1-hour aggregates

**Write Pattern**:
```typescript
await influxClient.writeStats('cpu', {
  server_id: 'server-1',
  usage: 45.2,
  cores: 8
});
```

**Query Pattern**:
```typescript
const data = await influxClient.queryHistory(
  measurement: 'cpu',
  range: '24h',
  server_id: 'server-1'
);
```

## Security Architecture

### Authentication Flow

```
Client → Authorization: Bearer <api-key>
       ↓
Server → Extract key from header
       ↓
       → Compare with STATS_API_KEY env var
       ↓
       → Valid? Proceed : Return 401
```

### Authorization Layers

1. **CORS**: Validates request origin against whitelist
2. **Rate Limiting**: Per-IP request throttling
3. **API Key**: Bearer token validation
4. **Input Validation**: Zod schema validation
5. **Output Sanitization**: Generic error messages

### Security Headers

All responses include:
- `Content-Security-Policy`: Restrictive CSP
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security` (if HTTPS enabled)

## Docker Integration

### Socket Proxy Security

**Component**: Tecnativa Docker Socket Proxy
**Purpose**: Secure access to Docker socket
**Configuration**:
- Read-only access (POST=0, DELETE=0)
- Specific endpoints enabled (containers, services, nodes, networks, tasks)
- No direct socket mounting to application

### Event Subscription

**Mechanism**: Docker Engine Events API
**Events Monitored**:
- Container: start, stop, die, destroy
- Service: create, update, remove
- Node: join, leave

**Implementation**:
```typescript
const cleanup = subscribeToEvents(
  (event) => broadcastToClients(event),
  { type: ['container', 'service'] }
);
```

## Deployment Architecture

### Docker Compose (Development)

```yaml
services:
  portfolio:
    build: .
    ports:
      - "3000:51337"
    environment:
      - STATS_API_KEY
      - ALLOWED_ORIGINS
    depends_on:
      - influxdb
      - docker-proxy
```

### Docker Swarm (Production)

**Features**:
- Service replication
- Rolling updates
- Health checks
- Secrets management
- Overlay networks

**Stack Configuration**:
- Traefik reverse proxy
- Automatic SSL (Let's Encrypt)
- Service discovery
- Load balancing

### Traefik Integration

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.portfolio.rule=Host(`portfolio.example.com`)"
  - "traefik.http.routers.portfolio.tls.certresolver=letsencrypt"
  - "traefik.http.services.portfolio.loadbalancer.server.port=51337"
```

## Monitoring & Observability

### Structured Logging

**Library**: Pino
**Features**:
- JSON structured logs
- Log levels (debug, info, warn, error)
- Redaction of sensitive data
- Child loggers per component

```typescript
import { logger, dockerLogger } from '$lib/logger';

dockerLogger.info({ containerId }, 'Container started');
```

### Health Checks

**Endpoints**:
- `/api/health` - Basic health check
- `/api/health/detailed` - Detailed status
- `/api/health/ready` - Readiness probe
- `/api/health/live` - Liveness probe

**Checks**:
- Application running
- Docker connection
- InfluxDB connection (if enabled)

## Scalability Considerations

### Current Limitations

1. **In-Memory Rate Limiting**: Not shared across instances
   - **Mitigation**: Use Traefik rate limiting for multi-instance deployments
   - **Future**: Redis-backed rate limiting

2. **Single API Key**: No user-specific keys
   - **Mitigation**: Key rotation procedures
   - **Future**: JWT-based authentication with multiple keys

3. **WebSocket State**: Connection state not shared
   - **Mitigation**: Sticky sessions
   - **Future**: Redis Pub/Sub for cross-instance events

### Horizontal Scaling

**Not Recommended Without**:
- External rate limiting (Traefik/nginx)
- Shared WebSocket state (Redis)
- Sticky sessions

**Recommended For**:
- Single-instance deployments
- Docker Swarm with 1 replica
- Vertical scaling (more CPU/RAM)

## Key Design Decisions

### Why SvelteKit 5?

- **Performance**: Minimal runtime overhead
- **Developer Experience**: Excellent TypeScript support
- **Reactivity**: New runes system is intuitive
- **Full-Stack**: File-based routing with API routes

### Why Modular Docker Client?

- **Maintainability**: Single Responsibility Principle
- **Testability**: Easier to test individual modules
- **Type Safety**: Better TypeScript inference
- **Refactoring**: Easier to modify without breaking everything

### Why InfluxDB?

- **Purpose-built**: Designed for time-series data
- **Performance**: Efficient compression and querying
- **Ecosystem**: Grafana integration
- **Operations**: Built-in retention policies

### Why Bun?

- **Speed**: Fast runtime and package manager
- **Compatibility**: Drop-in Node.js replacement
- **TypeScript**: Native TypeScript support
- **Testing**: Built-in test runner

## Trade-offs

### Accepted Trade-offs

1. **In-Memory Rate Limiting**
   - **Pros**: Simple, no external dependencies
   - **Cons**: Not distributed
   - **Mitigation**: Documented limitation, Traefik alternative

2. **Single API Key**
   - **Pros**: Simple, no user management
   - **Cons**: No granular permissions
   - **Mitigation**: Key rotation procedures

3. **Static Adapter (SvelteKit)**
   - **Pros**: Fast, CDN-friendly
   - **Cons**: No server-side rendering for dynamic content
   - **Mitigation**: API routes for dynamic data

4. **HTTP Polling vs WebSocket for Stats**
   - **Pros**: Simpler, works through proxies
   - **Cons**: More overhead than WebSocket
   - **Mitigation**: Configurable intervals

## Performance Optimizations

### Implemented

- **Code Splitting**: SvelteKit automatic code splitting
- **Lazy Loading**: Dynamic imports for heavy components
- **Debouncing**: Input validation debouncing
- **Memoization**: Derived values cached
- **Connection Pooling**: Docker client connection reuse

### Future Opportunities

- **Caching**: Redis for API responses
- **CDN**: Static assets on CDN
- **Compression**: Brotli compression
- **HTTP/2**: Server push for critical assets

## Development Workflow

### Local Development

```bash
# Terminal 1: Stats API
cd services/stats-api && bun run src/index.ts

# Terminal 2: Portfolio
cd /home/mili/Projects/resufolio && bun run dev

# Terminal 3: Docker Compose (for dependencies)
docker-compose up influxdb docker-proxy
```

### Testing Strategy

- **Unit Tests**: Bun test runner
- **Integration Tests**: Docker API mocking
- **E2E Tests**: Playwright
- **Performance Tests**: k6

## Future Architecture Roadmap

### Phase 1: Stability (Current)
- ✅ Core functionality
- ✅ Security hardening
- ✅ Documentation

### Phase 2: Scalability
- Redis for rate limiting
- Redis for WebSocket state
- Multi-key authentication

### Phase 3: Features
- Multi-server monitoring
- Kubernetes integration
- Alerting/notifications
- Custom dashboards

### Phase 4: Enterprise
- RBAC (Role-Based Access Control)
- Audit logging
- SSO integration
- Prometheus metrics

## Resources

- [SvelteKit Documentation](https://kit.svelte.dev/)
- [Docker Engine API](https://docs.docker.com/engine/api/)
- [InfluxDB Documentation](https://docs.influxdata.com/)
- [Traefik Documentation](https://doc.traefik.io/traefik/)

## Support

For architecture questions or suggestions:
- Open an issue in the repository
- Refer to [DEVELOPER.md](DEVELOPER.md) for implementation details
- Check [SECURITY.md](SECURITY.md) for security considerations
