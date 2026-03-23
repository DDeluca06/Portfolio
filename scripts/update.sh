#!/bin/bash
#
# Resufolio Rolling Update Script
# Usage: ./update.sh [stack-name] [service-name]
#

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
STACK_NAME="${1:-resufolio}"
SERVICE_NAME="${2:-}"

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

# Check if stack exists
check_stack() {
    if ! docker stack ls --format '{{.Name}}' | grep -q "^${STACK_NAME}$"; then
        log_error "Stack '${STACK_NAME}' not found!"
        log_info "Run ./scripts/deploy.sh first"
        exit 1
    fi
    log_success "Stack '${STACK_NAME}' found"
}

# Build updated images
build_images() {
    log_info "Building updated images..."
    cd "$PROJECT_ROOT"
    
    if [ -z "$SERVICE_NAME" ] || [ "$SERVICE_NAME" = "portfolio" ]; then
        log_info "Building portfolio image..."
        docker build -t "resufolio:latest" -f Dockerfile .
    fi
    
    if [ -z "$SERVICE_NAME" ] || [ "$SERVICE_NAME" = "stats-api" ]; then
        if [ -d "$PROJECT_ROOT/services/stats-api" ]; then
            log_info "Building stats-api image..."
            docker build -t "resufolio-stats-api:latest" -f services/stats-api/Dockerfile services/stats-api/
        fi
    fi
    
    log_success "Images built successfully"
}

# Update specific service or entire stack
update_service() {
    if [ -n "$SERVICE_NAME" ]; then
        log_info "Updating service '${STACK_NAME}_${SERVICE_NAME}'..."
        
        # Force update with new image
        docker service update \
            --image "resufolio${SERVICE_NAME:+-${SERVICE_NAME}}:latest" \
            --force \
            --update-parallelism 1 \
            --update-delay 10s \
            --update-order start-first \
            --update-monitor 60s \
            "${STACK_NAME}_${SERVICE_NAME}"
        
        log_success "Service update initiated"
        
        # Wait for update to complete
        log_info "Waiting for update to complete..."
        sleep 5
        
        # Monitor update progress
        local attempts=0
        local max_attempts=30
        
        while [ $attempts -lt $max_attempts ]; do
            local status
            status=$(docker service inspect --format '{{.UpdateStatus.State}}' "${STACK_NAME}_${SERVICE_NAME}" 2>/dev/null || echo "unknown")
            
            case "$status" in
                "completed")
                    log_success "Update completed successfully!"
                    return 0
                    ;;
                "paused")
                    log_error "Update paused due to failure!"
                    log_info "Check logs: docker service logs ${STACK_NAME}_${SERVICE_NAME}"
                    exit 1
                    ;;
                "rollback_completed")
                    log_error "Update failed and was rolled back!"
                    log_info "Check logs: docker service logs ${STACK_NAME}_${SERVICE_NAME}"
                    exit 1
                    ;;
                *)
                    log_info "Update in progress... (status: ${status})"
                    ;;
            esac
            
            attempts=$((attempts + 1))
            sleep 5
        done
        
        log_warning "Update monitoring timed out, check manually"
    else
        log_info "Updating entire stack..."
        
        local env_args=""
        if [ -f "$PROJECT_ROOT/.env" ]; then
            local DOMAIN
            DOMAIN=$(grep "^DOMAIN=" "$PROJECT_ROOT/.env" | cut -d= -f2 || echo "")
            [ -n "$DOMAIN" ] && env_args="DOMAIN=${DOMAIN}"
        fi
        
        cd "$PROJECT_ROOT"
        if [ -n "$env_args" ]; then
            docker stack deploy -c docker-stack.yml --with-registry-auth -e <(echo "$env_args") "$STACK_NAME"
        else
            docker stack deploy -c docker-stack.yml --with-registry-auth "$STACK_NAME"
        fi
        
        log_success "Stack update initiated"
    fi
}

# Verify services after update
verify_update() {
    log_info "Verifying services..."
    
    sleep 3
    
    if [ -n "$SERVICE_NAME" ]; then
        # Check specific service
        local replicas
        replicas=$(docker service inspect --format '{{.Spec.Mode.Replicated.Replicas}}' "${STACK_NAME}_${SERVICE_NAME}" 2>/dev/null || echo "0")
        local running
        running=$(docker service ps "${STACK_NAME}_${SERVICE_NAME}" --format '{{.CurrentState}}' | grep -c "Running" || echo "0")
        
        log_info "Service '${SERVICE_NAME}': ${running}/${replicas} replicas running"
        
        if [ "$running" -eq "$replicas" ]; then
            log_success "Service is healthy!"
        else
            log_warning "Service may still be starting..."
        fi
    else
        # Check all services
        docker stack ps "$STACK_NAME" --format 'table {{.Name}}\t{{.CurrentState}}\t{{.Image}}'
    fi
}

# Main update flow
main() {
    log_info "Starting update for stack '${STACK_NAME}'..."
    [ -n "$SERVICE_NAME" ] && log_info "Target service: ${SERVICE_NAME}"
    
    check_stack
    build_images
    update_service
    verify_update
    
    log_success "Update process complete!"
}

# Run main function
main "$@"
