# Voyaltis V2 - Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         VOYALTIS V2 ARCHITECTURE                         │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐
│   Mobile App Layer   │
│  (React Native)      │
├──────────────────────┤
│                      │
│  ┌────────────────┐  │     WebRTC (Audio Stream)
│  │ LiveKit Voice  │  │◄─────────────────────────────┐
│  │    Button      │  │                               │
│  └────────────────┘  │                               │
│         │            │     HTTP (Token Request)      │
│         ▼            │                               │
│  ┌────────────────┐  │         ┌──────────────────┐  │
│  │ useLiveKitRoom │──┼────────►│  Node.js Proxy   │  │
│  │     Hook       │  │         │   (server.js)    │  │
│  └────────────────┘  │         │                  │  │
│                      │         │ - Token Gen      │  │
└──────────────────────┘         │ - Claude API     │  │
                                 └──────────────────┘  │
                                                       │
                                          ┌────────────┴─────────────┐
                                          │   LiveKit Cloud/Server   │
                                          │  (WebRTC Signaling)      │
                                          │                          │
                                          │  - Room Management       │
                                          │  - Media Routing         │
                                          │  - Participant Tracking  │
                                          └────────────┬─────────────┘
                                                       │
                                          WebRTC (Audio Stream)
                                                       │
                                                       ▼
                                          ┌────────────────────────┐
                                          │   Python Agent         │
                                          │  (LiveKit Agents SDK)  │
                                          ├────────────────────────┤
                                          │                        │
                                          │  ┌──────────────────┐  │
                                          │  │  Agent Session   │  │
                                          │  │   (main.py)      │  │
                                          │  └────────┬─────────┘  │
                                          │           │            │
                                          │  ┌────────▼─────────┐  │
                                          │  │   Voice Pipeline │  │
                                          │  ├──────────────────┤  │
                                          │  │                  │  │
                                          │  │  1. STT          │  │
                                          │  │  (Deepgram)      │  │
                                          │  │       ▼          │  │
                                          │  │  2. LLM          │  │
                                          │  │  (Claude via     │  │
                                          │  │   Conversational │  │
                                          │  │   Engine)        │  │
                                          │  │       ▼          │  │
                                          │  │  3. TTS          │  │
                                          │  │  (ElevenLabs)    │  │
                                          │  │                  │  │
                                          │  └──────────────────┘  │
                                          │                        │
                                          │  ┌──────────────────┐  │
                                          │  │ Conversational   │  │
                                          │  │    Engine        │  │
                                          │  │                  │  │
                                          │  │ - Claude API     │  │
                                          │  │ - Context Mgmt   │  │
                                          │  │ - Style Adapt.   │  │
                                          │  └──────────────────┘  │
                                          │                        │
                                          │  ┌──────────────────┐  │
                                          │  │ Sales Analyzer   │  │
                                          │  │                  │  │
                                          │  │ - Fuzzy Match    │  │
                                          │  │ - Insights Gen.  │  │
                                          │  │ - Product Map    │  │
                                          │  └──────────────────┘  │
                                          │                        │
                                          └────────────────────────┘
```

---

## Component Breakdown

### 1. Mobile App Layer (React Native + Expo)

**Purpose**: User interface and local audio capture

**Key Components**:
- `LiveKitVoiceButton.tsx`: Main UI component
- `useLiveKitRoom.ts`: Custom hook for room management
- `services/livekit.ts`: LiveKit API service

**Responsibilities**:
- Capture user audio via microphone
- Display real-time transcription
- Manage connection state
- Handle user interactions
- Display conversation feedback

**Technologies**:
- React Native
- Expo
- LiveKit React Native SDK
- WebRTC (under the hood)

---

### 2. Node.js Proxy (server.js)

**Purpose**: Backend API gateway and token generation

**Endpoints**:
```javascript
POST /api/livekit-token
    → Generate LiveKit access token

POST /api/generate-report (legacy)
    → Claude API proxy

POST /api/claude (legacy)
    → Claude API proxy
```

**Responsibilities**:
- Generate secure LiveKit tokens
- Proxy Claude API calls (for legacy features)
- Handle CORS
- Validate requests

**Technologies**:
- Node.js
- Express
- livekit-server-sdk
- dotenv

---

### 3. LiveKit Cloud/Server

**Purpose**: Real-time media infrastructure

**Features**:
- WebRTC signaling
- Media routing (SFU - Selective Forwarding Unit)
- Room management
- Participant tracking
- Quality monitoring
- Transcription forwarding

**Deployment Options**:
- **LiveKit Cloud**: Managed service (easiest)
- **Self-hosted**: Docker or Kubernetes

---

### 4. Python Agent (LiveKit Agents SDK)

**Purpose**: Server-side voice AI processing

**Architecture**:
```python
AgentSession (main.py)
    ↓
VoiceAssistant
    ├── VAD (Voice Activity Detection)
    ├── STT (Speech-to-Text)
    ├── LLM (Language Model)
    └── TTS (Text-to-Speech)

