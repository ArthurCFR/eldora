# Système de Génération de Questions Naturelles

## Problème résolu

**Avant :** Les questions générées étaient trop littérales et formelles
- ❌ "Parle-moi de détail des opportunités B2B/B2C"
- ❌ "Parle-moi de profil des clients rencontrés"
- ❌ "Parle-moi de problèmes techniques"

**Maintenant :** Questions naturelles, orales et personnelles
- ✅ "Tu as eu des belles opportunités aujourd'hui ?"
- ✅ "T'as rencontré quel type de clients ?"
- ✅ "Tout s'est bien passé ?"

## Architecture du système

```
┌─────────────────────────────────────────────────────┐
│                 Création du projet                   │
│                         ↓                            │
│         Claude analyse la description                │
│                         ↓                            │
│      Génère naturalPrompts pour chaque point        │
│                         ↓                            │
│     Stockés dans attentionPoints du projet          │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│              Démarrage conversation                  │
│                         ↓                            │
│    naturalPrompts disponibles ? Oui → Utiliser       │
│                         │                            │
│                        Non                           │
│                         ↓                            │
│        Fallback: question_generator.py               │
│       (Transformation intelligente)                  │
└─────────────────────────────────────────────────────┘
```

## Deux niveaux de génération

### Niveau 1 : Claude (lors de la création du projet)

**Fichier :** `services/claudeProjectAnalyzer.ts`

Claude analyse le contexte complet et génère des questions adaptées :

```typescript
{
  "attentionPoints": [
    {
      "id": "opportunities",
      "description": "Opportunités B2B/B2C détectées",
      "priority": "high",
      "naturalPrompts": [
        "Tu as eu des belles opportunités aujourd'hui ?",
        "T'as détecté des gros coups à suivre ?"
      ]
    }
  ]
}
```

**Avantages :**
- ✅ Contexte complet du projet
- ✅ Connaissance des produits
- ✅ Adaptation à l'industrie
- ✅ Questions personnalisées

### Niveau 2 : Fallback Python (si naturalPrompts absent)

**Fichier :** `agent/utils/question_generator.py`

Transformation intelligente par pattern matching :

```python
description = "Opportunités B2B/B2C (taille du projet, budget)"
↓
Pattern détecté : r'opportunit[ée]s?'
↓
Question générée : "Tu as eu des belles opportunités ?"
```

**Avantages :**
- ✅ Fonctionne même sans naturalPrompts
- ✅ Garantit toujours des questions naturelles
- ✅ Patterns couvrant la plupart des cas

## Patterns supportés

| Catégorie | Patterns | Exemples de questions |
|-----------|----------|----------------------|
| **Ventes** | `produits? vendus?`, `ventes?` | "Qu'est-ce que tu as vendu ?", "Ça a bien marché ?" |
| **Opportunités** | `opportunit[ée]s?`, `prospects?` | "Tu as eu des belles opportunités ?", "T'as détecté des gros coups ?" |
| **Retours clients** | `retours? clients?`, `feedback` | "Les clients ont dit quoi ?", "T'as eu des retours intéressants ?" |
| **Concurrence** | `concurren(ce|t)` | "T'as croisé la concurrence ?", "Qui est en place chez tes clients ?" |
| **Problèmes** | `probl[èe]mes?`, `difficult[ée]s?` | "Tout s'est bien passé ?", "T'as eu des galères ?" |
| **Profil clients** | `profils? clients?`, `types? clients?` | "T'as rencontré quel type de clients ?", "C'était qui tes rendez-vous ?" |
| **Prix/Budget** | `prix`, `tarifs?`, `budget` | "On t'a parlé budget ?", "Des questions sur les prix ?" |
| **Événements** | `[ée]v[èe]nements?`, `animations?` | "T'as fait un événement ?", "T'as animé quelque chose ?" |
| **Stock** | `stocks?`, `livraisons?` | "T'as besoin de réassort ?", "Des livraisons à prévoir ?" |
| **Suivi** | `suivi`, `relance` | "Qui faut-il recontacter ?", "T'as des clients à rappeler ?" |

## Exemples de transformation

### Exemple 1 : EcoMobility Solutions

**Point d'attention :**
> "Détail des opportunités B2B/B2C (taille du projet, budget, délai de décision)"

**Transformation :**
1. **Claude (si configuré) :**
   ```
   "Tu as eu des belles opportunités aujourd'hui ?"
   ```

2. **Fallback Python :**
   ```
   Pattern : r'opportunit[ée]s?'
   → "Tu as eu des belles opportunités ?"
   ```

**Avant (V2.0) :**
```
❌ "Parle-moi de détail des opportunités B2B/B2C (taille du projet, budget, délai de décision)"
```

### Exemple 2 : Retours clients

**Point d'attention :**
> "Retours clients et niveau de satisfaction"

**Transformation :**
```
Pattern : r'retours? clients?'
→ "Les clients ont dit quoi ?"
```

**Avant :**
```
❌ "Parle-moi de retours clients et niveau de satisfaction"
```

### Exemple 3 : Problèmes techniques

**Point d'attention :**
> "Problèmes techniques ou incidents rencontrés"

**Transformation :**
```
Pattern : r'probl[èe]mes?'
→ "Tout s'est bien passé ?"
```

**Avant :**
```
❌ "Parle-moi de problèmes techniques ou incidents rencontrés"
```

## Instructions pour Claude

Le prompt de génération inclut maintenant des directives très claires :

