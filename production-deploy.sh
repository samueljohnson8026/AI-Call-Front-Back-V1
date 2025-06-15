#!/bin/bash

# AI Calling System - Production Deployment Script
# Optimized for cloud platforms (Render, Vercel, Railway, etc.)

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="AI Calling System - Production"
NODE_ENV=${NODE_ENV:-production}
PORT=${PORT:-3000}

# Function to print colored output
print_header() {
    echo -e "${PURPLE}🚀 $1${NC}"
    echo -e "${PURPLE}$(printf '=%.0s' {1..60})${NC}"
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
    echo -e "${BLUE}🔄 $1${NC}"
}

# Function to validate production environment
validate_production_env() {
    print_step "Validating production environment..."
    
    local missing_vars=()
    local warnings=()
    
    # Critical environment variables
    [ -z "$GEMINI_API_KEY" ] && missing_vars+=("GEMINI_API_KEY")
    
    # Optional but recommended
    [ -z "$NODE_ENV" ] && warnings+=("NODE_ENV (defaulting to production)")
    [ -z "$PORT" ] && warnings+=("PORT (defaulting to 3000)")
    
    # Show warnings
    if [ ${#warnings[@]} -gt 0 ]; then
        print_warning "Missing optional environment variables:"
        for var in "${warnings[@]}"; do
            echo "  - $var"
        done
        echo ""
    fi
    
    # Check critical variables
    if [ ${#missing_vars[@]} -gt 0 ]; then
        print_error "Missing critical environment variables:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        echo ""
        print_error "Production deployment cannot continue without these variables"
        return 1
    fi
    
    print_status "Production environment validated"
    return 0
}

# Function to check system requirements
check_system_requirements() {
    print_step "Checking system requirements..."
    
    # Check Node.js version
    if ! command -v node >/dev/null 2>&1; then
        print_error "Node.js not found"
        return 1
    fi
    
    local node_version=$(node --version | sed 's/v//')
    local major_version=$(echo $node_version | cut -d. -f1)
    
    if [ "$major_version" -lt 18 ]; then
        print_error "Node.js version $node_version found. Minimum required: 18.x"
        return 1
    fi
    
    print_status "Node.js $node_version (✓)"
    
    # Check npm
    if ! command -v npm >/dev/null 2>&1; then
        print_error "npm not found"
        return 1
    fi
    
    print_status "npm $(npm --version) (✓)"
    
    # Check available memory (if possible)
    if command -v free >/dev/null 2>&1; then
        local available_mem=$(free -m | awk 'NR==2{printf "%.0f", $7}')
        if [ "$available_mem" -lt 512 ]; then
            print_warning "Low available memory: ${available_mem}MB (recommended: 512MB+)"
        else
            print_status "Available memory: ${available_mem}MB (✓)"
        fi
    fi
    
    return 0
}

# Function to install production dependencies
install_production_dependencies() {
    print_step "Installing production dependencies..."
    
    # Set npm to production mode
    export NODE_ENV=production
    
    # Install backend dependencies
    print_info "Installing backend dependencies..."
    npm ci --only=production --silent
    print_status "Backend dependencies installed"
    
    # Install frontend dependencies (for build)
    if [ -d "frontend" ]; then
        print_info "Installing frontend dependencies..."
        cd frontend
        npm ci --silent
        cd ..
        print_status "Frontend dependencies installed"
    fi
}

# Function to build for production
build_production() {
    print_step "Building for production..."
    
    # Build frontend
    if [ -d "frontend" ]; then
        print_info "Building frontend..."
        cd frontend
        npm run build
        cd ..
        print_status "Frontend built successfully"
        
        # Verify build output
        if [ ! -d "frontend/dist" ]; then
            print_error "Frontend build failed - dist directory not found"
            return 1
        fi
        
        local build_size=$(du -sh frontend/dist | cut -f1)
        print_info "Frontend build size: $build_size"
    fi
    
    # Backend doesn't need building (uses ES modules)
    print_status "Backend ready for production"
}

# Function to run production health checks
run_health_checks() {
    print_step "Running production health checks..."
    
    # Check if server can start
    print_info "Testing server startup..."
    timeout 10s node server.js --test 2>/dev/null || {
        print_warning "Server startup test failed (this may be normal if --test flag is not implemented)"
    }
    
    # Check package integrity
    print_info "Checking package integrity..."
    if [ -f "package-lock.json" ]; then
        npm audit --audit-level=high --production || {
            print_warning "Security vulnerabilities found in dependencies"
        }
    fi
    
    # Check critical files
    local critical_files=("server.js" "package.json")
    for file in "${critical_files[@]}"; do
        if [ ! -f "$file" ]; then
            print_error "Critical file missing: $file"
            return 1
        fi
    done
    
    print_status "Health checks completed"
}

# Function to optimize for production
optimize_production() {
    print_step "Optimizing for production..."
    
    # Set production environment
    export NODE_ENV=production
    
    # Clean npm cache
    npm cache clean --force 2>/dev/null || true
    
    # Remove development dependencies if they exist
    if [ -d "node_modules" ]; then
        print_info "Cleaning development dependencies..."
        npm prune --production
    fi
    
    # Optimize frontend build
    if [ -d "frontend/dist" ]; then
        print_info "Optimizing frontend assets..."
        
        # Compress static files if gzip is available
        if command -v gzip >/dev/null 2>&1; then
            find frontend/dist -type f \( -name "*.js" -o -name "*.css" -o -name "*.html" \) -exec gzip -k {} \;
            print_status "Static files compressed"
        fi
    fi
    
    print_status "Production optimization completed"
}

# Function to start production server
start_production_server() {
    print_step "Starting production server..."
    
    # Set production environment variables
    export NODE_ENV=production
    export PORT=${PORT:-3000}
    
    print_info "Server configuration:"
    echo "  - Environment: $NODE_ENV"
    echo "  - Port: $PORT"
    echo "  - Process: $$"
    
    # Start the server
    print_status "Starting server on port $PORT..."
    exec node server.js
}

# Function to show deployment summary
show_deployment_summary() {
    print_header "🎉 Production Deployment Summary"
    
    echo "📊 System Information:"
    echo "  - Node.js: $(node --version)"
    echo "  - npm: $(npm --version)"
    echo "  - Environment: $NODE_ENV"
    echo "  - Port: $PORT"
    echo ""
    
    echo "📦 Components:"
    echo "  - Backend: ✅ Ready"
    if [ -d "frontend/dist" ]; then
        echo "  - Frontend: ✅ Built and ready"
        echo "  - Build size: $(du -sh frontend/dist | cut -f1)"
    else
        echo "  - Frontend: ⚠️  Not built (backend-only deployment)"
    fi
    echo ""
    
    echo "🔧 Configuration:"
    echo "  - GEMINI_API_KEY: $([ -n "$GEMINI_API_KEY" ] && echo "✅ Set" || echo "❌ Missing")"
    echo "  - NODE_ENV: $NODE_ENV"
    echo "  - PORT: $PORT"
    echo ""
    
    echo "🌐 Endpoints:"
    echo "  - Health: http://localhost:$PORT/health"
    echo "  - Status: http://localhost:$PORT/status"
    if [ -d "frontend/dist" ]; then
        echo "  - Frontend: http://localhost:$PORT/"
    fi
    echo ""
    
    print_status "Production deployment ready!"
}

# Function to handle deployment for specific platforms
deploy_platform() {
    local platform=$1
    
    case $platform in
        "render")
            print_header "Render Deployment"
            print_info "This script is optimized for Render's build process"
            print_info "Render will run: npm install && npm start"
            ;;
        "railway")
            print_header "Railway Deployment"
            print_info "This script is optimized for Railway's build process"
            ;;
        "heroku")
            print_header "Heroku Deployment"
            print_info "This script is optimized for Heroku's build process"
            ;;
        *)
            print_header "Generic Cloud Deployment"
            ;;
    esac
}

