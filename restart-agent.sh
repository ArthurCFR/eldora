#!/bin/bash

# Voyaltis - Restart Python Agent Only
# Quick restart for when you only modify Python code

set -e

PROJECT_ROOT="/home/arthurc/dev/projects/Eldora"
AGENT_DIR="$PROJECT_ROOT/agent"
LOG_DIR="$PROJECT_ROOT/logs"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 Restarting Python Agent${NC}"
echo "================================"

# Create logs directory
mkdir -p "$LOG_DIR"

# Function to check if a port is in use
check_port() {
    lsof -ti:$1 > /dev/null 2>&1
}

# Stop existing agent
echo -e "${YELLOW}Stopping existing agent...${NC}"
lsof -ti:8081 | xargs kill -9 2>/dev/null || true
pkill -f "mainV2.py" 2>/dev/null || true
pkill -f "start-v2.sh" 2>/dev/null || true
sleep 2

# Start Python Agent
echo -e "${GREEN}Starting Python Agent (port 8081)...${NC}"
cd "$AGENT_DIR"
nohup ./start-v2.sh > "$LOG_DIR/agent.log" 2>&1 &
AGENT_PID=$!
echo "   PID: $AGENT_PID"

sleep 3

echo ""
echo -e "${GREEN}✅ Python Agent restarted!${NC}"
echo "================================"
echo -e "Agent:    ${GREEN}http://localhost:8081${NC}  (PID: $AGENT_PID)"
echo -e "Log file: ${YELLOW}$LOG_DIR/agent.log${NC}"
echo ""
echo -e "${BLUE}Commands:${NC}"
echo -e "  ${GREEN}tail -f logs/agent.log${NC}  - View agent logs"
echo ""
