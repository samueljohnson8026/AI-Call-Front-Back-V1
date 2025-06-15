#!/bin/bash

# AI Calling System - Automated Deployment Script
# Supports local development, production, and cloud deployments

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="AI Calling System"
BACKEND_PORT=${PORT:-3000}
FRONTEND_PORT=${FRONTEND_PORT:-5173}
HEALTH_CHECK_TIMEOUT=30
LOG_DIR="./logs"

# Create logs directory
mkdir -p "$LOG_DIR"

# Function to print colored output
print_header() {
    echo -e "${PURPLE}🚀 $1${NC}"
    echo -e "${PURPLE}$(printf '=%.0s' {1..50})${NC}"
}

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_step() {
    echo -e "${CYAN}🔄 $1${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check service health
check_health() {
    local url=$1
    local service_name=$2
    local timeout=${3:-$HEALTH_CHECK_TIMEOUT}
    
    print_step "Checking $service_name health at $url..."
    
    for i in $(seq 1 $timeout); do
        if curl -s --max-time 5 "$url" > /dev/null 2>&1; then
            print_status "$service_name is healthy!"
            return 0
        fi
        echo -n "."
        sleep 1
    done
    
    echo ""
    print_error "$service_name health check failed after ${timeout}s"
    return 1
}

# Function to kill processes on specific ports
kill_port() {
    local port=$1
    local pids=$(lsof -ti:$port 2>/dev/null || true)
    if [ -n "$pids" ]; then
        print_step "Killing processes on port $port..."
        echo "$pids" | xargs kill -9 2>/dev/null || true
        sleep 2
    fi
}

# Function to validate environment variables
validate_env() {
    local env_type=$1
    local missing_vars=()
    
    if [ "$env_type" = "backend" ] || [ "$env_type" = "all" ]; then
        [ -z "$GEMINI_API_KEY" ] && missing_vars+=("GEMINI_API_KEY")
    fi
    
    if [ "$env_type" = "frontend" ] || [ "$env_type" = "all" ]; then
        [ -z "$VITE_SUPABASE_URL" ] && missing_vars+=("VITE_SUPABASE_URL")
        [ -z "$VITE_SUPABASE_ANON_KEY" ] && missing_vars+=("VITE_SUPABASE_ANON_KEY")
    fi
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        print_error "Missing required environment variables:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        return 1
    fi
    
    print_status "Environment variables validated"
    return 0
}

# Function to install dependencies
install_dependencies() {
    local target=$1
    
    if [ "$target" = "backend" ] || [ "$target" = "all" ]; then
        print_step "Installing backend dependencies..."
        npm install
        print_status "Backend dependencies installed"
    fi
    
    if [ "$target" = "frontend" ] || [ "$target" = "all" ]; then
        print_step "Installing frontend dependencies..."
        cd frontend
        npm install
        cd ..
        print_status "Frontend dependencies installed"
    fi
}

# Function to build projects
build_projects() {
    local target=$1
    
    if [ "$target" = "frontend" ] || [ "$target" = "all" ]; then
        print_step "Building frontend..."
        cd frontend
        npm run build
        cd ..
        print_status "Frontend built successfully"
    fi
    
    # Backend doesn't need building (uses ES modules directly)
    if [ "$target" = "backend" ] || [ "$target" = "all" ]; then
        print_status "Backend ready (no build step required)"
    fi
}

# Function to start backend
start_backend() {
    local mode=$1
    
    print_step "Starting backend server on port $BACKEND_PORT..."
    
    if [ "$mode" = "production" ]; then
        NODE_ENV=production nohup npm start > "$LOG_DIR/backend.log" 2>&1 &
    else
        nohup npm run dev > "$LOG_DIR/backend.log" 2>&1 &
    fi
    
    local backend_pid=$!
    echo "$backend_pid" > "$LOG_DIR/backend.pid"
    
    # Wait for backend to start
    sleep 3
    
    # Health check
    local health_url="http://localhost:$BACKEND_PORT/health"
    if check_health "$health_url" "Backend Server" 15; then
        print_status "Backend server started successfully (PID: $backend_pid)"
        return 0
    else
        print_error "Backend server failed to start"
        return 1
    fi
}

# Function to start frontend
start_frontend() {
    local mode=$1
    
    print_step "Starting frontend on port $FRONTEND_PORT..."
    
    cd frontend
    
    if [ "$mode" = "production" ]; then
        # For production, serve the built files
        if [ ! -d "dist" ]; then
            print_error "Frontend not built. Run with --build first."
            cd ..
            return 1
        fi
        nohup npx serve -s dist -l $FRONTEND_PORT > "../$LOG_DIR/frontend.log" 2>&1 &
    else
        # For development, use Vite dev server
        nohup npm run dev -- --port $FRONTEND_PORT --host 0.0.0.0 > "../$LOG_DIR/frontend.log" 2>&1 &
    fi
    
    local frontend_pid=$!
    echo "$frontend_pid" > "../$LOG_DIR/frontend.pid"
    cd ..
    
    # Wait for frontend to start
    sleep 5
    
    # Health check
    local frontend_url="http://localhost:$FRONTEND_PORT"
    if check_health "$frontend_url" "Frontend" 15; then
        print_status "Frontend started successfully (PID: $frontend_pid)"
        return 0
    else
        print_error "Frontend failed to start"
        return 1
    fi
}

# Function to stop services
stop_services() {
    print_step "Stopping services..."
    
    # Kill by PID files
    if [ -f "$LOG_DIR/backend.pid" ]; then
        local backend_pid=$(cat "$LOG_DIR/backend.pid")
        kill "$backend_pid" 2>/dev/null || true
        rm -f "$LOG_DIR/backend.pid"
        print_status "Backend stopped"
    fi
    
    if [ -f "$LOG_DIR/frontend.pid" ]; then
        local frontend_pid=$(cat "$LOG_DIR/frontend.pid")
        kill "$frontend_pid" 2>/dev/null || true
        rm -f "$LOG_DIR/frontend.pid"
        print_status "Frontend stopped"
    fi
    
    # Kill by port (backup)
    kill_port $BACKEND_PORT
    kill_port $FRONTEND_PORT
    
    print_status "All services stopped"
}

# Function to show status
show_status() {
    print_header "Service Status"
    
    # Check backend
    if [ -f "$LOG_DIR/backend.pid" ] && kill -0 "$(cat "$LOG_DIR/backend.pid")" 2>/dev/null; then
        print_status "Backend: Running (PID: $(cat "$LOG_DIR/backend.pid"))"
        if curl -s "http://localhost:$BACKEND_PORT/health" > /dev/null; then
            print_status "Backend Health: OK"
        else
            print_warning "Backend Health: Not responding"
        fi
    else
        print_error "Backend: Not running"
    fi
    
    # Check frontend
    if [ -f "$LOG_DIR/frontend.pid" ] && kill -0 "$(cat "$LOG_DIR/frontend.pid")" 2>/dev/null; then
        print_status "Frontend: Running (PID: $(cat "$LOG_DIR/frontend.pid"))"
        if curl -s "http://localhost:$FRONTEND_PORT" > /dev/null; then
            print_status "Frontend Health: OK"
        else
            print_warning "Frontend Health: Not responding"
        fi
    else
        print_error "Frontend: Not running"
    fi
    
    echo ""
    print_info "URLs:"
    echo "  Backend:  http://localhost:$BACKEND_PORT"
    echo "  Frontend: http://localhost:$FRONTEND_PORT"
    echo ""
    print_info "Logs:"
    echo "  Backend:  $LOG_DIR/backend.log"
    echo "  Frontend: $LOG_DIR/frontend.log"
}

# Function to show logs
show_logs() {
    local service=$1
    
    if [ "$service" = "backend" ]; then
        if [ -f "$LOG_DIR/backend.log" ]; then
            tail -f "$LOG_DIR/backend.log"
        else
            print_error "Backend log file not found"
        fi
    elif [ "$service" = "frontend" ]; then
        if [ -f "$LOG_DIR/frontend.log" ]; then
            tail -f "$LOG_DIR/frontend.log"
        else
            print_error "Frontend log file not found"
        fi
    else
        print_error "Invalid service. Use 'backend' or 'frontend'"
    fi
}

# Function to run tests
run_tests() {
    print_step "Running tests..."
    
    # Backend tests (if they exist)
    if [ -f "package.json" ] && npm run test --silent 2>/dev/null; then
        print_status "Backend tests passed"
    else
        print_warning "No backend tests found or tests failed"
    fi
    
    # Frontend tests (if they exist)
    cd frontend
    if [ -f "package.json" ] && npm run test --silent 2>/dev/null; then
        print_status "Frontend tests passed"
    else
        print_warning "No frontend tests found or tests failed"
    fi
    cd ..
}

# Function to deploy to cloud platforms
deploy_cloud() {
    local platform=$1
    
    case $platform in
        "render")
            print_step "Deploying to Render..."
            print_info "Make sure you have:"
            echo "  1. Connected this repository to Render"
            echo "  2. Set environment variables in Render dashboard"
            echo "  3. Configured build and start commands"
            print_info "Render will automatically deploy on git push"
            ;;
        "vercel")
            print_step "Deploying frontend to Vercel..."
            if command_exists vercel; then
                cd frontend
                vercel --prod
                cd ..
                print_status "Frontend deployed to Vercel"
            else
                print_error "Vercel CLI not found. Install with: npm i -g vercel"
            fi
            ;;
        "railway")
            print_step "Deploying to Railway..."
            if command_exists railway; then
                railway up
                print_status "Deployed to Railway"
            else
                print_error "Railway CLI not found. Install with: npm i -g @railway/cli"
            fi
            ;;
        *)
            print_error "Unknown platform: $platform"
            print_info "Supported platforms: render, vercel, railway"
            ;;
    esac
}

