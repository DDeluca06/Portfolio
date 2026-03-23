# Docker Swarm Deployment Guide

This guide covers the complete setup and deployment of Resufolio using Docker Swarm for production environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Architecture Overview](#architecture-overview)
3. [Initial Setup](#initial-setup)
4. [Secrets Management](#secrets-management)
5. [Deployment](#deployment)
6. [Updating Services](#updating-services)
7. [Rollback Procedures](#rollback-procedures)
8. [Monitoring](#monitoring)
9. [Backup and Restore](#backup-and-restore)
10. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software

- Docker Engine 20.10+ with Swarm mode
- Docker Compose 2.0+
- Git (for cloning repository)
- OpenSSL (for generating secrets)

### Infrastructure Requirements

- At least 1 node (manager) - 3+ recommended for high availability
- Traefik reverse proxy (for SSL/TLS termination)
- External network: `traefik-web`

### Node Specifications

**Minimum:**
- 1 vCPU
- 512MB RAM
- 10GB storage

**Recommended:**
- 2 vCPUs
- 1GB RAM
- 20GB storage

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Traefik                             │
│                    (Reverse Proxy)                          │
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┴───────────────┐
        │                               │
        ▼                               ▼
┌───────────────┐             ┌───────────────────┐
│  Portfolio    │             │  Stats API        │
│  (Port 51337) │◄───────────►│  (Port 3000)      │
└───────┬───────┘             └─────────┬─────────┘
        │                               │
        │         ┌───────────────────┐ │
        │         │   InfluxDB        │ │
        └────────►│   (Port 8086)     │◄┘
                  └───────────────────┘
                          ▲
                          │
                  ┌───────┴───────┐
                  │ Docker Proxy  │
                  │ (Socket Access)│
                  └───────────────┘
```

### Services

| Service | Image | Purpose | Replicas |
|---------|-------|---------|----------|
| portfolio | resufolio:latest | Main portfolio application | 1 |
| stats-api | resufolio-stats-api:latest | System metrics API | 1 |
| influxdb | influxdb:2.7-alpine | Metrics storage | 1 |
| docker-proxy | tecnativa/docker-socket-proxy | Secure Docker API access | 1 |

### Networks

| Network | Type | Purpose |
|---------|------|---------|
| web | External | Traefik ingress traffic |
| backend | Overlay (internal) | Service-to-service communication |
| docker-proxy | Overlay (internal) | Docker API access |

## Initial Setup

### 1. Initialize Docker Swarm

```bash
# Initialize Swarm (run on manager node)
docker swarm init --advertise-addr <MANAGER-IP>

# Join worker nodes (copy command from init output)
docker swarm join --token <TOKEN> <MANAGER-IP>:2377
```

### 2. Create Traefik Network

```bash
# Create external network for Traefik
docker network create --driver overlay --attachable traefik-web
```

### 3. Label Nodes

Label nodes to indicate which services should run on them:

```bash
# Get node ID
NODE_ID=$(docker info --format '{{.Swarm.NodeID}}')

# Add labels for each service
docker node update --label-add resufolio.portfolio=true $NODE_ID
docker node update --label-add resufolio.stats-api=true $NODE_ID
docker node update --label-add resufolio.influxdb=true $NODE_ID
docker node update --label-add resufolio.docker-proxy=true $NODE_ID
```

### 4. Clone Repository

```bash
git clone <repository-url>
cd resufolio
```

### 5. Configure Environment

Create `.env` file:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Required
DOMAIN=your-domain.com
STATS_API_KEY=your-secure-api-key

# InfluxDB
INFLUX_ADMIN_PASSWORD=secure-password
INFLUX_ADMIN_TOKEN=your-token-here
INFLUX_ORG=homelab
INFLUX_BUCKET=metrics

# Rate limiting
RATE_LIMIT_READS_PER_MINUTE=100
RATE_LIMIT_WRITES_PER_MINUTE=20

# CORS
ALLOWED_ORIGINS=https://your-domain.com
```

## Secrets Management

Docker Swarm secrets provide secure credential storage.

### Creating Secrets

Use the provided script:

```bash
./scripts/setup-secrets.sh
```

Or create manually:

```bash
# InfluxDB credentials
echo -n "admin" | docker secret create resufolio_influx_username -
echo -n "secure-password" | docker secret create resufolio_influx_password -
echo -n "your-token-min-32-chars-long" | docker secret create resufolio_influx_token -

# Stats API key
openssl rand -base64 32 | docker secret create resufolio_stats_api_key -
```

### Rotating Secrets

Secrets are immutable. To rotate:

```bash
# 1. Create new secret with new name
echo -n "new-password" | docker secret create resufolio_influx_password_v2 -

# 2. Update service to use new secret
docker service update \
  --secret-rm resufolio_influx_password \
  --secret-add source=resufolio_influx_password_v2,target=influx_password \
  resufolio_influxdb

# 3. Remove old secret
docker secret rm resufolio_influx_password
```

### Listing Secrets

```bash
# View all secrets
docker secret ls

# Inspect a secret (metadata only, not value)
docker secret inspect resufolio_influx_token
```

## Deployment

### Full Stack Deployment

```bash
# Deploy the complete stack
./scripts/deploy.sh resufolio your-domain.com

# Or if DOMAIN is set in .env
./scripts/deploy.sh
```

### Manual Deployment

```bash
# Build images
docker build -t resufolio:latest -f Dockerfile .
docker build -t resufolio-stats-api:latest -f services/stats-api/Dockerfile services/stats-api/

# Deploy stack
docker stack deploy -c docker-stack.yml --with-registry-auth resufolio
```

### Verifying Deployment

```bash
# List services
docker stack ps resufolio

# Check service status
docker service ls --filter "name=resufolio"

# View logs
docker service logs resufolio_portfolio -f
docker service logs resufolio_stats-api -f
```

## Updating Services

### Rolling Updates

Update a specific service:

```bash
./scripts/update.sh resufolio portfolio
```

Update all services:

```bash
./scripts/update.sh resufolio
```

### Manual Service Update

```bash
# Update image
docker service update --image resufolio:latest resufolio_portfolio

# Force restart (with same image)
docker service update --force resufolio_portfolio

# Update environment variable
docker service update --env-add "DEBUG=true" resufolio_portfolio
```

### Update Configuration

The stack uses rolling updates with these settings:

- **parallelism**: 1 (update one replica at a time)
- **delay**: 10s (wait between updates)
- **order**: start-first (start new container before stopping old)
- **monitor**: 60s (monitor for failures)
- **failure_action**: rollback (automatic rollback on failure)

## Rollback Procedures

### Automatic Rollback

If an update fails, Docker Swarm automatically rolls back based on `rollback_config`:

```bash
# Check rollback status
docker service inspect resufolio_portfolio --format '{{.UpdateStatus}}'
```

### Manual Rollback

Rollback to previous version:

```bash
# Rollback service
docker service update --rollback resufolio_portfolio

# Rollback entire stack (redeploy previous config)
git checkout <previous-commit>
docker stack deploy -c docker-stack.yml resufolio
```

### Emergency Procedures

```bash
# Scale down service immediately
docker service scale resufolio_portfolio=0

# Remove stack
docker stack rm resufolio

# Full reset
docker stack rm resufolio
docker volume rm resufolio_influxdb-data
docker network rm resufolio_backend resufolio_docker-proxy
```

## Monitoring

### Service Health

```bash
# Service status
docker stack ps resufolio

# Service details
docker service inspect resufolio_portfolio --pretty

# Container health
docker ps --filter "name=resufolio" --format "table {{.Names}}\t{{.Status}}"
```

### Logs

```bash
# All services
docker service logs resufolio_portfolio
docker service logs resufolio_stats-api
docker service logs resufolio_influxdb

# Follow logs
docker service logs -f resufolio_portfolio

# Last 100 lines
docker service logs --tail 100 resufolio_portfolio
```

### Resource Usage

```bash
# Service stats
docker stats $(docker ps --filter "name=resufolio" --format "{{.Names}}")

# Node resources
docker node ls --format "table {{.Hostname}}\t{{.Status}}\t{{.Availability}}"
```

## Backup and Restore

### Creating Backups

```bash
# Full backup
./scripts/backup.sh /path/to/backups

# Backup creates:
# - Stack configuration
# - InfluxDB data
# - Secrets metadata (names only)
# - Node labels
# - Service state
```

### Backup Contents

```
backups/
└── resufolio_backup_YYYYMMDD_HHMMSS.tar.gz
    ├── config/
    │   ├── docker-stack.yml
    │   ├── docker-compose.yml
    │   └── scripts/
    ├── influxdb/
    │   └── backup/
    ├── secrets/
    │   ├── secrets.txt
    │   └── create-secrets.sh
    ├── node-labels.txt
    ├── restore-labels.sh
    ├── service-state/
    ├── manifest.json
    └── README.md
```

### Restoring from Backup

1. **Extract backup:**
   ```bash
   tar -xzf resufolio_backup_YYYYMMDD_HHMMSS.tar.gz
   cd resufolio_backup_YYYYMMDD_HHMMSS
   ```

2. **Restore node labels:**
   ```bash
   ./restore-labels.sh
   ```

3. **Recreate secrets:**
   ```bash
   cd secrets
   ./create-secrets.sh
   # Enter secret values when prompted
   ```

4. **Restore InfluxDB:**
   ```bash
   # Start stack first
   docker stack deploy -c config/docker-stack.yml resufolio
   
   # Wait for InfluxDB to be ready
   sleep 10
   
   # Restore data
   docker exec -it resufolio_influxdb.1.<id> influx restore /backup
   ```

5. **Deploy stack:**
   ```bash
   ./config/scripts/deploy.sh resufolio
   ```

## Troubleshooting

### Common Issues

#### Services Not Starting

```bash
# Check service status
docker stack ps resufolio --no-trunc

# Check for placement constraints
docker node ls --format "table {{.Hostname}}\t{{.Labels}}"

# Verify node labels
docker node inspect <node-id> --format '{{json .Spec.Labels}}'
```

#### Traefik Not Routing

```bash
# Check Traefik is running
docker ps --filter "name=traefik"

# Verify network connectivity
docker network inspect traefik-web

# Check Traefik logs
docker logs traefik
```

#### Secret Issues

```bash
# Verify secrets exist
docker secret ls --filter "name=resufolio"

# Check service can access secrets
docker service inspect resufolio_portfolio --format '{{json .Spec.TaskTemplate.ContainerSpec.Secrets}}'
```

#### Network Issues

```bash
# List networks
docker network ls

# Inspect backend network
docker network inspect resufolio_backend

# Test connectivity
docker run --rm --network resufolio_backend alpine ping influxdb
```

### Debug Commands

```bash
# Exec into container
docker exec -it $(docker ps --filter "name=resufolio_portfolio" --format '{{.ID}}') sh

# Check environment variables
docker exec <container> env | grep -E "INFLUX|DOCKER|STATS"

# Test service connectivity
docker exec <container> wget -qO- http://influxdb:8086/health
```

### Log Locations

Logs are stored in Docker's logging driver (json-file by default):

```bash
# View log files directly (on host)
sudo ls /var/lib/docker/containers/<container-id>/

# Export logs
docker service logs resufolio_portfolio > portfolio.logs 2>&1
```

### Performance Tuning

#### Resource Limits

Edit `docker-stack.yml` to adjust resources:

```yaml
deploy:
  resources:
    limits:
      cpus: '1.0'      # Increase CPU limit
      memory: 512M     # Increase memory limit
    reservations:
      cpus: '0.5'
      memory: 256M
```

#### Scale Services

```bash
# Scale to multiple replicas
docker service scale resufolio_portfolio=3
```

## Security Considerations

### Network Security

- `backend` and `docker-proxy` networks are internal (no external access)
- Only `web` network connects to Traefik
- Docker socket is read-only and accessed via proxy

### Secret Security

- Secrets are never stored in environment variables
- Secrets are mounted as files in `/run/secrets/`
- Secret values cannot be retrieved after creation

### Access Control

```bash
# Restrict service to specific nodes
docker service update \
  --constraint-add 'node.labels.resufolio.portfolio==true' \
  resufolio_portfolio

# Prevent scheduling on manager nodes
docker service update \
  --constraint-add 'node.role!=manager' \
  resufolio_portfolio
```

## Maintenance Tasks

### Regular Backups

Set up a cron job:

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /path/to/resufolio/scripts/backup.sh /backups/resufolio
```

### Log Rotation

Docker handles log rotation automatically based on stack configuration:

```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

### Updates

```bash
# Update Docker images
docker pull influxdb:2.7-alpine
docker pull tecnativa/docker-socket-proxy:latest

# Redeploy with new images
./scripts/update.sh
```

## Support

For issues and questions:

1. Check service logs: `docker service logs resufolio_<service>`
2. Review this documentation
3. Check Docker Swarm documentation: https://docs.docker.com/engine/swarm/
4. Open an issue in the repository
