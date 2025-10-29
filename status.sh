#!/bin/bash

# Voyaltis - Check Services Status
# Shows which services are running

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}📊 Voyaltis Services Status${NC}"
echo "================================"

# Function to check if a port is in use and get PID
check_service() {
    local name=$1
    local port=$2
    local url=$3

    if lsof -ti:$port > /dev/null 2>&1; then
        local pid=$(lsof -ti:$port | head -1)
        echo -e "${GREEN}✅ $name${NC} - Running on $url (PID: $pid)"
    else
        echo -e "${RED}❌ $name${NC} - Not running (port $port free)"
    fi
}

check_service "LiveKit " 7880 "http://localhost:7880"
check_service "Proxy   " 3001 "http://localhost:3001"
check_service "Agent   " 8081 "http://localhost:8081"
check_service "Expo Web" 8082 "http://localhost:8082"

echo ""
echo -e "${BLUE}Commands:${NC}"
echo -e "  ${GREEN}./start-all.sh${NC}     - Start all services"
echo -e "  ${GREEN}./stop-all.sh${NC}      - Stop all services"
echo -e "  ${GREEN}./restart-agent.sh${NC} - Restart only agent"
echo ""
