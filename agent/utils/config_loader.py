"""
Configuration loader for Voyaltis Agent
Loads products and generates dynamic prompts
"""
import json
import os
from typing import Dict, List, Any

class ConfigLoader:
    def __init__(self, products_file: str = "config/products.json"):
        self.products_file = products_file
        self.products = []
        self.load_products()

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
            lines.append(f"   - Mots-clés : {', '.join(keywords)}")
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

        # Exemples personnalisés basés sur les produits
        mapping_examples = [
            ("portables", "Samsung Galaxy Z Nova", 3),
            ("frigos", "Samsung SmartFridge Elite", 2),
            ("télés", "Samsung QLED Vision 8K", 5),
            ("montres", "Samsung GearFit Pro", "X"),
            ("pc", "Samsung Galaxy Book Flex", 1),
            ("smartphones", "Samsung Galaxy Z Nova", 4),
            ("barre de son", "Samsung SoundBar X500", 1),
        ]

        for mention, product_name, quantity in mapping_examples:
            if quantity == "X":
                examples.append(f'- "des {mention}" → {{"{product_name}": X}} (compte le nombre)')
            else:
                examples.append(f'- "J\'ai vendu {quantity} {mention}" → {{"{product_name}": {quantity}}}')

        return "\n".join(examples)

    def get_product_names_list(self) -> List[str]:
        """Return list of all product display names"""
        return [
            product.get("display_name") or product.get("name")
            for product in self.products
        ]
