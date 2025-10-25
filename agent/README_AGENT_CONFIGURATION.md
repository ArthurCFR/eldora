# 🎯 Agent Configuration Guide - Version Générique

## 📋 Vue d'ensemble

L'agent Voyaltis a été **complètement refactoré** pour être **100% générique** et facilement adaptable à n'importe quel client.

**Changement majeur** : Plus AUCUNE référence hardcodée à Samsung dans le code. Toutes les spécificités client sont maintenant dans **2 fichiers de configuration uniquement**.

---

## 🔑 Configuration Client : Un Seul Fichier à Modifier

### 📁 Fichier Principal : `config/client_config.json`

Ce fichier contient **TOUTES** les spécificités de votre client.

```json
{
  "client": {
    "name": "Samsung",
    "brand_name": "Samsung",
    "industry": "Électronique grand public",
    "language": "fr",
    "context": "ventes de produits électroniques Samsung sur des événements et salons"
  },
  "conversation": {
    "objective": "Collecter des informations sur la journée de travail et les ventes",
    "opening_context": "journée sur le stand Samsung",
    "report_type": "rapport de vente événementiel",
    "tone": "professionnel mais chaleureux",
    "brand_specific_prompts": [
      "RÈGLE D'OR PRODUITS : Si l'utilisateur dit 'frigo', 'télé', 'montre', etc.,",
      "tu SAIS automatiquement de quel produit il parle (il n'y en a qu'UN seul par catégorie).",
      "NE DEMANDE JAMAIS 'quel modèle' pour ces catégories uniques !"
    ]
  },
  "products_context": {
    "brand_mentions": ["Samsung", "Galaxy"],
    "brand_mention_bonus_points": 3,
    "unique_category": true,
    "description": "Chaque catégorie de produit n'a qu'UN SEUL modèle disponible"
  }
}
```

#### 🔧 Explication des champs

| Section | Champ | Description | Exemple |
|---------|-------|-------------|---------|
| **client** | `name` | Nom complet du client | `"Samsung"` |
| | `brand_name` | Nom de marque à utiliser dans les prompts | `"Samsung"` |
| | `industry` | Secteur d'activité | `"Électronique grand public"` |
| | `language` | Langue de l'agent | `"fr"` |
| | `context` | Contexte des conversations | `"ventes de produits électroniques Samsung"` |
| **conversation** | `objective` | Objectif de la conversation | `"Collecter des informations..."` |
| | `opening_context` | Contexte pour message d'ouverture | `"journée sur le stand Samsung"` |
| | `report_type` | Type de rapport généré | `"rapport de vente événementiel"` |
| | `tone` | Ton de la conversation | `"professionnel mais chaleureux"` |
| | `brand_specific_prompts` | **Instructions spécifiques** à la marque | `["RÈGLE D'OR...", ...]` |
| **products_context** | `brand_mentions` | Mots-clés de marque pour bonus | `["Samsung", "Galaxy"]` |
| | `brand_mention_bonus_points` | Points bonus pour mentions marque | `3` |
| | `unique_category` | Une catégorie = un produit ? | `true` |
| | `description` | Description du contexte produits | `"Chaque catégorie..."` |

---

### 📦 Fichier Produits : `config/products.json`

Ce fichier contient la liste complète des produits avec leurs **keywords** pour le fuzzy matching.

```json
{
  "products": [
    {
      "name": "Samsung Galaxy Z Nova",
      "display_name": "Samsung Galaxy Z Nova",
      "category": "Smartphone",
      "price": 1299.99,
      "availability": "En stock",
      "description": "Smartphone pliable avec écran AMOLED 7.2 pouces",
      "keywords": ["smartphone", "téléphone", "phone", "mobile", "galaxy"],
      "synonyms": ["portable", "téléphone", "smartphone"],
      "target_quantity": 4
    },
    ...
  ]
}
```

#### 🔧 Structure d'un produit

