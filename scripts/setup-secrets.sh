#!/bin/bash
#
# Setup Docker Secrets for Resufolio
# Usage: ./setup-secrets.sh
#

set -euo pipefail

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

# Check if running in a Swarm
check_swarm() {
    if ! docker info --format '{{.Swarm.LocalNodeState}}' 2>/dev/null | grep -q "active"; then
        log_error "Docker Swarm is not initialized!"
        log_info "Run: docker swarm init"
        exit 1
    fi
    log_success "Docker Swarm is active"
}

# Check if secret already exists
secret_exists() {
    docker secret ls --format '{{.Name}}' | grep -q "^$1$"
}

# Create a secret
create_secret() {
    local name="$1"
    local prompt="$2"
    local min_length="${3:-0}"
    
    if secret_exists "$name"; then
        log_warning "Secret '$name' already exists."
        echo -n "Do you want to update it? [y/N]: "
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            log_info "Skipping '$name'"
            return 0
        fi
        
        # Remove old secret
        log_info "Removing old secret '$name'..."
        docker secret rm "$name"
    fi
    
    echo ""
    echo -n "$prompt: "
    read -r -s value
    echo ""
    
    if [ -z "$value" ]; then
        log_error "Value cannot be empty"
        return 1
    fi
    
    if [ "$min_length" -gt 0 ] && [ "${#value}" -lt "$min_length" ]; then
        log_error "Value must be at least $min_length characters (got ${#value})"
        return 1
    fi
    
    echo -n "$value" | docker secret create "$name" -
    log_success "Secret '$name' created"
}

# Generate a random secret
generate_secret() {
    local name="$1"
    local length="${2:-32}"
    
    if secret_exists "$name"; then
        log_warning "Secret '$name' already exists."
        echo -n "Do you want to regenerate it? [y/N]: "
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            log_info "Skipping '$name'"
            return 0
        fi
        
        docker secret rm "$name"
    fi
    
    local value
    value=$(openssl rand -base64 "$length" 2>/dev/null || head -c "$length" /dev/urandom | base64 | tr -dc 'a-zA-Z0-9' | head -c "$length")
    
    echo -n "$value" | docker secret create "$name" -
    log_success "Secret '$name' generated and created"
    log_info "Generated value: $value"
    log_warning "Please save this value securely - it cannot be retrieved later!"
}

# Main setup flow
main() {
    echo "========================================"
    echo "  Resufolio Docker Secrets Setup"
    echo "========================================"
    echo ""
    
    check_swarm
    
    echo ""
    echo "This script will create the following secrets:"
    echo "  - resufolio_influx_username: InfluxDB admin username"
    echo "  - resufolio_influx_password: InfluxDB admin password"
    echo "  - resufolio_influx_token: InfluxDB admin API token"
    echo "  - resufolio_stats_api_key: Stats API authentication key"
    echo ""
    echo -n "Continue? [Y/n]: "
    read -r response
    
    if [[ "$response" =~ ^[Nn]$ ]]; then
        log_info "Setup cancelled"
        exit 0
    fi
    
    echo ""
    log_info "Creating secrets..."
    echo ""
    
    # InfluxDB username
    create_secret "resufolio_influx_username" "Enter InfluxDB admin username" 3
    
    # InfluxDB password
    create_secret "resufolio_influx_password" "Enter InfluxDB admin password" 8
    
    # InfluxDB token
    echo ""
    echo "You can either:"
    echo "  1. Enter your own InfluxDB token (min 32 chars)"
    echo "  2. Generate a random token"
    echo -n "Generate random token? [Y/n]: "
    read -r gen_token
    
    if [[ ! "$gen_token" =~ ^[Nn]$ ]]; then
        generate_secret "resufolio_influx_token" 48
    else
        create_secret "resufolio_influx_token" "Enter InfluxDB admin token" 32
    fi
    
    # Stats API key
    echo ""
    echo "Stats API key options:"
    echo "  1. Enter your own API key (min 32 chars)"
    echo "  2. Generate a random API key"
    echo -n "Generate random API key? [Y/n]: "
    read -r gen_key
    
    if [[ ! "$gen_key" =~ ^[Nn]$ ]]; then
        generate_secret "resufolio_stats_api_key" 32
    else
        create_secret "resufolio_stats_api_key" "Enter Stats API key" 32
    fi
    
    echo ""
    echo "========================================"
    log_success "All secrets created successfully!"
    echo "========================================"
    echo ""
    log_info "Verify secrets:"
    docker secret ls --filter "name=resufolio"
    echo ""
    log_info "Next steps:"
    log_info "  1. Set node labels: docker node update --label-add resufolio.<service>=true <node-id>"
    log_info "  2. Deploy stack: ./scripts/deploy.sh"
}

# Run main function
main "$@"
