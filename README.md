# Voyaltis - Assistant Vocal pour Visites Pharmacie

Application React Native avec Expo permettant aux commerciaux de générer automatiquement des rapports de visite grâce à l'intelligence artificielle.

## 🚀 Fonctionnalités

- **Enregistrement vocal** : Capturez vos commentaires de visite en parlant
- **Transcription automatique** : Conversion de la voix en texte via Whisper API
- **Génération de rapports** : Création de rapports structurés via Claude AI
- **Interface intuitive** : Design moderne et professionnel
- **Synthèse vocale** : L'assistant vous pose des questions automatiquement

## 📋 Prérequis

- Node.js 18+
- Expo CLI
- Compte OpenAI (pour Whisper API)
- Compte Anthropic (pour Claude API)

## 🛠 Installation

1. **Cloner le projet**
```bash
git clone <repo-url>
cd voyaltis-pharmacy-assistant
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configurer les variables d'environnement**

Créez un fichier `.env` à la racine du projet :
```env
EXPO_PUBLIC_OPENAI_API_KEY=sk-...
EXPO_PUBLIC_ANTHROPIC_API_KEY=sk-ant-...
```

4. **Lancer l'application**
```bash
npm start
```

5. **Tester sur votre téléphone**
   - Installez l'app **Expo Go** sur votre smartphone
   - Scannez le QR code affiché dans le terminal

## 📱 Utilisation

1. L'application affiche les détails de la visite en cours
2. Appuyez sur le bouton micro pour commencer l'enregistrement
3. L'IA vous demande : "Comment s'est passée la visite ?"
4. Parlez librement de votre visite
5. Appuyez à nouveau pour arrêter l'enregistrement
6. Le rapport est généré automatiquement en quelques secondes
7. Consultez, modifiez ou envoyez le rapport

## 🏗 Architecture

```
/app
  ├── index.tsx              # Écran principal
  ├── _layout.tsx            # Layout de base
/components
  ├── VisitSummary.tsx       # Carte récapitulatif visite
  ├── VoiceButton.tsx        # Bouton d'enregistrement
  ├── ReportPreview.tsx      # Modal d'affichage du rapport
/services
  ├── whisper.ts             # Service Whisper API
  ├── reportGenerator.ts     # Service Claude API
  ├── speech.ts              # Service synthèse vocale
/constants
  ├── mockData.ts            # Données de démo
  ├── theme.ts               # Design system
/types
  ├── index.ts               # Types TypeScript
```

## 🎨 Design System

- **Couleurs** : Bleu primaire (#3B82F6), Rouge (#EF4444), Gris
- **Typographie** : SF Pro / Inter
- **Composants** : Cards, Boutons, Modals avec animations

## 🔑 APIs Utilisées

- **OpenAI Whisper** : Transcription audio → texte
- **Anthropic Claude** : Génération de rapports structurés
- **Expo Speech** : Synthèse vocale

## 📦 Dépendances Principales

- `expo` : Framework React Native
- `expo-av` : Enregistrement audio
- `expo-speech` : Synthèse vocale
- `expo-router` : Navigation
- `react-native-reanimated` : Animations

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une PR.

## 📄 Licence

MIT

---

**Développé avec ❤️ pour Voyaltis**
