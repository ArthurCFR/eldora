# 🔧 Configuration Dynamique - Voyaltis Agent

## 📋 Aperçu

L'agent Voyaltis utilise maintenant un système de configuration dynamique basé sur JSON pour gérer les produits Samsung, éliminant le besoin de modifier le code pour ajouter ou modifier des produits.

## 🏗️ Architecture

```
agent/
├── config/
│   └── products.json          # Configuration des produits
├── utils/
│   ├── __init__.py
│   ├── config_loader.py       # Chargement de la config JSON
│   └── prompt_builder.py      # Génération dynamique du prompt
├── tests/
│   ├── __init__.py
│   └── test_config_loader.py  # Tests unitaires
└── main.py                     # Agent principal (utilise la config dynamique)
```

## 🎯 Avantages

### Avant (Hardcodé)
```python
# ❌ 170 lignes de prompt hardcodé dans main.py
content = """
1. Samsung Galaxy Z Nova (Smartphone)
   - Mots-clés : smartphone, téléphone...
2. Samsung QLED Vision 8K (Téléviseur)
   ...
"""
```

### Après (Dynamique)
```python
# ✅ Configuration chargée depuis JSON
config_loader = ConfigLoader("config/products.json")
prompt_builder = PromptBuilder(config_loader)
prompt = prompt_builder.build_claude_extraction_prompt(...)
```

## 📝 Fichier products.json

### Structure
```json
{
  "products": [
    {
      "name": "Samsung Galaxy Z Nova",
      "display_name": "Samsung Galaxy Z Nova",
      "category": "Smartphone",
      "keywords": ["smartphone", "téléphone", "mobile", ...],
      "synonyms": ["portable", "téléphone", "smartphone"],
      "target_quantity": 4
    },
    ...
  ]
}
```

### Champs requis
- **name**: Nom technique du produit
- **display_name**: Nom affiché dans les rapports
- **category**: Catégorie du produit (Smartphone, Téléviseur, etc.)
- **keywords**: Liste de mots-clés pour la reconnaissance vocale
- **synonyms**: Synonymes utilisés dans les exemples de mapping
- **target_quantity**: Objectif de vente

## 🔧 Utilisation

### Ajouter un nouveau produit

1. Ouvrir `agent/config/products.json`
2. Ajouter un nouvel objet dans le tableau `products`:

```json
{
  "name": "Samsung Galaxy Buds Pro",
  "display_name": "Samsung Galaxy Buds Pro",
  "category": "Écouteurs",
  "keywords": ["écouteurs", "buds", "oreillettes", "airpods", "audio"],
  "synonyms": ["écouteurs", "buds"],
  "target_quantity": 3
}
```

3. Relancer l'agent - la nouvelle configuration est chargée automatiquement !

### Modifier un produit existant

1. Trouver le produit dans `products.json`
2. Modifier les champs souhaités (nom, keywords, target, etc.)
3. Sauvegarder et relancer l'agent

### Supprimer un produit

1. Retirer l'objet du tableau `products` dans `products.json`
2. Relancer l'agent

## 🧪 Tests

Exécuter les tests unitaires pour valider la configuration :

```bash
cd agent
python tests/test_config_loader.py
```

### Sortie attendue
```
======================================================================
🚀 Running Voyaltis Agent Config Tests
======================================================================

🧪 Testing products.json structure...
✅ Test 1 passed: JSON has 'products' key with 10 items
✅ Test 2 passed: All products have required fields
✅ Test 3 passed: All products have keywords

🧪 Testing ConfigLoader...
✅ Loaded 10 products from config/products.json
✅ Test 1 passed: Loaded 10 products
...

======================================================================
🎉 All tests passed!
======================================================================
```

## 🔍 Logs de démarrage

Lors du démarrage de l'agent, vous verrez :

```
🚀 Starting agent for room: voyaltis-room
✅ Loaded 10 products from config/products.json
🔌 Connected to LiveKit room
...
```

Et lors de la génération du rapport :

```
📊 Analyzing conversation to generate report...
📝 Generated dynamic prompt (7536 chars)
✅ Extracted data validated: 10 products
```

## 📊 Modules

### ConfigLoader (`utils/config_loader.py`)
Charge et parse le fichier `products.json`.

**Méthodes principales:**
- `get_products_count()` - Nombre de produits
- `get_products_list_for_prompt()` - Liste formatée pour le prompt
- `get_empty_sales_dict()` - Dictionnaire vide pour le JSON de réponse
- `get_mapping_examples()` - Exemples de mapping pour Claude
- `get_product_names_list()` - Liste des noms de produits

### PromptBuilder (`utils/prompt_builder.py`)
Construit le prompt Claude dynamiquement à partir de la config.

**Méthode principale:**
- `build_claude_extraction_prompt(conversation_text, attention_structure)`
  - Génère le prompt complet avec tous les produits
  - Inclut les règles de mapping
  - Crée la structure JSON attendue

## ⚠️ Validation

L'agent valide automatiquement les données extraites :

```python
# Validation que tous les produits sont présents
expected_products = config_loader.get_product_names_list()
actual_products = list(extracted_data.get("sales", {}).keys())

missing_products = set(expected_products) - set(actual_products)
if missing_products:
    logger.warning(f"⚠️ Missing products: {missing_products}")
    # Ajoute automatiquement les produits manquants avec 0
```

## 🚀 Bénéfices du refactoring

1. ✅ **Zéro hardcoding** - Tous les produits sont dans JSON
2. ✅ **Modulable** - Ajouter/modifier des produits sans toucher au code
3. ✅ **Maintenable** - Prompt centralisé et lisible
4. ✅ **Testable** - Tests unitaires automatiques
5. ✅ **Évolutif** - Facile d'étendre avec de nouvelles catégories
6. ✅ **Robuste** - Validation automatique des données

## 🔄 Migration depuis l'ancien système

Le système a été complètement refactorisé. L'ancien prompt hardcodé de 170 lignes dans `main.py` (lignes 212-376) a été remplacé par :

```python
# Nouveau système (3 lignes)
prompt = prompt_builder.build_claude_extraction_prompt(
    conversation_text=conversation_text,
    attention_structure=attention_structure
)
```

Aucune action n'est requise pour les utilisateurs existants - le comportement reste identique !

## 📞 Support

Pour toute question ou problème avec la configuration :

1. Vérifier que `products.json` est valide (JSON bien formé)
2. Exécuter les tests: `python tests/test_config_loader.py`
3. Vérifier les logs de l'agent au démarrage

---

*Dernière mise à jour : $(date +%Y-%m-%d)*
