# Système de Limitation des Questions

## Vue d'ensemble

Le système de limitation des questions garantit que les conversations restent efficaces tout en permettant suffisamment de flexibilité pour collecter des informations détaillées sur les produits.

## Formule de calcul

### Nouvelle formule (V2.1)

```python
base_questions = len(attention_points)  # Questions OBLIGATOIRES
follow_up_buffer = max(2, int(base_questions * 0.5))  # Questions BONUS
max_questions = base_questions + follow_up_buffer
```

**🎯 PRIORITÉ ABSOLUE :** Toutes les questions obligatoires (base) doivent être posées AVANT d'utiliser les questions bonus (follow-up).

### Exemples concrets

| Points d'attention | Base (obligatoires) | Buffer (bonus 50%) | Total | Priorité |
|-------------------|---------------------|-------------------|-------|----------|
| 3 | 3 | 2 | **5** | Q1-Q3 obligatoires, Q4-Q5 bonus |
| 4 | 4 | 2 | **6** | Q1-Q4 obligatoires, Q5-Q6 bonus |
| 5 | 5 | 3 | **8** | Q1-Q5 obligatoires, Q6-Q8 bonus |
| 6 | 6 | 3 | **9** | Q1-Q6 obligatoires, Q7-Q9 bonus |

### Ancienne formule (V2.0)

```python
max_questions = len(attention_points)  # Strictement 1 question par point
```

## Pourquoi ce changement ?

### Avant (V2.0)
- ❌ Trop restrictif : 1 question = 1 point d'attention
- ❌ Pas de place pour des clarifications
- ❌ Difficile de collecter des détails sur les produits

### Maintenant (V2.1)
- ✅ **50% de buffer** pour questions de suivi
- ✅ Permet de clarifier les réponses vagues
- ✅ Collecte plus de détails sur les produits (prix, caractéristiques, etc.)
- ✅ Reste efficace (pas de conversations interminables)

## Instructions à l'agent

L'agent reçoit des instructions adaptatives basées sur sa progression :

### Début de conversation
```
RÈGLES SIMPLES :
1. Commence par poser la question 1
2. Attends la réponse complète
3. Passe à la suivante
4. Si une réponse manque de détails, tu peux poser UNE question de clarification
5. Après avoir couvert tous les points, dis : "Parfait ! Je vais préparer ton rapport."

LIMITE : Maximum 5 questions au total (ne gaspille pas les questions de suivi)
```

### Approche de la limite (1 question restante)
```
PROGRESSION : Question 4/5

⚠️ ATTENTION : Plus qu'UNE question restante. Assure-toi d'avoir couvert l'essentiel avant de clôturer.
```

### Limite atteinte
```
PROGRESSION : Question 5/5

🚨 LIMITE ATTEINTE : Termine la conversation maintenant avec 'Parfait ! Je vais préparer ton rapport.'
```

## Garde-fous techniques

### 1. Logs de progression

```python
questions_asked += 1
logger.info(f"📊 Questions: {questions_asked}/{max_questions}")

questions_remaining = max_questions - questions_asked
if questions_remaining == 1:
    logger.warning(f"⚠️  Only 1 question remaining! Agent should wrap up.")
elif questions_remaining == 0:
    logger.warning(f"🚨 Limit reached! Agent must conclude now.")
```

### 2. Mise à jour dynamique des instructions

Quand il reste ≤ 1 question, les instructions de l'agent sont mises à jour automatiquement :

```python
if questions_remaining <= 1:
    updated_instructions = build_simple_instructions(...)
    session.agent.instructions = updated_instructions
    logger.info("🔄 Updated agent instructions - approaching limit")
```

### 3. Détection de fin

```python
if questions_asked >= max_questions:
    text_lower = assistant_text.lower()
    if "préparer ton rapport" in text_lower or "préparer le rapport" in text_lower:
        should_end = True
        logger.info("🏁 End detected - all questions asked + closing message")
```

## Cas d'usage

### Exemple 1 : Conversation efficace (4/5 questions)

```
Agent: Salut Arthur ! Comment s'est passée ta journée ?
User: Bien, j'ai vendu 3 Galaxy Z Nova et 2 QLED Vision
Agent: Super ! Les clients avaient des retours particuliers ?
User: Oui, ils adorent l'écran pliable du Z Nova
Agent: Et niveau événements, tu as fait des animations ?
User: Non, journée calme
Agent: Parfait ! Je vais préparer ton rapport.
```
✅ 3 questions principales + 0 follow-ups = Efficace !

### Exemple 2 : Besoin de clarification (5/5 questions)

