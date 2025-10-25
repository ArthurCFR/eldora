# Guide de test - Agent V2

## 🚀 Démarrage rapide

### 1. Arrêter V1 si actif

```bash
# Trouver le processus V1
ps aux | grep "python main.py"

# Tuer le processus
pkill -f "python main.py"
```

### 2. Démarrer V2

```bash
cd agent
./start-v2.sh
```

Vous devriez voir :
```
🚀 Starting Voyaltis Agent V2 (Ultra-Simplified)
================================================

Version: V2 - Simple linear question flow
Features: Minimal complexity, direct questions

Starting agent...
INFO:voyaltis-agent-v2:Worker started
```

### 3. Vérifier les logs

Les logs de V2 incluent le tag `[V2]` :
```
🚀 [V2] Starting simple agent for room: voyaltis-Thomas-1729850000
🎤 [V2] Simple agent started
✅ [V2] Session running
```

## 🧪 Test complet

### Terminal 1: Agent V2
```bash
cd agent
source venv/bin/activate
python mainV2.py start
```

### Terminal 2: Proxy Node.js
```bash
npm run proxy
```

### Terminal 3: App React Native
```bash
npm start
```

## ✅ Checklist de test

### Test 1: Conversation basique

**Attendu :**
1. ✅ Agent dit : "Salut [nom] ! Je vais te poser N questions rapides."
2. ✅ Agent pose question 1 (attention point 1)
3. ✅ User répond
4. ✅ Agent pose question 2 (attention point 2)
5. ✅ User répond
6. ✅ Agent dit : "Parfait ! Je vais préparer ton rapport."
7. ✅ Rapport généré et affiché

**Comment tester :**
- Ouvrir app sur téléphone/émulateur
- Appuyer sur bouton vocal
- Parler normalement
- Vérifier que toutes les questions sont posées
- Vérifier que le rapport est généré

### Test 2: Logs V2

**Attendu :**
```
📊 Will ask 2 questions
💬 assistant: Salut Thomas ! Je vais te poser 2 questions rapides.
💬 user: [transcription]
📊 Questions: 1/2
💬 assistant: [question 2]
📊 Questions: 2/2
🏁 End detected - all questions asked + closing message
📊 Generating report...
✅ Report sent to client
```

**Comment tester :**
- Surveiller le terminal de l'agent V2
- Vérifier la présence du tag `[V2]`
- Vérifier le compteur de questions

### Test 3: Configuration attention points

**Attendu :**
- Si 2 attention points configurés → 2 questions
- Si 3 attention points configurés → 3 questions
- Questions posées dans l'ordre des attention points

**Comment tester :**
1. Aller dans app admin
2. Ajouter un 3ème attention point : "Profil des visiteurs"
3. Sauvegarder
4. Lancer conversation
5. Vérifier que 3 questions sont posées

### Test 4: Génération du rapport

**Attendu :**
- Rapport avec tous les produits
- Sales correctement mappés (fuzzy matching)
- Customer feedback structuré par sections
- Key insights générés

**Comment tester :**
1. Compléter conversation
2. Vérifier le rapport dans la modal
3. Vérifier les ventes (nombres corrects)
4. Vérifier customer_feedback (sections **BOLD**)
5. Vérifier key_insights (2-4 insights)

### Test 5: Comparaison V1 vs V2

**Test A avec V1 :**
```bash
pkill -f mainV2
cd agent
python main.py start
```

**Test B avec V2 :**
```bash
pkill -f "python main.py"
cd agent
python mainV2.py start
```

**Comparer :**
| Critère | V1 | V2 |
|---------|----|----|
| Temps de réponse | ? | ? |
| Naturalité | ? | ? |
| Nombre de questions | ? | ? |
| Qualité du rapport | ? | ? |

## 🐛 Troubleshooting V2

### Problème : Agent ne démarre pas

**Symptômes :**
```
ModuleNotFoundError: No module named 'livekit'
```

**Solution :**
```bash
cd agent
source venv/bin/activate
pip install -r requirements.txt
```

