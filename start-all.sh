#!/bin/bash

# Voyaltis - Start All Services
# Launches LiveKit, Proxy, Agent, and Expo in background

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

# Create logs directory
mkdir -p "$LOG_DIR"

echo -e "${BLUE}🚀 Starting Voyaltis Services${NC}"
echo "================================"

# Function to check if a port is in use
check_port() {
    lsof -ti:$1 > /dev/null 2>&1
}

# Function to kill process on port
kill_port() {
    if check_port $1; then
        echo -e "${YELLOW}⚠️  Port $1 in use, killing existing process...${NC}"
        lsof -ti:$1 | xargs kill -9 2>/dev/null || true
        sleep 1
    fi
}

# Clean up old processes
echo -e "${YELLOW}🧹 Cleaning up old processes...${NC}"
kill_port 7880  # LiveKit
kill_port 3001  # Proxy
kill_port 8081  # Agent
kill_port 8082  # Expo
pkill -f "livekit-server" 2>/dev/null || true
pkill -f "mainV2.py" 2>/dev/null || true
pkill -f "expo start" 2>/dev/null || true

sleep 2

# Start LiveKit Server
echo -e "${GREEN}1️⃣  Starting LiveKit Server (port 7880)...${NC}"
cd "$PROJECT_ROOT"
nohup npm run livekit:local > "$LOG_DIR/livekit.log" 2>&1 &
LIVEKIT_PID=$!
echo "   PID: $LIVEKIT_PID"
sleep 3

# Start Proxy Server
echo -e "${GREEN}2️⃣  Starting Proxy Server (port 3001)...${NC}"
cd "$PROJECT_ROOT"
nohup npm run proxy > "$LOG_DIR/proxy.log" 2>&1 &
PROXY_PID=$!
echo "   PID: $PROXY_PID"
sleep 2

# Start Python Agent - COMMENTED OUT (manual start for debugging)
echo -e "${YELLOW}3️⃣  Python Agent NOT started (start manually with: cd agent && ./start-v2.sh)${NC}"
# cd "$AGENT_DIR"
# nohup ./start-v2.sh > "$LOG_DIR/agent.log" 2>&1 &
# AGENT_PID=$!
# echo "   PID: $AGENT_PID"
# sleep 3
AGENT_PID="MANUAL"

# Start Expo Web
echo -e "${GREEN}4️⃣  Starting Expo Web (port 8082)...${NC}"
cd "$PROJECT_ROOT"
nohup npx expo start --web -c > "$LOG_DIR/expo.log" 2>&1 &
EXPO_PID=$!
echo "   PID: $EXPO_PID"

# Wait for Expo to be ready
echo -e "${YELLOW}⏳ Waiting for Expo to be ready...${NC}"
sleep 8

# Try to open browser (WSL-aware)
if command -v wslview > /dev/null 2>&1; then
    echo -e "${GREEN}🌐 Opening browser with wslview...${NC}"
    wslview http://localhost:8082 &
elif command -v powershell.exe > /dev/null 2>&1; then
    echo -e "${GREEN}🌐 Opening browser with PowerShell...${NC}"
    powershell.exe -Command "Start-Process 'http://localhost:8082'" &
else
    echo -e "${YELLOW}💡 Open manually: http://localhost:8082${NC}"
fi

echo ""
echo -e "${BLUE}✅ Services started (except Agent)!${NC}"
echo "================================"
echo -e "LiveKit:  ${GREEN}http://localhost:7880${NC}  (PID: $LIVEKIT_PID)"
echo -e "Proxy:    ${GREEN}http://localhost:3001${NC}  (PID: $PROXY_PID)"
echo -e "Agent:    ${YELLOW}MANUAL START REQUIRED${NC}"
echo -e "          ${YELLOW}→ cd agent && ./start-v2.sh${NC}"
echo -e "Expo Web: ${GREEN}http://localhost:8082${NC}  (PID: $EXPO_PID)"
echo ""
echo -e "${YELLOW}📝 Logs directory: $LOG_DIR${NC}"
echo ""
echo -e "${BLUE}Commands:${NC}"
echo -e "  ${GREEN}./stop-all.sh${NC}     - Stop all services"
echo -e "  ${GREEN}./restart-agent.sh${NC} - Restart only the Python agent"
echo -e "  ${GREEN}tail -f logs/*.log${NC} - View logs"
echo ""
echo -e "${YELLOW}💡 Tip: Run './stop-all.sh' to cleanly stop all services${NC}"
