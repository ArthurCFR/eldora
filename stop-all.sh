#!/bin/bash

# Voyaltis - Stop All Services
# Cleanly stops LiveKit, Proxy, Agent, and Expo

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${RED}🛑 Stopping Voyaltis Services${NC}"
echo "================================"

# Function to check if a port is in use
check_port() {
    lsof -ti:$1 > /dev/null 2>&1
}

# Function to kill process on port
kill_port() {
    if check_port $1; then
        echo -e "${YELLOW}Stopping service on port $1...${NC}"
        lsof -ti:$1 | xargs kill -9 2>/dev/null || true
    else
        echo -e "${GREEN}Port $1 already free${NC}"
    fi
}

# Stop services
echo -e "${BLUE}Stopping LiveKit (port 7880)...${NC}"
kill_port 7880
pkill -f "livekit-server" 2>/dev/null || true

echo -e "${BLUE}Stopping Proxy (port 3001)...${NC}"
kill_port 3001

echo -e "${BLUE}Stopping Agent (port 8081)...${NC}"
kill_port 8081
pkill -f "mainV2.py" 2>/dev/null || true
pkill -f "start-v2.sh" 2>/dev/null || true

echo -e "${BLUE}Stopping Expo (port 8082)...${NC}"
kill_port 8082
pkill -f "expo start" 2>/dev/null || true

sleep 1

echo ""
echo -e "${GREEN}✅ All services stopped!${NC}"
echo ""
