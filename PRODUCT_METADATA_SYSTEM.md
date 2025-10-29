# Système de Métadonnées Produits

## Vue d'ensemble

Le système de métadonnées produits améliore l'intelligence de la génération de tableaux en capturant **toutes** les informations des fichiers Excel, tout en permettant une sélection intelligente des colonnes à afficher dans les rapports.

## Architecture

### 1. Flux de données

```
Excel Upload
     ↓
Parsing (excelParser.ts)
     ↓
Analyse des champs (productFieldAnalyzer.ts)
     ↓
Enrichissement IA (server.js /analyze-product-fields)
     ↓
Génération structure (tableStructureGenerator.ts)
     ↓
Stockage dans Project.reportTemplate.tableStructure
```

### 2. Structure de données

#### ProductFieldMetadata
```typescript
{
  fieldName: string;        // Nom original du champ Excel
  displayName: string;      // Nom formaté pour affichage
  type: 'text' | 'number' | 'currency' | 'percentage' | 'date';
  description?: string;     // Description contextuelle (générée par IA)
  sampleValues?: any[];     // Exemples de valeurs
}
```

#### TableStructure (amélioré)
```typescript
{
  columns: TableColumn[];              // Colonnes AFFICHÉES dans le rapport (max 5)
  description: string;                 // Description du tableau
  availableFields?: ProductFieldMetadata[];  // TOUS les champs Excel
  fieldMapping?: { [columnId: string]: string };  // Mapping colonne → champ Excel
}
```

## Fonctionnalités

### 1. Capture complète des données Excel

**Avant :**
- Seules les colonnes standard étaient utilisées (nom, catégorie, objectif)
- Les autres champs (prix, caractéristiques, etc.) étaient ignorés

**Maintenant :**
- **Toutes** les colonnes de l'Excel sont capturées et stockées
- Chaque champ est analysé pour déterminer son type (nombre, texte, devise, etc.)
- Des exemples de valeurs sont conservés pour contexte

### 2. Distinction affichage vs disponibilité

**Colonnes affichées (`columns`):**
- Maximum 5 colonnes pour la lisibilité du rapport
- Sélectionnées par l'IA en fonction du contexte métier
- Exemple : Produit, Quantité vendue, Objectif, Score

**Champs disponibles (`availableFields`):**
- **Tous** les champs de l'Excel
- Disponibles pour l'agent conversationnel
- Utilisés pour des réponses contextuelles

### 3. Enrichissement par IA

L'endpoint `/api/analyze-product-fields` génère des descriptions intelligentes pour chaque champ :

**Exemple :**
```json
{
  "fieldName": "Prix (€)",
  "displayName": "Prix",
  "type": "currency",
  "description": "Prix de vente conseillé en euros",
  "sampleValues": [1299, 899, 449]
}
```

### 4. Utilisation dans l'agent

L'agent Python (`config_loader.py`) affiche maintenant **tous** les champs dans le prompt Claude :

```
1. Samsung Galaxy Z Nova (Smartphone)
   - Mots-clés : smartphone, téléphone, mobile...
   - Objectif : 4 unités
   - Prix : 1299€
   - Caractéristiques : 5G, Écran pliable, 256GB
   - Garantie : 2 ans
   - [... tous les autres champs ...]
```

## Cas d'usage

### Exemple 1 : Tableau de ventes avec prix

**Excel fourni :**
```
Nom | Catégorie | Prix (€) | Objectif | Caractéristiques | Garantie
```

**Résultat :**
- **Colonnes affichées** : Produit, Quantité vendue, Objectif, Taux de réussite
- **Champs disponibles** : Tous (Prix, Caractéristiques, Garantie)

**Avantage :**
Quand un utilisateur dit "Quel est le prix du produit X ?", l'agent peut répondre avec le prix exact, même si la colonne Prix n'est pas affichée dans le tableau.

### Exemple 2 : Support client avec caractéristiques

**Excel fourni :**
```
Produit | Prix | Garantie | SAV | Fiche technique | Code EAN
```

**Résultat :**
- **Colonnes affichées** : Produit, Ventes, Prix, Score
- **Champs disponibles** : Tous (Garantie, SAV, Fiche technique, Code EAN)

**Avantage :**
L'agent peut répondre à des questions sur la garantie ou le SAV, enrichissant l'expérience conversationnelle.

## API Endpoints

### POST /api/analyze-product-fields

Enrichit les métadonnées de champs avec des descriptions IA.

**Request :**
```json
{
  "fields": [
    {
      "fieldName": "Prix (€)",
      "displayName": "Prix",
      "type": "currency",
      "sampleValues": [1299, 899, 449]
    }
  ],
  "projectContext": {
    "name": "Samsung Store",
    "description": "...",
    "industry": "electronics"
  }
}
```