# Function to show help
show_help() {
    echo "AI Calling System - Deployment Script"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  start [dev|prod]     Start services (default: dev)"
    echo "  stop                 Stop all services"
    echo "  restart [dev|prod]   Restart services"
    echo "  status               Show service status"
    echo "  logs [backend|frontend] Show service logs"
    echo "  build [frontend|all] Build projects"
    echo "  install [backend|frontend|all] Install dependencies"
    echo "  test                 Run tests"
    echo "  deploy [render|vercel|railway] Deploy to cloud platform"
    echo "  clean                Clean logs and temporary files"
    echo "  help                 Show this help"
    echo ""
    echo "Options:"
    echo "  --port PORT          Set backend port (default: 3000)"
    echo "  --frontend-port PORT Set frontend port (default: 5173)"
    echo "  --no-health-check    Skip health checks"
    echo ""
    echo "Environment Variables:"
    echo "  GEMINI_API_KEY       Required for backend"
    echo "  VITE_SUPABASE_URL    Required for frontend"
    echo "  VITE_SUPABASE_ANON_KEY Required for frontend"
    echo "  VITE_API_URL         Backend URL for frontend"
    echo ""
    echo "Examples:"
    echo "  $0 start dev         Start in development mode"
    echo "  $0 start prod        Start in production mode"
    echo "  $0 deploy render     Deploy to Render"
    echo "  $0 logs backend      Show backend logs"
}

