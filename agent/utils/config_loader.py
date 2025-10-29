"""
Configuration loader for Voyaltis Agent
Loads products and client configuration dynamically
"""
import json
import os
import re
from typing import Dict, List, Any, Optional


class ConfigLoader:
    def __init__(self, products_file: str = "config/products.json", client_config_file: str = "config/client_config.json"):
        self.products_file = products_file
        self.client_config_file = client_config_file
        self.products = []
        self.client_config = {}
        self.load_products()
        self.load_client_config()

    def load_products(self):
        """Load products from JSON file"""
        if not os.path.exists(self.products_file):
            raise FileNotFoundError(f"Products file not found: {self.products_file}")

        with open(self.products_file, 'r', encoding='utf-8') as f:
            data = json.load(f)

        # Load products from JSON structure
        # Support both formats:
        # 1. {"products": [...]} (old Samsung format)
        # 2. [{...}, {...}] (new project format from Excel)
        if isinstance(data, list):
            # Direct array format (from project Excel upload)
            self.products = data
        elif isinstance(data, dict):
            # Object with "products" key (old format)
            self.products = data.get("products", [])
        else:
            self.products = []

        if not self.products:
            raise ValueError("No products found in JSON file")

        print(f"✅ Loaded {len(self.products)} products from {self.products_file}")

    def load_client_config(self):
        """Load client-specific configuration"""
        if not os.path.exists(self.client_config_file):
            print(f"⚠️  Client config file not found: {self.client_config_file}, using defaults")
            self.client_config = self._get_default_client_config()
            return

        with open(self.client_config_file, 'r', encoding='utf-8') as f:
            self.client_config = json.load(f)

        print(f"✅ Loaded client config: {self.client_config['client']['brand_name']}")

    def _get_default_client_config(self) -> Dict[str, Any]:
        """Return default client configuration"""
        return {
            "client": {
                "name": "Generic Client",
                "brand_name": "Generic Brand",
                "industry": "Retail",
                "language": "fr",
                "context": "ventes de produits"
            },
            "conversation": {
                "objective": "Collecter des informations sur la journée de travail",
                "opening_context": "journée",
                "report_type": "rapport de vente",
                "tone": "professionnel mais chaleureux",
                "brand_specific_prompts": []
            },
            "products_context": {
                "brand_mentions": [],
                "brand_mention_bonus_points": 0,
                "unique_category": False,
                "description": ""
            }
        }

    def _find_price_field(self, product: Dict) -> Optional[float]:
        """
        Intelligently find the price field in a product using regex.
        Matches variations like "Prix", "Prix (€)", "Prix (€/unité)", "price"
        but excludes false positives like "Prix au kilo", "Prix de gros"

        Returns the price value or 0 if not found
        """
        # Pattern: starts with "prix" or "price" (case insensitive)
        # May contain parentheses with currency/unit info
        # Must NOT be followed by certain keywords that indicate wrong field

        for field_name, field_value in product.items():
            field_lower = field_name.lower()

            # Check if it starts with "prix" or "price"
            if not (field_lower.startswith("prix") or field_lower.startswith("price")):
                continue

            # Exclude false positives
            exclude_patterns = [
                r"au\s+(kilo|litre|kg|l\b)",  # "au kilo", "au litre"
                r"de\s+(gros|détail)",         # "de gros", "de détail"
                r"achat",                       # "prix achat"
                r"revient",                     # "prix de revient"
            ]

            # Check if this field should be excluded
            is_excluded = any(re.search(pattern, field_lower) for pattern in exclude_patterns)
            if is_excluded:
                continue

            # This looks like the right price field!
            # Try to extract numeric value
            if isinstance(field_value, (int, float)):
                return float(field_value)
            elif isinstance(field_value, str):
                # Try to parse string as number
                try:
                    return float(field_value)
                except ValueError:
                    continue

        # No price field found
        return 0.0

    def _normalize_product_field(self, product: Dict, field: str) -> Any:
        """
        Normalize product field names to handle different formats
        Maps Excel format (Nom, Catégorie, etc.) to standard format
        """
        # Special handling for price field - use intelligent detection
        if field == "price":
            return self._find_price_field(product)

        field_mappings = {
            "name": ["name", "Nom", "nom"],
            "display_name": ["display_name", "Nom d'affichage", "display name"],
            "category": ["category", "Catégorie", "catégorie"],
            "keywords": ["keywords", "Mots-clés", "mots-clés"],
            "target_quantity": ["target_quantity", "Objectif", "objectif", "target"],
        }

        # Get possible field names for this field
        possible_names = field_mappings.get(field, [field])

        # Try each possible field name
        for name in possible_names:
            if name in product:
                return product[name]

        # Return default values based on field type
        if field in ["keywords"]:
            return []
        elif field in ["target_quantity"]:
            return 0
        else:
            return ""

    def get_products_list_for_prompt(self) -> str:
        """
        Generate formatted product list for Claude prompt with ALL available fields
        Returns string like:

        1. Samsung Galaxy Z Nova (Smartphone)
           - Mots-clés : smartphone, téléphone, mobile...
           - Objectif : 4 unités
           - Prix : 1299€
           - [All other fields from Excel...]

        2. Samsung QLED Vision 8K (Téléviseur)
           ...
        """
        lines = []

        # Define standard fields that always get formatted specially
        standard_fields = {
            "name", "Nom", "nom",
            "display_name", "Nom d'affichage",
            "id", "ID",
            "category", "Catégorie", "catégorie",
            "keywords", "Mots-clés", "mots-clés"
        }

        for i, product in enumerate(self.products, 1):
            name = self._normalize_product_field(product, "display_name") or self._normalize_product_field(product, "name")
            category = self._normalize_product_field(product, "category")
            keywords = self._normalize_product_field(product, "keywords")

            # Header line with name and category
            lines.append(f"{i}. {name}" + (f" ({category})" if category else ""))

            # Keywords line
            if keywords:
                lines.append(f"   - Mots-clés : {', '.join(keywords[:8])}...")

            # Add ALL other fields from the product (excluding standard fields)
            for field_name, field_value in product.items():
                # Skip standard fields already displayed
                if field_name in standard_fields:
                    continue

                # Skip empty values
                if field_value is None or field_value == "" or field_value == []:
                    continue

                # Format the field nicely
                display_name = field_name.replace('_', ' ').title()

                # Format value based on type
                if isinstance(field_value, list):
                    formatted_value = ', '.join(str(v) for v in field_value)
                elif isinstance(field_value, (int, float)):
                    formatted_value = str(field_value)
                else:
                    formatted_value = str(field_value)

                lines.append(f"   - {display_name} : {formatted_value}")

            lines.append("")  # Empty line between products

        return "\n".join(lines)

    def get_products_count(self) -> int:
        """Return number of products"""
        return len(self.products)

    def get_empty_sales_dict(self) -> Dict[str, int]:
        """
        Generate empty sales dict for JSON structure
        Returns: {"Samsung Galaxy Z Nova": 0, "Samsung QLED Vision 8K": 0, ...}
        """
        sales = {}
        for product in self.products:
            name = self._normalize_product_field(product, "display_name") or self._normalize_product_field(product, "name")
            sales[name] = 0
        return sales

    def get_mapping_examples(self) -> str:
        """
        Generate mapping examples from products
        Returns formatted string with examples
        """
        examples = ["EXEMPLES DE MAPPING CORRECTS :"]

        # Generate examples dynamically from first few products
        for i, product in enumerate(self.products[:5]):  # First 5 products
            name = self._normalize_product_field(product, "display_name") or self._normalize_product_field(product, "name")
            keywords = self._normalize_product_field(product, "keywords")
            category = self._normalize_product_field(product, "category")

            # Pick first 2 keywords as examples
            if keywords and len(keywords) >= 2:
                keyword1 = keywords[0]
                keyword2 = keywords[1]
                examples.append(f'- "J\'ai vendu 3 {keyword1}s" → {{"{name}": 3}}')
                examples.append(f'- "des {keyword2}s" → {{"{name}": X}} (compte le nombre)')

        return "\n".join(examples)

    def get_product_names_list(self) -> List[str]:
        """Return list of all product display names"""
        return [
            self._normalize_product_field(product, "display_name") or self._normalize_product_field(product, "name")
            for product in self.products
        ]

    def get_products_for_analyzer(self) -> List[Dict]:
        """Return products list formatted for SalesAnalyzer"""
        formatted = []
        for product in self.products:
            formatted.append({
                "nom": self._normalize_product_field(product, "display_name") or self._normalize_product_field(product, "name"),
                "catégorie": self._normalize_product_field(product, "category"),
                "objectifs": self._normalize_product_field(product, "target_quantity"),
                "keywords": self._normalize_product_field(product, "keywords")
            })
        return formatted

    def get_brand_name(self) -> str:
        """Get brand name from client config"""
        return self.client_config.get("client", {}).get("brand_name", "")

    def get_conversation_objective(self) -> str:
        """Get conversation objective from client config"""
        return self.client_config.get("conversation", {}).get("objective", "Collecter des informations sur la journée de travail")

    def get_opening_context(self) -> str:
        """Get opening context from client config"""
        return self.client_config.get("conversation", {}).get("opening_context", "journée")

    def get_brand_specific_prompts(self) -> List[str]:
        """Get brand-specific prompts from client config"""
        return self.client_config.get("conversation", {}).get("brand_specific_prompts", [])

    def get_brand_mentions(self) -> List[str]:
        """Get brand mentions for fuzzy matching bonus"""
        return self.client_config.get("products_context", {}).get("brand_mentions", [])

    def get_brand_mention_bonus(self) -> int:
        """Get bonus points for brand mentions"""
        return self.client_config.get("products_context", {}).get("brand_mention_bonus_points", 0)

    def get_products_context_description(self) -> str:
        """Get products context description"""
        return self.client_config.get("products_context", {}).get("description", "")
