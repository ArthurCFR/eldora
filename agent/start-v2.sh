#!/bin/bash
# Start Voyaltis Agent V2 (Ultra-Simplified)

cd "$(dirname "$0")"

echo "🚀 Starting Voyaltis Agent V2 (Ultra-Simplified)"
echo "================================================"
echo ""
echo "Version: V2 - Simple linear question flow"
echo "Features: Minimal complexity, direct questions"
echo ""

# Check if venv exists
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found!"
    echo "Run: python -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
    exit 1
fi

# Activate venv
source venv/bin/activate

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found"
    echo "Copy .env.example to .env and configure your API keys"
    exit 1
fi

# Start agent V2
echo "Checking for existing agents..."
# Kill any existing agent processes
pkill -f "python main" 2>/dev/null && echo "✅ Stopped existing agents" || echo "✅ No existing agents found"

# Wait for port to be freed
sleep 1

echo "Starting agent..."
python mainV2.py start

# Note: Use 'python mainV2.py dev' for development mode with auto-reload