### Problème : Pas de questions posées

**Symptômes :**
- Agent dit juste l'opening message puis se tait

**Debug :**
```bash
# Vérifier les logs
tail -f agent/agent.log

# Vérifier que metadata est reçu
# Doit voir: "👤 Loaded config: Thomas, 2 attention points"
```

**Solution :**
- Vérifier que assistantConfig est bien passé dans metadata
- Vérifier que attention_points n'est pas vide

### Problème : Agent ne finit jamais

**Symptômes :**
- Toutes les questions posées mais pas de rapport

**Debug :**
```python
# Dans mainV2.py, ajouter plus de logs
logger.info(f"End check: {questions_asked} >= {max_questions}, keyword present: {'préparer ton rapport' in text_lower}")
```

**Solution :**
- Vérifier que l'agent dit bien "préparer ton rapport"
- Vérifier `should_end = True` dans les logs

### Problème : Rapport vide ou incorrect

**Symptômes :**
- Rapport généré mais sales = tous à 0
- Customer feedback vide

**Debug :**
```python
# Vérifier conversation_messages
logger.info(f"Conversation messages: {conversation_messages}")
```

**Solution :**
- Vérifier que les messages sont bien stockés
- Vérifier que Claude reçoit la conversation complète
- Vérifier les prompts dans PromptBuilder

## 📊 Métriques de performance V2

À collecter pendant les tests :

```
Métrique                | V1      | V2      | Objectif
------------------------|---------|---------|----------
Temps total (3 Q)       | ?       | ?       | < 2 min
Latence par réponse     | ?       | ?       | < 3s
Taux de complétion      | ?       | ?       | > 95%
Qualité rapport (1-10)  | ?       | ?       | > 7/10
Bugs rencontrés         | ?       | ?       | 0
```

## 🎯 Tests avancés

### Test stress : 10 conversations successives

```bash
# Script de test automatique (TODO)
for i in {1..10}; do
  echo "Test $i/10"
  # Lancer conversation
  # Attendre fin
  # Vérifier rapport
done
```

### Test edge case : Réponses très courtes

**Scénario :**
```
Agent: Comment s'est passée ta journée ?
User: Bien.

Agent: Et les retours clients ?
User: Rien.
```

**Attendu :**
- Agent termine quand même
- Rapport généré (peut-être vide)
- Pas de crash

### Test edge case : Réponses très longues

**Scénario :**
```
Agent: Comment s'est passée ta journée ?
User: [Parle pendant 2 minutes sans s'arrêter]
```

**Attendu :**
- Whisper transcrit tout
- GPT génère question suivante
- Pas de timeout

### Test edge case : User interrompt agent

**Scénario :**
```
Agent: Et au niveau des ret--
User: J'ai aussi vendu des tablettes !
```

**Attendu :**
- Agent s'arrête de parler
- Agent écoute le user
- Agent reprend après

## ✅ Validation finale

Avant de déployer V2 en production :

- [ ] Test 1 (Conversation basique) : ✅ OK
- [ ] Test 2 (Logs V2) : ✅ OK
- [ ] Test 3 (Configuration) : ✅ OK
- [ ] Test 4 (Rapport) : ✅ OK
- [ ] Test 5 (Comparaison V1/V2) : ✅ OK
- [ ] Troubleshooting vérifié
- [ ] Métriques collectées
- [ ] Tests edge cases passés
- [ ] Documentation à jour
- [ ] README_V2.md relu

## 📝 Notes de test

Date : ___________

Testeur : ___________

Version testée : V2.0.0

Résultats :
```
[Espace pour notes]
```

Bugs trouvés :
```
[Espace pour liste de bugs]
```

Recommandations :
```
[Espace pour recommandations]
```

---

**Après validation, n'oubliez pas de :**
1. Mettre à jour TECHNICAL_DEEP_DIVE.md avec `/update-docs`
2. Créer un tag git : `git tag v2.0.0-simple`
3. Documenter les différences dans le changelog
