"""
Sales Analyzer for Voyaltis
Handles product mapping and sales data processing with fuzzy matching
GENERIC version - works with any product configuration
"""
import json
import logging
from typing import Dict, List, Tuple, Optional

logger = logging.getLogger(__name__)


class SalesAnalyzer:
    """
    Analyzes sales data and maps product mentions to actual products
    Generic implementation that works with any client configuration
    """

    def __init__(self, config_loader=None, products_list: List[Dict] = None, brand_mentions: List[str] = None, brand_bonus: int = 0):
        """
        Initialize analyzer with products from config loader or direct list

        Args:
            config_loader: ConfigLoader instance (preferred method)
            products_list: Alternative - direct list of products (for backward compatibility)
            brand_mentions: List of brand names to give bonus points (e.g. ["Samsung", "Galaxy"])
            brand_bonus: Bonus points to add when brand name is mentioned
        """
        if config_loader:
            self.products = config_loader.get_products_for_analyzer()
            self.brand_mentions = config_loader.get_brand_mentions()
            self.brand_bonus = config_loader.get_brand_mention_bonus()
            logger.info(f"Loaded {len(self.products)} products from ConfigLoader")
        elif products_list:
            self.products = products_list
            self.brand_mentions = brand_mentions or []
            self.brand_bonus = brand_bonus or 0
            logger.info(f"Loaded {len(self.products)} products from direct list")
        else:
            raise ValueError("Must provide either config_loader or products_list")

        self.product_names = [p["nom"] for p in self.products]
        self.product_keywords = self._build_product_keywords()

    def _build_product_keywords(self) -> Dict[str, List[str]]:
        """
        Build keyword mapping for fuzzy matching dynamically from products config
        """
        keywords_map = {}

        for product in self.products:
            product_name = product["nom"]
            keywords = product.get("keywords", [])

            if keywords:
                keywords_map[product_name] = keywords
                logger.info(f"Loaded {len(keywords)} keywords for {product_name}")
            else:
                logger.warning(f"No keywords defined for {product_name}")

        return keywords_map

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
                logger.info(f"✓ Direct match: '{raw_name}' ({quantity})")
                continue

            # Fuzzy matching
            best_match = self._find_best_match(raw_name)
            if best_match:
                product_name, score = best_match
                if score >= 3:  # Minimum threshold
                    mapped_sales[product_name] = mapped_sales.get(product_name, 0) + quantity
                    logger.info(f"✓ Fuzzy match: '{raw_name}' ({quantity}) → '{product_name}' (score: {score})")
                else:
                    logger.warning(f"✗ No good match for: '{raw_name}' (best score: {score})")
            else:
                logger.warning(f"✗ No match found for: '{raw_name}'")

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

            # Generic brand mentions bonus (configurable)
            for brand in self.brand_mentions:
                if brand.lower() in raw_lower:
                    score += self.brand_bonus
                    break

            # Bonus for product name word matches
            product_name_words = product_name.lower().split()
            for word in product_name_words:
                if len(word) > 3 and word in raw_lower:
                    score += 5

            # HUGE bonus for unique category terms (short keywords like "frigo", "télé", etc.)
            # These are typically 3-6 letter words that uniquely identify a category
            for keyword in keywords:
                keyword_lower = keyword.lower()
                if 3 <= len(keyword_lower) <= 6 and keyword_lower in raw_lower:
                    score += 15
                    break

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
        Generic implementation
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
        Generic patterns that work for any business
        """
        if not feedback:
            return []

        feedback_lower = feedback.lower()
        insights = []

        # Generic business insights patterns
        patterns = {
            "competitive": [
                (r"concurrent|concurrence|compétiteur", "Pression concurrentielle mentionnée"),
                (r"moins cher|meilleur prix", "Sensibilité prix face à la concurrence"),
            ],
            "customer": [
                (r"jeunes?|étudiant|ado", "Segment jeune présent"),
                (r"professionnel|entreprise|b2b", "Cible professionnelle identifiée"),
                (r"famille|parent", "Cible familiale identifiée"),
            ],
            "pricing": [
                (r"trop cher|cher|prix élevé|coûteux", "Objection prix fréquente"),
                (r"bon (prix|rapport)|abordable|raisonnable", "Prix perçu positivement"),
            ],
            "stock": [
                (r"rupture|stock|dispo|indispo", "Problème de disponibilité mentionné"),
            ],
            "interest": [
                (r"intéressé|curieux|beaucoup de questions", "Fort intérêt client"),
                (r"hésit|indécis|réfléchi", "Clients indécis, besoin de réassurance"),
            ],
        }

        import re
        for category, pattern_list in patterns.items():
            for pattern, insight in pattern_list:
                if re.search(pattern, feedback_lower):
                    insights.append(insight)
                    break  # Only one insight per category

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
