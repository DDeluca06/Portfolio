#!/bin/bash
#
# Resufolio Backup Script
# Usage: ./backup.sh [backup-dir]
#

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${1:-$PROJECT_ROOT/backups}"
STACK_NAME="resufolio"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="resufolio_backup_${TIMESTAMP}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Create backup directory
create_backup_dir() {
    mkdir -p "$BACKUP_DIR"
    log_success "Backup directory: $BACKUP_DIR"
}

# Backup stack configuration
backup_config() {
    log_info "Backing up stack configuration..."
    
    local config_dir="$BACKUP_DIR/$BACKUP_NAME/config"
    mkdir -p "$config_dir"
    
    # Backup main stack file
    cp "$PROJECT_ROOT/docker-stack.yml" "$config_dir/"
    
    # Backup docker-compose if exists
    if [ -f "$PROJECT_ROOT/docker-compose.yml" ]; then
        cp "$PROJECT_ROOT/docker-compose.yml" "$config_dir/"
    fi
    
    # Backup environment example (not actual .env for security)
    if [ -f "$PROJECT_ROOT/.env.example" ]; then
        cp "$PROJECT_ROOT/.env.example" "$config_dir/"
    fi
    
    # Backup scripts
    if [ -d "$PROJECT_ROOT/scripts" ]; then
        cp -r "$PROJECT_ROOT/scripts" "$config_dir/"
    fi
    
    log_success "Configuration backed up"
}

# Backup InfluxDB data
backup_influxdb() {
    log_info "Backing up InfluxDB data..."
    
    local influx_backup_dir="$BACKUP_DIR/$BACKUP_NAME/influxdb"
    mkdir -p "$influx_backup_dir"
    
    # Check if InfluxDB is running
    if docker stack ps "$STACK_NAME" --format '{{.Name}}' | grep -q "influxdb"; then
        # Get InfluxDB container ID
        local container_id
        container_id=$(docker ps --filter "name=${STACK_NAME}_influxdb" --format '{{.ID}}' | head -1)
        
        if [ -n "$container_id" ]; then
            # Create backup inside container
            log_info "Creating InfluxDB backup in container..."
            docker exec "$container_id" influx backup /tmp/backup 2>/dev/null || {
                log_warning "InfluxDB backup command failed, copying data volume instead"
                # Fallback: copy data volume
                local volume_name
                volume_name=$(docker stack config -c "$PROJECT_ROOT/docker-stack.yml" 2>/dev/null | grep -A5 "influxdb-data:" | grep "driver:" | head -1 || echo "")
                if [ -n "$volume_name" ]; then
                    docker run --rm -v "${STACK_NAME}_influxdb-data":/data -v "$influx_backup_dir":/backup alpine cp -r /data /backup/ 2>/dev/null || true
                fi
            }
            
            # Copy backup from container
            docker cp "$container_id:/tmp/backup" "$influx_backup_dir/" 2>/dev/null || true
            
            log_success "InfluxDB backup created"
        else
            log_warning "InfluxDB container not found, skipping database backup"
        fi
    else
        log_warning "InfluxDB service not running, skipping database backup"
    fi
}

# Backup secrets metadata (not values for security)
backup_secrets_metadata() {
    log_info "Backing up secrets metadata..."
    
    local secrets_dir="$BACKUP_DIR/$BACKUP_NAME/secrets"
    mkdir -p "$secrets_dir"
    
    # Export secrets list (names only, not values)
    docker secret ls --filter "name=resufolio" --format '{{.Name}}\t{{.CreatedAt}}\t{{.UpdatedAt}}' > "$secrets_dir/secrets.txt" 2>/dev/null || true
    
    # Export secret creation script template (without actual values)
    cat > "$secrets_dir/create-secrets.sh" << 'EOF'
#!/bin/bash
# Recreate secrets after restore
# WARNING: You must provide the actual secret values

set -euo pipefail

# Check if secrets already exist
check_secret() {
    docker secret ls --format '{{.Name}}' | grep -q "^$1$"
}

# Create secret from file or prompt
create_secret() {
    local name="$1"
    local prompt_text="$2"
    
    if check_secret "$name"; then
        echo "Secret '$name' already exists, skipping..."
        return 0
    fi
    
    echo -n "$prompt_text: "
    read -s value
    echo
    
    if [ -z "$value" ]; then
        echo "ERROR: Value cannot be empty"
        return 1
    fi
    
    echo -n "$value" | docker secret create "$name" -
    echo "Secret '$name' created successfully"
}

echo "Creating Resufolio secrets..."
echo "You will be prompted for secret values"
echo ""

# Required secrets
create_secret "resufolio_influx_username" "Enter InfluxDB admin username"
create_secret "resufolio_influx_password" "Enter InfluxDB admin password"
create_secret "resufolio_influx_token" "Enter InfluxDB admin token (min 32 chars)"
create_secret "resufolio_stats_api_key" "Enter Stats API key (min 32 chars)"

echo ""
echo "All secrets created successfully!"
EOF
    chmod +x "$secrets_dir/create-secrets.sh"
    
    log_success "Secrets metadata backed up"
}

