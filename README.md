# Resufolio

A modern, reactive portfolio built with SvelteKit 5, showcasing software engineering and IT infrastructure expertise. Resufolio goes beyond a static portfolio by integrating real-time server monitoring, Docker container management, and WebSocket-powered live updates.

## Overview

Resufolio is more than just a portfolio—it's a demonstration of modern full-stack development and DevOps practices. Originally conceived as a simple resume site, it has evolved into a comprehensive showcase featuring:

- **Real-time Infrastructure Monitoring**: Live CPU, memory, disk, and Docker container statistics
- **Homelab Architecture Visualization**: Interactive diagrams of complex infrastructure
- **Production-Ready Deployment**: Docker Swarm support with Traefik reverse proxy
- **Enterprise-Grade Security**: API key authentication, rate limiting, CORS, CSP, and security headers
- **Metrics Persistence**: InfluxDB integration for historical data analysis

### Key Differentiators

Unlike traditional portfolios, Resufolio demonstrates **actual operational infrastructure skills** by:

- Monitoring live server metrics in real-time
- Managing Docker containers and Swarm services
- Persisting metrics to time-series databases
- Implementing comprehensive security controls
- Providing WebSocket-based live event streaming

## Features

### Real-Time Server Stats Monitoring

- **Live CPU Monitoring**: Real-time CPU usage percentage, load averages (1m, 5m, 15m), and core count
- **Memory Analytics**: Total, used, free memory with usage percentages
- **Disk Usage Tracking**: Per-filesystem disk usage with configurable alerts
- **System Information**: Platform, distribution, hostname, and uptime
- **Historical Data**: Query metrics over configurable time ranges (1h, 6h, 24h, 7d, 30d)

### Docker Container & Swarm Integration

- **Container Management**: List, monitor, and view container details
- **Swarm Overview**: Service replicas, node status, and cluster health
- **Real-Time Events**: WebSocket streaming of container/service events (create, start, stop, die, destroy)
- **Network Visualization**: Docker network topology and configuration
- **Service Discovery**: Automatic discovery of Docker Swarm services

### InfluxDB Metrics Persistence

- **Time-Series Storage**: Automatic persistence of all system and Docker metrics
- **Batch Writes**: Efficient batched writes with configurable flush intervals
- **Query API**: Flexible querying with aggregation (mean, min, max, first, last)
- **Retention Policies**: Configurable data retention for cost-effective storage
- **Multi-Measurement Support**: CPU, memory, disk, and Docker-specific metrics

### WebSocket Real-Time Events

- **Live Event Streaming**: Real-time Docker event notifications
- **Connection Management**: Automatic reconnection and heartbeat/ping-pong
- **Event Filtering**: Subscribe to specific event types (container, service, node, network, task)
- **Multi-Client Support**: Broadcast events to all connected clients
- **Connection Status**: Visual indicators for WebSocket connection state

### Comprehensive Security

- **API Key Authentication**: Bearer token validation for all protected endpoints
- **Rate Limiting**: Per-IP request throttling (configurable read/write limits)
- **CORS Protection**: Origin whitelist enforcement with preflight handling
- **Content Security Policy (CSP)**: Strict CSP headers to prevent XSS attacks
- **Security Headers**: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy
- **HSTS Support**: HTTP Strict Transport Security for HTTPS deployments
- **Request Tracking**: Unique request IDs for debugging and audit trails

### Terminal Easter Egg

