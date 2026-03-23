# ResuFolio API Documentation

**Version:** 1.0.0  
**Base URL:** `http://localhost:5173`  
**Last Updated:** 2026-03-23

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Rate Limiting](#rate-limiting)
4. [Error Handling](#error-handling)
5. [Health Endpoints](#health-endpoints)
6. [Stats Endpoints](#stats-endpoints)
7. [Docker Endpoints](#docker-endpoints)
8. [History Endpoints](#history-endpoints)
9. [WebSocket](#websocket)
10. [SDK/Client Usage](#sdkclient-usage)
11. [Changelog](#changelog)

---

## Overview

The ResuFolio API provides comprehensive monitoring capabilities for Docker containers, system statistics, and historical metrics. It offers both RESTful HTTP endpoints and WebSocket connections for real-time event streaming.

### Features

- **System Monitoring:** CPU, memory, and disk usage statistics
- **Docker Integration:** Container, service, and node management
- **Historical Data:** Time-series metrics storage via InfluxDB
- **Real-time Events:** WebSocket stream for Docker lifecycle events
- **Rate Limiting:** Configurable request throttling
- **API Key Authentication:** Secure access control

### Base URL

```
Development: http://localhost:5173
Production:  https://your-domain.com
```

### Content-Type

All API requests and responses use `application/json` unless otherwise specified.

---

## Authentication

### Overview

The ResuFolio API uses Bearer token authentication for all endpoints except the health check. API keys are configured via environment variables on the server.

### Bearer Token Format

```
Authorization: Bearer <your-api-key>
```

### API Key Configuration

The server administrator configures the API key via the `STATS_API_KEY` environment variable:

```bash
# Server configuration
export STATS_API_KEY="your-secure-api-key-here"
```

### Header Requirements

| Header          | Value              | Required      | Description         |
| --------------- | ------------------ | ------------- | ------------------- |
| `Authorization` | `Bearer <api-key>` | Yes\*         | API authentication  |
| `Content-Type`  | `application/json` | No            | Request body format |
| `Origin`        | `<origin-url>`     | Conditionally | Required for CORS   |

\*Not required for `/api/health`

### Request Example

```bash
curl -H "Authorization: Bearer your-api-key-here" \
     http://localhost:5173/api/stats
```

### Unauthorized Response

```json
{
  "error": "Unauthorized",
  "message": "Valid API key required",
  "requestId": "1711209600000-abc123"
}
```

### Security Headers

All responses include the following security headers:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy: default-src 'self' ...`

---

## Rate Limiting

### Overview

Rate limiting is enforced per client IP address to prevent abuse and ensure service availability. Limits are configurable via environment variables.

### Rate Limits

| Operation Type          | Default Limit       | Environment Variable           |
| ----------------------- | ------------------- | ------------------------------ |
| Read (GET/HEAD)         | 100 requests/minute | `RATE_LIMIT_READS_PER_MINUTE`  |
| Write (POST/PUT/DELETE) | 20 requests/minute  | `RATE_LIMIT_WRITES_PER_MINUTE` |

### Rate Limit Headers

| Header                  | Description                           |
| ----------------------- | ------------------------------------- |
| `X-RateLimit-Limit`     | Maximum requests allowed per window   |
| `X-RateLimit-Remaining` | Remaining requests in current window  |
| `X-RateLimit-Reset`     | Unix timestamp when limit resets      |
| `Retry-After`           | Seconds to wait before retry (on 429) |

### Handling 429 Errors

When rate limit is exceeded, the API returns a 429 status code:

```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 45,
  "requestId": "1711209600000-abc123"
}
```

**Retry Strategy:**

```javascript
// Exponential backoff example
async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(url, options);

    if (response.status === 429) {
      const data = await response.json();
      const delay = (data.retryAfter || 60) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
      continue;
    }

    return response;
  }
  throw new Error("Max retries exceeded");
}
```

---

## Error Handling

### Error Format

All errors follow a consistent JSON structure:

```json
{
  "error": "Human-readable error description",
  "message": "Detailed error message (optional)",
  "requestId": "unique-request-identifier",
  "timestamp": "2026-03-23T10:00:00.000Z"
}
```

### HTTP Status Codes

| Code | Meaning               | Description                           |
| ---- | --------------------- | ------------------------------------- |
| 200  | OK                    | Request successful                    |
| 204  | No Content            | Request successful, no body (OPTIONS) |
| 400  | Bad Request           | Invalid parameters or request format  |
| 401  | Unauthorized          | Missing or invalid API key            |
| 403  | Forbidden             | CORS policy violation                 |
| 404  | Not Found             | Resource does not exist               |
| 429  | Too Many Requests     | Rate limit exceeded                   |
| 500  | Internal Server Error | Server-side error                     |
| 503  | Service Unavailable   | Docker or InfluxDB unavailable        |

### Common Errors

#### Invalid Range Parameter

```json
{
  "error": "Invalid range",
  "validRanges": ["1h", "6h", "24h", "7d", "30d"],
  "message": "Range must be one of: 1h, 6h, 24h, 7d, 30d"
}
```

#### Docker Connection Failed

```json
{
  "error": "Docker connection failed",
  "message": "connect ENOENT /var/run/docker.sock",
  "requestId": "1711209600000-abc123",
  "timestamp": "2026-03-23T10:00:00.000Z"
}
```

#### InfluxDB Not Configured

```json
{
  "error": "InfluxDB not configured",
  "message": "Metrics persistence is disabled. Set INFLUX_TOKEN to enable."
}
```

### Request IDs

Every request is assigned a unique `requestId` that can be used for debugging and support. Include this ID when reporting issues.

```
Format: {timestamp}-{random-string}
Example: 1711209600000-abc123def456
```

The request ID is also available in the response header:

```
X-Request-ID: 1711209600000-abc123
```

---

## Health Endpoints

### GET /api/health

**Description:** Basic health check endpoint that returns the service status. Does not require authentication.

**Authentication:** Not Required

**Parameters:** None

**Request Example:**

```bash
curl http://localhost:5173/api/health
```

**Response Example:**

```json
{
  "status": "healthy",
  "timestamp": "2026-03-23T10:00:00.000Z",
  "uptime": 3600.123
}
```

**Response Fields:**

| Field       | Type   | Description                                      |
| ----------- | ------ | ------------------------------------------------ |
| `status`    | string | Current health status ("healthy" or "unhealthy") |
| `timestamp` | string | ISO 8601 timestamp of the check                  |
| `uptime`    | number | Process uptime in seconds                        |

**Response Codes:**

- 200: Service is healthy
- 500: Service is experiencing issues

---

## Stats Endpoints

### GET /api/stats

**Description:** Returns current system statistics including CPU usage, memory consumption, disk usage, and OS information.

**Authentication:** Required

**Parameters:** None

**Request Example:**

```bash
curl -H "Authorization: Bearer your-api-key" \
     http://localhost:5173/api/stats
```

**Response Example:**

```json
{
  "timestamp": "2026-03-23T10:00:00.000Z",
  "requestId": "1711209600000-abc123",
  "cpu": {
    "usage": 23.5,
    "cores": 8,
    "loadAverage": [0.5, 0.6, 0.4]
  },
  "memory": {
    "total": 17179869184,
    "used": 8589934592,
    "free": 8589934592,
    "usagePercent": "50.00"
  },
  "disk": [
    {
      "filesystem": "/dev/sda1",
      "size": 1000204886016,
      "used": 500000000000,
      "available": 500204886016,
      "usagePercent": 49.99,
      "mount": "/"
    }
  ],
  "system": {
    "platform": "linux",
    "distro": "Ubuntu",
    "release": "22.04",
    "hostname": "resufolio-server",
    "uptime": 86400
  }
}
```

**Response Fields:**

| Field                 | Type   | Description                       |
| --------------------- | ------ | --------------------------------- |
| `timestamp`           | string | ISO 8601 timestamp                |
| `requestId`           | string | Unique request identifier         |
| `cpu.usage`           | number | Current CPU usage percentage      |
| `cpu.cores`           | number | Number of CPU cores               |
| `cpu.loadAverage`     | array  | 1, 5, and 15-minute load averages |
| `memory.total`        | number | Total memory in bytes             |
| `memory.used`         | number | Used memory in bytes              |
| `memory.free`         | number | Free memory in bytes              |
| `memory.usagePercent` | string | Memory usage percentage           |
| `disk`                | array  | Disk usage per filesystem         |
| `system.platform`     | string | Operating system platform         |
| `system.distro`       | string | Linux distribution                |
| `system.hostname`     | string | System hostname                   |
| `system.uptime`       | number | System uptime in seconds          |

**Response Codes:**

- 200: Statistics retrieved successfully
- 401: Unauthorized
- 429: Rate limit exceeded
- 500: Failed to fetch system statistics

---

### GET /api/docker

**Description:** Returns comprehensive Docker system information including version, container counts, and system resources.

**Authentication:** Required

**Parameters:** None

**Request Example:**

```bash
curl -H "Authorization: Bearer your-api-key" \
     http://localhost:5173/api/docker
```

**Response Example:**

```json
{
  "timestamp": "2026-03-23T10:00:00.000Z",
  "requestId": "1711209600000-abc123",
  "system": {
    "name": "docker-host",
    "serverVersion": "24.0.7",
    "architecture": "x86_64",
    "osType": "linux",
    "kernelVersion": "5.15.0",
    "cpus": 8,
    "memory": 17179869184,
    "containers": {
      "running": 5,
      "paused": 0,
      "stopped": 2,
      "total": 7
    },
    "images": 15
  },
  "containers": [
    {
      "id": "a1b2c3d4e5f6",
      "names": ["/web-server"],
      "image": "nginx:latest",
      "state": "running",
      "status": "Up 2 hours",
      "ports": [
        {
          "private": 80,
          "public": 8080,
          "type": "tcp"
        }
      ],
      "created": "2026-03-23T08:00:00.000Z"
    }
  ]
}
```

**Response Codes:**

- 200: Docker statistics retrieved successfully
- 401: Unauthorized
- 429: Rate limit exceeded
- 500: Failed to fetch Docker statistics
- 503: Docker daemon not accessible

---

## Docker Endpoints

### GET /api/docker/containers

**Description:** Returns a detailed list of all Docker containers including configuration, networking, mounts, and computed health status.

**Authentication:** Required

**Parameters:** None

**Request Example:**

```bash
curl -H "Authorization: Bearer your-api-key" \
     http://localhost:5173/api/docker/containers
```

**Response Example:**

```json
{
  "timestamp": "2026-03-23T10:00:00.000Z",
  "requestId": "1711209600000-abc123",
  "count": 3,
  "running": 2,
  "containers": [
    {
      "id": "a1b2c3d4e5f6",
      "fullId": "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6",
      "names": ["web-server"],
      "image": "nginx:latest",
      "imageId": "sha256:abc123...",
      "command": "nginx -g 'daemon off;'",
      "created": "2026-03-23T08:00:00.000Z",
      "state": "running",
      "status": "Up 2 hours (healthy)",
      "ports": [
        {
          "ip": "0.0.0.0",
          "private": 80,
          "public": 8080,
          "type": "tcp"
        }
      ],
      "labels": {
        "app": "web",
        "environment": "production"
      },
      "networkMode": "bridge",
      "networks": ["bridge"],
      "mounts": [],
      "isRunning": true,
      "health": "healthy"
    }
  ]
}
```

**Container Fields:**

| Field       | Type    | Description                                        |
| ----------- | ------- | -------------------------------------------------- |
| `id`        | string  | Short container ID (12 chars)                      |
| `fullId`    | string  | Full container ID (64 chars)                       |
| `names`     | array   | Container names (without leading slash)            |
| `image`     | string  | Container image name                               |
| `state`     | string  | Container state (running, exited, etc.)            |
| `status`    | string  | Human-readable status                              |
| `ports`     | array   | Port mappings                                      |
| `labels`    | object  | Container labels                                   |
| `networks`  | array   | Connected networks                                 |
| `mounts`    | array   | Volume mounts                                      |
| `isRunning` | boolean | Whether container is running                       |
| `health`    | string  | Computed health status (healthy/unhealthy/unknown) |

**Response Codes:**

- 200: Containers retrieved successfully
- 401: Unauthorized
- 429: Rate limit exceeded
- 500: Failed to fetch containers
- 503: Docker connection failed

---

### GET /api/docker/containers/:id/stats

**Description:** Returns real-time resource usage statistics for a specific container including CPU, memory, network, and block I/O metrics.

**Authentication:** Required

**Parameters:**

| Name | Type   | In   | Required | Description                  |
| ---- | ------ | ---- | -------- | ---------------------------- |
| `id` | string | path | Yes      | Container ID (short or full) |

**Request Example:**

```bash
curl -H "Authorization: Bearer your-api-key" \
     http://localhost:5173/api/docker/containers/a1b2c3d4e5f6/stats
```

**Response Example:**

```json
{
  "timestamp": "2026-03-23T10:00:00.000Z",
  "requestId": "1711209600000-abc123",
  "containerId": "a1b2c3d4e5f6",
  "stats": {
    "cpu": {
      "percent": 15.3,
      "status": "normal"
    },
    "memory": {
      "usage": 134217728,
      "limit": 1073741824,
      "percent": 12.5,
      "usageFormatted": "128 MB",
      "limitFormatted": "1 GB",
      "status": "normal"
    },
    "network": {
      "rx": 10485760,
      "tx": 5242880,
      "rxFormatted": "10 MB",
      "txFormatted": "5 MB"
    },
    "block": {
      "read": 2097152,
      "write": 1048576,
      "readFormatted": "2 MB",
      "writeFormatted": "1 MB"
    },
    "pids": 5,
    "collectedAt": "2026-03-23T10:00:00.000Z"
  }
}
```

**Stats Fields:**

| Field            | Type   | Description                                              |
| ---------------- | ------ | -------------------------------------------------------- |
| `cpu.percent`    | number | CPU usage percentage                                     |
| `cpu.status`     | string | Status: normal (<50%), medium (50-80%), high (>80%)      |
| `memory.usage`   | number | Memory usage in bytes                                    |
| `memory.limit`   | number | Memory limit in bytes                                    |
| `memory.percent` | number | Memory usage percentage                                  |
| `memory.status`  | string | Status: normal (<75%), warning (75-90%), critical (>90%) |
| `network.rx`     | number | Bytes received                                           |
| `network.tx`     | number | Bytes transmitted                                        |
| `block.read`     | number | Bytes read from disk                                     |
| `block.write`    | number | Bytes written to disk                                    |
| `pids`           | number | Number of processes                                      |

**Response Codes:**

- 200: Container stats retrieved successfully
- 401: Unauthorized
- 404: Container not found
- 429: Rate limit exceeded
- 500: Failed to fetch container stats
- 503: Docker connection failed

---

### GET /api/docker/services

**Description:** Returns Docker Swarm services with replica status, resource constraints, and optional task details. Returns empty array if Swarm mode is not enabled.

**Authentication:** Required

**Query Parameters:**

| Name           | Type    | Required | Default | Description                           |
| -------------- | ------- | -------- | ------- | ------------------------------------- |
| `includeTasks` | boolean | No       | false   | Include task details for each service |

**Request Example:**

```bash
# Basic service list
curl -H "Authorization: Bearer your-api-key" \
     http://localhost:5173/api/docker/services

# Include tasks
curl -H "Authorization: Bearer your-api-key" \
     "http://localhost:5173/api/docker/services?includeTasks=true"
```

**Response Example:**

```json
{
  "timestamp": "2026-03-23T10:00:00.000Z",
  "requestId": "1711209600000-abc123",
  "swarmMode": true,
  "count": 2,
  "services": [
    {
      "id": "s1s2s3s4s5s6",
      "fullId": "s1s2s3s4s5s6s1s2s3s4s5s6s1s2s3s4s5s6s1s2s3s4s5s6",
      "name": "web-api",
      "version": 42,
      "createdAt": "2026-03-20T10:00:00.000Z",
      "updatedAt": "2026-03-23T09:00:00.000Z",
      "image": "myapp/api:v1.2.3",
      "labels": {
        "app": "api",
        "environment": "production"
      },
      "replicas": {
        "desired": 3,
        "running": 3,
        "pending": 0
      },
      "resources": {
        "limits": {
          "cpus": "1.00 CPUs",
          "memory": "512 MB"
        },
        "reservations": {
          "cpus": "0.50 CPUs",
          "memory": "256 MB"
        }
      },
      "networks": ["backend"],
      "ports": [
        {
          "name": "http",
          "protocol": "tcp",
          "target": 3000,
          "published": 80,
          "mode": "ingress"
        }
      ],
      "placement": {
        "constraints": ["node.role==worker"],
        "preferences": []
      },
      "updateStatus": null,
      "status": {
        "health": "healthy",
        "message": "3/3 replicas running"
      }
    }
  ]
}
```

**Service Fields:**

| Field                    | Type   | Description                                         |
| ------------------------ | ------ | --------------------------------------------------- |
| `name`                   | string | Service name                                        |
| `replicas.desired`       | number | Desired number of replicas                          |
| `replicas.running`       | number | Currently running replicas                          |
| `replicas.pending`       | number | Pending/starting replicas                           |
| `resources.limits`       | object | Resource limits (CPU, memory)                       |
| `resources.reservations` | object | Resource reservations                               |
| `networks`               | array  | Attached networks                                   |
| `ports`                  | array  | Published ports                                     |
| `status.health`          | string | Service health (healthy/degraded/unhealthy/stopped) |
| `tasks`                  | array  | Task details (if includeTasks=true)                 |

**Response Codes:**

- 200: Services retrieved successfully (or empty if no Swarm)
- 401: Unauthorized
- 429: Rate limit exceeded
- 500: Failed to fetch services
- 503: Docker connection failed

---

### GET /api/docker/nodes

**Description:** Returns Docker Swarm nodes with their roles, resources, and health status. Includes cluster summary information.

**Authentication:** Required

**Parameters:** None

**Request Example:**

```bash
curl -H "Authorization: Bearer your-api-key" \
     http://localhost:5173/api/docker/nodes
```

**Response Example:**

```json
{
  "timestamp": "2026-03-23T10:00:00.000Z",
  "requestId": "1711209600000-abc123",
  "swarmMode": true,
  "summary": {
    "total": 3,
    "managers": 1,
    "workers": 2,
    "healthy": 3,
    "leader": "manager-01"
  },
  "nodes": [
    {
      "id": "n1n2n3n4n5n6",
      "fullId": "n1n2n3n4n5n6n1n2n3n4n5n6n1n2n3n4n5n6n1n2n3n4n5n6",
      "hostname": "manager-01",
      "name": "manager-01",
      "role": "manager",
      "availability": "active",
      "isManager": true,
      "isLeader": true,
      "status": {
        "state": "ready",
        "message": "",
        "address": "192.168.1.10"
      },
      "platform": {
        "architecture": "x86_64",
        "os": "linux"
      },
      "resources": {
        "cpus": "4.00 CPUs",
        "memory": "16 GB",
        "genericResources": []
      },
      "engine": {
        "version": "24.0.7",
        "labels": {},
        "plugins": []
      },
      "health": {
        "status": "healthy",
        "reachable": true
      }
    }
  ]
}
```

**Node Fields:**

| Field              | Type    | Description                           |
| ------------------ | ------- | ------------------------------------- |
| `hostname`         | string  | Node hostname                         |
| `role`             | string  | Node role (manager/worker)            |
| `availability`     | string  | Availability (active/pause/drain)     |
| `isManager`        | boolean | Whether node is a manager             |
| `isLeader`         | boolean | Whether node is the swarm leader      |
| `status.state`     | string  | Node state (ready/down)               |
| `status.address`   | string  | Node IP address                       |
| `resources.cpus`   | string  | Available CPUs                        |
| `resources.memory` | string  | Available memory                      |
| `health.status`    | string  | Health status (healthy/down/degraded) |

**Summary Fields:**

| Field      | Type   | Description             |
| ---------- | ------ | ----------------------- |
| `total`    | number | Total nodes in swarm    |
| `managers` | number | Number of manager nodes |
| `workers`  | number | Number of worker nodes  |
| `healthy`  | number | Number of healthy nodes |
| `leader`   | string | Hostname of the leader  |

**Response Codes:**

- 200: Nodes retrieved successfully
- 401: Unauthorized
- 429: Rate limit exceeded
- 500: Failed to fetch nodes
- 503: Docker connection failed

---

## History Endpoints

### GET /api/history

**Description:** Queries historical metrics data from InfluxDB. Returns time-series data points for the specified measurement and time range.

**Authentication:** Required

**Query Parameters:**

| Name          | Type   | Required | Default | Valid Values                                                            |
| ------------- | ------ | -------- | ------- | ----------------------------------------------------------------------- |
| `measurement` | string | No       | `cpu`   | `cpu`, `memory`, `disk`, `system`, `docker_containers`, `docker_system` |
| `range`       | string | No       | `1h`    | `1h`, `6h`, `24h`, `7d`, `30d`                                          |
| `server_id`   | string | No       | -       | Server hostname to filter by                                            |
| `aggregate`   | string | No       | `mean`  | `mean`, `min`, `max`, `first`, `last`                                   |

**Request Example:**

```bash
# CPU usage for last hour
curl -H "Authorization: Bearer your-api-key" \
     "http://localhost:5173/api/history?measurement=cpu&range=1h"

# Memory usage aggregated by max for last 24 hours
curl -H "Authorization: Bearer your-api-key" \
     "http://localhost:5173/api/history?measurement=memory&range=24h&aggregate=max"
```

**Response Example:**

```json
{
  "measurement": "cpu",
  "range": "1h",
  "serverId": "resufolio-server",
  "aggregate": "mean",
  "count": 60,
  "queryTimeMs": 45,
  "requestId": "1711209600000-abc123",
  "timestamp": "2026-03-23T10:00:00.000Z",
  "data": [
    {
      "time": "2026-03-23T09:00:00.000Z",
      "value": 23.5,
      "field": "usage",
      "tags": {
        "server_id": "resufolio-server",
        "metric_type": "usage"
      }
    },
    {
      "time": "2026-03-23T09:01:00.000Z",
      "value": 25.1,
      "field": "usage",
      "tags": {
        "server_id": "resufolio-server",
        "metric_type": "usage"
      }
    }
  ]
}
```

**Data Point Fields:**

| Field              | Type   | Description                           |
| ------------------ | ------ | ------------------------------------- |
| `time`             | string | ISO 8601 timestamp                    |
| `value`            | number | Metric value                          |
| `field`            | string | Field name (usage, total, used, etc.) |
| `tags.server_id`   | string | Server identifier                     |
| `tags.metric_type` | string | Type of metric                        |
| `tags.filesystem`  | string | Filesystem path (for disk metrics)    |

**Aggregation Windows:**

| Range | Window Size | Data Points (approx) |
| ----- | ----------- | -------------------- |
| 1h    | 1 minute    | 60                   |
| 6h    | 5 minutes   | 72                   |
| 24h   | 15 minutes  | 96                   |
| 7d    | 1 hour      | 168                  |
| 30d   | 6 hours     | 120                  |

**Response Codes:**

- 200: History data retrieved successfully
- 400: Invalid measurement or range parameter
- 401: Unauthorized
- 429: Rate limit exceeded
- 500: Failed to query historical data
- 503: InfluxDB not configured

---

### GET /api/history/aggregate

**Description:** Returns aggregated statistics (min, max, average) for the specified measurement over a time range.

**Authentication:** Required

**Query Parameters:**

| Name          | Type   | Required | Default | Valid Values                                                            |
| ------------- | ------ | -------- | ------- | ----------------------------------------------------------------------- |
| `measurement` | string | No       | `cpu`   | `cpu`, `memory`, `disk`, `system`, `docker_containers`, `docker_system` |
| `range`       | string | No       | `24h`   | `1h`, `6h`, `24h`, `7d`, `30d`                                          |
| `server_id`   | string | No       | -       | Server hostname to filter by                                            |

**Request Example:**

```bash
# CPU statistics for last 7 days
curl -H "Authorization: Bearer your-api-key" \
     "http://localhost:5173/api/history/aggregate?measurement=cpu&range=7d"
```

**Response Example:**

```json
{
  "measurement": "cpu",
  "range": "7d",
  "serverId": "resufolio-server",
  "queryTimeMs": 120,
  "requestId": "1711209600000-abc123",
  "timestamp": "2026-03-23T10:00:00.000Z",
  "stats": {
    "min": 5.2,
    "max": 89.4,
    "avg": 32.7,
    "count": 168
  }
}
```

**Stats Fields:**

| Field   | Type   | Description            |
| ------- | ------ | ---------------------- |
| `min`   | number | Minimum value in range |
| `max`   | number | Maximum value in range |
| `avg`   | number | Average (mean) value   |
| `count` | number | Number of data points  |

**Response Codes:**

- 200: Aggregate data retrieved successfully
- 400: Invalid measurement or range parameter
- 401: Unauthorized
- 429: Rate limit exceeded
- 500: Failed to query aggregate data
- 503: InfluxDB not configured

---

## WebSocket

### WS /ws/docker-events

**Description:** Real-time WebSocket connection that streams Docker lifecycle events including container, service, node, network, and task events.

**Authentication:** Required (via query parameter or headers)

**Protocol:** WebSocket (ws:// or wss://)

**Connection Example:**

```javascript
// Browser JavaScript
const ws = new WebSocket("ws://localhost:5173/ws/docker-events");

ws.onopen = () => {
  console.log("Connected to Docker events");
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log("Event:", data);
};

ws.onerror = (error) => {
  console.error("WebSocket error:", error);
};

ws.onclose = () => {
  console.log("Disconnected");
};
```

### Message Types

#### Connection Message

Sent immediately upon successful connection:

```json
{
  "type": "connection",
  "status": "connected",
  "timestamp": "2026-03-23T10:00:00.000Z",
  "docker": {
    "version": "24.0.7",
    "apiVersion": "1.43",
    "platform": "linux"
  },
  "error": null
}
```

#### Docker Event Message

Streamed when Docker events occur:

```json
{
  "type": "docker-event",
  "timestamp": "2026-03-23T10:00:00.000Z",
  "event": {
    "type": "container",
    "action": "start",
    "actor": {
      "id": "a1b2c3d4e5f6a1b2c3d4e5f6",
      "attributes": {
        "image": "nginx:latest",
        "name": "web-server"
      }
    },
    "time": 1711209600,
    "timeNano": 1711209600000000000,
    "scope": "local"
  }
}
```

**Event Types:**

| Type        | Description                 |
| ----------- | --------------------------- |
| `container` | Container lifecycle events  |
| `service`   | Docker Swarm service events |
| `node`      | Swarm node events           |
| `network`   | Network events              |
| `task`      | Swarm task events           |

**Event Actions:**

| Action    | Description               |
| --------- | ------------------------- |
| `create`  | Resource created          |
| `start`   | Container/service started |
| `stop`    | Container stopped         |
| `die`     | Container exited          |
| `destroy` | Resource removed          |
| `update`  | Resource updated          |
| `remove`  | Resource deleted          |

#### Ping/Pong Messages

For keepalive (client-initiated):

```javascript
// Send ping
ws.send(JSON.stringify({ type: 'ping' }));

// Receive pong
{
  "type": "pong",
  "timestamp": "2026-03-23T10:00:00.000Z"
}
```

#### Subscription Messages

Filter events (client-initiated):

```javascript
// Subscribe to specific event types
ws.send(JSON.stringify({
  type: 'subscribe',
  filters: {
    type: ['container'],
    action: ['start', 'stop']
  }
}));

// Acknowledgment
{
  "type": "subscribed",
  "filters": "all",
  "timestamp": "2026-03-23T10:00:00.000Z"
}
```

### Connection States

| Status      | Description                             |
| ----------- | --------------------------------------- |
| `connected` | Successfully connected to Docker daemon |
| `error`     | Connection or Docker error occurred     |

### Error Handling

Connection errors return standard HTTP status codes before WebSocket upgrade:

- 400: Not a WebSocket upgrade request
- 503: Docker connection failed
- 500: WebSocket setup failed

### Requirements

- **Runtime:** Bun (uses Bun-specific WebSocket upgrade API)
- **CORS:** Configurable via `ALLOWED_ORIGINS` environment variable

---

## SDK/Client Usage

### TypeScript Client

```typescript
// api-client.ts

interface ApiConfig {
  baseUrl: string;
  apiKey: string;
}

class ResuFolioClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(config: ApiConfig) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
  }

  private async request<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`${error.error}: ${error.message}`);
    }

    return response.json();
  }

  // Health check
  async health(): Promise<{
    status: string;
    timestamp: string;
    uptime: number;
  }> {
    return this.request("/api/health");
  }

  // System stats
  async getStats() {
    return this.request("/api/stats");
  }

  // Docker containers
  async getContainers() {
    return this.request("/api/docker/containers");
  }

  // Container stats
  async getContainerStats(id: string) {
    return this.request(`/api/docker/containers/${id}/stats`);
  }

  // Docker services
  async getServices(includeTasks?: boolean) {
    const query = includeTasks ? "?includeTasks=true" : "";
    return this.request(`/api/docker/services${query}`);
  }

  // Docker nodes
  async getNodes() {
    return this.request("/api/docker/nodes");
  }

  // Historical data
  async getHistory(
    options: {
      measurement?: string;
      range?: string;
      serverId?: string;
      aggregate?: string;
    } = {},
  ) {
    const params = new URLSearchParams();
    if (options.measurement) params.set("measurement", options.measurement);
    if (options.range) params.set("range", options.range);
    if (options.serverId) params.set("server_id", options.serverId);
    if (options.aggregate) params.set("aggregate", options.aggregate);

    return this.request(`/api/history?${params}`);
  }

  // WebSocket connection
  connectToEvents(onMessage: (data: any) => void): WebSocket {
    const ws = new WebSocket(
      `${this.baseUrl.replace("http", "ws")}/ws/docker-events`,
    );

    ws.onmessage = (event) => {
      onMessage(JSON.parse(event.data));
    };

    return ws;
  }
}

// Usage
const client = new ResuFolioClient({
  baseUrl: "http://localhost:5173",
  apiKey: "your-api-key-here",
});

// Get system stats
const stats = await client.getStats();
console.log(`CPU: ${stats.cpu.usage}%`);

// Stream Docker events
const ws = client.connectToEvents((event) => {
  console.log("Docker event:", event);
});
```

### JavaScript Example

```javascript
// Simple API wrapper
class ResuFolioAPI {
  constructor(baseUrl, apiKey) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  async fetch(endpoint) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    return response.json();
  }

  health() {
    return this.fetch("/api/health");
  }

  stats() {
    return this.fetch("/api/stats");
  }

  containers() {
    return this.fetch("/api/docker/containers");
  }

  containerStats(id) {
    return this.fetch(`/api/docker/containers/${id}/stats`);
  }
}

