"""
Conversational Engine for Voyaltis Voice Agent
Ports the TypeScript conversational logic to Python for LiveKit integration
"""
import os
import json
import logging
from typing import Dict, List, Optional, Any
from anthropic import AsyncAnthropic

logger = logging.getLogger(__name__)


class ConversationalEngine:
    """
    Manages conversational flow, context, and Claude API interactions
    Based on the original conversationalEngine.ts
    """

    def __init__(self, config_loader=None):
        self.anthropic = AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        self.conversation_history: List[Dict[str, str]] = []
        self.collected_data: Dict[str, Any] = {}
        self.questions_asked = 0
        self.max_questions = 5  # 2 general + up to 3 specific
        self.config = self.load_default_config()
        self.config_loader = config_loader

    def load_default_config(self) -> Dict[str, Any]:
        """
        Load default assistant configuration
        TODO: Load from AsyncStorage equivalent or database
        """
        return {
            "conversationStyle": "friendly_colleague",
            "attentionPoints": [
                {
                    "id": "products_sold",
                    "description": "Produits vendus avec quantités",
                    "priority": "high"
                },
                {
                    "id": "customer_feedback",
                    "description": "Retours clients et ambiance",
                    "priority": "high"
                },
                {
                    "id": "event_details",
                    "description": "Détails de l'événement",
                    "priority": "medium"
                }
            ]
        }

    async def generate_opening_message(
        self,
        user_name: str,
        event_name: str = "",
        existing_report: Optional[Dict] = None
    ) -> str:
        """
        Generate the opening message based on conversation style
        Equivalent to generateSamsungOpeningMessage() in TypeScript
        """
        style = self.config.get("conversationStyle", "friendly_colleague")

        # Choose greeting based on style
        if style in ["friendly_colleague", "casual_relaxed"]:
            greeting = f"Salut {user_name} !"
        else:
            greeting = f"Bonjour {user_name} !"

        # EDIT MODE: Different opening if we have an existing report
        if existing_report:
            return f"{greeting} Tu veux compléter ton rapport de la journée ? Dis-moi ce qui a changé ou ce que tu veux ajouter."

        # Check if attention points have custom prompts
        attention_points = self.config.get("attentionPoints", [])
        if attention_points and attention_points[0].get("naturalPrompts"):
            return f"{greeting} {attention_points[0]['naturalPrompts'][0]}"

        # Fallback generic message
        if event_name:
            return f"{greeting} Comment s'est passée ta journée au {event_name} ?"
        return f"{greeting} Comment s'est passée ta journée ?"

    def get_system_prompt(self) -> str:
        """
        Generate system prompt based on conversation style
        """
        style = self.config.get("conversationStyle", "friendly_colleague")

        style_instructions = {
            "friendly_colleague": """Tu es un collègue bienveillant qui prend des nouvelles après une journée de travail.
- Utilise le tutoiement naturellement
- Sois empathique et à l'écoute
- Réagis spontanément ("Super !", "Ah ouais ?", "Pas mal !")
- Pose des questions ouvertes""",

            "professional_warm": """Tu es un manager professionnel et chaleureux.
- Utilise le vouvoiement respectueux
- Valorise le travail accompli
- Pose des questions structurées mais bienveillantes""",

            "coach_motivating": """Tu es un coach motivant et énergique.
- Célèbre les succès avec enthousiasme
- Transforme les difficultés en apprentissages
- Encourage et motive""",

            "casual_relaxed": """Tu es très décontracté et informel.
- Langage simple et direct
- Aucune pression
- Questions courtes et naturelles"""
        }

        base_instructions = style_instructions.get(style, style_instructions["friendly_colleague"])

        # Get brand name dynamically
        brand_name = self.config_loader.get_brand_name() if self.config_loader else ""
        objective = self.config_loader.get_conversation_objective() if self.config_loader else "Collecter des informations sur la journée de travail"

        # Format objective with brand name if available
        full_objective = f"{objective} {brand_name}" if brand_name else objective

        return f"""{base_instructions}

OBJECTIF : {full_objective}

RÈGLES IMPORTANTES :
1. LIMITE DE QUESTIONS : Tu as un maximum de {self.max_questions} questions à poser
2. Progression actuelle : {self.questions_asked}/{self.max_questions} questions posées
3. Ne pose qu'UNE SEULE question à la fois
4. Si la limite est atteinte OU si tu as l'essentiel, conclus chaleureusement
5. Adapte ton ton à l'état émotionnel détecté (fatigue, enthousiasme, stress)

EXTRACTION DE DONNÉES :
- Produits vendus : Extrait le nom du produit et la quantité
- Si le produit existe dans le catalogue, utilise le nom exact
- Si le produit n'existe pas, note-le quand même
- Insights managériaux : Enrichis les remarques brutes en insights business actionnables

FORMAT DE RÉPONSE :
Réponds TOUJOURS en JSON avec cette structure exacte :
{{
    "extractedData": {{
        "sales": {{"nom_produit": quantité}},
        "customer_feedback": "insights enrichis",
        "emotional_context": "enthousiaste|fatigué|stressé|content|frustré",
        "key_insights": ["insight 1", "insight 2"]
    }},
    "nextMessage": "ta prochaine question ou message de conclusion",
    "isComplete": true/false,
    "reasoning": "explication de ton raisonnement"
}}
"""

    def get_voice_assistant_prompt(self, existing_report: Optional[Dict] = None) -> str:
        """
        Generate a simple conversational prompt for the voice assistant (TTS)
        This outputs ONLY natural language, no JSON
        """
        style = self.config.get("conversationStyle", "friendly_colleague")

        style_instructions = {
            "friendly_colleague": """Tu es un collègue bienveillant qui prend des nouvelles après une journée de travail.
- Utilise le tutoiement naturellement
- Sois empathique et à l'écoute
- Réagis spontanément ("Super !", "Ah ouais ?", "Pas mal !")
- Pose des questions ouvertes et naturelles""",

            "professional_warm": """Tu es un manager professionnel et chaleureux.
- Utilise le vouvoiement respectueux
- Valorise le travail accompli
- Pose des questions structurées mais bienveillantes""",

            "coach_motivating": """Tu es un coach motivant et énergique.
- Célèbre les succès avec enthousiasme
- Transforme les difficultés en apprentissages
- Encourage et motive""",

            "casual_relaxed": """Tu es très décontracté et informel.
- Langage simple et direct
- Aucune pression
- Questions courtes et naturelles"""
        }

        base_instructions = style_instructions.get(style, style_instructions["friendly_colleague"])

        # Load products context dynamically
        products_context = self._get_products_context()

        # Get brand name dynamically
        brand_name = self.config_loader.get_brand_name() if self.config_loader else ""
        objective = self.config_loader.get_conversation_objective() if self.config_loader else "Collecter des informations sur la journée de travail"

        # Format objective with brand name if available
        full_objective = f"{objective} {brand_name}" if brand_name else objective

        # Build existing report context if in edit mode
        existing_context = ""
        if existing_report:
            sales = existing_report.get("sales", {})
            feedback = existing_report.get("customerFeedback", "")
            insights = existing_report.get("keyInsights", [])

            # Get attention points for the follow-up question
            attention_points = self.config.get("attentionPoints", [])
            attention_examples = []
            for point in attention_points[:2]:  # Take only first 2 for brevity
                desc = point.get("description", "")
                if desc:
                    # Clean description (remove technical IDs/metadata)
                    clean_desc = desc.split('_')[0] if '_' in desc else desc
                    clean_desc = clean_desc.strip()
                    attention_examples.append(clean_desc.lower())

            attention_text = " ou ".join(attention_examples) if attention_examples else "les ventes ou les retours clients"

            existing_context = f"""
⚠️ MODE ÉDITION - RAPPORT EXISTANT (FLOW ULTRA-LÉGER) :
L'utilisateur a déjà commencé son rapport aujourd'hui. Voici ce qui a DÉJÀ été enregistré :

VENTES DÉJÀ ENREGISTRÉES :
{json.dumps(sales, indent=2, ensure_ascii=False)}

RETOURS CLIENTS DÉJÀ ENREGISTRÉS :
{feedback if feedback else "Aucun"}

INSIGHTS DÉJÀ COLLECTÉS :
{', '.join(insights) if insights else "Aucun"}

🎯 TON RÔLE EN MODE ÉDITION - FLOW ULTRA-COURT :
Tu as droit à SEULEMENT 2 QUESTIONS au total :

QUESTION 1 (l'ouverture - déjà faite) :
"Tu veux compléter ton rapport de la journée ? Dis-moi ce qui a changé ou ce que tu veux ajouter."

QUESTION 2 (la relance ULTRA-COURTE - OPTIONNELLE) :
SEULEMENT si l'utilisateur a ajouté de nouvelles informations substantielles à la question 1,
pose UNE SEULE question de relance très courte comme :
"Entendu, rien d'autre à ajouter ?"

⚠️ RÈGLES STRICTES MODE ÉDITION (NON NÉGOCIABLES) :
1. Maximum 2 questions TOTAL (ouverture + 1 relance optionnelle)
2. Si l'utilisateur dit "non", "rien", "c'est tout", "c'est bon" → TERMINE IMMÉDIATEMENT
3. Si l'utilisateur donne une réponse courte sans nouvelles infos → TERMINE IMMÉDIATEMENT
4. NE pose JAMAIS de questions sur les points d'attention (ils sont déjà renseignés)
5. NE redemande JAMAIS ce qui est déjà dans le rapport existant
6. Sois ULTRA-CONCIS - c'est juste une correction/ajout rapide

🛑 APRÈS LA QUESTION 2 (ou dès que l'utilisateur dit "rien de plus"), tu DOIS dire :
"Parfait ! Merci pour ces infos, je vais préparer ton rapport maintenant."

🛑 NE POSE JAMAIS plus de 2 questions en mode édition, même si l'utilisateur continue à parler.

IMPORTANT : L'utilisateur a DÉJÀ donné toutes ces informations. C'est juste une MISE À JOUR RAPIDE.
"""

        # Build strict attention points list with questions (SKIP IN EDIT MODE)
        attention_points = self.config.get("attentionPoints", [])

        # In EDIT mode, skip attention points completely
        if existing_report:
            attention_points_instructions = ""
            max_questions_text = "2 MAXIMUM (déjà compris dans les instructions ci-dessus)"
        else:
            attention_points_instructions = self._format_attention_points_for_agent(attention_points)
            max_questions_text = f"2 questions générales + 1 question par point d'attention (total: {2 + len(attention_points)} questions)"

        # Get brand-specific prompts if available
        brand_specific_prompts = ""
        if self.config_loader:
            brand_prompts_list = self.config_loader.get_brand_specific_prompts()
            if brand_prompts_list:
                brand_specific_prompts = "\n".join(brand_prompts_list)

        return f"""{base_instructions}

{existing_context}

OBJECTIF : {full_objective}

{products_context}

{brand_specific_prompts}

{attention_points_instructions}

RÈGLES DE CONVERSATION (CRITIQUES) :
1. Ne pose qu'UNE SEULE question à la fois
2. Attends la réponse de l'utilisateur avant de continuer
3. QUESTIONS ULTRA-COURTES : Maximum 15-20 mots par question
4. LIMITE DE QUESTIONS : {max_questions_text}
5. Adapte ton ton à l'état émotionnel (fatigue, enthousiasme, stress)

🚫 RÈGLE ANTI-RÉPÉTITION ABSOLUE :
AVANT de poser une question, vérifie TOUTE la conversation précédente.
Si l'utilisateur a DÉJÀ mentionné cette information (produits vendus, retours clients, etc.),
NE REDEMANDE JAMAIS. Passe directement au point suivant ou termine.

Exemples de signaux que l'info est déjà donnée :
- "J'ai vendu X, Y, Z" → Ventes DÉJÀ données, ne redemande PAS
- "Les clients ont dit..." → Retours DÉJÀ donnés, ne redemande PAS
- Si l'utilisateur dit "je te l'ai déjà dit" → EXCUSE-TOI et passe au point suivant

⚠️ RÈGLE SPÉCIALE - VENTES PRIORITAIRES :
Si après la PREMIÈRE réponse, AUCUNE mention de ventes (même pas un produit),
pose UNE question courte sur les ventes. Sinon, passe au point suivant.

EXEMPLES DE BONNES QUESTIONS (COURTES) :
✅ "Super ! Et au niveau des retours clients ?"
✅ "D'accord ! Quel type de clientèle ?"
✅ "Parfait ! Quels produits mettre en avant d'après toi ?"

EXEMPLES DE MAUVAISES QUESTIONS (TROP LONGUES) :
❌ "Merci pour ces informations détaillées ! Je note de belles ventes. Pour compléter, pourriez-vous me parler de vos visiteurs aujourd'hui ?"
❌ "C'est excellent ! Je vois que vous avez eu une belle journée. Maintenant, est-ce que vous pourriez me dire..."

CLÔTURE : Quand tu as atteint le nombre maximum de questions, dis :
"Parfait ! Merci pour ces infos, je vais préparer ton rapport maintenant."

IMPORTANT : Réponds UNIQUEMENT avec du texte conversationnel naturel.
N'utilise JAMAIS de JSON, de balises, ou de formatage technique dans ta réponse.
Parle comme un humain normal."""

    def _get_products_context(self) -> str:
        """
        Get products context dynamically from config_loader
        Replaces the hardcoded _get_samsung_products_context()
        """
        if not self.config_loader:
            return ""

        # Get products description from config (generic description)
        context_description = self.config_loader.get_products_context_description()

        # Get formatted products list
        products_list = self.config_loader.get_products_list_for_prompt()

        # Build the full context
        if context_description and products_list:
            return f"""{context_description}

{products_list}"""
        elif products_list:
            # Fallback to generic description if none provided
            return f"""PRODUITS DISPONIBLES :

{products_list}"""
        else:
            return ""

    def _format_attention_points(self) -> str:
        """Format attention points for the prompt"""
        points = self.config.get("attentionPoints", [])
        formatted = []
        for i, point in enumerate(points, 1):
            status = "✓ Couvert" if point["id"] in self.collected_data else "✗ À couvrir"
            formatted.append(f"{i}. {point['description']} - {status} (Priorité: {point['priority']})")
        return "\n".join(formatted)

    def _format_attention_points_for_agent(self, attention_points: list) -> str:
        """Format attention points with strict instructions for the agent"""
        if not attention_points:
            return ""

        instructions = ["⚠️ POINTS D'ATTENTION SPÉCIFIQUES À COUVRIR OBLIGATOIREMENT :"]
        instructions.append("Tu DOIS poser une question pour CHACUN de ces points d'attention dans l'ordre :")
        instructions.append("")

        # Contextual transitions to make questions feel more natural
        contextual_intros = [
            "OK, bien noté. Et",
            "D'accord. Du coup,",
            "Parfait. Dis-moi,",
            "Super. Maintenant,",
            "Entendu. Autre chose,",
        ]

        for i, point in enumerate(attention_points, 1):
            desc = point.get("description", "")
            natural_prompts = point.get("naturalPrompts", [])

            # Clean description (remove technical IDs/metadata)
            clean_desc = desc.split('_')[0] if '_' in desc else desc
            clean_desc = clean_desc.strip()

            instructions.append(f"POINT D'ATTENTION {i} : {clean_desc}")

            if natural_prompts:
                # Use one of the configured natural prompts with contextual intro
                example_prompt = natural_prompts[0]
                # Add context suggestion
                intro = contextual_intros[min(i-1, len(contextual_intros)-1)]
                instructions.append(f"   ➜ Question suggérée avec contexte : \"{intro} {example_prompt[0].lower() + example_prompt[1:]}\"")
                instructions.append(f"   ➜ Ou utilise d'autres transitions naturelles comme : \"au vu de tes échanges avec les clients\", \"d'après ton expérience aujourd'hui\", \"selon toi\"")
            else:
                # Generate based on description with context
                instructions.append(f"   ➜ Pose une question courte avec contexte sur : {clean_desc}")
                instructions.append(f"   ➜ Exemple : \"OK, bien noté. Et au vu de ta journée, {clean_desc.lower()} ?\"")

            instructions.append("")

        instructions.append("⚠️ IMPORTANT : Rends les questions NATURELLES et FLUIDES")
        instructions.append("   - Ajoute des transitions contextuelles (\"au vu de\", \"d'après\", \"selon toi\")")
        instructions.append("   - Fais référence à ce qui vient d'être dit")
        instructions.append("   - Évite les questions sèches et robotiques")
        instructions.append("")
        instructions.append("⚠️ NE POSE PAS de questions hors de ces points d'attention (pas d'ambiance générale, pas d'anecdotes, etc.)")
        instructions.append("⚠️ Utilise les questions suggérées comme BASE mais enrichis-les avec du contexte")
        instructions.append("")

        return "\n".join(instructions)

    async def analyze_and_respond(
        self,
        user_transcript: str
    ) -> Dict[str, Any]:
        """
        Analyze user input and generate response
        Equivalent to analyzeAndRespond() in TypeScript
        """
        # Add user message to history
        self.conversation_history.append({
            "role": "user",
            "content": user_transcript
        })

        # Build analysis prompt
        analysis_prompt = self._build_analysis_prompt(user_transcript)

        try:
            # Call Claude API
            response = await self.anthropic.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=1024,
                messages=[{"role": "user", "content": analysis_prompt}]
            )

            # Parse response
            response_text = response.content[0].text
            logger.info(f"Claude response: {response_text}")

            # Extract JSON from response
            parsed = self._parse_claude_response(response_text)

            # Update collected data
            if "extractedData" in parsed:
                self._update_collected_data(parsed["extractedData"])

            # Add assistant response to history
            next_message = parsed.get("nextMessage", "")
            if next_message:
                self.conversation_history.append({
                    "role": "assistant",
                    "content": next_message
                })
                self.questions_asked += 1

            return {
                "nextMessage": next_message,
                "isComplete": parsed.get("isComplete", False),
                "collectedData": self.collected_data,
                "reasoning": parsed.get("reasoning", "")
            }

        except Exception as e:
            logger.error(f"Error in analyze_and_respond: {e}")
            return self._fallback_response(user_transcript)

    def _build_analysis_prompt(self, user_transcript: str) -> str:
        """Build the full analysis prompt for Claude"""
        system_prompt = self.get_system_prompt()

        history_text = "\n".join([
            f"{msg['role'].upper()}: {msg['content']}"
            for msg in self.conversation_history[-5:]  # Last 5 messages
        ])

        return f"""{system_prompt}

HISTORIQUE DE LA CONVERSATION :
{history_text}

NOUVELLE RÉPONSE UTILISATEUR :
{user_transcript}

Analyse cette réponse, extrait les données, et génère ta prochaine question (ou conclus si tu as assez d'informations).
Réponds UNIQUEMENT en JSON selon le format spécifié.
"""

    def _parse_claude_response(self, response_text: str) -> Dict[str, Any]:
        """Parse Claude's JSON response"""
        try:
            # Try to extract JSON from markdown code blocks if present
            if "```json" in response_text:
                start = response_text.find("```json") + 7
                end = response_text.find("```", start)
                response_text = response_text[start:end].strip()
            elif "```" in response_text:
                start = response_text.find("```") + 3
                end = response_text.find("```", start)
                response_text = response_text[start:end].strip()

            return json.loads(response_text)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON: {e}")
            logger.error(f"Response text: {response_text}")
            # Return a basic structure
            return {
                "extractedData": {},
                "nextMessage": "Merci pour ces informations. Peux-tu me donner plus de détails ?",
                "isComplete": False,
                "reasoning": "Failed to parse response"
            }

    def _update_collected_data(self, extracted_data: Dict[str, Any]):
        """Update collected data with new information"""
        # Merge sales data
        if "sales" in extracted_data:
            if "sales" not in self.collected_data:
                self.collected_data["sales"] = {}
            for product, quantity in extracted_data["sales"].items():
                self.collected_data["sales"][product] = \
                    self.collected_data["sales"].get(product, 0) + quantity

        # Append customer feedback
        if "customer_feedback" in extracted_data:
            existing = self.collected_data.get("customer_feedback", "")
            new_feedback = extracted_data["customer_feedback"]
            self.collected_data["customer_feedback"] = \
                f"{existing} {new_feedback}".strip()

        # Store other data
        for key in ["emotional_context", "key_insights"]:
            if key in extracted_data:
                self.collected_data[key] = extracted_data[key]

    def _fallback_response(self, user_transcript: str) -> Dict[str, Any]:
        """Fallback response if Claude API fails"""
        return {
            "nextMessage": "Merci pour ces informations. Y a-t-il autre chose que tu aimerais ajouter ?",
            "isComplete": self.questions_asked >= self.max_questions,
            "collectedData": self.collected_data,
            "reasoning": "Fallback due to API error"
        }

    async def before_tts_cb(self, text: str) -> str:
        """
        Callback before text-to-speech
        Can be used to modify the text before it's spoken
        """
        return text

    def get_collected_data(self) -> Dict[str, Any]:
        """Get all collected data"""
        return self.collected_data

    def reset_conversation(self):
        """Reset conversation state"""
        self.conversation_history = []
        self.collected_data = {}
        self.questions_asked = 0
