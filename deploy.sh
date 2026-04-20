#!/bin/bash
# ===========================================
# Office Supply Management System - Deployer
# ===========================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "${BLUE}============================================${NC}"
    echo -e "${BLUE}  OSMS Deployment Agent${NC}"
    echo -e "${BLUE}============================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

check_prerequisites() {
    print_info "Checking prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        exit 1
    fi
    print_success "Docker found"
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_error "Docker Compose is not installed"
        exit 1
    fi
    print_success "Docker Compose found"
    
    if [ ! -f ".env" ]; then
        print_warning ".env file not found, creating from example..."
        if [ -f ".env.example" ]; then
            cp .env.example .env
            print_success "Created .env from .env.example"
        else
            echo "JWT_SECRET=your-super-secret-jwt-key-change-in-production" > .env
            echo "JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production" >> .env
            print_success "Created default .env file"
        fi
    fi
    print_success ".env file exists"
}

build_images() {
    print_info "Building Docker images..."
    docker-compose build --no-cache
    print_success "Images built successfully"
}

start_services() {
    print_info "Starting services..."
    docker-compose up -d
    print_success "Services started"
}

stop_services() {
    print_info "Stopping services..."
    docker-compose down
    print_success "Services stopped"
}

restart_services() {
    stop_services
    start_services
}

show_status() {
    print_info "Service Status:"
    docker-compose ps
}

show_logs() {
    local service=$1
    if [ -z "$service" ]; then
        docker-compose logs -f
    else
        docker-compose logs -f "$service"
    fi
}

health_check() {
    print_info "Running health checks..."
    
    echo ""
    print_info "MongoDB:"
    if docker-compose exec -T mongo mongosh --eval "db.runCommand('ping')" &> /dev/null; then
        print_success "MongoDB is healthy"
    else
        print_error "MongoDB is not responding"
    fi
    
    echo ""
    print_info "Server (http://localhost:3001):"
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001 | grep -q "200\|404"; then
        print_success "Server is healthy"
    else
        print_warning "Server may not be ready yet"
    fi
    
    echo ""
    print_info "Client (http://localhost:80):"
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:80 | grep -q "200"; then
        print_success "Client is healthy"
    else
        print_warning "Client may not be ready yet"
    fi
}

clean_deploy() {
    print_warning "This will remove all containers and volumes!"
    read -p "Are you sure? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Cleaning up..."
        docker-compose down -v --remove-orphans
        docker system prune -f
        print_success "Cleanup complete"
        
        print_info "Rebuilding..."
        build_images
        start_services
        print_success "Clean deployment complete"
    fi
}

show_help() {
    echo "Usage: ./deploy.sh [command]"
    echo ""
    echo "Commands:"
    echo "  up, start       Build and start all services"
    echo "  down, stop      Stop all services"
    echo "  restart         Restart all services"
    echo "  build           Build Docker images"
    echo "  status          Show service status"
    echo "  logs [service]  Show logs (optionally for specific service)"
    echo "  health          Run health checks"
    echo "  clean           Clean rebuild (removes volumes)"
    echo "  help            Show this help message"
    echo ""
    echo "Services: mongo, server, client"
}

# Main
print_header

case "${1:-help}" in
    up|start)
        check_prerequisites
        build_images
        start_services
        echo ""
        print_success "🚀 Deployment complete!"
        echo ""
        echo "  Server: http://localhost:3001"
        echo "  Client: http://localhost:80"
        echo "  MongoDB: localhost:27017"
        echo ""
        echo "Run './deploy.sh logs' to monitor services"
        ;;
    down|stop)
        stop_services
        ;;
    restart)
        restart_services
        ;;
    build)
        check_prerequisites
        build_images
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs "$2"
        ;;
    health)
        health_check
        ;;
    clean)
        clean_deploy
        ;;
    help|*)
        show_help
        ;;
esac
