# 🚀 Guide de Démarrage Rapide - Voyaltis

## ⚡ Installation Express

### 1. Installer les dépendances
```bash
npm install
```

### 2. Configurer les API Keys

Créez un fichier `.env` à la racine :
```env
EXPO_PUBLIC_OPENAI_API_KEY=sk-votre-clé-openai
EXPO_PUBLIC_ANTHROPIC_API_KEY=sk-ant-votre-clé-anthropic
```

**Obtenir les clés API :**
- OpenAI : https://platform.openai.com/api-keys
- Anthropic : https://console.anthropic.com/settings/keys

### 3. Lancer l'application
```bash
npm start
```

### 4. Tester sur votre smartphone

1. Installez **Expo Go** depuis l'App Store / Google Play
2. Scannez le QR code affiché dans le terminal
3. L'app se charge sur votre téléphone !

---

## 📱 Test de la Démo

### Scénario de démo

1. **Lancez l'app** : Vous verrez la carte de visite "Pharmacie André Guides"
2. **Appuyez sur le bouton micro** : L'IA dit "Bonjour Stéphane ! Comment s'est passée la visite ?"
3. **Parlez pendant 10-20 secondes**, exemple :

> "La visite s'est très bien passée. J'ai discuté avec Marie des nouveaux produits de parapharmacie, notamment les compléments alimentaires et les cosmétiques bio. Elle est très intéressée par notre nouvelle gamme de vitamines. On a aussi parlé de la réorganisation du rayon conseil. Elle souhaite une présentation produit la semaine prochaine."

4. **Appuyez à nouveau** pour arrêter
5. **Attendez 5-10 secondes** : Le rapport se génère automatiquement
6. **Consultez le rapport** dans la modal qui s'affiche

---

## 🔧 Troubleshooting

### "Permission denied" pour le micro
- Sur iOS : Allez dans Réglages > Expo Go > Microphone → Activer
- Sur Android : Accordez la permission quand demandée

### "API Key invalid"
- Vérifiez que les clés sont bien dans le fichier `.env`
- Vérifiez qu'elles commencent par `sk-` (OpenAI) et `sk-ant-` (Anthropic)
- Redémarrez l'app avec `npm start`

### L'enregistrement ne démarre pas
- Vérifiez les permissions micro
- Fermez et relancez Expo Go
- Sur iOS, vérifiez que le mode silencieux n'est pas activé

### Erreur de transcription
- Vérifiez votre connexion internet
- Vérifiez le crédit de votre compte OpenAI
- Essayez de parler plus fort et distinctement

---

## 🎯 Mode Démo (sans vraies API)

Si vous voulez tester l'UI sans consommer de crédits API, vous pouvez modifier les services :

**services/whisper.ts** :
```typescript
export async function transcribeAudio(audioUri: string): Promise<string> {
  // Mode démo : retourne un texte fixe
  await new Promise(resolve => setTimeout(resolve, 2000)); // Simule le délai
  return "La visite s'est très bien passée. Discussion sur les nouveaux produits...";
}
```

**services/reportGenerator.ts** :
```typescript
export async function generateReport(transcript: string, visitInfo: VisitInfo): Promise<string> {
  // Mode démo
  await new Promise(resolve => setTimeout(resolve, 2000));
  return `📋 RAPPORT DE VISITE

Client : ${visitInfo.pharmacyName}
Contact : ${visitInfo.pharmacistName}
Date : ${visitInfo.visitDate}

🎯 Points clés
• Visite réussie avec un excellent contact
• Discussion approfondie sur les nouveaux produits
• Intérêt marqué pour notre gamme

💬 Produits discutés
• Compléments alimentaires
• Cosmétiques bio
• Vitamines

💡 Insights
• Pharmacienne très réceptive à l'innovation
• Budget disponible pour renouvellement stocks

📅 Prochaines étapes
• Organiser présentation produits semaine prochaine
• Envoyer catalogue détaillé
• Prévoir suivi dans 15 jours`;
}
```

---

## 📦 Build Production

### Android
```bash
npx expo build:android
```

### iOS
```bash
npx expo build:ios
```

---

## 💡 Personnalisation

### Changer les données de visite
Éditez `constants/mockData.ts`

### Modifier les couleurs
Éditez `constants/theme.ts`

### Adapter le prompt IA
Éditez `services/reportGenerator.ts`

---

## 🎉 Prêt pour la démo !

Votre application est maintenant opérationnelle. Bonne présentation ! 🚀