Custom Modules:
    ├── ConversationalEngine
    └── SalesAnalyzer
```

**Flow**:
1. User speaks → Audio stream arrives
2. VAD detects voice activity
3. STT transcribes speech (Deepgram)
4. ConversationalEngine analyzes with Claude
5. SalesAnalyzer maps products & extracts insights
6. TTS generates voice response (ElevenLabs)
7. Audio streamed back to user

**Technologies**:
- Python 3.11+
- livekit-agents
- livekit-plugins-deepgram
- livekit-plugins-elevenlabs
- anthropic (Claude API)

---

## Data Flow

### Real-time Conversation Flow

```
1. User taps voice button
   ↓
2. App requests token from Node.js proxy
   ├─ POST /api/livekit-token
   └─ Returns: { token, url, roomName }
   ↓
3. App connects to LiveKit room
   ├─ Establishes WebRTC connection
   └─ Enables microphone
   ↓
4. Python agent auto-joins room
   ├─ Detected by LiveKit
   └─ Speaks opening message
   ↓
5. User speaks
   ├─ Audio streamed to LiveKit
   └─ Forwarded to agent
   ↓
6. Agent processes (STT → LLM → TTS)
   ├─ Real-time transcription sent back
   └─ Voice response streamed back
   ↓
7. Repeat until conversation complete
   ↓
8. Agent sends final data via data channel
   └─ { sales: {...}, insights: [...], feedback: "..." }
```

### Token Generation Flow

```
Mobile App
    │
    ├─ POST /api/livekit-token
    │  {
    │    roomName: "voyaltis-thomas-1234567890",
    │    participantName: "Thomas",
    │    metadata: { userName: "Thomas", eventName: "Salon" }
    │  }
    │
    ▼
Node.js Proxy (server.js)
    │
    ├─ Validate request
    ├─ Create AccessToken with LiveKit SDK
    ├─ Add grants (roomJoin, publish, subscribe)
    ├─ Sign JWT with API secret
    │
    ▼
    └─ Return
       {
         token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
         url: "wss://your-project.livekit.cloud",
         roomName: "voyaltis-thomas-1234567890"
       }
```

---

## State Management

### App State (React Native)

```typescript
interface ConversationState {
  isConnecting: boolean;    // Connecting to room
  isConnected: boolean;     // Connected to room
  isAgentSpeaking: boolean; // Agent is talking
  transcription: string;    // Live transcription
  error: string | null;     // Error message
}
```

### Agent State (Python)

```python
class ConversationalEngine:
    conversation_history: List[Dict]  # Full dialogue
    collected_data: Dict              # Extracted data
    questions_asked: int              # Counter
    max_questions: int = 5            # Limit
```

---

## Conversation Logic

### Conversational Engine

```python
# System Prompt (varies by style)
styles = {
    "friendly_colleague": "Tu es un collègue sympa...",
    "professional_warm": "Tu es un manager professionnel...",
    "coach_motivating": "Tu es un coach motivant...",
    "casual_relaxed": "Tu es décontracté..."
}

# Analysis Process
1. User speaks → Transcript received
2. Build context:
   - System prompt (style)
   - Attention points (what to collect)
   - Conversation history
   - Question limit
3. Call Claude API
4. Parse JSON response:
   {
     "extractedData": {
       "sales": {"Product": qty},
       "customer_feedback": "...",
       "emotional_context": "enthousiaste",
       "key_insights": [...]
     },
     "nextMessage": "Question or conclusion",
     "isComplete": false,
     "reasoning": "..."
   }
5. Update state
6. Send response via TTS
```

### Sales Analyzer

```python
# Product Mapping with Fuzzy Match
scores = {
    "exact_keyword_match": +20,
    "contains_keyword": +10 to +15,
    "keyword_contains_input": +6,
    "mentions_samsung": +3,
    "mentions_galaxy": +5,
    "unique_category": +15
}

# Example
Input: "frigo"
Matches: "Samsung SmartFridge Elite"
Score: 20 (exact) + 15 (unique category) = 35 ✅
```

---

## Security

### Authentication Flow

```
1. User identity from app metadata
2. Node.js proxy validates user (can add auth here)
3. JWT token generated with:
   - Short expiry (1 hour)
   - Room-specific access
   - Limited permissions
