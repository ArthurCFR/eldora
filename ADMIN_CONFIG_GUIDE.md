# Guide de Configuration Admin - Voyaltis

## Vue d'ensemble

La page Admin permet de configurer finement le comportement conversationnel de l'assistant vocal. Elle est maintenant simplifiée et focalisée sur l'essentiel.

## Accès

L'interface admin est disponible dans `/app/admin.tsx`. Le manager peut y accéder pour personnaliser l'expérience conversationnelle.

## Fonctionnalités

### 1. Ton de l'assistant

4 styles de conversation disponibles :

- **👥 Collègue sympa** : Décontracté, chaleureux et empathique
- **💼 Professionnel chaleureux** : Respectueux mais bienveillant
- **🎯 Coach motivant** : Encourageant et énergique
- **😊 Décontracté** : Informel et sans pression

Le ton sélectionné influence automatiquement :
- Le vocabulaire utilisé
- Le niveau de formalité (tutoiement/vouvoiement)
- Les expressions et encouragements
- L'énergie de la conversation

### 2. Points d'attention spécifiques

Remplace l'ancienne section "Informations à collecter".

**Caractéristiques** :
- Pas de nom de champ technique visible (géré automatiquement en arrière-plan)
- Simple description en français de ce qu'on veut savoir
- Questions naturelles optionnelles pour guider la conversation
- Numérotation automatique pour l'ordre

**Par défaut** :
1. "Produits vendus avec quantités"
2. "Retours clients"

### 3. Ajout de points d'attention

Bouton vert **"Ajouter un point d'attention"** qui ouvre un modal avec :

#### Points courants prédéfinis
Liste de 12 points fréquemment utilisés :
- Produits vendus avec quantités
- Retours clients
- Ambiance générale de l'événement
- Demandes spécifiques des clients
- Produits en rupture de stock
- Comparaisons avec la concurrence
- Questions fréquentes des clients
- Profil des visiteurs (âge, secteur)
- Difficultés rencontrées
- Best practices identifiées
- Opportunités commerciales
- Durée de la présence sur le stand

#### Point personnalisé
Le manager peut créer son propre point d'attention avec :
- Description libre (ex: "Niveau de satisfaction des visiteurs")
- Questions naturelles optionnelles (une par ligne)

**Exemple** :
```
Point : "Produits demandés mais non disponibles"
Questions :
- Y a-t-il eu des demandes pour des produits qu'on n'avait pas ?
- Des clients cherchaient des articles spécifiques ?
```

## Sauvegarde

Bouton vert **"Sauvegarder la configuration"** en bas de page.
- Stockage local (AsyncStorage)
- Confirmation visuelle après sauvegarde
- La configuration s'applique immédiatement aux nouvelles conversations

## Impact sur les conversations

### Prompt système
Le prompt système de l'assistant est généré dynamiquement à partir de :
- Le ton choisi (définit la personnalité)
- Les points d'attention (guident les sujets à couvrir)

### Questions d'ouverture
Si des questions naturelles sont définies pour le premier point, l'assistant les utilise pour démarrer la conversation.

### Suivi conversationnel
L'assistant suit l'état de chaque point d'attention :
- ✓ Couvert : Information collectée
- ✗ À couvrir : Information manquante

Il adapte ses questions pour couvrir tous les points de manière fluide.

## Architecture technique

### Nouvelle structure de données

```typescript
interface AttentionPoint {
  id: string;              // Généré automatiquement (ex: "produits_vendus_1234_abc")
  description: string;     // "Produits vendus avec quantités"
  naturalPrompts?: string[]; // Questions optionnelles
  priority: 'high' | 'medium' | 'low';
}

interface AssistantConfig {
  conversationStyle: 'friendly_colleague' | 'professional_warm' | 'coach_motivating' | 'casual_relaxed';
  attentionPoints: AttentionPoint[];
}
```

### Simplifications
- ❌ Supprimé : `outputFormat` (n'était pas utilisé efficacement)
- ❌ Supprimé : `field` technique visible (inutile pour le manager)
- ✅ Ajouté : Modal d'ajout avec suggestions
- ✅ Ajouté : Interface moderne avec GlassContainer
- ✅ Ajouté : Validation et feedback utilisateur

## Best Practices

### Pour les managers

1. **Ton** : Choisir selon la culture d'entreprise
   - Startup/jeunes équipes → "Collègue sympa" ou "Décontracté"
   - Entreprise corporate → "Professionnel chaleureux"
   - Équipe commerciale → "Coach motivant"

2. **Points d'attention** :
   - Maximum 5-6 points pour une conversation fluide
   - Commencer par les points essentiels (ventes, retours)
   - Ajouter des points spécifiques selon les besoins métier

3. **Questions naturelles** :
   - Optionnelles mais recommandées pour le premier point
   - Utiliser un langage simple et ouvert
   - Varier les formulations pour plus de naturel

### Exemples de configuration

#### Configuration Startup Tech
```
Ton: Collègue sympa
Points:
1. Produits vendus avec quantités
2. Retours clients
3. Comparaisons avec la concurrence
4. Opportunités commerciales
```

#### Configuration Corporate
```
Ton: Professionnel chaleureux
Points:
1. Produits vendus avec quantités
2. Profil des visiteurs (âge, secteur)
3. Retours clients
4. Best practices identifiées
5. Durée de la présence sur le stand
```

#### Configuration Retail
```
Ton: Coach motivant
Points:
1. Produits vendus avec quantités
2. Ambiance générale de l'événement
3. Questions fréquentes des clients
4. Produits en rupture de stock
5. Difficultés rencontrées
```

## Migration depuis l'ancienne config

Si vous aviez une ancienne configuration avec `requiredFields` :
- Elle est automatiquement convertie en `attentionPoints`
- Aucune action requise
- La fonction `attentionPointsToRequiredFields()` assure la compatibilité

## Support

Pour toute question sur la configuration :
1. Consulter ce guide
2. Tester différentes configurations
3. Observer l'impact sur les conversations réelles
4. Ajuster selon les retours des commerciaux