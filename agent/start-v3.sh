#!/bin/bash
# Start Voyaltis Agent V3 (Natural Conversation - Premium Stack)

cd "$(dirname "$0")"

echo "🚀 Starting Voyaltis Agent V3 (Natural Conversational Agent)"
echo "======================================================================="
echo ""
echo "Version: V3 - Ultra-free natural conversation"
echo "Features: Premium stack (Deepgram Nova-2 + GPT-4o), no rigid questions"
echo "Stack: Deepgram STT | GPT-4o LLM | ElevenLabs TTS"
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

# Start agent V3
echo "Checking for existing agents..."
# Kill any existing agent processes
pkill -f "python main" 2>/dev/null && echo "✅ Stopped existing agents" || echo "✅ No existing agents found"

# Wait for port to be freed
sleep 1

echo "Starting agent V3..."
python mainV3.py start

# Note: Use 'python mainV3.py dev' for development mode with auto-reload
