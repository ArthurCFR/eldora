# Système de Priorité des Questions

## Principe fondamental

**TOUS les points d'attention doivent être couverts EN PRIORITÉ avant d'utiliser les questions bonus.**

## Structure des questions

### Questions obligatoires (base)
- Nombre : `len(attention_points)`
- Priorité : **ABSOLUE**
- Objectif : Couvrir tous les points d'attention définis dans le projet
- Statut : Doivent être posées dans l'ordre

### Questions bonus (follow-ups)
- Nombre : `max(2, int(base * 0.5))` (50% des questions obligatoires, minimum 2)
- Priorité : **SECONDAIRE**
- Objectif : Clarifier, approfondir, collecter des détails supplémentaires
- Statut : Utilisables uniquement après avoir couvert tous les points obligatoires

## Calcul des limites

| Points d'attention | Questions obligatoires | Questions bonus | Total |
|-------------------|------------------------|-----------------|-------|
| 3 | 3 | 2 | 5 |
| 4 | 4 | 2 | 6 |
| 5 | 5 | 3 | 8 |
| 6 | 6 | 3 | 9 |

## Instructions données à l'agent

### Progression affichée

```
PROGRESSION : Question 2/5 (3 obligatoires + 2 bonus)
Questions obligatoires couvertes : 2/3
🎯 PRIORITÉ : Il reste 1 question(s) OBLIGATOIRE(S) sur les points d'attention à poser avant d'utiliser les questions bonus.
```

### Règles explicites

```
4. 🎯 PRIORITÉ ABSOLUE : Couvre TOUS les 3 points d'attention AVANT de poser des questions bonus
5. Une fois les 3 points couverts, tu peux poser jusqu'à 2 questions de clarification si nécessaire
```

## Scénarios détaillés

### Scénario 1 : Conversation efficace (sans questions bonus)

**Configuration :** 3 points d'attention → 3 obligatoires + 2 bonus = 5 max

```
Q1: [Obligatoire] Comment s'est passée ta journée ?
    → Réponse claire et complète
    → Progression : 1/5 (1/3 obligatoires)

Q2: [Obligatoire] Quels produits as-tu vendus ?
    → "3 Galaxy Z Nova et 2 QLED Vision"
    → Progression : 2/5 (2/3 obligatoires)

Q3: [Obligatoire] Les clients avaient des retours ?
    → "Oui, ils adorent l'écran pliable"
    → Progression : 3/5 (3/3 obligatoires) ✅ Tous les points couverts

Agent: "Parfait ! Je vais préparer ton rapport."
```

✅ Efficace : 3 questions utilisées sur 5 disponibles

### Scénario 2 : Besoin de clarification (avec questions bonus)

**Configuration :** 3 points d'attention → 3 obligatoires + 2 bonus = 5 max

```
Q1: [Obligatoire] Comment s'est passée ta journée ?
    → "Bien, j'ai vendu des trucs"
    → Progression : 1/5 (1/3 obligatoires)

Q2: [Obligatoire] Quels produits exactement ?
    → "Samsung"
    → Progression : 2/5 (2/3 obligatoires)

Q3: [Obligatoire] Les clients avaient des retours ?
    → "Ouais"
    → Progression : 3/5 (3/3 obligatoires) ✅ Tous les points couverts

🎯 L'agent peut maintenant utiliser les questions bonus :

Q4: [Bonus] Combien de chaque produit as-tu vendus ?
    → "3 Galaxy Z Nova et 2 QLED Vision"
    → Progression : 4/5

Q5: [Bonus] Qu'est-ce qui a plu particulièrement aux clients ?
    → "L'écran pliable du Z Nova"
    → Progression : 5/5 (LIMITE)

Agent: "Parfait ! Je vais préparer ton rapport."
```

✅ Toutes les questions utilisées de manière pertinente

### Scénario 3 : Tentative d'utiliser bonus trop tôt (BLOQUÉ)

**Configuration :** 3 points d'attention → 3 obligatoires + 2 bonus = 5 max

```
Q1: [Obligatoire] Comment s'est passée ta journée ?
    → "Bien"
    → Progression : 1/5 (1/3 obligatoires)
    → 🎯 PRIORITÉ : Il reste 2 question(s) OBLIGATOIRE(S)

Q2: [Tentative Bonus] Peux-tu me donner plus de détails sur les prix ?
    ❌ NON ! L'agent voit dans ses instructions :
    "🎯 PRIORITÉ : Il reste 2 question(s) OBLIGATOIRE(S) sur les points d'attention à poser"

Q2: [Obligatoire - Corrigé] Quels produits as-tu vendus ?
    → "3 Galaxy Z Nova"
    → Progression : 2/5 (2/3 obligatoires)
    → 🎯 PRIORITÉ : Il reste 1 question(s) OBLIGATOIRE(S)

Q3: [Obligatoire] Les clients avaient des retours ?
    → "Oui, positifs"
    → Progression : 3/5 (3/3 obligatoires) ✅

Q4: [Bonus - Maintenant autorisé] Quels retours précisément ?
    → "Ils adorent l'écran"
    → Progression : 4/5

Agent: "Parfait ! Je vais préparer ton rapport."
```

