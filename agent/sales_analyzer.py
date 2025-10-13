"""
Samsung Sales Analyzer for Voyaltis
Handles product mapping and sales data processing with fuzzy matching
"""
import json
import logging
from typing import Dict, List, Tuple, Optional

logger = logging.getLogger(__name__)


class SalesAnalyzer:
    """
    Analyzes sales data and maps product mentions to actual products
    Based on samsungSalesAnalyzer.ts
    """

    def __init__(self, products_file: str = None):
        if products_file is None:
            # Default: look for produits.json in parent directory
            import os
            current_dir = os.path.dirname(os.path.abspath(__file__))
            products_file = os.path.join(current_dir, "..", "produits.json")

        self.products = self._load_products(products_file)
        self.product_names = [p["nom"] for p in self.products]
        self.product_keywords = self._build_product_keywords()

    def _load_products(self, products_file: str) -> List[Dict]:
        """Load products from JSON file"""
        try:
            import os
            abs_path = os.path.abspath(products_file)
            logger.info(f"Loading products from: {abs_path}")
            with open(abs_path, 'r', encoding='utf-8') as f:
                products = json.load(f)
                logger.info(f"Loaded {len(products)} products")
                return products
        except Exception as e:
            logger.error(f"Error loading products from {products_file}: {e}")
            return []

    def _build_product_keywords(self) -> Dict[str, List[str]]:
        """
        Build keyword mapping for fuzzy matching
        Based on the keyword system in TypeScript
        """
        return {
            "Samsung Galaxy Z Nova": [
                "smartphone", "téléphone", "telephone", "phone", "mobile",
                "cellulaire", "portable", "galaxy", "z nova", "nova",
                "téléphone portable", "tel", "gsm", "android"
            ],
            "Samsung QLED Vision 8K": [
                "télé", "tv", "téléviseur", "television", "écran",
                "qled", "8k", "vision", "télévision", "tele", "telly",
                "écran tv", "téléviseur 8k"
            ],
            "Samsung Galaxy Tab Ultra S": [
                "tablette", "tablet", "tab", "ipad", "galaxy tab",
                "ultra s", "tab ultra", "tablette tactile"
            ],
            "Samsung GearFit Pro": [
                "montre", "watch", "montre connectée", "smartwatch",
                "gearfit", "gear fit", "bracelet connecté", "fitness tracker",
                "montre intelligente"
            ],
            "Samsung AirCool Max": [
                "climatiseur", "clim", "climatisation", "air conditionné",
                "aircool", "air cool", "clim réversible", "ac"
            ],
            "Samsung SoundBar X500": [
                "soundbar", "barre de son", "sound bar", "enceinte",
                "haut-parleur", "speaker", "audio", "son", "home cinema",
                "x500", "système audio"
            ],
            "Samsung Galaxy Book Flex": [
                "ordinateur", "laptop", "book", "pc", "flex", "notebook",
                "galaxy book", "pc portable", "ordi portable", "ordi",
                "ordinateur portable", "windows", "portable"
            ],
            "Samsung EcoWash 9000": [
                "lave-linge", "machine à laver", "machine a laver",
                "lave linge", "ecowash", "eco wash", "laveuse",
                "washing machine", "9000"
            ],
            "Samsung SmartFridge Elite": [
                "frigo", "réfrigérateur", "refrigerateur", "frigidaire",
                "smartfridge", "smart fridge", "frigo connecté",
                "réfrigérateur intelligent", "fridge"
            ],
            "Samsung LaserJet Pro M500": [
                "imprimante", "printer", "laserjet", "laser jet",
                "m500", "imprimante laser", "impression"
            ]
        }

    def map_sales_data(self, raw_sales: Dict[str, int]) -> Dict[str, int]:
        """
        Map raw sales data to actual product names using fuzzy matching
        Returns a dict with proper product names and quantities
        """
        mapped_sales = {}

        for raw_name, quantity in raw_sales.items():
            # Try exact match first
            if raw_name in self.product_names:
                mapped_sales[raw_name] = mapped_sales.get(raw_name, 0) + quantity
                logger.info(f"Direct match: '{raw_name}' ({quantity})")
                continue

            # Fuzzy matching
            best_match = self._find_best_match(raw_name)
            if best_match:
                product_name, score = best_match
                if score >= 3:  # Minimum threshold
                    mapped_sales[product_name] = mapped_sales.get(product_name, 0) + quantity
                    logger.info(f"Smart match: '{raw_name}' ({quantity}) → '{product_name}' (score: {score})")
                else:
                    logger.warning(f"No good match found for: '{raw_name}' (best score: {score})")
            else:
                logger.warning(f"No match found for: '{raw_name}'")

        return mapped_sales

    def _find_best_match(self, raw_name: str) -> Optional[Tuple[str, float]]:
        """
        Find the best matching product using keyword scoring
        Returns (product_name, score) or None
        """
        best_product = None
        best_score = 0.0

        raw_lower = raw_name.lower()

        for product_name, keywords in self.product_keywords.items():
            score = 0.0

            for keyword in keywords:
                keyword_lower = keyword.lower()

                # Exact match with keyword: +20 points
                if raw_lower == keyword_lower:
                    score += 20

                # Contains the keyword: +10 to +15 points (proportional)
                elif keyword_lower in raw_lower:
                    proportion = len(keyword_lower) / len(raw_lower)
                    score += 10 + (proportion * 5)

                # Keyword contains the raw name (min 3 chars): +6 points
                elif len(raw_lower) > 3 and raw_lower in keyword_lower:
                    score += 6

            # Bonus if mentions "Samsung": +3 points
            if "samsung" in raw_lower:
                score += 3

            # Bonus if mentions "Galaxy" for Galaxy products: +5 points
            if "galaxy" in raw_lower and "galaxy" in product_name.lower():
                score += 5

            # HUGE bonus for unique category terms: +15 points
            unique_category_terms = [
                "frigo", "réfrigérateur", "télé", "tv", "montre",
                "clim", "climatiseur", "soundbar", "imprimante",
                "lave-linge", "machine à laver"
            ]
            if any(term in raw_lower for term in unique_category_terms):
                if any(term in keyword.lower() for keyword in keywords for term in unique_category_terms):
                    score += 15

            # Track best match
            if score > best_score:
                best_score = score
                best_product = product_name

        return (best_product, best_score) if best_product else None

    def generate_insights(
        self,
        sales: Dict[str, int],
        customer_feedback: str = ""
    ) -> Dict[str, any]:
        """
        Generate managerial insights from sales data and feedback
        Based on insightGenerator.ts
        """
        # Calculate metrics
        total_sold = sum(sales.values())
        total_target = sum(p["objectifs"] for p in self.products)

        product_performance = []
        for product in self.products:
            name = product["nom"]
            sold = sales.get(name, 0)
            target = product["objectifs"]
            performance = (sold / target * 100) if target > 0 else 0

            product_performance.append({
                "name": name,
                "sold": sold,
                "target": target,
                "performance": performance,
                "category": product["catégorie"]
            })

        # Sort by performance
        product_performance.sort(key=lambda x: x["performance"], reverse=True)

        # Top performers (sold > 0)
        top_performers = [p for p in product_performance if p["sold"] > 0][:3]

        # Struggling products (< 50% performance)
        struggling = [p for p in product_performance if p["performance"] < 50 and p["target"] > 0]

        # Extract insights from feedback using patterns
        insights = self._extract_insights_from_feedback(customer_feedback)

        # Calculate global performance
        global_performance = (total_sold / total_target * 100) if total_target > 0 else 0

        return {
            "globalPerformance": global_performance,
            "totalSold": total_sold,
            "totalTarget": total_target,
            "topPerformers": top_performers,
            "strugglingProducts": struggling,
            "insights": insights,
            "customerFeedback": customer_feedback
        }

    def _extract_insights_from_feedback(self, feedback: str) -> List[str]:
        """
        Extract insights from customer feedback using pattern matching
        Based on patterns in insightGenerator.ts
        """
        if not feedback:
            return []

        feedback_lower = feedback.lower()
        insights = []

        # Competitive insights
        patterns = {
            "competitive": [
                (r"compar.*apple", "Forte pression concurrentielle Apple"),
                (r"moins cher.*concurrent", "Sensibilité prix face à la concurrence"),
            ],
            "customer": [
                (r"jeunes?|étudiant", "Segment jeune/étudiant présent"),
                (r"professionnel|entreprise", "Cible B2B identifiée"),
            ],
            "pricing": [
                (r"trop cher|cher|prix élevé", "Objection prix fréquente"),
                (r"bon (prix|rapport)", "Prix perçu positivement"),
            ],
            "stock": [
                (r"rupture|stock|dispo", "Problème de disponibilité"),
            ],
        }

        import re
        for category, pattern_list in patterns.items():
            for pattern, insight in pattern_list:
                if re.search(pattern, feedback_lower):
                    insights.append(insight)

        return insights

    def format_report(self, insights_data: Dict) -> str:
        """
        Format insights data into a readable report
        """
        report = []

        # Performance header
        perf = insights_data["globalPerformance"]
        report.append(f"PERFORMANCE GLOBALE : {perf:.0f}% ({insights_data['totalSold']}/{insights_data['totalTarget']} produits vendus)\n")

        # Top performers
        if insights_data["topPerformers"]:
            report.append("TOP PERFORMERS :")
            for p in insights_data["topPerformers"]:
                report.append(f"- {p['name']} : {p['performance']:.0f}% ({p['sold']}/{p['target']})")
            report.append("")

        # Key insights
        if insights_data["insights"]:
            report.append("INSIGHTS CLÉS :")
            for insight in insights_data["insights"]:
                report.append(f"✓ {insight}")
            report.append("")

        # Struggling products
        if insights_data["strugglingProducts"]:
            report.append("PRODUITS EN DIFFICULTÉ :")
            for p in insights_data["strugglingProducts"]:
                report.append(f"- {p['name']} : {p['performance']:.0f}% ({p['sold']}/{p['target']})")
            report.append("")

        return "\n".join(report)
