# Setup Voyaltis V2 - Architecture Simplifiée

## Architecture : Self-Hosted Local UNIQUEMENT

```
React Native App ←─── WebRTC ───→ LiveKit (Docker Local)
                                       ↓
                                  Python Agent
                                  ├── STT (OpenAI Whisper)
                                  ├── LLM (Claude)
                                  └── TTS (OpenAI)
```

---

## Installation (5 minutes)

### 1. Cloner et installer

```bash
cd Eldora
npm install
```

### 2. Configuration

**Créer `.env` à la racine :**
```bash
cp .env.example .env
nano .env
```

**Ajouter SEULEMENT ces clés :**
```bash
ANTHROPIC_API_KEY=sk-ant-votre-clé
OPENAI_API_KEY=sk-votre-clé

# LiveKit local (ne pas changer)
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
```

**Créer `agent/.env` :**
```bash
cd agent
cp .env.example .env
nano .env
```

**Même contenu que ci-dessus.**

### 3. Setup Python Agent

```bash
cd agent
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

---

## Démarrage

**4 terminaux requis :**

### Terminal 1 : LiveKit Server
```bash
npm run livekit:local
```
Attend de voir : `LiveKit server started`

### Terminal 2 : Python Agent
```bash
cd agent
source venv/bin/activate
python main.py start
```
Attend de voir : `✅ Connected to LiveKit room`

### Terminal 3 : Node.js Proxy
```bash
npm run proxy
```
Attend de voir : `Proxy server running on http://localhost:3001`

### Terminal 4 : React Native App
```bash
npm start
```
Scannez le QR code avec Expo Go.

---

## Test Rapide

**Test 1 : LiveKit fonctionne**
```bash
curl http://localhost:7880
# Devrait retourner: {"version":"..."}
```

**Test 2 : Agent OK**
```bash
cd agent
python main_simple.py
# Devrait afficher: "Agent initialized successfully!"
```

**Test 3 : Token generation**
```bash
curl -X POST http://localhost:3001/api/livekit-token \
  -H "Content-Type: application/json" \
  -d '{"roomName":"test","participantName":"Thomas"}'
# Devrait retourner un token
```

---

## Troubleshooting

**LiveKit ne démarre pas :**
```bash
docker ps  # Vérifier que le conteneur tourne
npm run livekit:logs  # Voir les logs
```

**Agent ne se connecte pas :**
```bash
# Vérifier .env
cat agent/.env

# Tester connexion
curl http://localhost:7880
```

**App ne se connecte pas :**
```bash
# Vérifier que server.js tourne
curl http://localhost:3001/api/livekit-token \
  -X POST -d '{"roomName":"test","participantName":"test"}' \
  -H "Content-Type: application/json"
```

---

## Structure Simplifiée

```
Eldora/
├── .env                        # Config principale
├── livekit.yaml                # Config LiveKit
├── docker-compose.yml          # Lance LiveKit
├── server.js                   # Proxy pour tokens
│
├── agent/
│   ├── .env                    # Config agent (même que racine)
│   ├── main.py                 # Agent LiveKit
│   ├── conversational_engine.py
│   ├── sales_analyzer.py
│   └── requirements.txt
│
├── hooks/
│   └── useLiveKitRoom.ts       # Hook React Native
│
├── services/
│   └── livekit.ts              # Service LiveKit
│
└── components/
    └── LiveKitVoiceButton.tsx  # Bouton vocal
```

---

## Commandes Utiles

```bash
# LiveKit
npm run livekit:local    # Démarrer
npm run livekit:stop     # Arrêter
npm run livekit:logs     # Logs

# Développement
npm run proxy            # Proxy Node.js
npm start               # App React Native
cd agent && python main.py start  # Agent

# Tests
cd agent && python main_simple.py  # Test sans LiveKit
```

---

## Configuration par Défaut (Local)

**LiveKit (ne pas changer) :**
- URL : `ws://localhost:7880`
- API Key : `devkey`
- API Secret : `secret`

Ces valeurs sont dans `livekit.yaml` :
```yaml
port: 7880
keys:
  devkey: secret
```

**Vous devez SEULEMENT ajouter :**
- `ANTHROPIC_API_KEY` (Claude)
- `OPENAI_API_KEY` (Whisper + TTS)

---

## Workflow Quotidien

**1. Démarrage :**
```bash
# Terminal 1
npm run livekit:local

# Terminal 2
cd agent && source venv/bin/activate && python main.py start

# Terminal 3
npm run proxy

# Terminal 4
npm start
```

**2. Développement :**
- Modifier le code
- Pas besoin de redémarrer LiveKit
- Redémarrer seulement agent/proxy si besoin

**3. Arrêt :**
```bash
# Ctrl+C dans chaque terminal
npm run livekit:stop  # Arrêter LiveKit proprement
```

---

## C'est Tout !

L'architecture est simple :
1. **LiveKit local** (Docker) - Gère WebRTC
2. **Python Agent** - Logique conversationnelle
3. **Node.js Proxy** - Génération de tokens
4. **React Native App** - Interface utilisateur

Pas de Cloud, pas de complications ! 🚀