Hidden command-line interface accessible via `Ctrl+`` (backtick):

- `help` - Display all available commands
- `about` - Portfolio owner information
- `skills` - Technical skills overview
- `experience` - Work history
- `homelab` - Infrastructure statistics
- `contact` - Contact information
- `secret` - Hidden surprise

### Error Boundaries and Structured Logging

- **Global Error Handling**: SvelteKit error boundaries with graceful degradation
- **Pino Logging**: Structured JSON logging with redaction of sensitive fields
- **Log Levels**: Configurable log levels (debug, info, warn, error)
- **Child Loggers**: Component-specific loggers (database, API, Docker)
- **Pretty Printing**: Human-readable logs in development mode

## Tech Stack

### Frontend

- **Framework**: SvelteKit 5 with Svelte 5 runes for optimal reactivity
- **Language**: TypeScript 5.x with strict type checking
- **Styling**: Tailwind CSS 3.4 with custom configuration
- **Icons**: Lucide Svelte for consistent iconography
- **Animations**: Custom CSS animations + Svelte transitions
- **Build**: Vite 5.x with optimized production builds

### Backend & API

- **Runtime**: Bun (high-performance JavaScript runtime)
- **API Routes**: SvelteKit server-side API routes
- **WebSocket**: Bun-native WebSocket upgrade support
- **Validation**: Zod for runtime type validation

### Infrastructure & DevOps

- **Containerization**: Docker & Docker Compose
- **Orchestration**: Docker Swarm with rolling updates and rollback
- **Reverse Proxy**: Traefik with automatic SSL/TLS via Let's Encrypt
- **Metrics Database**: InfluxDB 2.7 for time-series data
- **Monitoring**: Custom stats collection with systeminformation

### Security

- **Authentication**: API key-based Bearer token auth
- **Rate Limiting**: In-memory rate limiting (Redis-ready for multi-instance)
- **CORS**: Configurable origin whitelist
- **CSP**: Comprehensive Content Security Policy

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Clients                              │
│                  (Browser / curl / API)                     │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTPS
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                     Traefik (Proxy)                         │
│           • SSL/TLS termination                            │
│           • Rate limiting                                  │
│           • Request routing                                │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
┌───────────────┐        ┌─────────────────┐
│   Resufolio   │        │   Stats API     │
│   (SvelteKit) │        │   (Bun)         │
│               │        │                 │
│ • Frontend    │        │ • System stats  │
│ • API routes  │        │ • Docker proxy  │
│ • WebSocket   │        │ • InfluxDB      │
└───────┬───────┘        └────────┬────────┘
        │                         │
        │    ┌────────────────────┘
        │    │
        ▼    ▼
┌─────────────────────────────────────────────────────────────┐
│                  Docker Socket Proxy                        │
│              (Read-only Docker API access)                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    Docker Daemon                            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    InfluxDB 2.7                             │
│              (Time-series metrics storage)                  │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### Development Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/resufolio.git
cd resufolio

# Install dependencies (requires Bun)
bun install

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
# See Configuration section for details

# Run development server
bun run dev

# Open browser at http://localhost:5173
```

### Production Setup (Docker Compose)

```bash
# Create external network for Traefik
docker network create web

# Copy and configure environment
cp .env.example .env
# Edit .env with production values

# Deploy with Docker Compose
docker-compose up -d

# Access at https://your-domain.com (via Traefik)
```

### Docker Swarm Deployment

```bash
# Initialize swarm (if not already)
docker swarm init

# Create secrets
echo "your-influx-username" | docker secret create resufolio_influx_username -
echo "your-influx-password" | docker secret create resufolio_influx_password -
echo "your-influx-token" | docker secret create resufolio_influx_token -
echo "your-api-key" | docker secret create resufolio_stats_api_key -

# Label nodes for placement
docker node update --label-add resufolio.portfolio=true <node-id>
docker node update --label-add resufolio.stats-api=true <node-id>
docker node update --label-add resufolio.influxdb=true <node-id>
docker node update --label-add resufolio.docker-proxy=true <node-id>

# Deploy stack
docker stack deploy -c docker-stack.yml resufolio
```

## Configuration

### Environment Variables

#### Core Application

| Variable    | Default       | Description                               |
| ----------- | ------------- | ----------------------------------------- |
| `NODE_ENV`  | `development` | Environment mode (development/production) |
| `PORT`      | `3000`        | Application port                          |
| `HOST`      | `0.0.0.0`     | Bind address                              |
| `LOG_LEVEL` | `info`        | Logging level (debug/info/warn/error)     |

#### Security

| Variable                       | Default    | Description                           |
| ------------------------------ | ---------- | ------------------------------------- |
| `STATS_API_KEY`                | _required_ | API key for protected endpoints       |
| `ALLOWED_ORIGINS`              | _optional_ | Comma-separated CORS origins          |
| `RATE_LIMIT_READS_PER_MINUTE`  | `100`      | Read request rate limit               |
| `RATE_LIMIT_WRITES_PER_MINUTE` | `20`       | Write request rate limit              |
| `ENABLE_HSTS`                  | `false`    | Enable HTTP Strict Transport Security |
| `HSTS_MAX_AGE`                 | `31536000` | HSTS max-age in seconds               |

#### InfluxDB

| Variable        | Default                 | Description                   |
| --------------- | ----------------------- | ----------------------------- |
| `INFLUX_URL`    | `http://localhost:8086` | InfluxDB URL                  |
| `INFLUX_TOKEN`  | _optional_              | InfluxDB authentication token |
| `INFLUX_ORG`    | `homelab`               | InfluxDB organization         |
| `INFLUX_BUCKET` | `metrics`               | InfluxDB bucket name          |

#### Docker

| Variable      | Default                   | Description             |
| ------------- | ------------------------- | ----------------------- |
| `DOCKER_HOST` | `tcp://docker-proxy:2375` | Docker daemon socket    |
| `SERVER_NAME` | `Homelab Server`          | Display name for server |

### Generating Secure API Keys

