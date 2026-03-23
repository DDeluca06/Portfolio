#!/bin/bash
#
# Setup Docker Swarm Node Labels for Resufolio
# Usage: ./setup-labels.sh [node-id]
#

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
NODE_ID="${1:-}"

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

# List all nodes
list_nodes() {
    log_info "Available nodes:"
    echo ""
    docker node ls --format 'table {{.ID}}\t{{.Hostname}}\t{{.Status}}\t{{.ManagerStatus}}'
    echo ""
}

# Get node ID if not provided
get_node_id() {
    if [ -z "$NODE_ID" ]; then
        # Try to get current node
        NODE_ID=$(docker info --format '{{.Swarm.NodeID}}')
        log_info "Using current node: $NODE_ID"
    fi
}

# Check if node exists
check_node() {
    if ! docker node inspect "$NODE_ID" > /dev/null 2>&1; then
        log_error "Node '$NODE_ID' not found!"
        list_nodes
        exit 1
    fi
    log_success "Node '$NODE_ID' found"
}

# Show current labels
show_current_labels() {
    log_info "Current labels on node '$NODE_ID':"
    echo ""
    docker node inspect "$NODE_ID" --format '{{json .Spec.Labels}}' | jq -r 'to_entries[] | "  \(.key)=\(.value)"' 2>/dev/null || echo "  (no labels set)"
    echo ""
}

# Add Resufolio labels
add_labels() {
    log_info "Adding Resufolio labels to node '$NODE_ID'..."
    echo ""
    
    local labels=(
        "resufolio.portfolio=true"
        "resufolio.stats-api=true"
        "resufolio.influxdb=true"
        "resufolio.docker-proxy=true"
    )
    
    for label in "${labels[@]}"; do
        local key="${label%%=*}"
        local value="${label##*=}"
        
        log_info "Adding label: ${key}=${value}"
        docker node update --label-add "$label" "$NODE_ID"
    done
    
    log_success "All labels added"
}

# Interactive label selection
interactive_labels() {
    log_info "Interactive label setup"
    echo ""
    
    local services=("portfolio" "stats-api" "influxdb" "docker-proxy")
    local labels_to_add=()
    
    echo "Select which services should run on this node:"
    echo ""
    
    for service in "${services[@]}"; do
        echo -n "Enable ${service}? [Y/n]: "
        read -r response
        
        if [[ ! "$response" =~ ^[Nn]$ ]]; then
            labels_to_add+=("resufolio.${service}=true")
        fi
    done
    
    echo ""
    log_info "Applying labels..."
    
    for label in "${labels_to_add[@]}"; do
        docker node update --label-add "$label" "$NODE_ID"
        log_success "Added: $label"
    done
}

# Remove all Resufolio labels
remove_labels() {
    log_info "Removing all Resufolio labels from node '$NODE_ID'..."
    
    local labels
    labels=$(docker node inspect "$NODE_ID" --format '{{json .Spec.Labels}}' | jq -r 'keys[] | select(startswith("resufolio."))' 2>/dev/null || true)
    
    if [ -z "$labels" ]; then
        log_warning "No Resufolio labels found"
        return 0
    fi
    
    for label in $labels; do
        log_info "Removing label: $label"
        docker node update --label-rm "$label" "$NODE_ID"
    done
    
    log_success "All Resufolio labels removed"
}

# Show help
show_help() {
    cat << EOF
Usage: $0 [OPTIONS] [NODE_ID]

Setup Docker Swarm node labels for Resufolio deployment.

OPTIONS:
    -h, --help          Show this help message
    -i, --interactive   Interactive mode (select services)
    -r, --remove        Remove all Resufolio labels
    -l, --list          List all nodes
    -s, --show          Show current labels only

ARGUMENTS:
    NODE_ID             Docker node ID (optional, defaults to current node)

EXAMPLES:
    $0                              # Add all labels to current node
    $0 <node-id>                    # Add all labels to specific node
    $0 -i                           # Interactive mode
    $0 -r                           # Remove all labels from current node
    $0 -l                           # List all nodes

EOF
}

# Main function
main() {
    local mode="add"
    
    # Parse options
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -i|--interactive)
                mode="interactive"
                shift
                ;;
            -r|--remove)
                mode="remove"
                shift
                ;;
            -l|--list)
                list_nodes
                exit 0
                ;;
            -s|--show)
                mode="show"
                shift
                ;;
            -*)
                log_error "Unknown option: $1"
                show_help
                exit 1
                ;;
            *)
                NODE_ID="$1"
                shift
                ;;
        esac
    done
    
    # Check prerequisites
    check_swarm
    get_node_id
    check_node
    
    # Execute based on mode
    case $mode in
        show)
            show_current_labels
            ;;
        remove)
            show_current_labels
            echo -n "Are you sure you want to remove all labels? [y/N]: "
            read -r response
            if [[ "$response" =~ ^[Yy]$ ]]; then
                remove_labels
            else
                log_info "Cancelled"
            fi
            ;;
        interactive)
            show_current_labels
            interactive_labels
            show_current_labels
            ;;
        add)
            show_current_labels
            add_labels
            show_current_labels
            log_success "Node labels configured!"
            log_info "You can now deploy the stack with: ./scripts/deploy.sh"
            ;;
    esac
}

# Run main function
main "$@"
