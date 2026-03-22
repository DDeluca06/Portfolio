# Metrics Storage and History

This project includes optional InfluxDB integration for persisting and querying historical metrics data.

## Features

- **Time-series data storage** - Store CPU, memory, disk, and Docker metrics
- **Automatic data downsampling** - Raw data (7 days) → 5-min aggregates (30 days) → 1-hour aggregates (1 year)
- **REST API** - Query historical data with time range and aggregation filters
- **Frontend charts** - Visualize trends with time range selector

## Quick Start

### 1. Configure Environment Variables

Copy `.env.example` to `.env` and set your InfluxDB credentials:

```bash
cp .env.example .env
```

Edit `.env`:
```env
# InfluxDB Configuration
INFLUX_URL=http://localhost:8086
INFLUX_TOKEN=your-generated-token
INFLUX_ORG=homelab
INFLUX_BUCKET=metrics

# For Docker deployment
INFLUX_ADMIN_PASSWORD=your-secure-password
INFLUX_ADMIN_TOKEN=your-admin-token-at-least-32-characters
```

### 2. Start InfluxDB

Using Docker Compose:

```bash
# Generate a secure admin token (if you don't have one)
export INFLUX_ADMIN_TOKEN=$(openssl rand -base64 48)
export INFLUX_ADMIN_PASSWORD=your-secure-password

# Start services
docker-compose up -d influxdb

# Wait for InfluxDB to be ready
docker-compose logs -f influxdb
```

### 3. Generate API Token

Once InfluxDB is running, generate a token for the application:

```bash
# Enter the InfluxDB container
docker exec -it resufolio-influxdb influx auth create \
  --org homelab \
  --all-access \
  --token $INFLUX_ADMIN_TOKEN \
  --description "Application Token"
```

Copy the generated token to your `.env` file as `INFLUX_TOKEN`.

### 4. Verify Setup

Check the application logs:

```bash
# You should see: [InfluxDB] Client initialized successfully
npm run dev
```

Test the API endpoints:

```bash
# Current stats (writes to InfluxDB)
curl http://localhost:5173/api/stats

# Query history
curl "http://localhost:5173/api/history?measurement=cpu&range=1h"

# Query aggregates
curl "http://localhost:5173/api/history/aggregate?measurement=cpu&range=24h"
```

## API Endpoints

### GET /api/history

Query historical metrics data.

**Parameters:**
- `measurement` (string): One of `cpu`, `memory`, `disk`, `system`, `docker_containers`, `docker_system`
- `range` (string): Time range - `1h`, `6h`, `24h`, `7d`, `30d`
- `server_id` (string, optional): Filter by server hostname
- `aggregate` (string): Aggregation function - `mean`, `min`, `max`, `first`, `last` (default: `mean`)

**Example Response:**
```json
{
  "measurement": "cpu",
  "range": "1h",
  "count": 60,
  "queryTimeMs": 45,
  "data": [
    {
      "time": "2024-01-15T10:00:00Z",
      "value": 23.5,
      "field": "usage",
      "tags": {
        "server_id": "homelab-server"
      }
    }
  ]
}
```

### GET /api/history/aggregate

Query aggregated statistics (min, max, avg) for a time range.

**Parameters:**
- `measurement` (string): Same as above
- `range` (string): Time range
- `server_id` (string, optional): Filter by server hostname

**Example Response:**
```json
{
  "measurement": "cpu",
  "range": "24h",
  "stats": {
    "min": 5.2,
    "max": 87.3,
    "avg": 34.1,
    "count": 1440
  }
}
```

## Retention Policies

Data is automatically downsampled to optimize storage:

| Bucket | Retention | Granularity | Use Case |
|--------|-----------|-------------|----------|
| `metrics` | 7 days | Raw | Recent detailed data |
| `metrics_5m` | 30 days | 5-minute aggregates | Medium-term trends |
| `metrics_1h` | 365 days | 1-hour aggregates | Long-term analysis |

Downsampling tasks run automatically every 5 minutes and 1 hour respectively.

## Frontend Integration

The `StatsDisplay` component now includes a **History** tab with:

- **Time range selector** - Choose from 1 hour to 30 days
- **Trend charts** - SVG-based visualization of metrics over time
- **Statistics** - Min, max, average, and sample count
- **Auto-refresh** - Updates every 30 seconds

Usage:
```svelte
<StatsDisplay />
```

Or use the `HistoryChart` component directly:
```svelte
<script>
  import HistoryChart from '$lib/components/HistoryChart.svelte';
</script>

<HistoryChart measurement="cpu" title="CPU Usage History" />
<HistoryChart measurement="memory" title="Memory Usage History" />
```

## Architecture

```
┌─────────────────┐     ┌─────────────┐     ┌─────────────┐
│  Stats API      │────▶│  InfluxDB   │────▶│  History    │
│  (/api/stats)   │     │  Client     │     │  API        │
└─────────────────┘     └─────────────┘     └─────────────┘
                               │                    │
                               ▼                    ▼
                        ┌─────────────┐      ┌─────────────┐
                        │  InfluxDB   │      │  Frontend   │
                        │  (Docker)   │      │  Charts     │
                        └─────────────┘      └─────────────┘
```

## Performance

- **Batch writes** - Metrics are batched (100 points) and flushed every 5 seconds
- **Automatic downsampling** - Reduces data volume by 96% for long-term storage
- **Query optimization** - Appropriate window sizes for each time range ensure <1s response times

## Troubleshooting

### "InfluxDB not configured" error

Check that all environment variables are set:
```bash
echo $INFLUX_URL $INFLUX_TOKEN $INFLUX_ORG $INFLUX_BUCKET
```

### No historical data showing

1. Verify InfluxDB is running:
   ```bash
   docker ps | grep influxdb
   ```

2. Check metrics are being written:
   ```bash
   docker exec -it resufolio-influxdb influx query 'from(bucket:"metrics") |> range(start:-1h)' --token $INFLUX_ADMIN_TOKEN
   ```

3. Verify the API is working:
   ```bash
   curl http://localhost:5173/api/history?measurement=cpu&range=1h
   ```

### Query timeouts

For large time ranges (7d, 30d), the API automatically uses larger window sizes to maintain performance. If queries are still slow:

1. Check InfluxDB resource usage
2. Verify retention policies are set up correctly
3. Consider increasing the `FLUSH_INTERVAL` in `src/lib/db/influx.ts`

## Security

- Never commit `.env` files to version control
- Use strong, randomly generated tokens (minimum 32 characters)
- Limit InfluxDB port exposure in production (use backend network only)
- The retention setup script runs automatically on container startup