4. Agent validates participant metadata
```

### API Keys

**Environment Variables** (never committed):
- `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET`
- `ANTHROPIC_API_KEY`
- `DEEPGRAM_API_KEY`
- `ELEVENLABS_API_KEY`

**Best Practices**:
- Use `.env` files (gitignored)
- Rotate keys regularly
- Use different keys for dev/prod
- Monitor API usage

---

## Scalability

### Horizontal Scaling

**Agent Scaling**:
```bash
# Run multiple agent instances
python main.py start  # Instance 1
python main.py start  # Instance 2
python main.py start  # Instance 3
```

LiveKit automatically distributes participants across available agents.

**Load Balancing**:
- LiveKit handles routing
- Each room assigned to one agent
- Multiple rooms = multiple agents

### Vertical Scaling

- Add more CPU/RAM to agent server
- Increase max concurrent rooms per agent
- Optimize AI model calls (caching, batching)

---

## Monitoring & Observability

### Metrics to Track

**App Metrics**:
- Connection success rate
- Connection latency
- Audio quality (packet loss, jitter)
- User engagement (session duration)

**Agent Metrics**:
- STT latency
- LLM latency (Claude)
- TTS latency
- End-to-end latency
- Error rates
- Concurrent sessions

**Business Metrics**:
- Conversations completed
- Data quality (completeness)
- Products identified correctly
- User satisfaction

### Logging

**App Logs** (React Native):
```typescript
console.log('Connected to room:', roomName);
console.log('Transcription:', text, 'Final:', isFinal);
```

**Proxy Logs** (Node.js):
```javascript
console.log('Token generated for:', participantName);
console.error('Token error:', error);
```

**Agent Logs** (Python):
```python
logger.info(f"Agent started for room: {room.name}")
logger.info(f"Transcription: {text}")
logger.error(f"Error: {error}")
```

---

## Error Handling

### Network Errors

```typescript
// App reconnection
room.on(RoomEvent.Reconnecting, () => {
  setIsConnecting(true);
});

room.on(RoomEvent.Reconnected, () => {
  setIsConnecting(false);
});
```

### API Errors

```python
# Agent fallback
try:
    response = await anthropic.messages.create(...)
except Exception as e:
    logger.error(f"Claude API error: {e}")
    return fallback_response(user_input)
```

### Agent Crashes

- LiveKit detects agent disconnect
- Can implement agent respawn logic
- User notified of error

---

## Performance Optimization

### Latency Budget

```
Total Target: < 1 second

Audio Capture:       50ms
Network (up):       100ms
STT (Deepgram):     200ms
LLM (Claude):       300ms
TTS (ElevenLabs):   200ms
Network (down):     100ms
Audio Playback:      50ms
────────────────────────
TOTAL:            ~1000ms
```

### Optimization Strategies

1. **Streaming STT**: Start LLM as soon as transcription complete
2. **Streaming TTS**: Start playback before full generation
3. **Caching**: Cache common responses
4. **Connection reuse**: Keep WebRTC connection alive
5. **Geographic proximity**: Deploy agent near LiveKit server

---

## Deployment Architecture

### Production Setup

```
┌─────────────────┐
│   CDN (App)     │
└────────┬────────┘
         │
┌────────▼────────┐
│  Node.js Proxy  │
│  (Railway)      │
└────────┬────────┘
         │
┌────────▼────────────┐
│  LiveKit Cloud      │
└────────┬────────────┘
         │
┌────────▼────────────┐
│  Python Agent       │
│  (Docker/Railway)   │
└─────────────────────┘
```

### Recommended Hosts

- **App**: Expo (OTA updates)
- **Proxy**: Railway, Heroku, Vercel
- **LiveKit**: LiveKit Cloud (managed)
- **Agent**: Railway, Render, AWS ECS

---

## Cost Estimation

### Monthly Costs (estimate for 1000 conversations/month)

| Service | Usage | Cost |
|---------|-------|------|
| LiveKit Cloud | 1000 sessions × 5min | $20-50 |
| Deepgram STT | 5000 min audio | $30 |
| Claude API | 1M tokens | $30 |
| ElevenLabs TTS | 5000 min audio | $100-200 |
| Server Hosting | 1 instance | $20-50 |
| **TOTAL** | | **$200-360/month** |

*Prices approximate and subject to change*

---

## Future Enhancements

### Planned Features

1. **Multi-language support**: Detect and switch languages
2. **Voice cloning**: Personalized agent voice per user
3. **Offline mode**: Local STT/TTS for offline use
4. **Analytics dashboard**: Real-time conversation insights
5. **A/B testing**: Test different conversation styles
6. **Integration**: CRM sync, calendar, email reports

### Technical Improvements

1. **Edge deployment**: Deploy agents closer to users
2. **Model fine-tuning**: Custom Claude fine-tune for domain
3. **Voice biometrics**: User identification by voice
4. **Emotion detection**: Advanced sentiment analysis
5. **Compression**: Optimize audio bandwidth

---

## Summary

Voyaltis V2 uses a modern **real-time streaming architecture** powered by LiveKit, replacing file-based uploads with WebRTC. This enables:

- Natural conversations with sub-second latency
- Live transcription and feedback
- Interruption handling
- Better scalability

The system combines:
- **React Native** (mobile app)
- **LiveKit** (real-time infrastructure)
- **Python Agent** (voice AI processing)
- **Claude** (conversational intelligence)
- **Deepgram** (STT)
- **ElevenLabs** (TTS)

All working together to create a seamless, intelligent voice assistant for sales reporting.
