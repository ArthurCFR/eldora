# Eldora/Voyaltis - Documentation Technique Complète

> **Document exhaustif pour discussion et amélioration du système**
> Date : Octobre 2024
> Version : V2 (LiveKit Real-Time Architecture)

---

## Table des matières

1. [Vue d'ensemble du projet](#1-vue-densemble-du-projet)
2. [Architecture technique globale](#2-architecture-technique-globale)
3. [Couche Frontend - React Native](#3-couche-frontend---react-native)
4. [Couche Backend - Proxy Node.js](#4-couche-backend---proxy-nodejs)
5. [Couche Agent - Python LiveKit](#5-couche-agent---python-livekit)
6. [Flux de données complet](#6-flux-de-données-complet)
7. [Système de configuration dynamique](#7-système-de-configuration-dynamique)
8. [Moteur conversationnel](#8-moteur-conversationnel)
9. [Génération de rapports](#9-génération-de-rapports)
10. [Gestion de l'état et persistance](#10-gestion-de-létat-et-persistance)
11. [Limitations actuelles](#11-limitations-actuelles)
12. [Pistes d'amélioration](#12-pistes-damélioration)

---

## 1. Vue d'ensemble du projet

### 1.1 Contexte et objectif

**Eldora (anciennement Voyaltis)** est une application mobile d'assistance vocale en temps réel destinée aux commerciaux lors d'événements salon (ex: Samsung). L'objectif est de **transformer une conversation vocale naturelle en rapport de vente structuré** sans effort manuel.

**Problème résolu :**
- Les commerciaux perdent du temps à saisir manuellement leurs rapports de vente
- Les informations collectées sont souvent incomplètes ou mal structurées
- Le processus de reporting est perçu comme une corvée administrative

**Solution apportée :**
- Conversation vocale naturelle avec un assistant IA (comme parler à un collègue)
- Transcription en temps réel de la parole
- Extraction automatique des données structurées (ventes, insights, retours clients)
- Génération de rapport professionnel prêt à envoyer

### 1.2 Technologies principales

**Stack Frontend :**
- React Native + Expo
- TypeScript
- LiveKit Client SDK (WebRTC)
- AsyncStorage (persistance locale)

**Stack Backend Proxy :**
- Node.js + Express
- LiveKit Server SDK (génération de tokens)
- CORS enabled

**Stack Agent Python :**
- LiveKit Agents Framework
- OpenAI Whisper (STT - Speech to Text)
- OpenAI GPT-4o-mini (LLM conversationnel)
- ElevenLabs TTS (Text to Speech - voix française)
- Anthropic Claude 3.5 Sonnet (analyse et extraction de données)
- Silero VAD (Voice Activity Detection)

**Infrastructure :**
- LiveKit Cloud (serveur WebRTC géré)
- WebRTC pour streaming audio bidirectionnel

### 1.3 Évolution V1 → V2

**V1 (Architecture fichiers - LEGACY)** :
```
User → Record audio → Upload file → Claude API → Generate report → Download
Latence : 3-5 secondes par message
```

**V2 (Architecture temps réel - ACTUELLE)** :
```
User ←→ LiveKit Room ←→ Python Agent (STT → LLM → TTS)
Latence : ~500ms
Streaming audio bidirectionnel
Conversation naturelle avec détection de tour de parole
```

**Gains V2 :**
- Latence réduite de 90%
- Conversation fluide et naturelle
- Interruption possible de l'agent
- Transcription en direct visible par l'utilisateur
- Expérience utilisateur comparable à un appel téléphonique

---

## 2. Architecture technique globale

### 2.1 Schéma d'architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    REACT NATIVE APP (Expo)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  samsung.tsx │  │  admin.tsx   │  │ index.tsx    │          │
│  │  (Main)      │  │  (Config)    │  │ (Redirect)   │          │
│  └──────┬───────┘  └──────────────┘  └──────────────┘          │
│         │                                                        │
│  ┌──────▼────────────────────────────────────────────────────┐  │
│  │           LiveKitVoiceButton Component                     │  │
│  │  ┌────────────────────────────────────────────────────┐   │  │
│  │  │        useLiveKitRoom Hook (state manager)         │   │  │
│  │  └────────────────────────────────────────────────────┘   │  │
│  └───────────────────────────────┬────────────────────────────┘  │
│                                  │                               │
│  ┌───────────────────────────────▼─────────────────────────┐    │
│  │         AsyncStorage (Local Persistence)                │    │
│  │  - Assistant Config (attention points, style)           │    │
│  │  - Daily Reports (sales data, drafts)                   │    │
│  └─────────────────────────────────────────────────────────┘    │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP (get token)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                   NODE.JS PROXY SERVER                          │
│                      (localhost:3001)                           │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  POST /api/livekit-token                                 │   │
│  │  - Generate JWT token with metadata                      │   │
│  │  - Include: userName, eventName, assistantConfig,       │   │
│  │             existingReport                               │   │
│  └──────────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────────┘
                            │ Return: {token, url, roomName}
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    LIVEKIT CLOUD (WebRTC)                       │
│                    wss://xxx.livekit.cloud                      │
│                                                                 │
│  ┌───────────────────┐         ┌───────────────────┐           │
│  │  Room: voyaltis-  │  WebRTC │   Python Agent    │           │
│  │  user-timestamp   │ ←─────→ │   (entrypoint)    │           │
│  └───────────────────┘         └───────────────────┘           │
└──────────────────────────────────────┬──────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────┐
│              PYTHON AGENT (LiveKit Agents SDK)                  │
│                    agent/main.py                                │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  entrypoint(ctx: JobContext)                            │   │
│  │  - Load participant metadata (config, existing report)  │   │
│  │  - Initialize ConversationalEngine                      │   │
│  │  - Initialize SalesAnalyzer                             │   │
│  │  - Create AgentSession with voice pipeline             │   │
│  └───────────────────────┬─────────────────────────────────┘   │
│                          │                                     │
│  ┌───────────────────────▼─────────────────────────────────┐   │
│  │         VOICE PIPELINE (AgentSession)                   │   │
│  │                                                          │   │
│  │  User Audio → VAD (Silero) → STT (Whisper)              │   │
│  │       ↓                           ↓                      │   │
│  │  Speaker ← TTS (ElevenLabs) ← LLM (GPT-4o-mini)         │   │
│  │                                                          │   │
│  │  Transcription events → Store messages                  │   │
│  │  Question counter → End detection                       │   │
│  └───────────────────────┬─────────────────────────────────┘   │
│                          │                                     │
│  ┌───────────────────────▼─────────────────────────────────┐   │
│  │   CONVERSATION END DETECTED                             │   │
│  │   1. Send "conversation_ending" signal to client        │   │
│  │   2. Build full conversation history                    │   │
│  │   3. Call Claude 3.5 Sonnet for data extraction         │   │
│  │   4. Apply fuzzy matching (SalesAnalyzer)               │   │
│  │   5. Send "conversation_complete" with data             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │         CONVERSATIONAL ENGINE                           │   │
│  │  - Prompt generation (voice assistant, no JSON)         │   │
│  │  - Dynamic attention points injection                   │   │
│  │  - Edit mode vs Creation mode logic                    │   │
│  │  - Brand-specific configuration                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │         SALES ANALYZER                                  │   │
│  │  - Fuzzy matching (keywords scoring)                    │   │
│  │  - Product name mapping                                 │   │
│  │  - Brand mentions bonus                                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │         CONFIG LOADER                                   │   │
│  │  - products.json (10 produits Samsung)                  │   │
│  │  - client_config.json (brand config)                    │   │
│  │  - Dynamic prompt building                              │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                          │
                          │ DataReceived event
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACK TO REACT NATIVE APP                     │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  onConversationComplete(data)                           │   │
│  │  - Parse sales data                                     │   │
│  │  - Create or Update DailyReport                         │   │
│  │  - Show ReportModal                                     │   │
│  │  - Save to AsyncStorage                                 │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Communication entre composants

**Protocol Stack :**
```
Application Layer: JSON messages
Transport Layer: WebRTC Data Channels + Audio Streams
Session Layer: LiveKit Room Protocol
Network Layer: WebSocket (signaling) + UDP (media)
```

**Types de données échangées :**

1. **Audio Streams (bidirectionnel)** :
   - User → Agent : Microphone capture (Opus codec)
   - Agent → User : TTS synthesized speech (Opus codec)

2. **Data Messages (Agent → Client)** :
   ```json
   {
     "type": "conversation_ending",
     "message": "Recording stopped, generating report..."
   }
   ```
   ```json
   {
     "type": "conversation_complete",
     "data": {
       "sales": {"Samsung Galaxy Z Nova": 3, ...},
       "customer_feedback": "**PRODUITS VENDUS**\n...",
       "key_insights": ["insight1", "insight2"],
       "emotional_context": "enthousiaste",
       "event_name": "Tech Expo 2024",
       "time_spent": "4 heures"
     }
   }
   ```

3. **Metadata (Client → Agent)** :
   ```json
   {
     "userName": "Thomas",
     "eventName": "Tech Expo Paris",
     "assistantConfig": {
       "conversationStyle": "friendly_colleague",
       "attentionPoints": [...]
     },
     "existingReport": {
       "sales": {...},
       "customerFeedback": "...",
       ...
     }
   }
   ```

---

## 3. Couche Frontend - React Native

### 3.1 Structure des écrans

**app/index.tsx** : Point d'entrée → Redirect vers `/samsung`

**app/samsung.tsx** : Écran principal commercial
- Affichage du résumé de vente (SalesSummary)
- Bouton vocal LiveKit
- Historique de conversation (ConversationHistory)
- Tableau des ventes (SamsungSalesTable)
- Modal de rapport (ReportTable)
- Gestion du cycle de vie du rapport (création, édition, envoi)

**app/admin.tsx** : Écran de configuration manager
- Choix du ton de conversation (4 styles)
- Phrase d'accroche personnalisée (avec variable {userName})
- Points d'attention spécifiques (avec questions naturelles)
- Sauvegarde dans AsyncStorage

**app/_layout.tsx** : Layout global
- SplashScreen (vidéo intro)
- LoginScreen (nom du vendeur)
- Navigation

### 3.2 Composant LiveKitVoiceButton

**Responsabilités :**
- UI du bouton vocal (états: idle, connecting, connected, speaking, generating)
- Gestion de la connexion LiveKit via useLiveKitRoom hook
- Affichage de l'animation de validation (Lottie)
- Gestion des erreurs de connexion

**États visuels :**
```typescript
idle → connecting → connected → recording → agent_speaking → generating_report → completed
```

**Code clé :**
```typescript
const { connect, disconnect, isConnected, isAgentSpeaking, isGeneratingReport } =
  useLiveKitRoom({
    userName,
    eventName,
    existingReport,
    onTranscription: handleTranscription,
    onAgentResponse: handleAgentResponse,
    onConversationComplete: handleConversationComplete,
  });
```

### 3.3 Hook useLiveKitRoom

**Fichier :** `hooks/useLiveKitRoom.ts`

**Cycle de vie complet :**

1. **Initialisation** :
   - Load assistant config from AsyncStorage
   - Check for existing report (edit mode)
   - Generate room name: `voyaltis-{userName}-{timestamp}`

2. **Connexion** :
   ```typescript
   // Get token from proxy
   const { token, url } = await getLiveKitToken(roomName, userName, {
     userName,
     eventName,
     assistantConfig,
     existingReport, // null in creation mode, populated in edit mode
   });

   // Create Room with audio optimization
   const room = new Room({
     adaptiveStream: true,
     dynacast: true,
     audioCaptureDefaults: {
       echoCancellation: true,
       noiseSuppression: true,
       autoGainControl: true,
     },
   });

   // Connect and enable microphone
   await room.connect(url, token);
   await room.localParticipant.setMicrophoneEnabled(true);
   ```

3. **Event Listeners** :
   ```typescript
   // Connection state
   room.on(RoomEvent.Connected, () => setIsConnected(true));
   room.on(RoomEvent.Disconnected, () => setIsConnected(false));

   // Agent audio playback
   room.on(RoomEvent.TrackSubscribed, (track) => {
     if (track.kind === Track.Kind.Audio) {
       const audioElement = track.attach();
       audioElement.play();
       setIsAgentSpeaking(true);
     }
   });

   // Data messages from agent
   room.on(RoomEvent.DataReceived, (payload: Uint8Array) => {
     const message = JSON.parse(decoder.decode(payload));

     if (message.type === 'conversation_ending') {
       // STOP RECORDING IMMEDIATELY
       room.localParticipant.setMicrophoneEnabled(false);
       setIsGeneratingReport(true);
     } else if (message.type === 'conversation_complete') {
       setIsGeneratingReport(false);
       onConversationComplete(message.data);
     }
   });
   ```

4. **Cleanup** :
   ```typescript
   useEffect(() => {
     return () => disconnect();
   }, [disconnect]);
   ```

### 3.4 Services Frontend

#### 3.4.1 assistantConfig.ts

**Rôle :** Gestion de la configuration de l'assistant (AsyncStorage)

**Types principaux :**
```typescript
interface AttentionPoint {
  id: string; // Auto-generated unique ID
  description: string; // Ex: "Produits vendus avec quantités"
  priority: 'high' | 'medium' | 'low';
  naturalPrompts?: string[]; // Ex: ["Comment ça s'est passé ?", ...]
}

interface AssistantConfig {
  conversationStyle: 'friendly_colleague' | 'professional_warm' |
                      'coach_motivating' | 'casual_relaxed';
  attentionPoints: AttentionPoint[];
  customOpeningMessage?: string; // Ex: "Salut {userName} ! ..."
}
```

**Fonctions :**
- `loadAssistantConfig()` : Load from AsyncStorage (default if empty)
- `saveAssistantConfig(config)` : Save to AsyncStorage
- `generateAttentionPointId(desc)` : Generate unique ID with timestamp

**Valeurs par défaut :**
```typescript
const DEFAULT_CONFIG: AssistantConfig = {
  conversationStyle: 'friendly_colleague',
  attentionPoints: [
    {
      id: 'default_sales',
      description: 'Produits vendus avec quantités',
      priority: 'high',
      naturalPrompts: ['Alors, raconte-moi ta journée ! ...'],
    },
    {
      id: 'default_feedback',
      description: 'Retours clients',
      priority: 'medium',
      naturalPrompts: ['Et au niveau des clients, ...'],
    },
  ],
};
```

#### 3.4.2 dailyReportService.ts

**Rôle :** Gestion des rapports quotidiens (CRUD dans AsyncStorage)

**Structure d'un rapport :**
```typescript
interface DailyReport {
  id: string; // "@daily_report_{salesRepName}_{YYYY-MM-DD}"
  salesRepName: string;
  eventName: string;
  date: string; // "YYYY-MM-DD"
  createdAt: string; // ISO timestamp
  lastModifiedAt: string; // ISO timestamp
  sales: { [productName: string]: number };
  customerFeedback: string; // Markdown with **BOLD** sections
  emotionalContext?: string;
  keyInsights: string[];
  conversationHistory: Array<{
    timestamp: string;
    userInput: string;
    agentResponse: string;
  }>;
  status: 'draft' | 'sent';
}
```

**Fonctions clés :**
- `loadTodayReport(salesRepName)` : Charge le rapport du jour (null si inexistant)
- `createReport(salesRepName, eventName, data)` : Crée un nouveau rapport
- `updateReport(report, newData)` : **Fusionne** les nouvelles données avec l'existant
  - Sales : Addition des quantités
  - CustomerFeedback : Concaténation avec `\n\n`
  - KeyInsights : Fusion avec suppression des doublons
- `sendReport(report)` : Marque le rapport comme envoyé (`status: 'sent'`)
- `deleteTodayReport(salesRepName)` : Supprime le rapport du jour (pour tests)

**Fusion intelligente lors de l'édition :**
```typescript
// Exemple : l'utilisateur ajoute 2 Galaxy Z Nova
// Rapport existant : {"Samsung Galaxy Z Nova": 3}
// Nouvelles données : {"Samsung Galaxy Z Nova": 2}
// Résultat après fusion : {"Samsung Galaxy Z Nova": 5}
```

#### 3.4.3 livekit.ts

**Rôle :** Communication avec le proxy Node.js pour obtenir les tokens LiveKit

```typescript
export async function getLiveKitToken(
  roomName: string,
  participantName: string,
  metadata?: Record<string, any>
): Promise<LiveKitTokenResponse> {
  const response = await fetch(`${PROXY_URL}/api/livekit-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      roomName,
      participantName,
      metadata: metadata ? JSON.stringify(metadata) : undefined,
    }),
  });

  return await response.json(); // {token, url, roomName}
}

export function generateRoomName(userId: string, timestamp = Date.now()): string {
  return `voyaltis-${userId}-${timestamp}`;
}
```

---

## 4. Couche Backend - Proxy Node.js

### 4.1 Rôle du proxy

**Fichier :** `server.js`

**Pourquoi un proxy ?**
- Les clés API LiveKit (API_KEY, API_SECRET) ne doivent **jamais** être dans le code client
- Le proxy génère des tokens JWT signés côté serveur
- Le client reçoit un token temporaire avec permissions limitées

### 4.2 Endpoint principal

```javascript
app.post('/api/livekit-token', async (req, res) => {
  const { roomName, participantName, metadata } = req.body;

  // Validation
  if (!roomName || !participantName) {
    return res.status(400).json({
      error: 'roomName and participantName are required'
    });
  }

  // Load credentials from .env
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  // Create JWT token
  const at = new AccessToken(apiKey, apiSecret, {
    identity: participantName,
    metadata: metadata || JSON.stringify({
      userName: participantName,
      timestamp: new Date().toISOString()
    }),
  });

  // Grant permissions
  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,      // Publish microphone
    canSubscribe: true,    // Subscribe to agent audio
    canPublishData: true,  // Publish data messages (if needed)
  });

  // Generate token
  const token = await at.toJwt();

  res.json({
    token,
    url: process.env.LIVEKIT_URL, // wss://xxx.livekit.cloud
    roomName,
  });
});
```

### 4.3 Variables d'environnement

**.env à la racine :**
```env
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=APIxxxxxxxxx
LIVEKIT_API_SECRET=xxxxxxxxxxxxxxxxxx
```

### 4.4 Démarrage

```bash
npm run proxy
# ou
node server.js
```

**Port :** 3001 (par défaut)

---

## 5. Couche Agent - Python LiveKit

### 5.1 Fichier principal : main.py

**Structure générale :**
```python
async def entrypoint(ctx: JobContext):
    """
    Point d'entrée appelé quand un participant rejoint une room
    """
    # 1. Load configuration from products.json
    config_loader = ConfigLoader("config/products.json")
    prompt_builder = PromptBuilder(config_loader)

    # 2. Initialize engines
    conversation_engine = ConversationalEngine(config_loader=config_loader)
    sales_analyzer = SalesAnalyzer(config_loader=config_loader)

    # 3. Connect to room
    await ctx.connect()

    # 4. Load participant metadata
    def load_participant_config(participant):
        metadata = json.loads(participant.metadata)
        user_name = metadata.get("userName")
        event_name = metadata.get("eventName")
        existing_report = metadata.get("existingReport")
        assistant_config = metadata.get("assistantConfig")

        # Dynamic max_questions based on mode
        if existing_report:
            max_questions = 2  # EDIT MODE: ultra-short
        else:
            attention_points = assistant_config.get("attentionPoints", [])
            max_questions = 2 + len(attention_points)  # CREATION MODE

    # 5. Create AgentSession with voice pipeline
    session = AgentSession(
        vad=silero.VAD.load(...),
        stt=openai.STT(model="whisper-1"),
        llm=openai.LLM(model="gpt-4o-mini"),
        tts=elevenlabs.TTS(model="eleven_turbo_v2_5", voice_id="...", language="fr"),
        allow_interruptions=True,
        min_interruption_duration=1.0,
    )

    # 6. Event handlers
    @session.on("user_input_transcribed")
    def on_user_input(event):
        # Log user transcription

    @session.on("conversation_item_added")
    def on_conversation_item(event):
        # Store message
        # Count questions
        # Detect end keywords
        # If end detected: analyze_conversation_and_send_report()

    # 7. Start session
    await session.start(room=ctx.room, agent=Agent(instructions=instructions))

    # 8. Say opening message instantly (bypass LLM)
    await session.say(opening_message, allow_interruptions=False)
```

### 5.2 Détection de fin de conversation

**Critères de fin :**
```python
# 1. Max questions reached
if questions_count >= max_questions and event.item.role == "assistant":
    should_end = True

# 2. Explicit ending keywords in assistant message
ending_keywords = [
    "préparer ton rapport", "préparer le rapport", "générer ton rapport",
    "je vais préparer", "vais préparer ton rapport"
]
if any(keyword in event.item.text_content.lower() for keyword in ending_keywords):
    should_end = True

# 3. User explicitly requests end
if "j'ai fini" in text_lower and "génère le rapport" in text_lower:
    should_end = True
```

**Séquence de fin :**
```python
if should_end and not report_sent:
    report_sent = True  # Prevent duplicates

    async def finalize_conversation():
        # 1. Send "conversation_ending" signal → STOP RECORDING
        ending_signal = {"type": "conversation_ending", ...}
        await ctx.room.local_participant.publish_data(...)

        await asyncio.sleep(0.5)  # Wait for signal delivery

        # 2. Generate report with Claude
        await analyze_conversation_and_send_report()

        await asyncio.sleep(1)

        # 3. Close session
        await session.aclose()

    asyncio.create_task(finalize_conversation())
```

### 5.3 Génération du rapport avec Claude

**Fonction :** `analyze_conversation_and_send_report()`

```python
async def analyze_conversation_and_send_report():
    # Build conversation history
    conversation_text = "\n".join([
        f"{msg['role'].upper()}: {msg['content']}"
        for msg in conversation_messages
    ])

    # Build attention points structure
    attention_structure = "\n".join([
        f"{i}. {point['description'].upper()}"
        for i, point in enumerate(attention_points, 1)
    ])

    # Build dynamic prompt using PromptBuilder
    prompt = prompt_builder.build_claude_extraction_prompt(
        conversation_text=conversation_text,
        attention_structure=attention_structure
    )

    # Call Claude 3.5 Sonnet
    response = await conversation_engine.anthropic.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}]
    )

    # Parse JSON response
    response_text = response.content[0].text.strip()
    if "```json" in response_text:
        response_text = extract_json_from_markdown(response_text)

    extracted_data = json.loads(response_text)

    # Apply fuzzy matching to sales data
    if "sales" in extracted_data:
        raw_sales = extracted_data["sales"]
        mapped_sales = sales_analyzer.map_sales_data(raw_sales)
        extracted_data["sales"] = mapped_sales

    # Send data to client
    data_message = {
        "type": "conversation_complete",
        "data": extracted_data
    }
    await ctx.room.local_participant.publish_data(
        payload=json.dumps(data_message).encode('utf-8'),
        topic="conversation-complete"
    )
```

### 5.4 ConversationalEngine

**Fichier :** `agent/conversational_engine.py`

**Rôle principal :** Générer les prompts pour l'agent vocal (GPT-4o-mini)

**Méthodes clés :**

```python
class ConversationalEngine:
    def get_voice_assistant_prompt(self, existing_report=None) -> str:
        """
        Generate conversational prompt for GPT-4o-mini (TTS agent)
        IMPORTANT: NO JSON, only natural language responses
        """
        style_instructions = self._get_style_instructions()
        products_context = self._get_products_context()
        existing_context = self._build_existing_report_context(existing_report)
        attention_points_instructions = self._format_attention_points_for_agent()

        return f"""
{style_instructions}

{existing_context}

OBJECTIF : {full_objective}

{products_context}

{attention_points_instructions}

RÈGLES DE CONVERSATION (CRITIQUES) :
1. Ne pose qu'UNE SEULE question à la fois
2. QUESTIONS ULTRA-COURTES : Maximum 15-20 mots
3. LIMITE DE QUESTIONS : {max_questions}
4. RÈGLE ANTI-RÉPÉTITION ABSOLUE : Ne redemande JAMAIS une info déjà donnée

CLÔTURE : "Parfait ! Merci pour ces infos, je vais préparer ton rapport maintenant."
        """
```

**Mode EDIT vs CREATION :**

```python
if existing_report:
    max_questions = 2
    existing_context = f"""
⚠️ MODE ÉDITION - RAPPORT EXISTANT :
VENTES DÉJÀ ENREGISTRÉES : {sales}
RETOURS CLIENTS DÉJÀ ENREGISTRÉS : {feedback}

QUESTION 1 : "Tu veux compléter ton rapport ?"
QUESTION 2 (optionnelle) : "Rien d'autre à ajouter ?"

TERMINE IMMÉDIATEMENT si l'utilisateur dit "non", "rien", "c'est bon"
    """
else:
    attention_points = config.get("attentionPoints", [])
    max_questions = 2 + len(attention_points)
    # Build full attention points instructions
```

**Formatage des attention points :**
```python
def _format_attention_points_for_agent(self, attention_points):
    """
    Convert attention points into actionable questions for the agent
    """
    instructions = ["⚠️ POINTS D'ATTENTION À COUVRIR :"]

    for i, point in enumerate(attention_points, 1):
        desc = point.get("description")
        natural_prompts = point.get("naturalPrompts", [])

        instructions.append(f"POINT {i} : {desc}")
        if natural_prompts:
            instructions.append(f"   ➜ Question suggérée : \"{natural_prompts[0]}\"")
        else:
            instructions.append(f"   ➜ Pose une question courte sur : {desc}")

    return "\n".join(instructions)
```

### 5.5 SalesAnalyzer

**Fichier :** `agent/sales_analyzer.py`

**Rôle :** Fuzzy matching des noms de produits mentionnés vers les noms exacts

**Problème résolu :**
```
Utilisateur dit : "J'ai vendu 3 télés"
Claude extrait : {"télés": 3}
❌ Produit exact : "Samsung QLED Vision 8K"
```

**Solution : Fuzzy Matching avec scoring**

```python
class SalesAnalyzer:
    def map_sales_data(self, raw_sales: Dict[str, int]) -> Dict[str, int]:
        mapped_sales = {}

        for raw_name, quantity in raw_sales.items():
            # Try exact match first
            if raw_name in self.product_names:
                mapped_sales[raw_name] = quantity
                continue

            # Fuzzy matching
            best_match = self._find_best_match(raw_name)
            if best_match:
                product_name, score = best_match
                if score >= 3:  # Minimum threshold
                    mapped_sales[product_name] = quantity

        return mapped_sales

    def _find_best_match(self, raw_name: str) -> Optional[Tuple[str, float]]:
        best_product = None
        best_score = 0.0
        raw_lower = raw_name.lower()

        for product_name, keywords in self.product_keywords.items():
            score = 0.0

            for keyword in keywords:
                keyword_lower = keyword.lower()

                # Exact match: +20 points
                if raw_lower == keyword_lower:
                    score += 20

                # Contains keyword: +10 to +15 (proportional)
                elif keyword_lower in raw_lower:
                    proportion = len(keyword_lower) / len(raw_lower)
                    score += 10 + (proportion * 5)

                # Keyword contains raw name (min 3 chars): +6
                elif len(raw_lower) > 3 and raw_lower in keyword_lower:
                    score += 6

            # Unique category terms bonus (short keywords like "frigo", "télé")
            for keyword in keywords:
                if 3 <= len(keyword) <= 6 and keyword.lower() in raw_lower:
                    score += 15
                    break

            if score > best_score:
                best_score = score
                best_product = product_name

        return (best_product, best_score) if best_product else None
```

**Exemple de matching :**
```python
raw_name = "télé"
keywords = ["télé", "tv", "téléviseur", "television", "écran", "qled", "8k"]

Scoring:
- "télé" exact match: +20 points
- "télé" 3-6 chars: +15 points
Total: 35 points → Match: "Samsung QLED Vision 8K"
```

### 5.6 ConfigLoader

**Fichier :** `agent/utils/config_loader.py`

**Rôle :** Charger et parser les fichiers de configuration JSON

**Fichiers chargés :**
1. `config/products.json` : Liste des 10 produits Samsung
2. `config/client_config.json` : Configuration spécifique client (optionnel)

**Structure products.json :**
```json
{
  "products": [
    {
      "name": "Samsung Galaxy Z Nova",
      "display_name": "Samsung Galaxy Z Nova",
      "category": "Smartphone",
      "price": 1299.99,
      "keywords": ["smartphone", "téléphone", "mobile", "galaxy", "z nova"],
      "target_quantity": 4
    },
    ...
  ]
}
```

**Méthodes utiles :**
```python
config_loader.get_products_count()  # 10
config_loader.get_product_names_list()  # ["Samsung Galaxy Z Nova", ...]
config_loader.get_products_list_for_prompt()  # Formatted string for Claude
config_loader.get_empty_sales_dict()  # {"Samsung Galaxy Z Nova": 0, ...}
config_loader.get_mapping_examples()  # Dynamic examples for prompt
config_loader.get_brand_name()  # "Samsung"
config_loader.get_conversation_objective()  # From client_config
```

### 5.7 PromptBuilder

**Fichier :** `agent/utils/prompt_builder.py`

**Rôle :** Construire dynamiquement le prompt d'extraction pour Claude

**Prompt généré (~2000 lignes) :**
```python
def build_claude_extraction_prompt(conversation_text, attention_structure):
    products_list = self.config.get_products_list_for_prompt()
    mapping_examples = self.config.get_mapping_examples()
    empty_sales = self.config.get_empty_sales_dict()

    prompt = f"""
Analyse cette conversation et extrait les informations en JSON.

CONVERSATION COMPLÈTE :
{conversation_text}

═══════════════════════════════════════════════
📋 LISTE EXHAUSTIVE DES PRODUITS SAMSUNG (10 produits)
═══════════════════════════════════════════════

{products_list}

═══════════════════════════════════════════════
🎯 RÈGLES DE MAPPING ABSOLUES
═══════════════════════════════════════════════

⚠️ SEULS CES 10 PRODUITS EXISTENT.

{mapping_examples}

═══════════════════════════════════════════════
📊 EXTRACTION DES DONNÉES
═══════════════════════════════════════════════

1. PRODUITS VENDUS : Mappe vers les noms EXACTS

2. RETOURS CLIENTS - STRUCTURE PAR SECTIONS :
   POINTS D'ATTENTION :
{attention_structure}

   FORMAT : "**[SECTION 1]**\\n[Contenu]\\n\\n**[SECTION 2]**\\n[Contenu]"

3. CONTEXTE ÉMOTIONNEL : enthousiaste|fatigué|content|frustré|stressé|neutre

4. INSIGHTS CLÉS : 2-4 insights COURTS (max 15 mots)
   🚫 N'invente PAS, utilise UNIQUEMENT ce qui est dit explicitement

Réponds en JSON :
{json_structure}
    """
    return prompt
```

**Points critiques du prompt :**
- Liste exhaustive des 10 produits avec keywords
- Exemples de mapping dynamiques
- Structure JSON attendue avec tous les produits à 0 par défaut
- Instructions anti-hallucination
- Format markdown pour customer_feedback (**BOLD** sections)

---

## 6. Flux de données complet

### 6.1 Scénario : Création d'un nouveau rapport

**Étape 1 : Initialisation (Frontend)**
```
1. User ouvre app/samsung.tsx
2. loadTodayReport("Thomas") → null (pas de rapport aujourd'hui)
3. User appuie sur le bouton vocal
4. loadAssistantConfig() → config avec 2 attention points par défaut
5. Génération roomName: "voyaltis-Thomas-1729850000"
```

**Étape 2 : Obtention du token (Frontend → Proxy)**
```
POST http://172.28.191.115:3001/api/livekit-token
Body: {
  "roomName": "voyaltis-Thomas-1729850000",
  "participantName": "Thomas",
  "metadata": JSON.stringify({
    "userName": "Thomas",
    "eventName": "Tech Expo Paris",
    "assistantConfig": {
      "conversationStyle": "friendly_colleague",
      "attentionPoints": [
        {"id": "...", "description": "Produits vendus", ...},
        {"id": "...", "description": "Retours clients", ...}
      ]
    },
    "existingReport": null  // CREATION MODE
  })
}

Response: {
  "token": "eyJhbGc...",
  "url": "wss://xxx.livekit.cloud",
  "roomName": "voyaltis-Thomas-1729850000"
}
```

**Étape 3 : Connexion LiveKit (Frontend)**
```
1. Create Room instance
2. room.connect(url, token)
3. room.localParticipant.setMicrophoneEnabled(true)
4. Event listeners activated:
   - TrackSubscribed → play agent audio
   - DataReceived → handle messages
```

**Étape 4 : Agent rejoint la room (Python)**
```
1. LiveKit calls entrypoint(ctx)
2. ctx.connect()
3. Wait for participant (Thomas) metadata
4. Parse metadata:
   - userName = "Thomas"
   - eventName = "Tech Expo Paris"
   - assistantConfig with 2 attention points
   - existingReport = null → CREATION MODE
5. Calculate max_questions = 2 + 2 = 4
6. Load products config (10 produits Samsung)
7. Build opening message: "Salut Thomas ! Comment s'est passée ta journée ?"
8. Create AgentSession with voice pipeline
9. Start session with instructions
10. Say opening message instantly (no LLM delay)
```

**Étape 5 : Conversation (User ↔ Agent)**
```
User: "Salut ! J'ai vendu 3 Galaxy Z Nova et 2 montres connectées"
   ↓
VAD (Silero) détecte la parole
   ↓
STT (Whisper) transcrit: "salut j'ai vendu trois galaxy z nova et deux montres connectées"
   ↓
LLM (GPT-4o-mini) reçoit:
   - System prompt avec instructions conversationnelles
   - User message transcription
   ↓
LLM génère: "Super ! Et au niveau des retours clients, ils ont dit quoi ?"
   ↓
TTS (ElevenLabs) synthétise la voix
   ↓
Audio stream → User entend la réponse

Questions counter: 1/4

User: "Les clients étaient très intéressés par les écrans pliables"
   ↓
[Same pipeline]
   ↓
Agent: "D'accord ! Y a-t-il autre chose à ajouter ?"

Questions counter: 2/4

User: "Non c'est bon"
   ↓
Agent détecte: short response + questions >= 2
   ↓
Agent: "Parfait ! Merci, je vais préparer ton rapport maintenant."

Questions counter: 3/4

Agent détecte ending keyword: "préparer ton rapport"
   ↓
Fin de conversation détectée
```

**Étape 6 : Génération du rapport (Python Agent)**
```
1. Send DataReceived message:
   {"type": "conversation_ending"}

2. Frontend receives → setMicrophoneEnabled(false)

3. Build conversation history:
   """
   ASSISTANT: Salut Thomas ! Comment s'est passée ta journée ?
   USER: Salut ! J'ai vendu 3 Galaxy Z Nova et 2 montres connectées
   ASSISTANT: Super ! Et au niveau des retours clients ?
   USER: Les clients étaient très intéressés par les écrans pliables
   ASSISTANT: D'accord ! Y a-t-il autre chose à ajouter ?
   USER: Non c'est bon
   ASSISTANT: Parfait ! Merci, je vais préparer ton rapport.
   """

4. Build attention structure:
   """
   1. PRODUITS VENDUS
   2. RETOURS CLIENTS
   """

5. Call PromptBuilder.build_claude_extraction_prompt()
   → Generate 2000-line prompt with products list, examples, rules

6. Call Claude 3.5 Sonnet:
   model="claude-3-5-sonnet-20241022"
   max_tokens=2048
   messages=[{"role": "user", "content": prompt}]

7. Claude returns JSON:
   {
     "sales": {
       "Samsung Galaxy Z Nova": 3,
       "Samsung GearFit Pro": 2,
       "Samsung QLED Vision 8K": 0,
       ...all 10 products...
     },
     "customer_feedback": "**PRODUITS VENDUS**\nBonne performance sur smartphones et montres\n\n**RETOURS CLIENTS**\nFort intérêt pour la technologie des écrans pliables",
     "key_insights": [
       "Smartphones pliables suscitent beaucoup de curiosité",
       "Montres connectées bien accueillies"
     ],
     "emotional_context": "content",
     "event_name": "Tech Expo Paris",
     "time_spent": ""
   }

8. Apply SalesAnalyzer fuzzy matching (déjà correct ici)

9. Validate all 10 products are present (add missing with 0)

10. Send DataReceived message:
    {"type": "conversation_complete", "data": {...}}
```

**Étape 7 : Affichage du rapport (Frontend)**
```
1. useLiveKitRoom receives DataReceived
2. onConversationComplete(data) called
3. samsung.tsx handleConversationComplete(data):
   - Parse sales data
   - createReport("Thomas", "Tech Expo Paris", {
       sales: data.sales,
       customerFeedback: data.customer_feedback,
       keyInsights: data.key_insights,
       emotionalContext: data.emotional_context
     })
   - Save to AsyncStorage with ID: "@daily_report_Thomas_2024-10-24"
   - setDailyReport(newReport)
   - setIsEditMode(true)
   - setShowReport(true) → Open modal

4. User sees:
   - Report header (event, date, name)
   - Comment section (customer_feedback formatted)
   - Sales table (SamsungSalesTable)
   - Key insights (bullet list)
   - Performance percentage

5. User can:
   - Close modal → Continue editing later
   - Edit → Reconnect for additional info (EDIT MODE)
   - Send → Mark as 'sent', can't edit anymore
```

### 6.2 Scénario : Édition d'un rapport existant

**Différences avec création :**

**Frontend (étape 2) :**
```typescript
const existingReport = await loadTodayReport("Thomas");
// existingReport = {
//   sales: {"Samsung Galaxy Z Nova": 3, "Samsung GearFit Pro": 2, ...},
//   customerFeedback: "...",
//   keyInsights: [...],
//   ...
// }

const { token, url } = await getLiveKitToken(roomName, userName, {
  ...,
  existingReport: existingReport,  // EDIT MODE
});
```

**Agent Python (étape 4) :**
```python
existing_report = metadata.get("existingReport")
if existing_report:
    logger.info("📄 EDIT MODE")
    max_questions = 2  # Ultra-short flow
    opening_message = "Salut Thomas ! Tu veux compléter ton rapport ? Dis-moi ce qui a changé."
else:
    logger.info("📝 CREATION MODE")
    max_questions = 2 + len(attention_points)
```

**Conversation (étape 5) :**
```
Agent: "Salut Thomas ! Tu veux compléter ton rapport ?"
User: "Oui, j'ai vendu 2 Galaxy Z Nova de plus"

Agent: "Entendu, rien d'autre à ajouter ?"
User: "Non c'est tout"

Agent: "Parfait ! Merci, je vais préparer ton rapport."
→ Fin (2 questions seulement)
```

**Fusion des données (étape 7) :**
```typescript
// Existing: {"Samsung Galaxy Z Nova": 3}
// New: {"Samsung Galaxy Z Nova": 2}
// Result: {"Samsung Galaxy Z Nova": 5}

updatedReport = await updateReport(dailyReport, {
  sales: newSales,  // Fusion additive
  customerFeedback: newFeedback,  // Concaténation
  keyInsights: newInsights,  // Fusion sans doublons
});
```

---

## 7. Système de configuration dynamique

### 7.1 Configuration produits (Agent Python)

**Fichier :** `agent/config/products.json`

**Structure :**
```json
{
  "products": [
    {
      "name": "Samsung Galaxy Z Nova",
      "display_name": "Samsung Galaxy Z Nova",
      "category": "Smartphone",
      "price": 1299.99,
      "availability": "En stock",
      "description": "Smartphone pliable...",
      "keywords": ["smartphone", "téléphone", "mobile", "galaxy", "z nova", "tel"],
      "synonyms": ["portable", "téléphone", "smartphone"],
      "target_quantity": 4
    },
    ...10 produits total
  ]
}
```

**Utilisation :**
- `keywords` : Pour le fuzzy matching (SalesAnalyzer)
- `display_name` : Nom exact à utiliser dans le JSON de sortie
- `target_quantity` : Objectif de vente (pour calcul de performance)
- `category` : Pour regroupement et insights

### 7.2 Configuration client (Agent Python - optionnel)

**Fichier :** `agent/config/client_config.json`

**Structure :**
```json
{
  "client": {
    "name": "Samsung France",
    "brand_name": "Samsung",
    "industry": "Electronics",
    "language": "fr",
    "context": "ventes d'électronique Samsung"
  },
  "conversation": {
    "objective": "Collecter des informations sur la journée de salon Samsung",
    "opening_context": "journée sur le stand Samsung",
    "report_type": "rapport de vente événementiel",
    "tone": "professionnel mais chaleureux",
    "brand_specific_prompts": [
      "Focus sur les produits phares Galaxy et QLED",
      "Identifier les comparaisons avec Apple et LG"
    ]
  },
  "products_context": {
    "brand_mentions": ["Samsung", "Galaxy"],
    "brand_mention_bonus_points": 3,
    "unique_category": false,
    "description": "PRODUITS SAMSUNG DISPONIBLES :\nGamme complète : smartphones, TV, électroménager..."
  }
}
```

**Impact :**
- `brand_name` : Injecté dans les prompts
- `objective` : Remplace l'objectif générique
- `brand_specific_prompts` : Instructions supplémentaires pour Claude
- `brand_mentions` : Mots donnant bonus au fuzzy matching
- `brand_mention_bonus_points` : +3 points si "Samsung" mentionné

### 7.3 Configuration assistant (Frontend)

**Fichier :** AsyncStorage `@assistant_config`

**Interface :**
```typescript
interface AssistantConfig {
  conversationStyle: 'friendly_colleague' | 'professional_warm' |
                      'coach_motivating' | 'casual_relaxed';
  attentionPoints: AttentionPoint[];
  customOpeningMessage?: string;
}

interface AttentionPoint {
  id: string; // "products_sold_1729850000_x7f3a"
  description: string; // "Produits vendus avec quantités"
  priority: 'high' | 'medium' | 'low';
  naturalPrompts?: string[]; // ["Comment ça s'est passé ?", ...]
}
```

**Styles de conversation :**

1. **friendly_colleague** (par défaut) :
   - Tutoiement naturel
   - Expressions authentiques ("Ah ouais ?", "Top !")
   - Empathique et curieux

2. **professional_warm** :
   - Vouvoiement respectueux
   - Valorisation du travail
   - Questions structurées

3. **coach_motivating** :
   - Célébration des succès
   - Transformation des difficultés en apprentissages
   - Énergique

4. **casual_relaxed** :
   - Très détendu
   - Langage pote-à-pote
   - Aucune pression

**Gestion des attention points :**

```typescript
// Default points (si config vide)
DEFAULT_CONFIG.attentionPoints = [
  {
    id: 'default_sales',
    description: 'Produits vendus avec quantités',
    priority: 'high',
    naturalPrompts: [
      'Alors, raconte-moi ta journée !',
      'Comment ça s\'est passé sur le stand ?',
    ],
  },
  {
    id: 'default_feedback',
    description: 'Retours clients',
    priority: 'medium',
    naturalPrompts: [
      'Et au niveau des clients, quels retours ?',
      'Des remarques intéressantes ?',
    ],
  },
];

// Manager can add custom points
attentionPoints.push({
  id: generateAttentionPointId("Profil des visiteurs"),
  description: "Profil des visiteurs",
  priority: "medium",
  naturalPrompts: [
    "Quel type de clientèle aujourd'hui ?",
    "Tu as vu quel genre de profils ?"
  ]
});
```

**Impact sur max_questions :**
```python
# CREATION MODE
max_questions = 2 (general) + len(attention_points)
# Example: 2 + 3 = 5 questions

# EDIT MODE
max_questions = 2 (ultra-short)
```

---

## 8. Moteur conversationnel

### 8.1 Prompt système pour GPT-4o-mini

**Rôle :** GPT-4o-mini génère les réponses vocales de l'agent en temps réel

**Prompt structuré en 7 sections :**

```python
prompt = f"""
{style_instructions}  # Ton et personnalité selon conversationStyle

{existing_context}  # EDIT MODE: rapport existant + règles ultra-courtes

OBJECTIF : {conversation_objective}

{products_context}  # Liste des 10 produits avec keywords

{brand_specific_prompts}  # Instructions marque-specific

{attention_points_instructions}  # Points à couvrir avec questions suggérées

RÈGLES DE CONVERSATION (CRITIQUES) :
1. Ne pose qu'UNE SEULE question à la fois
2. QUESTIONS ULTRA-COURTES : Max 15-20 mots
3. LIMITE : {max_questions} questions
4. RÈGLE ANTI-RÉPÉTITION : Ne redemande JAMAIS une info déjà donnée

🚫 INTERDICTIONS :
- Questions robotiques
- Ignorer les émotions
- Passer trop vite d'un sujet à l'autre
- Redemander ce qui a été dit

CLÔTURE : "Parfait ! Merci, je vais préparer ton rapport."

IMPORTANT : Réponds UNIQUEMENT avec du texte naturel (PAS de JSON).
"""
```

### 8.2 Stratégie de questions dynamiques

**Ordre de questions (CREATION MODE) :**

```
Question 1 (Opening) : Message d'accroche personnalisé ou premier attention point
    ↓
Question 2 (Général) : Rebond sur la réponse + exploration
    ↓
Question 3 (Attention Point 1) : Si pas encore couvert
    ↓
Question 4 (Attention Point 2) : Si pas encore couvert
    ↓
Question N (Attention Point N) : Si pas encore couvert
    ↓
Clôture : "Parfait ! Je vais préparer ton rapport."
```

**Exemple avec 3 attention points :**
```
1. "Salut Thomas ! Comment s'est passée ta journée sur le stand Samsung ?" [Opening]
2. "Super ! Et au niveau des retours clients ?" [Attention Point 1]
3. "D'accord. Quel type de clientèle tu as eu ?" [Attention Point 2]
4. "Parfait. Des produits à mettre en avant selon toi ?" [Attention Point 3]
5. "Merci pour ces infos, je vais préparer ton rapport." [Closing]

Total: 5 questions (2 + 3 attention points)
```

**Ordre de questions (EDIT MODE) :**
```
1. "Salut Thomas ! Tu veux compléter ton rapport ?" [Opening]
2. "Entendu, rien d'autre ?" [Follow-up optionnel]
3. "Parfait ! Je vais préparer ton rapport." [Closing]

Total: 2 questions maximum
```

### 8.3 Règles anti-répétition

**Problème courant :**
```
User: "J'ai vendu 3 Galaxy Z Nova et 2 montres"
Agent: "Super ! Combien de produits as-tu vendus ?"  ❌ RÉPÉTITION
```

**Solution dans le prompt :**
```python
⚠️ RÈGLE ANTI-RÉPÉTITION ABSOLUE :
AVANT de poser une question, vérifie TOUTE la conversation précédente.
Si l'utilisateur a DÉJÀ mentionné cette information, NE REDEMANDE JAMAIS.

Exemples de signaux :
- "J'ai vendu X, Y, Z" → Ventes DÉJÀ données
- "Les clients ont dit..." → Retours DÉJÀ donnés
- Si l'utilisateur dit "je te l'ai déjà dit" → EXCUSE-TOI et passe au point suivant

⚠️ RÈGLE SPÉCIALE - VENTES PRIORITAIRES :
Si après la PREMIÈRE réponse, AUCUNE mention de ventes, pose UNE question courte.
Sinon, passe au point suivant.
```

### 8.4 Détection de contexte émotionnel

**Signaux détectés par l'agent :**
- Fatigue : "C'était long", "Je suis crevé"
- Enthousiasme : "Super journée !", "Trop bien !"
- Frustration : "Ça ne marchait pas", "C'était compliqué"
- Stress : "J'ai eu du mal", "C'était tendu"

**Adaptation du ton :**
```python
if emotional_context == "fatigué":
    # Agent: "Je comprends, tu as fait du bon boulot. On termine vite."

elif emotional_context == "enthousiaste":
    # Agent: "Génial ! Raconte-moi ça !"

elif emotional_context == "frustré":
    # Agent: "OK, je vois. Qu'est-ce qui a coincé exactement ?"
```

### 8.5 Gestion des interruptions

**Configuration VAD (Voice Activity Detection) :**
```python
session = AgentSession(
    vad=silero.VAD.load(
        min_speech_duration=0.5,      # Ignorer bruits < 0.5s
        min_silence_duration=0.6,     # Pauses naturelles 0.6s
        prefix_padding_duration=0.2,  # Capturer début de phrase
    ),
    allow_interruptions=True,
    min_interruption_duration=1.0,   # Parler 1s min pour interrompre
    min_interruption_words=2,        # Au moins 2 mots
    false_interruption_timeout=2.0,  # Détecter fausses interruptions
    resume_false_interruption=True,  # Reprendre si fausse interruption
)
```

**Comportement :**
- User peut interrompre l'agent à tout moment (si > 1s + 2 mots)
- Fausses interruptions (toux, bruit) sont filtrées
- Si fausse interruption détectée après 2s, l'agent reprend automatiquement

---

## 9. Génération de rapports

### 9.1 Prompt d'extraction Claude (~2000 lignes)

**Structure du prompt :**

```
PARTIE 1 : Conversation complète
    USER: ...
    ASSISTANT: ...
    ...

PARTIE 2 : Liste exhaustive des 10 produits Samsung
    1. Samsung Galaxy Z Nova (Smartphone)
       - Mots-clés : smartphone, téléphone, mobile...
       - Objectif : 4 unités
    ...

PARTIE 3 : Règles de mapping absolues
    ⚠️ SEULS CES 10 PRODUITS EXISTENT
    - Exemples de mapping correct
    - Gestion des quantités non spécifiées

PARTIE 4 : Extraction des données
    1. PRODUITS VENDUS
       - Relis ligne par ligne
       - Mappe vers noms exacts
       - Additionne si mentionné plusieurs fois

    2. RETOURS CLIENTS - STRUCTURE PAR SECTIONS
       - Points d'attention :
         1. PRODUITS VENDUS
         2. RETOURS CLIENTS
         3. PROFIL DES VISITEURS
       - Format : **SECTION**\nContenu\n\n**SECTION**\nContenu
       - Si non abordé : "Non renseigné"
       - 🚫 Aucune quantité (déjà dans sales)
       - 🚫 N'invente PAS

    3. CONTEXTE ÉMOTIONNEL
       - Enthousiaste, fatigué, content, frustré, stressé, neutre

    4. INSIGHTS CLÉS (key_insights)
       - 2-4 insights COURTS (max 15 mots)
       - SÉPARÉS du customer_feedback
       - 🚫 N'invente PAS, n'infère PAS

PARTIE 5 : Structure JSON attendue
    {
      "sales": {"Samsung Galaxy Z Nova": 0, ...tous les 10...},
      "customer_feedback": "**SECTION**\nContenu...",
      "emotional_context": "...",
      "key_insights": ["...", "..."],
      "event_name": "...",
      "time_spent": "..."
    }

PARTIE 6 : Règles anti-hallucination
    🚫 N'invente PAS de "ventes croisées"
    🚫 N'invente PAS de "dynamique"
    🚫 N'invente PAS de conclusions non mentionnées
    ✅ Utilise UNIQUEMENT ce qui est EXPLICITEMENT dit
```

### 9.2 Extraction JSON

**Parsing robuste :**
```python
response_text = response.content[0].text.strip()

# Remove markdown code blocks if present
if "```json" in response_text:
    response_text = response_text.split("```json")[1].split("```")[0].strip()
elif "```" in response_text:
    response_text = response_text.split("```")[1].split("```")[0].strip()

extracted_data = json.loads(response_text)
```

**Validation :**
```python
# 1. Check all products are present
expected_products = config_loader.get_product_names_list()
actual_products = list(extracted_data.get("sales", {}).keys())

missing_products = set(expected_products) - set(actual_products)
if missing_products:
    logger.warning(f"Missing products: {missing_products}")
    for product_name in missing_products:
        extracted_data["sales"][product_name] = 0

# 2. Apply fuzzy matching
raw_sales = extracted_data["sales"]
mapped_sales = sales_analyzer.map_sales_data(raw_sales)
extracted_data["sales"] = mapped_sales

# 3. Validate structure
assert "customer_feedback" in extracted_data
assert "key_insights" in extracted_data
assert isinstance(extracted_data["key_insights"], list)
```

### 9.3 Format du customer_feedback

**Structure attendue (Markdown) :**
```markdown
**PRODUITS VENDUS**
Bonne diversité sur tablettes et montres connectées, potentiel à exploiter sur l'électroménager

**RETOURS CLIENTS**
Clients très réceptifs aux démonstrations interactives, beaucoup de questions sur les écrans pliables

**PROFIL DES VISITEURS**
Non renseigné lors de la conversation
```

**Affichage dans l'app :**
- Parsing des **BOLD** pour styling
- Chaque section affichée clairement
- "Non renseigné" affiché en gris si point non abordé

### 9.4 Format des key_insights

**Caractéristiques :**
- Liste de 2-4 insights
- COURTS (max 15 mots)
- ACTIONNABLES pour le management
- SÉPARÉS du customer_feedback

**Exemples :**
```json
{
  "key_insights": [
    "Smartphones pliables suscitent beaucoup de curiosité",
    "Montres connectées bien accueillies",
    "Besoin de documentation sur les comparaisons avec concurrence"
  ]
}
```

**Affichage :**
```
INSIGHTS CLÉS :
• Smartphones pliables suscitent beaucoup de curiosité
• Montres connectées bien accueillies
• Besoin de documentation sur les comparaisons avec concurrence
```

### 9.5 Calcul de performance

**Formule :**
```typescript
const totalSold = Object.values(sales).reduce((sum, val) => sum + val, 0);
const totalObjectives = productsData.products.reduce(
  (sum, p) => sum + p.target_quantity, 0
);
const globalPerformance = totalObjectives > 0
  ? Math.round((totalSold / totalObjectives) * 100)
  : 0;
```

**Exemple :**
```
Objectifs :
- Galaxy Z Nova: 4
- QLED Vision: 4
- Galaxy Tab: 3
- GearFit Pro: 4
- ... (10 produits)
Total: 34 unités

Vendus:
- Galaxy Z Nova: 3
- GearFit Pro: 2
Total: 5 unités

Performance: 5/34 = 15% ⚠️
```

---

## 10. Gestion de l'état et persistance

### 10.1 AsyncStorage structure

**Clés stockées :**
```
@assistant_config : AssistantConfig
@daily_report_Thomas_2024-10-24 : DailyReport
@daily_report_Thomas_2024-10-23 : DailyReport
...
```

### 10.2 Cycle de vie d'un rapport

**États du rapport :**
```
null → draft → draft (édité) → sent
```

**Transitions :**
```typescript
// 1. Création
null → createReport() → status: 'draft'

// 2. Édition (fusion)
draft → updateReport() → status: 'draft' (lastModifiedAt updated)

// 3. Envoi définitif
draft → sendReport() → status: 'sent' (read-only)

// 4. Suppression (tests)
any → deleteTodayReport() → null
```

### 10.3 Fusion intelligente (Edit Mode)

**Sales (addition) :**
```typescript
// Existing report
sales = {"Samsung Galaxy Z Nova": 3, "Samsung GearFit Pro": 2}

// New data from conversation
newSales = {"Samsung Galaxy Z Nova": 2}

// After merge
mergedSales = {"Samsung Galaxy Z Nova": 5, "Samsung GearFit Pro": 2}
```

**CustomerFeedback (concaténation) :**
```typescript
// Existing
customerFeedback = "**PRODUITS VENDUS**\nBonne journée"

// New
newFeedback = "**RETOURS CLIENTS**\nClients satisfaits"

// After merge
mergedFeedback = "**PRODUITS VENDUS**\nBonne journée\n\n**RETOURS CLIENTS**\nClients satisfaits"
```

**KeyInsights (fusion sans doublons) :**
```typescript
// Existing
keyInsights = ["Insight A", "Insight B"]

// New
newInsights = ["Insight B", "Insight C"]

// After merge (no duplicates)
mergedInsights = ["Insight A", "Insight B", "Insight C"]
```

### 10.4 Interface de rapport

**Composants :**
- **ReportTable** : Tableau avec produits, quantités, objectifs, %
- **SamsungSalesTable** : Version détaillée avec catégories
- **ReportPreview** : Modal complète avec header, commentaires, insights

**Actions disponibles :**
```
[Fermer] [Modifier] [Envoyer]
    ↓        ↓          ↓
   Close   Edit mode  Mark as sent
```

---

## 11. Limitations actuelles

### 11.1 Limitations techniques

**Architecture :**
1. **Pas de backend persistant** : Tout en AsyncStorage local
   - Pas de synchronisation entre devices
   - Perte de données si désinstallation
   - Pas de backup cloud

2. **Proxy Node.js en local** : Pas de déploiement prod
   - Nécessite `npm run proxy` en développement
   - Non scalable pour production
   - Pas de gestion de sessions multiples

3. **Agent Python unique** : Une instance par room
   - Pas de load balancing
   - Limite de concurrence LiveKit
   - Pas de fallback si agent crash

4. **Transcription désactivée côté client** :
   - API LiveKit transcription a changé
   - Pas de transcription visible en temps réel
   - Dépendance uniquement sur l'agent

**Performances :**
5. **Latence variable** :
   - Dépend de la qualité réseau
   - TTS ElevenLabs peut varier (500ms-2s)
   - Whisper STT peut être lent sur longs audios

6. **Fuzzy matching imparfait** :
   - Dépend de la qualité des keywords
   - Peut échouer sur des variations inattendues
   - Pas d'apprentissage automatique

7. **Gestion des erreurs limitée** :
   - Pas de retry automatique sur échec Claude API
   - Pas de fallback si LiveKit déconnecte
   - Pas de reprise de conversation interrompue

### 11.2 Limitations fonctionnelles

**Configuration :**
8. **Configuration produits statique** :
   - Nécessite modification de products.json
   - Pas d'interface admin pour gérer les produits
   - Pas de multi-client (un seul products.json)

9. **Attention points limités** :
   - Manager peut ajouter des points, mais pas de guidage
   - Pas de templates prédéfinis par industrie
   - Pas de validation des questions naturelles

**Conversation :**
10. **Détection de fin simpliste** :
    - Basée sur keywords et compteur de questions
    - Peut finir trop tôt si keywords détectés par erreur
    - Pas de détection d'intention réelle

11. **Pas de gestion de contexte multi-événements** :
    - Un rapport par jour par vendeur
    - Pas de distinction entre plusieurs événements le même jour
    - Pas de rapport partiel (ex: midi, fin de journée)

**Rapports :**
12. **Extraction Claude non garantie** :
    - Peut halluciner des insights non mentionnés
    - Peut mal parser des quantités ambiguës
    - Peut mapper incorrectement des produits non standards

13. **Pas d'envoi réel** :
    - Bouton "Envoyer" marque juste comme sent
    - Pas d'intégration email/CRM
    - Pas de workflow d'approbation manager

14. **Analytics absents** :
    - Pas de suivi de performance dans le temps
    - Pas de comparaison entre vendeurs
    - Pas de dashboard manager

### 11.3 Limitations UX

15. **Pas de feedback visuel riche** :
    - Animation de validation basique
    - Pas d'indication de progression pendant la conversation
    - Pas de preview du rapport en cours de construction

16. **Pas d'historique de conversations** :
    - Impossible de réécouter l'audio
    - Pas de log détaillé des échanges
    - Pas de possibilité de corriger manuellement

17. **Interface admin limitée** :
    - Configuration attention points peu intuitive
    - Pas de preview du comportement agent
    - Pas de test mode

18. **Mono-langue** :
    - Français uniquement
    - Pas de support multi-langue
    - Voix ElevenLabs en français seulement

### 11.4 Limitations de sécurité

19. **Pas d'authentification réelle** :
    - LoginScreen demande juste un prénom
    - Pas de gestion de comptes
    - Pas de contrôle d'accès

20. **Données non chiffrées** :
    - AsyncStorage en clair
    - Pas de chiffrement des rapports
    - Tokens LiveKit temporaires seulement

21. **Pas de conformité RGPD** :
    - Pas de consentement explicite
    - Pas de droit à l'oubli
    - Pas de portabilité des données

---

## 12. Pistes d'amélioration

### 12.1 Architecture & Backend

**1. Backend cloud avec base de données**
- Remplacer AsyncStorage par une vraie API REST
- PostgreSQL ou MongoDB pour persistance
- Synchronisation multi-device
- Backup automatique quotidien

**2. Déploiement production**
- Agent Python sur Railway/Render
- Proxy Node.js sur Vercel/Railway
- CI/CD avec GitHub Actions
- Monitoring avec Sentry + LogRocket

**3. Agent Python scalable**
- Pool d'agents avec load balancing
- Queue système (Redis/RabbitMQ)
- Graceful shutdown et reprise
- Health checks et auto-restart

**4. WebSocket pour état temps réel**
- Remplacer DataReceived par WebSocket dédié
- Afficher progression du rapport en temps réel
- Afficher transcription live côté client
- Synchronisation multi-participants (manager observe)

### 12.2 Fonctionnalités conversationnelles

**5. Amélioration détection de fin**
- Modèle ML pour détecter intention de fin
- Analyse sentiment pour détecter fatigue/impatience
- Proposition "Tu veux terminer ?" si conversation traîne
- Confirmation explicite avant génération rapport

**6. Gestion de contexte avancée**
- Mémoire long-terme (conversations précédentes)
- Références aux rapports passés
- Suggestions basées sur l'historique
- "La dernière fois tu as vendu X, comment c'était aujourd'hui ?"

**7. Questions adaptatives**
- Analyse des réponses en temps réel
- Questions de relance intelligentes
- Skip automatique si info déjà donnée
- Approfondissement sur points intéressants

**8. Multi-tours de parole complexes**
- Gestion de dialogues imbriqués
- Clarifications ("Tu veux dire X ou Y ?")
- Récapitulatif intermédiaire ("Si je comprends bien...")

### 12.3 Configuration & Personnalisation

**9. Interface admin avancée (web)**
- Gestion multi-clients/marques
- Éditeur visuel de produits
- Templates d'attention points par industrie
- Simulateur de conversation avec preview

**10. Configuration produits dynamique**
- API CRUD pour produits
- Import CSV/Excel
- Connexion ERP/CRM
- Mise à jour en temps réel sans redéploiement

**11. Personnalisation voix**
- Voice cloning pour voix personnalisée marque
- Choix parmi plusieurs voix
- Ajustement vitesse/ton
- Multilangue (anglais, espagnol, allemand)

**12. Templates conversationnels**
- Bibliothèque de styles prédéfinis
- Templates par industrie (tech, retail, pharma)
- Customisation fine du ton
- A/B testing de styles

### 12.4 Extraction & Rapports

**13. Amélioration fuzzy matching**
- Fine-tuning d'un modèle de NER
- Embedding-based similarity (sentence-transformers)
- Apprentissage des corrections utilisateur
- Feedback loop pour améliorer keywords

**14. Validation humaine avant extraction**
- Preview des données extraites avant rapport final
- Correction manuelle possible
- Suggestions de Claude avec confiance score
- Validation manager avant envoi définitif

**15. Rapports enrichis**
- Graphiques de performance
- Comparaison avec objectifs
- Insights automatiques (tendances, anomalies)
- Recommandations d'actions

**16. Export multi-formats**
- PDF stylisé avec logo marque
- Excel avec tableaux de données
- Email automatique au manager
- Intégration CRM (Salesforce, HubSpot)

### 12.5 Analytics & Intelligence

**17. Dashboard manager**
- Vue d'ensemble multi-vendeurs
- Comparaison de performances
- Détection de best practices
- Alertes sur produits en difficulté

**18. Détection d'insights automatique**
- Analyse des tendances sur plusieurs rapports
- Détection d'opportunités manquées
- Identification de problèmes récurrents
- Suggestions de coaching personnalisées

**19. Analyse sentiment avancée**
- Détection fine des émotions (14 catégories)
- Évolution de l'état émotionnel durant la conversation
- Corrélation émotion/performance
- Alertes bien-être vendeurs

**20. Prédictions & Forecasting**
- Prédiction de ventes futures basée sur historique
- Identification de produits à promouvoir
- Optimisation d'allocation de vendeurs par événement

### 12.6 Expérience utilisateur

**21. Onboarding interactif**
- Tutorial vocal guidé
- Demo avec conversation exemple
- Tips contextuels durant l'usage
- Gamification (badges, streaks)

**22. Feedback visuel temps réel**
- Indicateur de progression conversation
- Aperçu du rapport en construction
- Suggestions de ce qui manque
- Barre de progression attention points

**23. Mode déconnecté**
- Enregistrement local si pas de réseau
- Upload différé quand connexion rétablie
- Transcription locale avec Whisper.cpp
- Mode "rapport express" sans IA si offline

**24. Accessibilité**
- Support des lecteurs d'écran
- Mode contraste élevé
- Taille de texte ajustable
- Sous-titres en temps réel

### 12.7 Sécurité & Conformité

**25. Authentification robuste**
- OAuth2 avec SSO entreprise
- 2FA obligatoire
- Gestion fine des permissions (vendeur, manager, admin)
- Session timeout configurable

**26. Chiffrement end-to-end**
- Chiffrement des rapports au repos
- Chiffrement des communications
- Tokenization des données sensibles
- Audit trail complet

**27. Conformité RGPD**
- Consentement explicite à l'enregistrement
- Droit à l'oubli (suppression sur demande)
- Export de données personnelles
- Politique de rétention configurable

**28. Audit & Monitoring**
- Logs détaillés de toutes les actions
- Alertes sur comportements anormaux
- Dashboard de sécurité
- Conformité SOC2/ISO27001

### 12.8 Scalabilité & Performance

**29. Optimisation latence**
- TTS streaming optimisé (Cartesia)
- STT plus rapide (Deepgram Nova 2)
- LLM inference optimisé (vLLM, TGI)
- CDN pour assets statiques

**30. Multi-régions**
- Déploiement multi-régions (EU, US, APAC)
- Data residency respectée
- Failover automatique
- Latence réduite par géolocalisation

**31. Cost optimization**
- Cache intelligent des réponses courantes
- Batch processing pour rapports non urgents
- Tier gratuit + premium
- Monitoring des coûts API en temps réel

### 12.9 Intégrations & Écosystème

**32. Intégrations CRM**
- Salesforce bidirectionnel
- HubSpot sync automatique
- Zoho CRM
- API REST ouverte pour custom integrations

**33. Intégrations communication**
- Slack notifications
- Teams integration
- Email automatique avec résumé
- SMS pour alertes critiques

**34. Intégrations analytics**
- Google Analytics événements
- Mixpanel user tracking
- Amplitude product analytics
- Custom dashboards Metabase

**35. Marketplace de plugins**
- API publique pour développeurs tiers
- SDK JavaScript/Python
- Templates communautaires
- Approbation et modération

### 12.10 Innovation & R&D

**36. Multimodal (Vision + Voice)**
- Capture photo de produits
- Scan de documents (factures, bons)
- Reconnaissance visuelle de logos concurrents
- OCR pour lecture de badges visiteurs

**37. Agent proactif**
- Rappels automatiques en fin de journée
- Suggestions basées sur l'événement
- Questions prédictives ("Tu vas probablement avoir...")
- Coaching en temps réel durant l'événement

**38. Collaboration temps réel**
- Plusieurs vendeurs sur même événement
- Agrégation automatique des rapports
- Chat entre vendeurs via l'app
- Manager peut "rejoindre" la conversation

**39. Analyse audio avancée**
- Détection de bruit ambiant (jauge de fréquentation)
- Analyse de prosodie (confiance, hésitation)
- Détection de mensonge/exagération
- Recommandations de formation personnalisées

**40. IA générative pour insights**
- Résumés automatiques multi-rapports
- Génération de recommandations stratégiques
- Prédiction de tendances marché
- Génération de pitchs de vente optimisés

---

## Conclusion

Ce document décrit de manière exhaustive l'architecture, le fonctionnement et les possibilités d'évolution du projet Eldora/Voyaltis V2.

**Points clés à retenir :**
- Architecture temps réel avec LiveKit (WebRTC)
- Pipeline vocal complet : VAD → STT → LLM → TTS
- Configuration dynamique avec attention points personnalisables
- Extraction de données structurées via Claude 3.5 Sonnet
- Fuzzy matching intelligent pour mapping produits
- Persistance locale avec AsyncStorage (à remplacer par backend cloud)
- Mode création vs édition de rapports
- 40 pistes d'amélioration identifiées

**Prochaines étapes recommandées :**
1. Backend cloud avec API REST + PostgreSQL
2. Déploiement production (Agent Python + Proxy Node.js)
3. Amélioration détection de fin de conversation
4. Dashboard manager avec analytics
5. Intégrations CRM pour envoi automatique des rapports

---

**Document généré pour discussion avec d'autres systèmes d'IA**
**Date : Octobre 2024**
**Version : 2.0**