// Usage
const api = new ResuFolioAPI("http://localhost:5173", "your-api-key");

api.stats().then((data) => {
  console.log("Memory usage:", data.memory.usagePercent + "%");
});
```

### cURL Examples

```bash
# Set your API key
export API_KEY="your-api-key-here"
export BASE_URL="http://localhost:5173"

# Health check
curl $BASE_URL/api/health

# System stats
curl -H "Authorization: Bearer $API_KEY" \
     $BASE_URL/api/stats

# Docker system info
curl -H "Authorization: Bearer $API_KEY" \
     $BASE_URL/api/docker

# List containers
curl -H "Authorization: Bearer $API_KEY" \
     $BASE_URL/api/docker/containers

# Container stats
curl -H "Authorization: Bearer $API_KEY" \
     $BASE_URL/api/docker/containers/abc123/stats

# List services
curl -H "Authorization: Bearer $API_KEY" \
     $BASE_URL/api/docker/services

# List nodes
curl -H "Authorization: Bearer $API_KEY" \
     $BASE_URL/api/docker/nodes

# Historical CPU data
curl -H "Authorization: Bearer $API_KEY" \
     "$BASE_URL/api/history?measurement=cpu&range=24h"

# Historical memory with max aggregation
curl -H "Authorization: Bearer $API_KEY" \
     "$BASE_URL/api/history?measurement=memory&range=7d&aggregate=max"