**Response :**
```json
{
  "fields": [
    {
      "fieldName": "Prix (€)",
      "displayName": "Prix",
      "type": "currency",
      "description": "Prix de vente conseillé en euros pour chaque produit Samsung",
      "sampleValues": [1299, 899, 449]
    }
  ]
}
```

### POST /api/generate-table-structure

Génère la structure de tableau en tenant compte de tous les champs.

**Request (mis à jour) :**
```json
{
  "projectContext": { ... },
  "products": [ ... ],
  "fieldMetadata": [ ... ]  // Nouveau : métadonnées enrichies
}
```

**Response :**
```json
{
  "description": "Suivi des ventes par produit",
  "columns": [ ... ],  // 4-5 colonnes pour affichage
  "availableFields": [ ... ],  // Tous les champs Excel
  "fieldMapping": {
    "product_name": "Nom",
    "price": "Prix (€)"
  }
}
```

## Services

### productFieldAnalyzer.ts

**Fonctions principales :**

1. `analyzeProductFields(products)`
   - Analyse tous les champs d'un tableau de produits
   - Infère automatiquement les types
   - Génère des noms d'affichage
   - Collecte des exemples de valeurs

2. `enrichFieldMetadataWithAI(metadata, projectContext)`
   - Appelle l'API serveur pour enrichir avec IA
   - Ajoute des descriptions contextuelles
   - Fallback gracieux si l'IA échoue

### tableStructureGenerator.ts

**Flux amélioré :**

1. Analyser les champs des produits
2. Enrichir avec IA (descriptions)
3. Générer la structure (sélection intelligente des colonnes à afficher)
4. Ajouter `availableFields` au résultat

## Migration

### Pour les projets existants

Les projets créés avant cette amélioration continueront de fonctionner, mais sans les métadonnées enrichies. Pour bénéficier du nouveau système :

1. Re-charger le fichier Excel dans le projet
2. Re-générer la structure de tableau

### Compatibilité

Le système est entièrement rétro-compatible :
- Si `availableFields` est absent, seules les colonnes affichées sont utilisées
- Si `fieldMapping` est absent, les IDs de colonnes sont utilisés directement
- L'agent Python affiche tous les champs disponibles dans le produit

## Bénéfices

1. **Intelligence contextuelle** : L'IA connaît tous les détails des produits
2. **Rapports optimisés** : Seules les métriques pertinentes sont affichées
3. **Expérience enrichie** : L'agent peut répondre à des questions sur tous les attributs
4. **Flexibilité** : Ajout facile de nouveaux champs sans modification de code
5. **Scalabilité** : Supporte des catalogues avec des dizaines de colonnes

## Exemple complet

### Excel uploadé
```
Nom           | Catégorie | Prix (€) | Objectif | Garantie | Fiche Technique
Galaxy Z Nova | Phone     | 1299     | 4        | 2 ans    | 5G, 256GB
QLED Vision   | TV        | 2499     | 2        | 3 ans    | 8K, 65"
```

### Structure générée
```json
{
  "description": "Suivi des ventes Samsung",
  "columns": [
    { "id": "product_name", "label": "Produit", ... },
    { "id": "quantity_sold", "label": "Vendu", ... },
    { "id": "target_quantity", "label": "Objectif", ... },
    { "id": "success_rate", "label": "Score", ... }
  ],
  "availableFields": [
    { "fieldName": "Nom", "displayName": "Nom", "type": "text", ... },
    { "fieldName": "Prix (€)", "displayName": "Prix", "type": "currency",
      "description": "Prix de vente conseillé", "sampleValues": [1299, 2499] },
    { "fieldName": "Garantie", "displayName": "Garantie", "type": "text",
      "description": "Durée de garantie produit", "sampleValues": ["2 ans", "3 ans"] },
    { "fieldName": "Fiche Technique", "displayName": "Fiche Technique", "type": "text",
      "description": "Caractéristiques techniques principales", ... }
  ]
}
```

### Prompt généré pour l'agent
```
1. Galaxy Z Nova (Phone)
   - Mots-clés : phone, smartphone...
   - Objectif : 4
   - Prix (€) : 1299
   - Garantie : 2 ans
   - Fiche Technique : 5G, 256GB

2. QLED Vision (TV)
   - Mots-clés : tv, télévision...
   - Objectif : 2
   - Prix (€) : 2499
   - Garantie : 3 ans
   - Fiche Technique : 8K, 65"
```

### Capacités conversationnelles
- "Quel est le prix du Galaxy Z Nova ?" → "Le prix est de 1299€"
- "Quelle garantie a le QLED Vision ?" → "Il a une garantie de 3 ans"
- "Quelles sont les caractéristiques techniques ?" → "8K, écran 65 pouces"

Tout cela **sans afficher ces colonnes dans le rapport** !
