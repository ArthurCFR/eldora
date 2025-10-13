"""
Dynamic prompt builder using product configuration
"""
import json
from typing import Dict, Any
from utils.config_loader import ConfigLoader


class PromptBuilder:
    def __init__(self, config_loader: ConfigLoader):
        self.config = config_loader

    def build_claude_extraction_prompt(
        self,
        conversation_text: str,
        attention_structure: str
    ) -> str:
        """
        Build the complete Claude extraction prompt dynamically
        """
        products_count = self.config.get_products_count()
        products_list = self.config.get_products_list_for_prompt()
        mapping_examples = self.config.get_mapping_examples()
        empty_sales = self.config.get_empty_sales_dict()

        # Construire le JSON structure example
        json_structure = {
            "sales": empty_sales,
            "customer_feedback": "Structure avec sections **BOLD** pour chaque point d'attention (pas de quantités de produits)",
            "emotional_context": "état émotionnel",
            "key_insights": ["insight 1", "insight 2", "insight 3"],
            "event_name": "nom événement ou vide",
            "time_spent": "durée ou vide"
        }

        json_str = json.dumps(json_structure, indent=4, ensure_ascii=False)

        prompt = f"""Analyse cette conversation de vente Samsung et extrait PRÉCISÉMENT les informations suivantes en JSON.

CONVERSATION COMPLÈTE :
{conversation_text}

═══════════════════════════════════════════════════════════════
📋 LISTE EXHAUSTIVE DES PRODUITS SAMSUNG ({products_count} produits UNIQUEMENT)
═══════════════════════════════════════════════════════════════

{products_list}

═══════════════════════════════════════════════════════════════
🎯 RÈGLES DE MAPPING ABSOLUES
═══════════════════════════════════════════════════════════════

⚠️ SEULS CES {products_count} PRODUITS EXISTENT. Aucun autre produit Samsung n'est disponible.

ÉTAPES DE MAPPING :
1. Lis CHAQUE phrase de la conversation où le vendeur mentionne des ventes
2. Pour CHAQUE produit mentionné, cherche dans la liste ci-dessus
3. Utilise les mots-clés pour identifier le bon produit
4. Utilise le NOM EXACT du produit dans le JSON

{mapping_examples}

⚠️ IMPORTANT : Si le vendeur dit "j'ai vendu des X", estime la quantité basée sur le contexte.
Si aucun chiffre n'est donné, utilise 1 par défaut.

═══════════════════════════════════════════════════════════════
📊 EXTRACTION DES DONNÉES
═══════════════════════════════════════════════════════════════

1. PRODUITS VENDUS :
   - Relis TOUTE la conversation ligne par ligne
   - Identifie CHAQUE mention de vente
   - Mappe vers les noms EXACTS ci-dessus
   - Additionne si un produit est mentionné plusieurs fois

2. RETOURS CLIENTS - STRUCTURE PAR SECTIONS :

   POINTS D'ATTENTION ATTENDUS :
{attention_structure}

   RÈGLES POUR LE customer_feedback :

   a) STRUCTURE : Crée UNE section **BOLD** par point d'attention ci-dessus

   b) CONTENU DES SECTIONS :
      - Si le point A ÉTÉ abordé : Écris 1-2 phrases d'insights managériaux concis et actionnables
      - Si NON abordé : Écris simplement "Non renseigné lors de la conversation"
      - NE répète JAMAIS le contenu d'une section dans une autre
      - AUCUNE quantité de produits (déjà dans le tableau sales)
      - 🚫 N'INVENTE PAS : Utilise UNIQUEMENT ce qui est dit explicitement par le vendeur

   c) FORMAT EXACT à suivre :
      "**[NOM SECTION 1]**\\n[Contenu section 1 OU "Non renseigné lors de la conversation"]\\n\\n**[NOM SECTION 2]**\\n[Contenu section 2 OU "Non renseigné lors de la conversation"]\\n\\n..."

   d) Exemple concret :
      "**PRODUITS VENDUS**\\nBonne diversité sur tablettes et montres, potentiel à exploiter sur l'électroménager\\n\\n**RETOURS CLIENTS**\\nClients très réceptifs aux démonstrations interactives\\n\\n**PROFIL DES VISITEURS**\\nNon renseigné lors de la conversation"

   ⚠️ INTERDICTIONS ABSOLUES :
   - NE mets PAS les insights de key_insights dans customer_feedback
   - NE répète PAS les mêmes informations dans plusieurs sections
   - N'utilise PAS ## pour les titres (uniquement **TEXT**)

3. CONTEXTE ÉMOTIONNEL :
   - Enthousiaste, fatigué, content, frustré, stressé, neutre

4. INSIGHTS CLÉS (key_insights) :
   - Liste de 2-4 insights COURTS et PERCUTANTS (maximum 10-15 mots chacun)
   - Ces insights sont SÉPARÉS du customer_feedback
   - Ils seront affichés en liste à puces APRÈS les sections
   - Focus : Tendances marché, opportunités, difficultés, actions recommandées

   🚫 RÈGLE CRITIQUE ANTI-HALLUCINATION :
   Les insights DOIVENT être basés UNIQUEMENT sur ce qui est EXPLICITEMENT dit dans la conversation.
   NE DÉDUIS PAS, N'INFÈRE PAS, N'INVENTE PAS.

   ❌ INTERDIT :
   - "Succès des ventes croisées" si non mentionné explicitement
   - "Forte dynamique" basé sur juste quelques chiffres
   - Toute conclusion non exprimée par l'utilisateur

   ✅ AUTORISÉ :
   - "Bonne performance sur [produit]" si vendeur dit "ça marche bien"
   - "[Produit X] a attiré l'attention" si vendeur le mentionne
   - "Clients intéressés par [feature]" si vendeur le dit explicitement

Réponds UNIQUEMENT avec un JSON valide (SANS markdown, SANS balises ``` ) :
{json_str}

⚠️ IMPORTANT - RÈGLES FINALES :
1. SALES : Mets les bonnes quantités pour les {products_count} produits Samsung
2. CUSTOMER_FEEDBACK : Sections **BOLD** structurées par points d'attention (SANS les insights de key_insights)
   🚫 N'invente PAS, ne déduis PAS - utilise UNIQUEMENT ce que le vendeur a EXPLICITEMENT dit
3. KEY_INSIGHTS : Liste séparée de 2-4 insights courts (max 15 mots chacun)
   🚫 N'invente PAS de "ventes croisées", "dynamique", ou autres conclusions non mentionnées
4. SÉPARATION STRICTE : customer_feedback contient les sections détaillées, key_insights contient les points clés courts
5. AUCUNE répétition entre sections ou entre customer_feedback et key_insights
6. NE MENTIONNE PAS les quantités dans customer_feedback (déjà dans sales)
7. 🚫 ANTI-HALLUCINATION : Si le vendeur n'a PAS dit quelque chose, ne l'écris PAS dans le rapport"""

        return prompt