```
Agent: Salut Marie ! Comment s'est passée ta journée ?
User: Pas mal, j'ai vendu quelques produits
Agent: Super ! Combien de chaque produit exactement ?  [← FOLLOW-UP]
User: 3 Galaxy Z Nova et 2 QLED Vision
Agent: Les clients avaient des retours particuliers ?
User: Ils posaient beaucoup de questions sur les prix
Agent: Quels produits les intéressaient niveau prix ?  [← FOLLOW-UP]
User: Surtout les tablettes et montres
Agent: Parfait ! Je vais préparer ton rapport.
```
✅ 3 questions principales + 2 follow-ups = Maximum utilisé, mais pertinent

### Exemple 3 : Conversation qui dérape (évité)

```
Agent: Salut Paul ! Comment s'est passée ta journée ?
User: Bien
Agent: Qu'as-tu vendu ?
User: Des produits
Agent: Lesquels exactement ?
User: Samsung
Agent: Combien ?
User: Quelques-uns
Agent: ⚠️ [4/5 questions] - Dernière question
Agent: Peux-tu me donner les quantités exactes ?
User: 2 Galaxy Z Nova
Agent: 🚨 [5/5 questions] - LIMITE ATTEINTE
Agent: Parfait ! Je vais préparer ton rapport.
```
✅ Garde-fou déclenché = Conversation clôturée proprement

## Avantages du système

### 1. Flexibilité
- ✅ Permet des clarifications naturelles
- ✅ S'adapte à la qualité des réponses
- ✅ Collecte plus de détails produits

### 2. Efficacité
- ✅ Limite toujours présente (pas de conversations infinies)
- ✅ Garde-fous automatiques
- ✅ Instructions adaptatives

### 3. Qualité des rapports
- ✅ Plus d'informations collectées
- ✅ Meilleure compréhension du contexte
- ✅ Utilisation optimale des métadonnées produits enrichies

## Synergie avec le système de métadonnées

Le nouveau système de questions fonctionne en parfaite synergie avec le [système de métadonnées produits](../PRODUCT_METADATA_SYSTEM.md) :

1. **Plus d'infos produits disponibles** → L'agent peut poser des questions plus détaillées
2. **Questions de suivi autorisées** → Permet de clarifier prix, caractéristiques, etc.
3. **Limite intelligente** → Assez de flexibilité sans perdre l'efficacité

### Exemple concret

**Avec métadonnées enrichies :**
```
Excel : Nom | Prix | Garantie | Fiche Technique
```

**L'agent peut maintenant :**
```
Agent: Quels produits as-tu vendus ?
User: Des Galaxy Z Nova
Agent: Les clients ont demandé des infos sur le prix ou la garantie ? [← FOLLOW-UP utilisant les métadonnées]
User: Oui, ils voulaient connaître la garantie
Agent: Parfait, c'est noté !
```

**Résultat dans le rapport :**
L'agent peut mentionner les discussions sur la garantie, même si elle n'est pas affichée dans le tableau du rapport.

## Configuration

### Modifier la formule

Pour ajuster le buffer, éditer `agent/mainV2.py` ligne 382 :

```python
# Buffer actuel : 50%
follow_up_buffer = max(2, int(base_questions * 0.5))

# Buffer plus généreux : 75%
follow_up_buffer = max(2, int(base_questions * 0.75))

# Buffer fixe : toujours 3
follow_up_buffer = 3
```

### Désactiver les garde-fous

Non recommandé, mais possible en commentant les lignes 645-659 de `mainV2.py`.

## Monitoring

### Logs à surveiller

```
📊 Will ask up to 5 questions (3 base + 2 follow-ups)  ← Au démarrage
📊 Questions: 1/5                                       ← Progression
📊 Questions: 4/5                                       ← Proche limite
⚠️  Only 1 question remaining! Agent should wrap up.   ← Avertissement
🚨 Limit reached! Agent must conclude now.             ← Limite atteinte
🔄 Updated agent instructions - approaching limit       ← Instructions mises à jour
🏁 End detected - all questions asked + closing message ← Fin détectée
```

## Tests recommandés

1. **Test avec réponses claires** : Vérifier que 3-4 questions suffisent
2. **Test avec réponses vagues** : Vérifier que les follow-ups sont utilisés
3. **Test de garde-fou** : Vérifier que la limite force la clôture
4. **Test de métadonnées** : Vérifier que l'agent utilise les infos produits enrichies

## Historique des versions

- **V2.1** (2025-01-XX) : Formule flexible avec buffer de 50%
- **V2.0** (2025-01-XX) : Formule stricte `len(attention_points)`
- **V1.0** (2024-XX-XX) : Limite fixe de 5 questions