```bash
# Generate a 64-character hex API key
openssl rand -hex 32

# Example output:
# fec508045695c85fe478f79f73f946e75c5042d71644a6ecd2c810040b9003b8
```

## API Documentation

### Authentication

All API endpoints (except health check) require Bearer token authentication:

```http
Authorization: Bearer <your-api-key>
```

### Endpoints

#### Health Check

```http
GET /api/health
```

No authentication required. Returns service status.

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "uptime": 3600
}
```

#### System Stats

```http
GET /api/stats
Authorization: Bearer <api-key>
```

**Response:**

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "requestId": "12345-abc",
  "cpu": {
    "usage": 45.2,
    "cores": 8,
    "loadAverage": [0.5, 0.8, 1.2]
  },
  "memory": {
    "total": 16777216000,
    "used": 8589934592,
    "free": 8197283712,
    "usagePercent": "51.20"
  },
  "disk": [...],
  "system": {
    "hostname": "server01",
    "platform": "linux",
    "distro": "Ubuntu 22.04",
    "uptime": 86400
  }
}
```

#### Docker Containers

```http
GET /api/docker/containers
Authorization: Bearer <api-key>
```

#### Docker Services

```http
GET /api/docker/services
Authorization: Bearer <api-key>
```

#### Docker Nodes

```http
GET /api/docker/nodes
Authorization: Bearer <api-key>
```

#### Historical Metrics

```http
GET /api/history?measurement=cpu&range=24h&aggregate=mean
Authorization: Bearer <api-key>
```

Query Parameters:

- `measurement`: cpu, memory, disk, system
- `range`: 1h, 6h, 24h, 7d, 30d
- `aggregate`: mean, min, max, first, last

### WebSocket Events

Connect to `/ws/docker-events` for real-time Docker events:

```javascript
const ws = new WebSocket("wss://your-domain.com/ws/docker-events");

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log("Docker event:", data);
};
```

## Security

Resufolio implements defense in depth with multiple security layers:

### Authentication

- API key required for all stats endpoints
- Bearer token format: `Authorization: Bearer <key>`
- Health check endpoint remains unauthenticated for monitoring

### Rate Limiting

- Per-IP tracking with configurable limits
- Separate limits for read (GET) and write (POST/PUT/DELETE) operations
- Automatic cleanup of expired rate limit entries

### CORS Protection

- Origin whitelist enforcement
- Proper preflight (OPTIONS) handling
- Rejection of unauthorized origins with 403 Forbidden

### Security Headers

All responses include comprehensive security headers:

- `Content-Security-Policy`: Strict CSP to prevent XSS
- `X-Content-Type-Options: nosniff`: Prevent MIME sniffing
- `X-Frame-Options: DENY`: Prevent clickjacking
- `X-XSS-Protection: 1; mode=block`: Legacy XSS protection
- `Strict-Transport-Security`: HSTS when enabled

### Secret Management

- Docker Secrets for Swarm deployments
- Environment variables for local/Compose deployments
- Automatic redaction of sensitive fields in logs

See [docs/SECURITY.md](docs/SECURITY.md) for detailed security documentation.

## Monitoring

### Real-Time Stats Dashboard

The dashboard displays:

- **CPU Usage**: Live percentage with load averages
- **Memory**: Usage bar with exact bytes
- **Disk**: Per-mount usage visualization
- **Docker**: Container counts and service status
- **Connection Status**: WebSocket and API health indicators

### Historical Metrics

InfluxDB enables:

- Time-series visualization
- Trend analysis
- Capacity planning
- Alert threshold monitoring

### Health Checks

All services implement health checks:

```bash
# Check application health
curl http://localhost:3000/api/health

# Check Docker connectivity
curl -H "Authorization: Bearer $STATS_API_KEY" \
  http://localhost:3000/api/docker
```

## Docker

### Development (Docker Compose)

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f portfolio

# Stop services
docker-compose down
```

### Production (Docker Swarm)

```bash
# Deploy stack
docker stack deploy -c docker-stack.yml resufolio

# View services
docker service ls

# Scale portfolio service
docker service scale resufolio_portfolio=3

# View logs
docker service logs resufolio_portfolio -f

