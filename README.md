# Voyaltis V2 - Assistant Vocal en Temps Réel

Application React Native avec Expo et **LiveKit** permettant aux commerciaux de générer automatiquement des rapports de visite grâce à l'intelligence artificielle **en temps réel**.

## ✨ V2 - Nouveautés

**⚡ Architecture temps réel avec LiveKit:**
- Streaming audio bidirectionnel via WebRTC
- Latence réduite de 3-5s → ~500ms
- Conversation naturelle avec détection automatique de tour de parole
- Interruption de l'agent possible
- Transcription en direct affichée à l'écran

**🎯 Cette V2 transforme l'app d'un système de fichiers en une conversation vocale fluide et naturelle.**

## 🚀 Fonctionnalités

- **Conversation en temps réel** : Dialogue naturel avec l'assistant IA
- **Transcription live** : Voir ce que vous dites en temps réel
- **Détection de tour** : L'assistant sait quand vous avez fini de parler
- **Interruption** : Vous pouvez interrompre l'assistant
- **Génération de rapports** : Création de rapports structurés via Claude AI
- **Interface intuitive** : Design moderne avec feedback visuel temps réel
- **Multi-style** : Conversation amicale, professionnelle, ou motivante

## 📋 Prérequis

- Node.js 18+
- Python 3.11+ (pour l'agent LiveKit)
- Expo CLI
- Compte LiveKit (gratuit sur [LiveKit Cloud](https://cloud.livekit.io/))
- Compte Anthropic (pour Claude API)
- Compte Deepgram (pour STT en temps réel)
- Compte ElevenLabs (pour TTS)

## 🛠 Installation

### 🚀 Quick Start (5 minutes)

**Voir [LIVEKIT_QUICKSTART.md](./LIVEKIT_QUICKSTART.md) pour un guide détaillé.**

1. **Cloner le projet**
```bash
git clone <repo-url>
cd Eldora
```

2. **Installer les dépendances Node.js**
```bash
npm install
```

3. **Configurer les variables d'environnement**

Créez un fichier `.env` à la racine :
```env
# LiveKit
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret

# AI Services
ANTHROPIC_API_KEY=sk-ant-...
DEEPGRAM_API_KEY=...
ELEVENLABS_API_KEY=...
```

4. **Configurer l'agent Python**
```bash
cd agent
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Éditer agent/.env avec vos clés API
```

5. **Démarrer tous les services (3 terminaux)**

**Terminal 1 - Agent Python:**
```bash
cd agent
source venv/bin/activate
python main.py start
```

**Terminal 2 - Proxy Node.js:**
```bash
npm run proxy
```

**Terminal 3 - App React Native:**
```bash
npm start
```

6. **Tester sur votre téléphone**
   - Installez l'app **Expo Go** sur votre smartphone
   - Scannez le QR code affiché dans le terminal
   - Appuyez sur le bouton vocal et parlez !

## 📱 Utilisation

### V2 (LiveKit - Temps Réel)

1. Ouvrez l'application
2. Appuyez sur le bouton vocal
3. L'assistant dit : **"Salut Thomas ! Comment s'est passée ta journée ?"**
4. Parlez naturellement - vous voyez votre transcription en temps réel
5. L'assistant détecte automatiquement quand vous avez fini
6. Il pose des questions de suivi basées sur ce que vous dites
7. La conversation se termine automatiquement quand toutes les infos sont collectées
8. Le rapport est généré avec ventes, insights, et recommandations

**Vous pouvez interrompre l'assistant à tout moment en parlant !**

### V1 (Legacy - Fichiers)

1. Utilisez le composant `VoiceButton` classique
2. Enregistrement → Upload → Traitement → Download
3. Plus lent mais fonctionne sans Python agent

## 🏗 Architecture

**Voir [ARCHITECTURE.md](./ARCHITECTURE.md) pour le détail complet.**

```
/agent                         # 🆕 Agent Python LiveKit
  ├── main.py                  # Point d'entrée agent
  ├── conversational_engine.py # Logique conversationnelle
  ├── sales_analyzer.py        # Analyse et mapping produits
  ├── produits.json            # Catalogue produits
  ├── requirements.txt         # Dépendances Python
  └── Dockerfile               # Conteneur Docker

/hooks                         # 🆕 React Hooks
  └── useLiveKitRoom.ts        # Hook connexion LiveKit

/services                      # 🆕 Services
  └── livekit.ts               # Service LiveKit

/components
  ├── LiveKitVoiceButton.tsx   # 🆕 Bouton temps réel
  ├── VoiceButton.tsx          # Legacy (fichiers)
  ├── VisitSummary.tsx         # Récapitulatif visite
  └── ReportPreview.tsx        # Modal rapport

/types
  └── index.ts                 # Types TypeScript

server.js                      # 🆕 Token LiveKit + proxy Claude
```

### Architecture Système

```
React Native App ←─── WebRTC ───→ LiveKit Cloud
                                       ↓
                                  Python Agent
                                  ├── STT (Deepgram)
                                  ├── LLM (Claude)
                                  └── TTS (ElevenLabs)
```

## 🎨 Design System

- **Couleurs** : Bleu primaire (#3B82F6), Rouge (#EF4444), Gris
- **Typographie** : SF Pro / Inter
- **Composants** : Cards, Boutons, Modals avec animations

## 🔑 APIs Utilisées

### V2 (LiveKit - Temps Réel)
- **LiveKit** : Infrastructure WebRTC temps réel
- **Deepgram** : Transcription audio → texte en streaming
- **Anthropic Claude** : Intelligence conversationnelle
- **ElevenLabs** : Synthèse vocale naturelle

### V1 (Legacy)
- **OpenAI Whisper** : Transcription audio → texte (fichiers)
- **Anthropic Claude** : Génération de rapports
- **Expo Speech** : Synthèse vocale basique

## 📦 Dépendances Principales

### React Native
- `expo` : Framework React Native
- `@livekit/react-native` : SDK LiveKit
- `livekit-client` : Client LiveKit
- `expo-av` : Enregistrement audio (legacy)
- `expo-router` : Navigation

### Node.js (Proxy)
- `express` : Serveur HTTP
- `livekit-server-sdk` : Génération de tokens
- `cors` : Gestion CORS

### Python (Agent)
- `livekit-agents` : SDK agent LiveKit
- `livekit-plugins-deepgram` : STT
- `livekit-plugins-elevenlabs` : TTS
- `anthropic` : API Claude

## 📚 Documentation

- **[SETUP.md](./SETUP.md)** - 🚀 Guide d'installation (START HERE)
- **[README_SELFHOSTED.md](./README_SELFHOSTED.md)** - Utilisation LiveKit local
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Architecture système
- **[LIVEKIT_MIGRATION.md](./LIVEKIT_MIGRATION.md)** - Guide complet (référence)
- **[agent/START.md](./agent/START.md)** - Démarrage agent Python

## 🐛 Troubleshooting

**L'agent ne démarre pas:**
```bash
cd agent && pip install -r requirements.txt
```

**Connexion échoue:**
- Vérifiez que `LIVEKIT_URL` est correct dans `.env`
- Assurez-vous que `server.js` tourne (npm run proxy)
- Utilisez `wss://` pour LiveKit Cloud, `ws://` pour local

**Pas de son de l'agent:**
- Vérifiez `ELEVENLABS_API_KEY`
- Vérifiez les permissions micro
- Vérifiez que l'agent Python tourne

**Voir [LIVEKIT_MIGRATION.md](./LIVEKIT_MIGRATION.md#troubleshooting) pour plus de détails.**

## 🚀 Déploiement

### Agent Python
- **Railway**: `railway up` dans `/agent`
- **Docker**: `docker build -t voyaltis-agent . && docker run --env-file .env voyaltis-agent`

### Proxy Node.js
- **Railway / Heroku / Vercel**

### LiveKit Server
- **LiveKit Cloud** (recommandé - géré)
- **Self-hosted** (Docker)

Voir [LIVEKIT_MIGRATION.md](./LIVEKIT_MIGRATION.md#deployment) pour les détails.

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une PR.

## 📄 Licence

MIT

---

## 🎯 Prochaines Étapes

1. ✅ Architecture LiveKit implémentée
2. ⏳ Tests et optimisation
3. ⏳ Déploiement production
4. ⏳ Analytics et monitoring
5. ⏳ Multi-langue
6. ⏳ Voice cloning personnalisé

---

**Développé avec ❤️ pour Voyaltis**

**V2 powered by LiveKit 🚀**
