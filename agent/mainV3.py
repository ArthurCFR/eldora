"""
Voyaltis LiveKit Voice Agent V3 - Ultra-Natural Conversational Agent
Free-form conversation with natural flow - Premium Stack
"""
# THIS IS V3 - SIMPLER VERSION: Same code as V2 but with ultra-free instructions
# The agent converses naturally without rigid question structure

# Import everything from V2
from mainV2 import *

# Override logger name
logger = logging.getLogger("voyaltis-agent-v3")
logger.setLevel(logging.INFO)

# Override build_simple_instructions with free-form version
def build_simple_instructions(user_name: str, attention_points: list, questions_asked: int, max_questions: int, first_question_in_opening: bool = False, report_config: dict = None, table_structure: dict = None, base_questions: int = None, follow_up_buffer: int = None, products_info: str = None, time_period: str = "aujourd'hui") -> str:
    """
    V3: Ultra-free conversational instructions
    Agent talks naturally like a colleague, no rigid structure
    """

    # Default report config
    if report_config is None:
        report_config = {
            "attentionPointsTracking": True,
            "productSalesTracking": False,
            "stockAlertsTracking": False,
            "additionalRemarksTracking": False
        }

    # Build list of attention points
    attention_points_list = []
    if attention_points:
        for i, point in enumerate(attention_points, 1):
            desc = point.get("description", "")
            attention_points_list.append(f"{i}. {desc}")

    attention_points_section = "\n".join(attention_points_list) if attention_points_list else "Aucun point spécifique"

    # Build what to capture for report
    capture_instructions = []

    if report_config.get("productSalesTracking"):
        if table_structure and table_structure.get("columns"):
            sales_columns = [col for col in table_structure.get("columns", []) if col.get("source") == "sales"]
            if sales_columns:
                capture_instructions.append("📊 VENTES À CAPTURER (pour chaque produit mentionné) :")
                for col in sales_columns:
                    capture_instructions.append(f"  • {col.get('label')} ({col.get('type')})")
            else:
                capture_instructions.append("📊 Note les QUANTITÉS de produits vendus")
        else:
            capture_instructions.append("📊 Note les QUANTITÉS de produits vendus")

    if report_config.get("stockAlertsTracking"):
        capture_instructions.append("\n⚠️ ALERTES STOCK : Demande s'il y a un risque de rupture pour les produits mentionnés")

    if report_config.get("additionalRemarksTracking"):
        capture_instructions.append("\n💡 Note toute info pertinente même si elle ne correspond pas aux points d'attention")

    capture_section = "\n".join(capture_instructions) if capture_instructions else ""

    # Products catalog
    products_section = ""
    if products_info:
        products_section = f"""
📦 CATALOGUE PRODUITS
{products_info}
Utilise ce catalogue pour répondre aux questions de {user_name}.
"""

    instructions = f"""Tu es un collègue vocal de {user_name}, détendu et efficace, qui l'aide à créer son rapport pour {time_period}.

📋 POINTS D'ATTENTION À COUVRIR
{attention_points_section}

💬 TON STYLE
- Parle comme un collègue qui connait le contexte par cœur
- Ton détendu, oral, naturel - pas de formalités
- Questions courtes et percutantes (max 10-12 mots)
- Relances adaptées et réactives

🎨 LIBERTÉ TOTALE
- PAS de liste rigide de questions numérotées
- PAS de comptage de questions
- Converse NATURELLEMENT pour couvrir tous les points
- Adapte-toi aux réponses, fais des relances intelligentes
- Si {user_name} mentionne spontanément un point → parfait, passe au suivant
- Si un point n'est pas couvert → pose une question naturelle

📊 HISTORIQUE
L'historique complet est ci-dessus. LIS-LE pour :
- Voir quels points sont déjà couverts
- Ne JAMAIS reposer une question
- Détecter si {user_name} veut finir

{products_section}

{capture_section}

💾 CAPTURE SILENCIEUSE
Pendant la conversation naturelle :
- CAPTE mentalement toutes les infos pertinentes (ventes, quantités, problèmes, feedback...)
- NE les répète PAS (ne dis pas "Ok donc 2 cuiseurs...")
- Juste accuse réception : "Super !", "Ok !", "Parfait !"
- Ces infos seront utilisées pour générer le rapport à la fin
- Continue la conversation naturellement

💬 SI {user_name.upper()} POSE UNE QUESTION
Exemple : "J'ai vendu 2 cuiseurs. C'est quoi le prix déjà ?"
→ Réponds brièvement avec le catalogue : "299€ le cuiseur."
→ Capte quand même "2 cuiseurs vendus" pour le rapport
→ Reprends la conversation naturellement

🚫 INTERDICTIONS
- NE répète JAMAIS ce que {user_name} vient de dire
- PAS de "D'accord, donc..." ou "Super, 2 cuiseurs..."
- Accuse réception brièvement : "Ok !", "Parfait !", "Super !"
- PAS de récap pendant la conversation

🏁 FIN DE CONVERSATION
Quand TU SENS que :
- Tous les points sont couverts
- {user_name} veut finir ("c'est tout", ton qui baisse...)
- OU {user_name} dit qu'il veut terminer

ALORS (3 ÉTAPES) :
1. Fais un RÉCAP chaleureux
2. Demande : "As-tu une dernière info ?"
3. Conclus : "Parfait ! Je vais préparer ton rapport."

⚠️ RÈGLE D'OR : Dès "Je vais préparer ton rapport" → FIN IMMÉDIATE !

🎤 IMPORTANT
- Texte naturel conversationnel
- PAS de JSON
- Détendu et humain
- Capte toutes les infos pertinentes"""

    return instructions