# Backup node labels
backup_node_labels() {
    log_info "Backing up node labels..."
    
    local labels_file="$BACKUP_DIR/$BACKUP_NAME/node-labels.txt"
    
    # Get all nodes and their labels
    docker node ls --format '{{.ID}}\t{{.Hostname}}' | while read -r node_id hostname; do
        echo "Node: $hostname ($node_id)" >> "$labels_file"
        docker node inspect --format '{{json .Spec.Labels}}' "$node_id" 2>/dev/null | jq -r 'to_entries[] | "  \(.key)=\(.value)"' >> "$labels_file" || true
        echo "" >> "$labels_file"
    done
    
    # Create restore script
    cat > "$BACKUP_DIR/$BACKUP_NAME/restore-labels.sh" << 'EOF'
#!/bin/bash
# Restore node labels from backup
# Usage: ./restore-labels.sh

set -euo pipefail

LABELS_FILE="node-labels.txt"

if [ ! -f "$LABELS_FILE" ]; then
    echo "ERROR: $LABELS_FILE not found"
    exit 1
fi

echo "Restoring node labels..."

while IFS= read -r line; do
    if [[ $line == Node:* ]]; then
        # Extract node hostname
        hostname=$(echo "$line" | sed 's/Node: \(.*\) (.*/\1/')
        node_id=$(docker node ls --format '{{.ID}}\t{{.Hostname}}' | grep "$hostname" | cut -f1)
        
        if [ -z "$node_id" ]; then
            echo "WARNING: Node '$hostname' not found, skipping..."
            continue
        fi
        
        echo "Processing node: $hostname"
    elif [[ $line == \ \ * ]]; then
        # This is a label line
        label=$(echo "$line" | sed 's/^  //')
        key=$(echo "$label" | cut -d= -f1)
        value=$(echo "$label" | cut -d= -f2-)
        
        if [ -n "$node_id" ]; then
            docker node update --label-add "${key}=${value}" "$node_id" 2>/dev/null || true
            echo "  Set label: ${key}=${value}"
        fi
    fi
done < "$LABELS_FILE"

echo "Node labels restored!"
EOF
    chmod +x "$BACKUP_DIR/$BACKUP_NAME/restore-labels.sh"
    
    log_success "Node labels backed up"
}

# Backup service state
backup_service_state() {
    log_info "Backing up service state..."
    
    local state_dir="$BACKUP_DIR/$BACKUP_NAME/service-state"
    mkdir -p "$state_dir"
    
    # Export stack services
    docker stack ps "$STACK_NAME" --format '{{.Name}}\t{{.Image}}\t{{.Node}}\t{{.CurrentState}}' > "$state_dir/services.txt" 2>/dev/null || true
    
    # Export service configs
    docker service ls --filter "name=${STACK_NAME}_" --format '{{.Name}}' | while read -r service; do
        docker service inspect "$service" > "$state_dir/${service}.json" 2>/dev/null || true
    done
    
    log_success "Service state backed up"
}

