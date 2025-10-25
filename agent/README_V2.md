# Agent V2 - Version Ultra-Simplifiée

## Vue d'ensemble

**mainV2.py** est une version ultra-simplifiée de l'agent conversationnel Voyaltis.

### Différences V1 vs V2

| Feature | V1 (main.py) | V2 (mainV2.py) |
|---------|-------------|----------------|
| **Complexité** | ~400 lignes | ~250 lignes |
| **Mode édition** | ✅ Oui (EDIT/CREATE) | ❌ Non (toujours CREATE) |
| **ConversationalEngine** | ✅ Complet avec prompts complexes | ❌ Simplifié inline |
| **Détection de fin** | ✅ Multi-critères (keywords, count, explicit) | ✅ Simple (count + keyword) |
| **Règles anti-répétition** | ✅ Avancées | ❌ Basiques |
| **Contexte émotionnel** | ✅ Détection fine | ❌ Minimal |
| **Questions dynamiques** | ✅ Adaptatives selon réponses | ❌ Linéaires strictes |
| **Instructions GPT** | ✅ ~100 lignes de prompt | ✅ ~30 lignes de prompt |
| **Gestion d'erreurs** | ✅ Complète | ✅ Basique |

## Avantages de V2

### ✅ Simplicité
- Code facile à comprendre et maintenir
- Moins de dépendances internes
- Debugging plus simple

### ✅ Prévisibilité
- Flow strictement linéaire
- Pas de comportement inattendu
- Questions posées dans l'ordre exact

### ✅ Performance
- Moins de traitement
- Instructions plus courtes → réponses plus rapides
- Moins de logique conditionnelle

### ✅ Fiabilité
- Moins de points de défaillance
- Comportement déterministe
- Génération de rapport identique

## Inconvénients de V2

### ❌ Moins naturel
- Conversations plus rigides
- Pas d'adaptation contextuelle
- Pas de détection de répétition avancée

### ❌ Moins de features
- Pas de mode édition
- Pas de contexte émotionnel
- Pas de questions adaptatives

### ❌ Moins intelligent
- Peut redemander des infos déjà données
- Pas de relances intelligentes
- Flow mécanique

## Quand utiliser V2 ?

**Utilisez V2 si :**
- Vous voulez un comportement simple et prévisible
- Vous débutez avec l'agent
- Vous avez des questions très structurées
- Vous privilégiez la rapidité au naturel
- Vous voulez debugger facilement

**Utilisez V1 si :**
- Vous voulez une conversation naturelle
- Vous avez besoin du mode édition
- Vous voulez de l'adaptation contextuelle
- Vous privilégiez l'UX au détriment de la simplicité

## Démarrage

### 1. Installation (même que V1)

```bash
cd agent
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configuration (même que V1)

Copier `.env.example` vers `.env` et configurer les clés API.

### 3. Démarrage de V2

```bash
# Script dédié
./start-v2.sh

# Ou directement
cd agent
source venv/bin/activate
python mainV2.py start
```

## Architecture V2

```
User speaks
    ↓
STT (Whisper) → Transcription
    ↓
GPT-4o-mini receives:
    - Simple instructions (~30 lines)
    - Current question number
    - List of questions to ask
    ↓
GPT generates next question
    ↓
TTS (ElevenLabs) → Audio
    ↓
User hears response

[Repeat until all questions asked]

↓
End detection: "préparer ton rapport"
    ↓
Generate report with Claude
    ↓
Send to client
```

## Exemple de conversation V2

```
Agent: Salut Thomas ! Je vais te poser 2 questions rapides pour ton rapport.

Agent: Comment s'est passée ta journée ? Qu'as-tu vendu ?
User: J'ai vendu 3 Galaxy Z Nova et 2 montres.

Agent: Et au niveau des retours clients ?
User: Les clients étaient contents, beaucoup de questions sur les écrans pliables.

Agent: Parfait ! Je vais préparer ton rapport.

[Génération du rapport...]
```

## Instructions GPT-4o-mini (V2)

```python
Tu es un assistant vocal sympathique qui aide Thomas à créer un rapport de vente.

TON RÔLE :
- Poser exactement 2 questions
- Une question à la fois
- Courtes et naturelles (max 15 mots)
- Écouter la réponse
- Passer à la question suivante

QUESTIONS À POSER (dans l'ordre) :
Question 1: Comment s'est passée ta journée ? Qu'as-tu vendu ?
Question 2: Et au niveau des retours clients ?

PROGRESSION : Question 0/2

RÈGLES SIMPLES :
1. Pose UNE question à la fois
2. Attends la réponse
3. Passe à la suivante
4. Après la dernière question, dis : "Parfait ! Je vais préparer ton rapport."

IMPORTANT :
- Réponds en texte naturel conversationnel
- PAS de JSON
- Questions courtes et directes
- Reste sympathique et détendu
```

## Code simplifié

### État simple
```python
questions_asked = 0
max_questions = len(attention_points)
report_sent = False
```

### Détection de fin simple
```python
if questions_asked >= max_questions:
    if "préparer ton rapport" in text_lower:
        should_end = True
```

### Pas de ConversationalEngine
Tout inline dans `build_simple_instructions()` - 30 lignes au lieu de 500.

## Connexion à l'app

**V2 utilise exactement la même interface que V1 :**
- Même LiveKit room
- Même metadata (attention points)
- Même format de rapport en sortie
- Même DataReceived messages

**Pour basculer de V1 à V2 :**
1. Arrêter V1 : `pkill -f "python main.py"`
2. Démarrer V2 : `./start-v2.sh`
3. L'app React Native n'a rien à changer !

## Tests

```bash
# Terminal 1: Démarrer V2
cd agent
./start-v2.sh

# Terminal 2: Démarrer proxy
npm run proxy

# Terminal 3: Démarrer app
npm start
```

## Logs V2

V2 utilise le logger `voyaltis-agent-v2` pour distinguer des logs de V1.

```
🚀 [V2] Starting simple agent for room: voyaltis-Thomas-1234
📊 Will ask 2 questions
🎤 [V2] Simple agent started
💬 assistant: Salut Thomas ! Je vais te poser 2 questions rapides.
💬 user: J'ai vendu 3 smartphones
📊 Questions: 1/2
💬 assistant: Et au niveau des retours clients ?
📊 Questions: 2/2
🏁 End detected - all questions asked + closing message
📊 Generating report...
✅ Report sent to client
✅ [V2] Session closed
```

## Maintenance

V2 est conçu pour être **ultra-simple à maintenir** :
- Pas de modules complexes
- Logique linéaire
- Peu de conditions
- Code auto-documenté

Si vous voulez modifier le comportement :
1. Cherchez `build_simple_instructions()`
2. Modifiez le prompt (~30 lignes)
3. C'est tout !

## Migration V1 → V2

Si vous voulez migrer complètement vers V2 :

```bash
# Backup V1
mv agent/main.py agent/main.py.backup

# Promouvoir V2
cp agent/mainV2.py agent/main.py

# Mettre à jour les scripts
sed -i 's/main.py/mainV2.py/g' agent/start.sh
```

## Roadmap V2

Améliorations possibles sans complexifier :
- [ ] Ajouter un compteur visuel des questions restantes
- [ ] Timeout si user ne répond pas
- [ ] Retry si génération rapport échoue
- [ ] Logs plus détaillés
- [ ] Mode debug avec transcription complète

---

**Créé le :** 2024-10-24
**Version :** 2.0.0-simple
**Maintenu par :** Équipe Eldora/Voyaltis
