# Voyaltis LiveKit Voice Agent

Python-based LiveKit agent for real-time conversational AI.

## Setup

1. Install Python 3.11+
2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your API keys
```

4. Run the agent:
```bash
python main.py start
```

## Docker Deployment

Build and run with Docker:
```bash
docker build -t voyaltis-agent .
docker run --env-file .env voyaltis-agent
```

## Architecture

- `main.py` - LiveKit agent entry point
- `conversational_engine.py` - Claude-powered conversational logic
- `sales_analyzer.py` - Product mapping and insights generation
- `produits.json` - Product catalog

## Configuration

The agent loads configuration from environment variables:
- `LIVEKIT_URL` - LiveKit server URL
- `LIVEKIT_API_KEY` - API key
- `LIVEKIT_API_SECRET` - API secret
- `ANTHROPIC_API_KEY` - Claude API key
- `OPENAI_API_KEY` - OpenAI/Whisper API key (optional)
- `DEEPGRAM_API_KEY` - Deepgram STT key
- `ELEVENLABS_API_KEY` - ElevenLabs TTS key