# Aggregate statistics
curl -H "Authorization: Bearer $API_KEY" \
     "$BASE_URL/api/history/aggregate?measurement=cpu&range=7d"
```

---

## Changelog

### Version 1.0.0 (2026-03-23)

**Added:**

- Initial API release
- Health check endpoint (`/api/health`)
- System statistics endpoint (`/api/stats`)
- Docker containers endpoint (`/api/docker/containers`)
- Container statistics endpoint (`/api/docker/containers/:id/stats`)
- Docker services endpoint (`/api/docker/services`)
- Docker nodes endpoint (`/api/docker/nodes`)
- Docker system endpoint (`/api/docker`)
- Historical metrics endpoints (`/api/history`, `/api/history/aggregate`)
- WebSocket Docker events stream (`/ws/docker-events`)
- Bearer token authentication
- Rate limiting (100 reads/min, 20 writes/min)
- CORS support
- Security headers
- InfluxDB integration for metrics persistence

**Features:**

- Real-time container resource monitoring
- Docker Swarm support (services, nodes, tasks)
- Time-series data storage and querying
- Configurable aggregation functions
- WebSocket event streaming
- Request ID tracking for debugging

---

## Environment Configuration

The following environment variables configure the API:

| Variable                       | Required | Default               | Description                   |
| ------------------------------ | -------- | --------------------- | ----------------------------- |
| `STATS_API_KEY`                | Yes      | -                     | API authentication key        |
| `ALLOWED_ORIGINS`              | No       | -                     | Comma-separated CORS origins  |
| `RATE_LIMIT_READS_PER_MINUTE`  | No       | 100                   | Read operation rate limit     |
| `RATE_LIMIT_WRITES_PER_MINUTE` | No       | 20                    | Write operation rate limit    |
| `INFLUX_URL`                   | No       | http://localhost:8086 | InfluxDB URL                  |
| `INFLUX_TOKEN`                 | No       | -                     | InfluxDB authentication token |
| `INFLUX_ORG`                   | No       | homelab               | InfluxDB organization         |
| `INFLUX_BUCKET`                | No       | metrics               | InfluxDB bucket name          |
| `ENABLE_HSTS`                  | No       | false                 | Enable HSTS header            |
| `HSTS_MAX_AGE`                 | No       | 31536000              | HSTS max-age in seconds       |

---

## Support

For issues, questions, or feature requests:

1. Include the `requestId` from error responses
2. Check the error message for specific details
3. Verify your API key and permissions
4. Ensure Docker and InfluxDB are accessible

---

_Documentation generated for ResuFolio v1.0.0_