```
**IMPORTANT pour les naturalPrompts :**
- Les questions doivent être ORALES, naturelles, comme si tu parlais à un collègue
- Utilise le tutoiement et un ton chaleureux
- Évite les formulations trop techniques ou formelles
- Personnalise avec le contexte métier
- Les questions doivent être courtes (10-15 mots max)

**Exemples de MAUVAISES questions :**
❌ "Parle-moi de détail des opportunités B2B/B2C"
❌ "Décris le profil des clients rencontrés"
❌ "Quels sont les problèmes techniques rencontrés"

**Exemples de BONNES questions :**
✅ "Tu as eu des belles opportunités aujourd'hui ?"
✅ "T'as rencontré quel type de clients ?"
✅ "Tout s'est bien passé au niveau matos ?"
```

## Critères d'une bonne question orale

### ✅ DO : Questions naturelles

| Critère | Exemple |
|---------|---------|
| **Tutoiement** | "Tu as eu..." au lieu de "Vous avez eu..." |
| **Contractions** | "T'as" au lieu de "Tu as" |
| **Ton chaleureux** | "Des belles opportunités" au lieu de "Des opportunités" |
| **Courte** | 10-15 mots maximum |
| **Contexte métier** | "Au niveau matos" pour un commercial terrain |
| **Orale** | "Ça a donné quoi ?" au lieu de "Quels résultats ?" |

### ❌ DON'T : Questions à éviter

| Problème | Exemple à éviter |
|----------|------------------|
| **Trop formelle** | "Pourriez-vous me décrire..." |
| **Trop technique** | "Analyse des KPIs de conversion..." |
| **Trop longue** | Questions de plus de 20 mots |
| **Vouvoiement** | "Vous avez..." |
| **Répétition description** | "Parle-moi de [description exacte]" |
| **Jargon** | "ROI", "pipeline", "forecast" sans contexte |

## Tests et validation

### Test automatique

```bash
cd agent
python3 utils/question_generator.py
```

**Résultat attendu :**
```
📋 Point d'attention : "Opportunités B2B/B2C (taille du projet, budget)"
❓ Question générée : "Tu as eu des belles opportunités ?"

📋 Point d'attention : "Retours clients et satisfaction"
❓ Question générée : "Les clients ont dit quoi ?"
```

### Test avec projet réel

1. Créer un projet avec description riche
2. Vérifier les `naturalPrompts` générés par Claude
3. Si absents, vérifier le fallback Python

### Critères de qualité

Une question est considérée comme bonne si :

- [ ] Maximum 15 mots
- [ ] Utilise le tutoiement
- [ ] Ton chaleureux et naturel
- [ ] Pas de jargon technique non expliqué
- [ ] Adaptée au contexte métier
- [ ] Prononcable facilement à l'oral

## Configuration

### Ajouter un nouveau pattern

**Fichier :** `agent/utils/question_generator.py`

```python
patterns = [
    # ...
    # Votre nouveau pattern
    (r'votre_regex', [
        "Première variante de question ?",
        "Deuxième variante ?"
    ]),
]
```

### Personnaliser les exemples pour Claude

**Fichier :** `services/claudeProjectAnalyzer.ts` ligne 112-120

```typescript
**Exemples de BONNES questions :**
✅ "Votre exemple 1"
✅ "Votre exemple 2"
```

## Impact sur l'expérience

### Avant (V2.0)

```
Agent: Salut Fabrice ! Parle-moi de détail des opportunités B2B/B2C (taille du projet, budget, délai de décision)
User: Euh... quoi ? Répète ?
```

❌ Question trop longue, trop technique, pas naturelle

### Maintenant (V2.1)

```
Agent: Salut Fabrice ! Tu as eu des belles opportunités aujourd'hui ?
User: Ouais ! J'ai rencontré la DRH d'une boîte de 500 personnes, elle veut équiper toute l'équipe !
```

✅ Question courte, naturelle, engageante

## Monitoring

### Logs de génération

```
📊 Will ask up to 5 questions (3 base + 2 follow-ups)
[Question 1] Using naturalPrompt: "Tu as eu des belles opportunités ?"
[Question 2] Fallback to generator: "Les clients ont dit quoi ?"
```

### Métriques à suivre

- % de projets avec `naturalPrompts` générés par Claude
- % d'utilisation du fallback Python
- Feedback utilisateurs sur la qualité des questions

## Améliorations futures

### Court terme
- [ ] Ajouter plus de patterns (industrie-specific)
- [ ] Support de variantes (formelle/informelle)
- [ ] Randomisation des variantes

### Moyen terme
- [ ] Apprentissage automatique des patterns
- [ ] Adaptation selon l'heure (matin/soir)
- [ ] Personnalisation par commercial

### Long terme
- [ ] IA temps réel pour adapter selon le contexte
- [ ] Analyse de sentiment pour ajuster le ton
- [ ] A/B testing des formulations

## Résumé

Le système de génération de questions naturelles transforme :

**❌ AVANT :** Questions trop littérales et formelles
```
"Parle-moi de détail des opportunités B2B/B2C (taille du projet, budget, délai de décision)"
```

**✅ MAINTENANT :** Questions naturelles et orales
```
"Tu as eu des belles opportunités aujourd'hui ?"
```

**→ Résultat :** Conversations plus naturelles, engagement accru, meilleure expérience utilisateur

---

**Version :** V2.1
**Fichiers :**
- `services/claudeProjectAnalyzer.ts` - Génération par Claude
- `agent/utils/question_generator.py` - Fallback intelligent
- `agent/mainV2.py` - Intégration