# Main script logic
main() {
    local command=${1:-"help"}
    local mode=${2:-"dev"}
    
    # Parse options
    while [[ $# -gt 0 ]]; do
        case $1 in
            --port)
                BACKEND_PORT="$2"
                shift 2
                ;;
            --frontend-port)
                FRONTEND_PORT="$2"
                shift 2
                ;;
            --no-health-check)
                HEALTH_CHECK_TIMEOUT=0
                shift
                ;;
            *)
                break
                ;;
        esac
    done
    
    print_header "$PROJECT_NAME - Deployment Script"
    
    # Check prerequisites
    if ! command_exists node; then
        print_error "Node.js not found. Please install Node.js 18+"
        exit 1
    fi
    
    if ! command_exists npm; then
        print_error "npm not found. Please install npm"
        exit 1
    fi
    
    print_status "Node.js $(node --version) found"
    print_status "npm $(npm --version) found"
    
    case $command in
        "start")
            # Validate environment
            if [ "$mode" = "prod" ] || [ "$mode" = "production" ]; then
                validate_env "all" || exit 1
                mode="production"
            else
                mode="development"
            fi
            
            print_step "Starting in $mode mode..."
            
            # Clean up existing processes
            stop_services
            
            # Install dependencies
            install_dependencies "all"
            
            # Build if production
            if [ "$mode" = "production" ]; then
                build_projects "all"
            fi
            
            # Start services
            start_backend "$mode" || exit 1
            start_frontend "$mode" || exit 1
            
            print_header "🎉 Deployment Complete!"
            show_status
            
            print_info "Press Ctrl+C to stop services"
            
            # Keep script running
            trap 'stop_services; exit 0' INT TERM
            while true; do
                sleep 1
            done
            ;;
        "stop")
            stop_services
            ;;
        "restart")
            stop_services
            sleep 2
            $0 start "$mode"
            ;;
        "status")
            show_status
            ;;
        "logs")
            show_logs "$mode"
            ;;
        "build")
            local target=${mode:-"all"}
            build_projects "$target"
            ;;
        "install")
            local target=${mode:-"all"}
            install_dependencies "$target"
            ;;
        "test")
            run_tests
            ;;
        "deploy")
            deploy_cloud "$mode"
            ;;
        "clean")
            print_step "Cleaning logs and temporary files..."
            rm -rf "$LOG_DIR"
            rm -f *.pid
            print_status "Cleaned"
            ;;
        "help"|"--help"|"-h")
            show_help
            ;;
        *)
            print_error "Unknown command: $command"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"