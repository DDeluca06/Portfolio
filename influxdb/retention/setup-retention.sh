#!/bin/sh
# InfluxDB Retention Policy Setup Script
# Run this script to configure retention policies for the metrics bucket

set -e

echo "Setting up InfluxDB retention policies..."

# Wait for InfluxDB to be ready
until curl -s "http://localhost:8086/health" > /dev/null 2>&1; do
    echo "Waiting for InfluxDB to be ready..."
    sleep 2
done

echo "InfluxDB is ready, configuring retention policies..."

# Create buckets with retention policies using the InfluxDB CLI
# Raw metrics: 7 days
influx bucket create \
    --name metrics_raw \
    --retention 7d \
    --org homelab \
    --token "${DOCKER_INFLUXDB_INIT_ADMIN_TOKEN}" \
    --host http://localhost:8086 2>/dev/null || echo "Bucket metrics_raw already exists"

# 5-minute aggregates: 30 days
influx bucket create \
    --name metrics_5m \
    --retention 30d \
    --org homelab \
    --token "${DOCKER_INFLUXDB_INIT_ADMIN_TOKEN}" \
    --host http://localhost:8086 2>/dev/null || echo "Bucket metrics_5m already exists"

# 1-hour aggregates: 1 year (365 days)
influx bucket create \
    --name metrics_1h \
    --retention 365d \
    --org homelab \
    --token "${DOCKER_INFLUXDB_INIT_ADMIN_TOKEN}" \
    --host http://localhost:8086 2>/dev/null || echo "Bucket metrics_1h already exists"

# Create tasks for downsampling data

# Task 1: Downsample raw data to 5-minute aggregates
cat > /tmp/task_5m.flux << 'EOF'
option task = {
    name: "Downsample to 5m",
    every: 5m,
}

from(bucket: "metrics")
    |> range(start: -task.every)
    |> filter(fn: (r) => r._measurement == "cpu" or r._measurement == "memory" or r._measurement == "disk")
    |> aggregateWindow(every: 5m, fn: mean, createEmpty: false)
    |> set(key: "_aggregate", value: "mean")
    |> to(bucket: "metrics_5m")
EOF

influx task create \
    --file /tmp/task_5m.flux \
    --org homelab \
    --token "${DOCKER_INFLUXDB_INIT_ADMIN_TOKEN}" \
    --host http://localhost:8086 2>/dev/null || echo "Task Downsample to 5m already exists"

# Task 2: Downsample 5m aggregates to 1-hour aggregates
cat > /tmp/task_1h.flux << 'EOF'
option task = {
    name: "Downsample to 1h",
    every: 1h,
}

from(bucket: "metrics_5m")
    |> range(start: -task.every)
    |> filter(fn: (r) => r._measurement == "cpu" or r._measurement == "memory" or r._measurement == "disk")
    |> aggregateWindow(every: 1h, fn: mean, createEmpty: false)
    |> set(key: "_aggregate", value: "mean")
    |> to(bucket: "metrics_1h")
EOF

influx task create \
    --file /tmp/task_1h.flux \
    --org homelab \
    --token "${DOCKER_INFLUXDB_INIT_ADMIN_TOKEN}" \
    --host http://localhost:8086 2>/dev/null || echo "Task Downsample to 1h already exists"

echo "Retention policies setup complete!"
echo ""
echo "Summary:"
echo "  - metrics (raw): 7 days retention"
echo "  - metrics_5m (5-min aggregates): 30 days retention"
echo "  - metrics_1h (1-hour aggregates): 365 days retention"