✅ Le système force la priorité

## Implémentation technique

### Calcul de la progression

```python
mandatory_questions_covered = min(questions_asked, base_questions)
mandatory_remaining = base_questions - mandatory_questions_covered

if mandatory_remaining > 0:
    priority_warning = f"🎯 PRIORITÉ : Il reste {mandatory_remaining} question(s) OBLIGATOIRE(S) sur les points d'attention à poser avant d'utiliser les questions bonus."
```

### Affichage en temps réel

```
PROGRESSION : Question {questions_asked}/{max_questions} ({base_questions} obligatoires + {follow_up_buffer} bonus)
Questions obligatoires couvertes : {mandatory_questions_covered}/{base_questions}
{priority_warning}
```

## Bénéfices du système

### 1. Garantie de couverture complète
✅ TOUS les points d'attention sont couverts
✅ Aucun point ne peut être oublié
✅ L'ordre des priorités est respecté

### 2. Flexibilité intelligente
✅ Permet des clarifications après avoir couvert l'essentiel
✅ Collecte de détails supplémentaires si nécessaire
✅ Adaptation au niveau de précision des réponses

### 3. Efficacité maintenue
✅ Pas de gaspillage des questions bonus sur des détails avant l'essentiel
✅ Conversations restent courtes si les réponses sont claires
✅ Utilisation optimale des questions disponibles

## Comparaison avec l'ancien système

| Aspect | Avant | Maintenant |
|--------|-------|------------|
| **Couverture points d'attention** | ✅ Garantie (1:1) | ✅ Garantie + priorité explicite |
| **Flexibilité** | ❌ Aucune | ✅ +50% de questions |
| **Priorité explicite** | ⚠️ Implicite | ✅ Explicite dans les instructions |
| **Suivi en temps réel** | ❌ Non | ✅ Progression obligatoires/bonus |
| **Garde-fou priorité** | ⚠️ Confiance en l'IA | ✅ Alertes automatiques |

## Logs de monitoring

### Démarrage
```
📊 Will ask up to 5 questions (3 base + 2 follow-ups)
```

### Progression avec priorité non remplie
```
📊 Questions: 2/5
[Instructions] Questions obligatoires couvertes : 2/3
[Instructions] 🎯 PRIORITÉ : Il reste 1 question(s) OBLIGATOIRE(S)
```

### Progression avec priorité remplie
```
📊 Questions: 3/5
[Instructions] Questions obligatoires couvertes : 3/3 ✅
[Instructions] Tu peux maintenant poser jusqu'à 2 questions bonus si nécessaire
```

### Approche limite
```
📊 Questions: 4/5
⚠️ Only 1 question remaining! Agent should wrap up.
```

## Tests recommandés

### Test 1 : Vérifier la priorité
1. Démarrer avec 3 points d'attention
2. Répondre vaguement aux 2 premières questions
3. Vérifier que l'agent pose Q3 (obligatoire) et non une clarification

### Test 2 : Vérifier les bonus
1. Démarrer avec 3 points d'attention
2. Répondre clairement aux 3 questions obligatoires
3. Répondre vaguement à Q3
4. Vérifier que l'agent utilise Q4 (bonus) pour clarifier

### Test 3 : Vérifier les alertes
1. Démarrer avec 3 points d'attention
2. À Q2, vérifier les logs : "Il reste 1 question OBLIGATOIRE"
3. À Q3, vérifier : "Questions obligatoires couvertes : 3/3 ✅"

## Configuration

### Modifier le ratio bonus

Éditer `agent/mainV2.py` ligne 382 :

```python
# Actuellement : 50% de bonus
follow_up_buffer = max(2, int(base_questions * 0.5))

# Plus généreux : 75%
follow_up_buffer = max(2, int(base_questions * 0.75))

# Plus strict : 33%
follow_up_buffer = max(1, int(base_questions * 0.33))
```

**Note :** Le minimum de 2 garantit toujours un peu de flexibilité.

## Résumé visuel

```
┌─────────────────────────────────────────────────────┐
│            SYSTÈME DE PRIORITÉ                       │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Q1 Q2 Q3  │  Q4 Q5                                │
│  └──┬──┘   │  └─┬─┘                                │
│     │      │    │                                   │
│ OBLIGATOIRES  BONUS                                 │
│ (Priorité 1)  (Priorité 2)                         │
│                                                      │
│ ✅ TOUJOURS posées d'abord                         │
│ ✅ Couvrent tous les points d'attention            │
│                ↓                                     │
│ ⏸️  Uniquement après avoir couvert l'obligatoire   │
│ ✅ Clarifications et approfondissements            │
│                                                      │
└─────────────────────────────────────────────────────┘
```

## Conclusion

Le système de priorité garantit que :

1. **TOUS** les points d'attention sont couverts (priorité absolue)
2. Des questions bonus permettent d'approfondir si nécessaire
3. L'agent reçoit des instructions claires et un suivi en temps réel
4. Les conversations restent efficaces tout en étant flexibles

**→ Meilleur des deux mondes : couverture garantie + flexibilité intelligente**
