#!/bin/bash
#
# Resufolio Docker Swarm Deployment Script
# Usage: ./deploy.sh [stack-name] [domain]
#

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
STACK_NAME="${1:-resufolio}"
DOMAIN="${2:-}"

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

# Check if Docker Swarm is initialized
check_swarm() {
    if ! docker info --format '{{.Swarm.LocalNodeState}}' 2>/dev/null | grep -q "active"; then
        log_error "Docker Swarm is not initialized!"
        log_info "Run: docker swarm init"
        exit 1
    fi
    log_success "Docker Swarm is active"
}

# Check if Traefik network exists
check_traefik_network() {
    if ! docker network ls --format '{{.Name}}' | grep -q "traefik-web"; then
        log_error "Traefik network 'traefik-web' not found!"
        log_info "Please create the network: docker network create --driver overlay --attachable traefik-web"
        exit 1
    fi
    log_success "Traefik network exists"
}

# Check if required secrets exist
check_secrets() {
    local secrets=("resufolio_influx_username" "resufolio_influx_password" "resufolio_influx_token" "resufolio_stats_api_key")
    local missing=()
    
    for secret in "${secrets[@]}"; do
        if ! docker secret ls --format '{{.Name}}' | grep -q "^${secret}$"; then
            missing+=("$secret")
        fi
    done
    
    if [ ${#missing[@]} -gt 0 ]; then
        log_error "Missing required secrets: ${missing[*]}"
        log_info "Run ./scripts/setup-secrets.sh first to create secrets"
        exit 1
    fi
    
    log_success "All required secrets exist"
}

# Check if node labels are set
check_node_labels() {
    local labels=("resufolio.portfolio" "resufolio.stats-api" "resufolio.docker-proxy" "resufolio.influxdb")
    local node_id
    node_id=$(docker info --format '{{.Swarm.NodeID}}')
    
    for label in "${labels[@]}"; do
        if ! docker node inspect --format "{{.Spec.Labels.${label//./}}}" "$node_id" 2>/dev/null | grep -q "true"; then
            log_warning "Node label '${label}' not set"
            log_info "Run: docker node update --label-add ${label}=true ${node_id}"
        fi
    done
}

# Build and tag images
build_images() {
    log_info "Building portfolio image..."
    cd "$PROJECT_ROOT"
    docker build -t "resufolio:latest" -f Dockerfile .
    
    if [ -d "$PROJECT_ROOT/services/stats-api" ]; then
        log_info "Building stats-api image..."
        docker build -t "resufolio-stats-api:latest" -f services/stats-api/Dockerfile services/stats-api/
    else
        log_warning "Stats API directory not found, skipping build"
    fi
    
    log_success "Images built successfully"
}

# Deploy the stack
deploy_stack() {
    log_info "Deploying stack '${STACK_NAME}'..."
    
    local env_args=""
    if [ -n "$DOMAIN" ]; then
        env_args="DOMAIN=${DOMAIN}"
    elif [ -f "$PROJECT_ROOT/.env" ]; then
        # Source domain from .env file
        DOMAIN=$(grep "^DOMAIN=" "$PROJECT_ROOT/.env" | cut -d= -f2 || echo "")
        [ -n "$DOMAIN" ] && env_args="DOMAIN=${DOMAIN}"
    fi
    
    cd "$PROJECT_ROOT"
    if [ -n "$env_args" ]; then
        docker stack deploy -c docker-stack.yml --with-registry-auth -e <(echo "$env_args") "$STACK_NAME"
    else
        docker stack deploy -c docker-stack.yml --with-registry-auth "$STACK_NAME"
    fi
    
    log_success "Stack deployed successfully"
}

# Verify deployment
verify_deployment() {
    log_info "Verifying deployment..."
    
    sleep 5
    
    # Check if services are running
    local services
    services=$(docker stack ps "$STACK_NAME" --format '{{.Name}}:{{.CurrentState}}' 2>/dev/null || true)
    
    if [ -z "$services" ]; then
        log_error "No services found for stack '${STACK_NAME}'"
        exit 1
    fi
    
    log_info "Services status:"
    docker stack ps "$STACK_NAME" --format 'table {{.Name}}\t{{.CurrentState}}\t{{.Error}}'
    
    # Check health
    local running_count
    running_count=$(echo "$services" | grep -c "Running" || true)
    local total_count
    total_count=$(echo "$services" | wc -l)
    
    log_info "Running: ${running_count}/${total_count} services"
    
    if [ "$running_count" -eq "$total_count" ]; then
        log_success "All services are running!"
    else
        log_warning "Some services may still be starting..."
        log_info "Run 'docker stack ps ${STACK_NAME}' to monitor"
    fi
}

# Main deployment flow
main() {
    log_info "Starting deployment of Resufolio stack '${STACK_NAME}'..."
    
    check_swarm
    check_traefik_network
    check_secrets
    check_node_labels
    build_images
    deploy_stack
    verify_deployment
    
    log_success "Deployment complete!"
    log_info ""
    log_info "Stack: ${STACK_NAME}"
    [ -n "$DOMAIN" ] && log_info "Domain: ${DOMAIN}"
    log_info ""
    log_info "Useful commands:"
    log_info "  - View services:  docker stack ps ${STACK_NAME}"
    log_info "  - View logs:      docker service logs ${STACK_NAME}_portfolio -f"
    log_info "  - Update stack:   ./scripts/update.sh"
    log_info "  - Backup config:  ./scripts/backup.sh"
}

# Run main function
main "$@"