| Champ | Requis | Description |
|-------|--------|-------------|
| `name` | ✅ | Nom interne unique du produit |
| `display_name` | ✅ | Nom affiché dans les rapports |
| `category` | ✅ | Catégorie du produit |
| `price` | ❌ | Prix du produit (optionnel) |
| `availability` | ❌ | Disponibilité (optionnel) |
| `description` | ❌ | Description détaillée (optionnel) |
| **`keywords`** | ✅ | **CRITIQUE** : Mots-clés pour le fuzzy matching |
| `synonyms` | ❌ | Synonymes courants (optionnel) |
| `target_quantity` | ✅ | Objectif de vente |

---

## 🚀 Comment Changer de Client en 5 Minutes

### Exemple : Passer de Samsung à Apple Store

#### 1️⃣ Modifier `config/client_config.json`

```json
{
  "client": {
    "name": "Apple Store",
    "brand_name": "Apple",
    "industry": "Électronique et technologie",
    "language": "fr",
    "context": "ventes de produits Apple en Apple Store"
  },
  "conversation": {
    "objective": "Collecter des informations sur la journée de vente en Apple Store",
    "opening_context": "journée à l'Apple Store",
    "report_type": "rapport de vente Apple Store",
    "tone": "professionnel et moderne",
    "brand_specific_prompts": [
      "PRODUITS APPLE : iPhone, iPad, Mac, Apple Watch, AirPods",
      "Si l'utilisateur dit 'un iPhone', demande TOUJOURS le modèle (iPhone 15, 15 Pro, etc.)"
    ]
  },
  "products_context": {
    "brand_mentions": ["Apple", "iPhone", "iPad", "Mac"],
    "brand_mention_bonus_points": 5,
    "unique_category": false,
    "description": "Plusieurs modèles par catégorie de produit"
  }
}
```

#### 2️⃣ Modifier `config/products.json`

```json
{
  "products": [
    {
      "name": "iPhone 15 Pro",
      "display_name": "iPhone 15 Pro",
      "category": "Smartphone",
      "price": 1229.00,
      "keywords": ["iphone", "15 pro", "smartphone", "téléphone", "mobile"],
      "target_quantity": 10
    },
    {
      "name": "iPhone 15",
      "display_name": "iPhone 15",
      "category": "Smartphone",
      "price": 969.00,
      "keywords": ["iphone", "15", "smartphone", "téléphone"],
      "target_quantity": 15
    },
    {
      "name": "MacBook Air M3",
      "display_name": "MacBook Air M3",
      "category": "Ordinateur portable",
      "price": 1299.00,
      "keywords": ["macbook", "mac", "air", "m3", "ordinateur", "laptop"],
      "target_quantity": 5
    }
  ]
}
```

#### 3️⃣ C'est tout ! 🎉

Relancez l'agent :
```bash
npm run agent
```

---

## 🏗️ Architecture Refactorée

### Ancien système (hardcodé Samsung)

```
❌ AVANT : Références Samsung partout
├── conversational_engine.py     → "Samsung Galaxy Z Nova" hardcodé
├── sales_analyzer.py            → Keywords Samsung hardcodés
├── prompt_builder.py            → "vente Samsung" hardcodé
└── main.py                      → Logique Samsung
```

### Nouveau système (100% générique)

```
✅ APRÈS : Système de configuration centralisé
├── config/
│   ├── client_config.json       ← 🔑 CONFIGURATION CLIENT
│   └── products.json             ← 📦 LISTE DES PRODUITS
│
├── utils/
│   └── config_loader.py         ← Charge les 2 configs
│
├── conversational_engine.py     ← Générique (utilise config_loader)
├── sales_analyzer.py            ← Générique (utilise config_loader)
├── prompt_builder.py            ← Générique (utilise config_loader)
└── main.py                      ← Générique (utilise config_loader)
```

---

## 📊 Fichiers Modifiés (Refactoring Complet)