# Remove stack
docker stack rm resufolio
```

### Docker Socket Proxy Security

The Docker Socket Proxy provides read-only access to the Docker API:

- **Enabled**: CONTAINERS, SERVICES, NODES, NETWORKS, TASKS, INFO, VERSION
- **Disabled**: POST, DELETE, PUT, PATCH, BUILD, EXEC (all write operations)
- **Network**: Isolated internal network (docker-proxy)

## Project Structure

```
resufolio/
├── src/
│   ├── lib/
│   │   ├── components/          # Svelte components
│   │   │   ├── docker/          # Docker-related components
│   │   │   ├── stats/           # Statistics display components
│   │   │   ├── ErrorBoundary.svelte
│   │   │   ├── Terminal.svelte
│   │   │   └── ...
│   │   ├── data/                # Resume & homelab data
│   │   │   ├── resumeData.ts
│   │   │   └── homelabData.ts
│   │   ├── db/                  # Database clients
│   │   │   └── influx.ts        # InfluxDB client
│   │   ├── docker/              # Docker integration
│   │   │   ├── client.ts        # Docker client wrapper
│   │   │   ├── containers.ts    # Container operations
│   │   │   ├── events.ts        # Event streaming
│   │   │   ├── networks.ts      # Network operations
│   │   │   ├── nodes.ts         # Swarm node operations
│   │   │   ├── services.ts      # Swarm service operations
│   │   │   └── types.ts         # TypeScript definitions
│   │   ├── logger/              # Logging utilities
│   │   │   └── index.ts         # Pino logger configuration
│   │   ├── stores/              # Svelte stores
│   │   ├── utils/               # Utilities and types
│   │   └── validation/          # Zod schemas
│   ├── routes/                  # SvelteKit routes
│   │   ├── api/                 # API endpoints
│   │   │   ├── docker/          # Docker API routes
│   │   │   ├── health/          # Health check
│   │   │   ├── history/         # Historical metrics
│   │   │   ├── proxy/           # Proxy endpoints
│   │   │   └── stats/           # System stats
│   │   ├── ws/                  # WebSocket routes
│   │   │   └── docker-events/   # Docker events WebSocket
│   │   ├── +layout.svelte       # Root layout
│   │   ├── +layout.ts           # Layout config
│   │   └── +page.svelte         # Home page
│   ├── hooks.server.ts          # Server hooks (security)
│   ├── app.html                 # HTML template
│   └── app.css                  # Global styles
├── services/
│   └── stats-api/               # Standalone stats API service
│       ├── src/
│       ├── package.json
│       └── Dockerfile
├── docs/                        # Documentation
│   ├── SECURITY.md
│   ├── SWARM-DEPLOYMENT.md
│   ├── INFLUXDB.md
│   └── DEPLOYMENT.md
├── tests/                       # Test suite
│   ├── api/                     # API tests
│   ├── docker/                  # Docker client tests
│   ├── e2e/                     # End-to-end tests
│   ├── integration/             # Integration tests
│   ├── performance/             # Load tests
│   ├── security/                # Security tests
│   └── utils/                   # Test utilities
├── scripts/                     # Utility scripts
│   └── monitor.ts               # Monitoring script
├── docker-compose.yml           # Docker Compose config
├── docker-stack.yml             # Docker Swarm stack
├── Dockerfile                   # Main app Dockerfile
├── .env.example                 # Environment template
├── svelte.config.js             # SvelteKit config
├── tailwind.config.js           # Tailwind config
├── vite.config.ts               # Vite config
└── README.md                    # This file
```

## Contributing

Contributions are welcome! Please follow these guidelines:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** your changes: `git commit -m 'Add amazing feature'`
4. **Push** to the branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

### Development Guidelines

- Follow TypeScript strict mode
- Use Svelte 5 runes for reactivity
- Add tests for new features
- Update documentation as needed
- Ensure `bun run check` passes
- Run tests with `bun test`

### Code Style

- Use 2 spaces for indentation
- Max line length: 100 characters
- Use semicolons
- Prefer explicit types over implicit

## Troubleshooting

### Common Issues

#### WebSocket Connection Failed

- Check if Bun runtime is being used (WebSocket requires Bun)
- Verify Docker proxy is accessible
- Check firewall rules for WebSocket port

#### 401 Unauthorized

- Verify `STATS_API_KEY` is set correctly
- Check Authorization header format: `Bearer <key>`
- Ensure no extra whitespace in key

#### 403 CORS Error

- Add your domain to `ALLOWED_ORIGINS`
- Ensure protocol matches (http vs https)
- Check if Origin header is sent

#### 429 Rate Limited

- Wait for rate limit window to reset
- Check `X-RateLimit-Reset` header
- Increase limits in configuration if needed

#### InfluxDB Connection Failed

- Verify `INFLUX_URL` and `INFLUX_TOKEN`
- Check InfluxDB is running: `docker-compose ps`
- Review InfluxDB logs: `docker-compose logs influxdb`

#### Docker Connection Failed

- Verify Docker proxy is running
- Check `DOCKER_HOST` environment variable
- Ensure Docker socket is mounted correctly

### Getting Help

- Check [docs/](docs/) for detailed guides
## License

MIT License - see LICENSE file for details.