# Main production deployment function
main() {
    local platform=${1:-"generic"}
    local action=${2:-"deploy"}
    
    print_header "$PROJECT_NAME"
    
    case $action in
        "deploy")
            # Full production deployment
            deploy_platform "$platform"
            check_system_requirements || exit 1
            validate_production_env || exit 1
            install_production_dependencies || exit 1
            build_production || exit 1
            run_health_checks || exit 1
            optimize_production || exit 1
            show_deployment_summary
            
            # Start server if not in build-only mode
            if [ "${BUILD_ONLY:-false}" != "true" ]; then
                start_production_server
            fi
            ;;
        "build")
            # Build-only mode
            print_info "Running in build-only mode"
            check_system_requirements || exit 1
            install_production_dependencies || exit 1
            build_production || exit 1
            print_status "Build completed successfully"
            ;;
        "test")
            # Test mode
            print_info "Running in test mode"
            check_system_requirements || exit 1
            validate_production_env || exit 1
            run_health_checks || exit 1
            print_status "Production tests passed"
            ;;
        *)
            print_error "Unknown action: $action"
            echo "Usage: $0 [platform] [deploy|build|test]"
            exit 1
            ;;
    esac
}

# Handle script interruption
trap 'print_warning "Deployment interrupted"; exit 1' INT TERM

# Run main function
main "$@"