| Fichier | Changements | Status |
|---------|-------------|--------|
| `config/client_config.json` | **NOUVEAU** : Configuration client centralisée | ✅ Créé |
| `config/products.json` | Unifié (ancien `produits.json` supprimé) | ✅ Unifié |
| `utils/config_loader.py` | Charge config client + produits | ✅ Refactoré |
| `conversational_engine.py` | Supprimé `_get_samsung_products_context()` | ✅ Générique |
| `sales_analyzer.py` | Keywords dynamiques depuis config | ✅ Générique |
| `prompt_builder.py` | Textes dynamiques depuis config | ✅ Générique |
| `main.py` | Utilise `config_loader` partout | ✅ Refactoré |
| `produits.json` (racine) | Supprimé (dupliqué) | ✅ Supprimé |

---

## ⚙️ API ConfigLoader

Le `ConfigLoader` expose ces méthodes pour accéder à la configuration :

### Méthodes Client
```python
config_loader.get_brand_name()                    # "Samsung"
config_loader.get_conversation_objective()        # "Collecter des informations..."
config_loader.get_opening_context()               # "journée sur le stand Samsung"
config_loader.get_brand_specific_prompts()        # ["RÈGLE D'OR...", ...]
config_loader.get_brand_mentions()                # ["Samsung", "Galaxy"]
config_loader.get_brand_mention_bonus()           # 3
config_loader.get_products_context_description()  # "Chaque catégorie..."
```

### Méthodes Produits
```python
config_loader.get_products_count()                # 10
config_loader.get_products_list_for_prompt()      # Formatted list
config_loader.get_empty_sales_dict()              # {"Product 1": 0, ...}
config_loader.get_mapping_examples()              # Exemples de mapping
config_loader.get_product_names_list()            # ["Product 1", "Product 2", ...]
config_loader.get_products_for_analyzer()         # Format pour SalesAnalyzer
```

---

## 🧪 Test de Validation

Testez que l'agent charge correctement la configuration :

```bash
cd agent
python -c "
from utils.config_loader import ConfigLoader
cl = ConfigLoader()
print('✅ Brand:', cl.get_brand_name())
print('✅ Products:', cl.get_products_count())
print('✅ Config loaded successfully!')
"
```

---

## 🎨 Exemples de Configurations Client

### Exemple 1 : Boutique de mode

```json
{
  "client": {
    "name": "Zara France",
    "brand_name": "Zara",
    "industry": "Mode et habillement",
    "context": "ventes de vêtements Zara en boutique"
  },
  "conversation": {
    "objective": "Collecter les ventes et retours clients de la journée",
    "brand_specific_prompts": [
      "Pour les vêtements, demande toujours la taille et la couleur",
      "Les clients parlent souvent de 'pantalon', 'robe', 'chemise'"
    ]
  }
}
```

### Exemple 2 : Pharmacie

```json
{
  "client": {
    "name": "Pharmacie Centrale",
    "brand_name": "Pharmacie Centrale",
    "industry": "Santé et pharmacie",
    "context": "ventes de produits pharmaceutiques et parapharmaceutiques"
  },
  "conversation": {
    "objective": "Collecter les ventes et demandes clients de la journée",
    "tone": "professionnel et bienveillant",
    "brand_specific_prompts": [
      "Les clients utilisent souvent les noms génériques (doliprane, vitamine C, etc.)",
      "Sois attentif aux demandes de conseils (à noter dans le rapport)"
    ]
  }
}
```

---

## 🔒 Sécurité et Bonnes Pratiques

1. **Ne jamais commit de données sensibles** dans `products.json` (prix réels, marges, etc.)
2. **Toujours tester** après avoir modifié la configuration
3. **Backup** de `config/` avant modifications majeures
4. **Versionner** les configurations client séparément si multi-clients

---

## 📞 Support

En cas de problème :
1. Vérifier que `config/client_config.json` et `config/products.json` existent
2. Valider le JSON avec un validateur en ligne
3. Vérifier les logs de l'agent au démarrage
4. Tester avec `python -c` comme montré plus haut

---

**✨ Votre agent est maintenant 100% générique et prêt pour n'importe quel client !**