# Create backup manifest
create_manifest() {
    log_info "Creating backup manifest..."
    
    local manifest_file="$BACKUP_DIR/$BACKUP_NAME/manifest.json"
    
    cat > "$manifest_file" << EOF
{
  "backup_name": "$BACKUP_NAME",
  "timestamp": "$TIMESTAMP",
  "stack_name": "$STACK_NAME",
  "hostname": "$(hostname)",
  "contents": {
    "config": "Stack configuration files",
    "influxdb": "InfluxDB database backup",
    "secrets": "Secrets metadata (names only, no values)",
    "node_labels": "Docker Swarm node labels",
    "service_state": "Service configuration and state"
  },
  "restore_instructions": "See README.md in backup directory"
}
EOF
    
    # Create restore README
    cat > "$BACKUP_DIR/$BACKUP_NAME/README.md" << 'EOF'
# Resufolio Backup

## Contents

This backup contains:

1. **config/** - Stack configuration files (docker-stack.yml, docker-compose.yml, scripts)
2. **influxdb/** - InfluxDB data backup
3. **secrets/** - Secrets metadata and recreation script
4. **node-labels.txt** - Docker Swarm node labels
5. **restore-labels.sh** - Script to restore node labels
6. **service-state/** - Service configurations and current state

## Restore Procedure

### 1. Prepare Environment

Ensure Docker Swarm is initialized and Traefik network exists:
```bash
docker swarm init  # If not already initialized
docker network create --driver overlay --attachable traefik-web  # If not exists
```

### 2. Restore Node Labels

```bash
cd backups/resufolio_backup_YYYYMMDD_HHMMSS
./restore-labels.sh
```

### 3. Recreate Secrets

Secrets are not backed up for security. Recreate them:
```bash
cd backups/resufolio_backup_YYYYMMDD_HHMMSS/secrets
./create-secrets.sh
```

### 4. Restore InfluxDB Data

If InfluxDB data was backed up:
```bash
# Start services first
docker stack deploy -c docker-stack.yml resufolio

# Wait for InfluxDB to be ready, then restore
docker exec -it resufolio_influxdb.1.<container_id> influx restore /path/to/backup
```

### 5. Deploy Stack

```bash
cd backups/resufolio_backup_YYYYMMDD_HHMMSS/config
./scripts/deploy.sh resufolio
```

## Important Notes

- Secrets values are NOT included in backups for security reasons
- The backup contains metadata to recreate secrets, but you must provide the actual values
- Node labels are backed up but must be manually restored if node IDs change
- InfluxDB backup requires the database to be running for restore
EOF
    
    log_success "Manifest created"
}

# Create compressed archive
create_archive() {
    log_info "Creating compressed archive..."
    
    cd "$BACKUP_DIR"
    tar -czf "${BACKUP_NAME}.tar.gz" "$BACKUP_NAME"
    
    log_success "Archive created: $BACKUP_DIR/${BACKUP_NAME}.tar.gz"
    
    # Get archive size
    local size
    size=$(du -h "${BACKUP_NAME}.tar.gz" | cut -f1)
    log_info "Archive size: $size"
}

# Cleanup old backups
cleanup_old_backups() {
    log_info "Checking for old backups..."
    
    local keep_count=7
    local backup_count
    backup_count=$(ls -1t "$BACKUP_DIR"/resufolio_backup_*.tar.gz 2>/dev/null | wc -l)
    
    if [ "$backup_count" -gt "$keep_count" ]; then
        log_info "Removing old backups (keeping last $keep_count)..."
        ls -1t "$BACKUP_DIR"/resufolio_backup_*.tar.gz | tail -n +$((keep_count + 1)) | xargs rm -f
        log_success "Old backups cleaned up"
    else
        log_info "No cleanup needed ($backup_count backups, keeping $keep_count)"
    fi
}

# Main backup flow
main() {
    log_info "Starting backup for Resufolio stack..."
    log_info "Backup location: $BACKUP_DIR"
    log_info "Backup name: $BACKUP_NAME"
    
    create_backup_dir
    backup_config
    backup_influxdb
    backup_secrets_metadata
    backup_node_labels
    backup_service_state
    create_manifest
    create_archive
    cleanup_old_backups
    
    log_success "Backup complete!"
    log_info ""
    log_info "Backup location: $BACKUP_DIR/${BACKUP_NAME}.tar.gz"
    log_info "To restore, see: $BACKUP_DIR/$BACKUP_NAME/README.md"
}

# Run main function
main "$@"
