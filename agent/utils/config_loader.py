"""
Configuration loader for Voyaltis Agent
Loads products and client configuration dynamically
"""
import json
import os
from typing import Dict, List, Any


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
        self.products = data.get("products", [])

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

    def get_products_list_for_prompt(self) -> str:
        """
        Generate formatted product list for Claude prompt
        Returns string like:

        1. Samsung Galaxy Z Nova (Smartphone)
           - Mots-clés : smartphone, téléphone, mobile...
           - Objectif : 4 unités

        2. Samsung QLED Vision 8K (Téléviseur)
           ...
        """
        lines = []
        for i, product in enumerate(self.products, 1):
            name = product.get("display_name") or product.get("name")
            category = product.get("category", "")
            keywords = product.get("keywords", [])
            target = product.get("target_quantity") or product.get("target", 0)

            lines.append(f"{i}. {name} ({category})")
            lines.append(f"   - Mots-clés : {', '.join(keywords[:8])}...")  # Limit keywords for readability
            lines.append(f"   - Objectif : {target} unités")
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
            name = product.get("display_name") or product.get("name")
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
            name = product.get("display_name") or product.get("name")
            keywords = product.get("keywords", [])
            category = product.get("category", "")

            # Pick first 2 keywords as examples
            if len(keywords) >= 2:
                keyword1 = keywords[0]
                keyword2 = keywords[1]
                examples.append(f'- "J\'ai vendu 3 {keyword1}s" → {{"{name}": 3}}')
                examples.append(f'- "des {keyword2}s" → {{"{name}": X}} (compte le nombre)')

        return "\n".join(examples)

    def get_product_names_list(self) -> List[str]:
        """Return list of all product display names"""
        return [
            product.get("display_name") or product.get("name")
            for product in self.products
        ]

    def get_products_for_analyzer(self) -> List[Dict]:
        """Return products list formatted for SalesAnalyzer"""
        formatted = []
        for product in self.products:
            formatted.append({
                "nom": product.get("display_name") or product.get("name"),
                "catégorie": product.get("category", ""),
                "objectifs": product.get("target_quantity", 0),
                "keywords": product.get("keywords", [])
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
