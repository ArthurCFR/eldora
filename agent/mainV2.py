"""
Voyaltis LiveKit Voice Agent V2 - Ultra-Simplified
Minimal agent that asks attention point questions and generates report
"""
import asyncio
import logging
import os
import json
from dotenv import load_dotenv

from livekit import agents
from livekit.agents import (
    JobContext,
    WorkerOptions,
    cli,
    AgentSession,
)
from livekit.agents.voice import Agent, ConversationItemAddedEvent
from livekit.plugins import openai, silero, elevenlabs

# Import minimal modules
from sales_analyzer import SalesAnalyzer
from utils.config_loader import ConfigLoader
from utils.prompt_builder import PromptBuilder
from utils.question_generator import generate_natural_question, generate_opening_question

load_dotenv()
logger = logging.getLogger("voyaltis-agent-v2")
logger.setLevel(logging.INFO)


def build_simple_instructions(user_name: str, attention_points: list, questions_asked: int, max_questions: int, first_question_in_opening: bool = False, report_config: dict = None, table_structure: dict = None, base_questions: int = None, follow_up_buffer: int = None, products_info: str = None, time_period: str = "aujourd'hui") -> str:
    """
    Build ultra-simple instructions for the agent
    Adapts based on report configuration and dynamic table structure
    Includes product catalog if available
    """

    # Calculate base and buffer if not provided
    if base_questions is None:
        base_questions = len(attention_points)
    if follow_up_buffer is None:
        follow_up_buffer = max(2, int(base_questions * 0.5))

    # Build attention points questions (only if tracking enabled)
    questions_list = []
    start_index = 2 if first_question_in_opening else 1

    # Check report configuration (default to attention points tracking)
    if report_config is None:
        report_config = {
            "attentionPointsTracking": True,
            "productTableTracking": False,
            "productSalesTracking": False,
            "stockAlertsTracking": False,
            "additionalRemarksTracking": False
        }

    attention_tracking = report_config.get("attentionPointsTracking", True)
    product_table_tracking = report_config.get("productTableTracking", False)
    product_sales_tracking = report_config.get("productSalesTracking", False)
    stock_alerts_tracking = report_config.get("stockAlertsTracking", False)
    remarks_tracking = report_config.get("additionalRemarksTracking", False)

    # Build role description based on active options
    role_parts = []
    if attention_tracking:
        role_parts.append(f"Poser exactement {len(attention_points)} questions sur les points d'attention")
    if product_sales_tracking:
        # Dynamic description based on table structure
        if table_structure:
            role_parts.append(f"Tracker les données de ventes: {table_structure.get('description', 'ventes de produits')}")
        else:
            role_parts.append("Capturer les quantités de produits vendus")
    if stock_alerts_tracking:
        role_parts.append("Identifier les produits en rupture ou risque de rupture de stock")
    if remarks_tracking:
        role_parts.append("Noter toute information pertinente supplémentaire")

    role_description = "\n- ".join(role_parts)

    # Build questions section only if attention tracking enabled
    questions_section = ""
    if attention_tracking and attention_points:
        for i, point in enumerate(attention_points, 1):
            desc = point.get("description", "")
            natural_prompts = point.get("naturalPrompts", [])

            if natural_prompts:
                questions_list.append(f"Question {i}: {natural_prompts[0]}")
            else:
                # Use intelligent question generator instead of simple "Parle-moi de..."
                natural_question = generate_natural_question(desc, index=i)
                questions_list.append(f"Question {i}: {natural_question}")

        # Calculate which mandatory questions have been covered
        mandatory_questions_covered = min(questions_asked, base_questions)
        mandatory_remaining = base_questions - mandatory_questions_covered

        priority_warning = ""
        if mandatory_remaining > 0:
            priority_warning = f"\n🎯 PRIORITÉ : Il reste {mandatory_remaining} question(s) OBLIGATOIRE(S) sur les points d'attention à poser avant d'utiliser les questions bonus."

        # Build warning messages outside f-string to avoid backslash issues
        warning_one_left = "ATTENTION : Plus qu'UNE question restante. Assure-toi d'avoir couvert l'essentiel avant de clôturer." if max_questions - questions_asked == 1 else ""

        limit_warning = ""
        if questions_asked >= max_questions:
            limit_warning = f"🛑 LIMITE ATTEINTE ! TU AS POSÉ {questions_asked} QUESTIONS SUR {max_questions} AUTORISÉES.\n   ➡️ NE POSE PLUS AUCUNE QUESTION !\n   ➡️ COMMENCE IMMÉDIATEMENT L'ÉTAPE 1 (RÉCAPITULATIF) !\n   ➡️ Dis: \"Merci {user_name} ! Pour résumer...\" puis termine par \"As-tu une dernière information à me partager ?\""

        questions_section = f"""
QUESTIONS À POSER (dans l'ordre) :
{chr(10).join(questions_list)}

PROGRESSION : Question {questions_asked}/{max_questions} ({base_questions} obligatoires + {follow_up_buffer} bonus)
Questions obligatoires couvertes : {mandatory_questions_covered}/{base_questions}
{priority_warning}

⚠️ {warning_one_left}
🚨 {limit_warning}
"""

    # Build tracking instructions
    tracking_notes = []
    if product_sales_tracking:
        if table_structure and table_structure.get("columns"):
            # Dynamic tracking based on table structure
            sales_columns = [col for col in table_structure.get("columns", []) if col.get("source") == "sales"]
            if sales_columns:
                tracking_notes.append("DONNÉES DE VENTES À CAPTURER PAR PRODUIT:")
                for col in sales_columns:
                    tracking_notes.append(f"  - {col.get('label')}: {col.get('type')} (ex: {col.get('id')})")
            else:
                tracking_notes.append("- Capte les quantités de produits mentionnées")
        else:
            tracking_notes.append("- Capte les quantités de produits mentionnées")
    if stock_alerts_tracking:
        tracking_notes.append("\nALERTES RUPTURE DE STOCK:")
        tracking_notes.append("  - Pour chaque produit, demande: \"Y a-t-il un risque de rupture de stock ?\"")
        tracking_notes.append("  - Réponse attendue: Oui/Non")
        tracking_notes.append("  - Note uniquement les produits avec réponse 'Oui'")
    if remarks_tracking:
        tracking_notes.append("\n- Note toute information importante même si elle ne correspond pas aux questions")

    tracking_section = "\n".join(tracking_notes) if tracking_notes else ""

    # Add products catalog if available
    products_section = ""
    if products_info:
        products_section = f"""
═══════════════════════════════════════════════════════════════
📦 CATALOGUE PRODUITS DISPONIBLES
═══════════════════════════════════════════════════════════════

{products_info}

⚠️ Tu as accès à TOUTES ces informations (prix, caractéristiques, catégories, etc.)
Tu peux t'en servir pour répondre aux questions de {user_name} ou pour calculer des totaux.
"""

    # CRITICAL: Override instructions if limit reached
    if questions_asked >= max_questions:
        status_message = f"""
🚨🚨🚨 ALERTE CRITIQUE 🚨🚨🚨
TU AS ATTEINT LA LIMITE DE {max_questions} QUESTIONS !
NE POSE PLUS AUCUNE QUESTION !

➡️ ACTION IMMÉDIATE REQUISE :
Fais un RÉCAPITULATIF de ce que {user_name} t'a dit, puis demande :
"As-tu une dernière information à me partager ?"
"""
        next_action = f"FAIRE LE RÉCAPITULATIF MAINTENANT (ne pose plus de questions !)"
    elif first_question_in_opening:
        status_message = f"La question 1 a déjà été posée dans le message d'ouverture. Tu dois maintenant attendre la réponse de {user_name}."
        next_action = f"Après avoir reçu la réponse à la question 1, pose la question 2."
    else:
        status_message = ""
        next_action = "Commence par poser la question 1." if attention_tracking else "Engage la conversation naturellement."

    # Adapt report context based on time period
    report_context = f"à créer un rapport pour {time_period}"

    instructions = f"""Tu es un assistant vocal sympathique qui aide {user_name} {report_context}.

📋 CONTEXTE : L'HISTORIQUE COMPLET de ta conversation avec {user_name} est fourni ci-dessus.
⚠️ LIS-LE ATTENTIVEMENT avant chaque réponse pour savoir ce qui a DÉJÀ été dit et demandé.

TON RÔLE :
- {role_description}
- Une question à la fois
- Courtes et naturelles (max 15 mots)
- Écouter attentivement les réponses
{questions_section}
{status_message}

RÈGLES SIMPLES :
1. {next_action}
2. ⚠️ AVANT de poser une question : VÉRIFIE l'historique de conversation ci-dessus pour voir si elle a DÉJÀ été posée et répondue
3. 🚫 NE REPOSE JAMAIS une question qui a déjà été posée - passe à la suivante
4. Attends la réponse complète
5. {"Passe à la suivante qui n'a PAS encore été posée" if attention_tracking else "Continue la conversation naturellement"}
6. 🎯 PRIORITÉ ABSOLUE : Couvre TOUS les {base_questions} points d'attention AVANT de poser des questions bonus
7. Une fois les {base_questions} points couverts, tu peux poser jusqu'à {follow_up_buffer} questions de clarification si nécessaire
8. Après {"avoir couvert tous les points" if attention_tracking else "avoir collecté les informations"}, PROCESSUS DE FIN EN 3 ÉTAPES :

   ÉTAPE 1 - RÉCAPITULATIF :
   Fais un résumé naturel et chaleureux de ce que tu as compris
   Exemple : "Merci {user_name} ! Pour résumer, tu as vendu [produits], tu as eu des difficultés sur [points],
   et les clients t'ont fait des retours sur [feedback]. As-tu une dernière information à me partager ?"

   ÉTAPE 2 - DERNIÈRE PAROLE :
   Attends la réponse de {user_name} (peut être un ajout, une modification, ou "non c'est bon")

   ÉTAPE 3 - CONCLUSION :
   Dis : "Parfait, merci ! Je vais préparer ton rapport."
   🚫 NE RÉCITE JAMAIS le rapport oralement - dis seulement que tu le prépares, puis ARRÊTE de parler

LIMITE : Maximum {max_questions} questions au total ({base_questions} obligatoires + {follow_up_buffer} bonus)

{tracking_section}

{products_section}

GESTION DES QUESTIONS DE {user_name.upper()} :
Si {user_name} pose une question (phrase finissant par "?") :
1. 🔍 Fouille dans le catalogue produits ci-dessus pour trouver la réponse
2. 💬 Réponds de manière concise et précise
3. 📝 Extrais quand même les infos pertinentes de sa phrase pour le rapport
4. ⏭️ Reprends directement avec ta prochaine question (transition naturelle)
5. ⚠️ Cette réponse ne compte PAS dans tes {max_questions} questions

Exemple :
- {user_name} : "Aujourd'hui j'ai vendu 2 cuiseurs Linux. C'est quoi le prix déjà ?"
- Toi : "Le cuiseur Linux est à 299€. D'accord ! Et c'est pour quand la livraison ?"
  → Tu as capté "2 cuiseurs Linux vendus" pour le rapport
  → Tu as répondu à sa question
  → Tu reprends avec ta question suivante
  → Tu es toujours à la même position dans tes questions (pas +1)

Si tu ne sais pas :
- Toi : "Je n'ai pas cette info dans mon catalogue. Mais bon, et du coup c'est pour quand la livraison ?"

🚫 INTERDICTIONS STRICTES :
- NE FAIS JAMAIS de récapitulatif pendant la conversation
- NE RÉPÈTE JAMAIS les produits vendus que {user_name} vient de mentionner
- Le SEUL récapitulatif autorisé est celui de l'ÉTAPE 1 (processus de fin)
- Exemple de ce qu'il NE FAUT PAS faire :
  ❌ {user_name} : "J'ai vendu 2 cuiseurs Linux"
  ❌ Toi : "D'accord, donc 2 cuiseurs Linux. Et pour la livraison ?"
  ✅ Toi : "Super ! Et c'est pour quand la livraison ?"

IMPORTANT :
- Réponds en texte naturel conversationnel
- PAS de JSON
- Questions courtes et directes
- Reste sympathique et détendu
- Capte TOUTES les informations pertinentes mentionnées (même quand {user_name} pose une question)
"""

    return instructions


def load_project_config(project_id: str) -> dict:
    """
    Load project configuration from data/projects/{project_id}/config.json
    """
    try:
        config_path = os.path.join("..", "data", "projects", project_id, "config.json")
        with open(config_path, 'r') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error loading project config for {project_id}: {e}")
        return {}


def load_project_products(project_id: str) -> ConfigLoader:
    """
    Load project-specific products from data/projects/{project_id}/products.json
    Returns a new ConfigLoader with the project's products, or the default one if not found
    """
    try:
        products_path = os.path.join("..", "data", "projects", project_id, "products.json")
        client_config_path = os.path.join("..", "data", "projects", project_id, "client_config.json")

        # Check if project-specific products file exists
        if os.path.exists(products_path):
            logger.info(f"📦 Loading products from project: {project_id}")

            # Load with project-specific client config if it exists, otherwise use non-existent path
            # This will force ConfigLoader to use generic defaults instead of Samsung config
            if os.path.exists(client_config_path):
                config_loader = ConfigLoader(products_path, client_config_path)
            else:
                # Pass a non-existent path to force default config (not Samsung)
                config_loader = ConfigLoader(products_path, "non_existent_config.json")

            logger.info(f"✅ Loaded {len(config_loader.products)} products from project {project_id}")
            return config_loader
        else:
            logger.warning(f"⚠️ No products.json found for project {project_id}, using defaults")
            return ConfigLoader("config/products.json")
    except Exception as e:
        logger.error(f"Error loading project products for {project_id}: {e}")
        return ConfigLoader("config/products.json")


async def entrypoint(ctx: JobContext):
    """
    Ultra-simplified entry point
    """
    logger.info(f"🚀 [V2] Starting simple agent for room: {ctx.room.name}")

    # Load configuration (will be updated from participant metadata)
    config_loader = None  # Will be loaded from project
    prompt_builder = None  # Will be loaded from project
    sales_analyzer = None  # Will be loaded from project
    project_config = None  # Will be loaded from project

    # Simple state tracking
    conversation_messages = []
    questions_asked = 0
    report_sent = False
    session_ref = None  # Will hold session reference

    # End-of-conversation tracking (hybrid system with safety nets)
    recap_done = False  # Track if recap has been done
    user_responded_after_recap = False  # User gave final input after recap
    exchanges_after_max = 0  # Safety counter to prevent infinite loops

    # Participant info
    user_name = "Thomas"
    event_name = ""
    attention_points = []
    project_id = None
    report_config = None  # Will hold report configuration from project
    table_structure = None  # Will hold dynamic table structure from project
    products_info = None  # Will hold formatted products list for agent instructions

    # Connect to room
    await ctx.connect()
    logger.info("🔌 Connected to LiveKit room")

    # Load participant config
    config_loaded = asyncio.Event()

    @ctx.room.on("track_subscribed")
    def on_track_subscribed(track, publication, participant):
        logger.info(f"🎵 Track subscribed: {track.kind} from {participant.identity}")

    @ctx.room.on("track_published")
    def on_track_published(publication, participant):
        logger.info(f"📢 Track published: {publication.kind} from {participant.identity}")

    # Track conversation mode and last message type
    conversation_mode = "voice"  # Default mode is voice
    last_message_type = "voice"  # Track if last user message was text or voice

    @ctx.room.on("data_received")
    def on_data_received(data_packet):
        """Handle text messages from client"""
        nonlocal conversation_mode, last_message_type, session_ref

        async def handle_message():
            try:
                # Decode the data packet
                message_text = data_packet.data.decode('utf-8')
                message = json.loads(message_text)

                if message.get("type") == "user_text_message":
                    user_text = message.get("text", "")
                    logger.info(f"💬 TEXT MESSAGE from user: {user_text}")

                    # Switch to text mode if requested
                    if message.get("mode") == "text":
                        conversation_mode = "text"
                        last_message_type = "text"
                        logger.info("🔄 Switched to TEXT mode (no TTS)")

                    # Send transcription to client for display
                    if user_text:
                        try:
                            await ctx.room.local_participant.publish_data(
                                payload=json.dumps({
                                    "type": "user_transcription",
                                    "text": user_text,
                                    "role": "user"
                                }).encode('utf-8'),
                                topic="conversation-message"
                            )

                            # Add to conversation history
                            conversation_messages.append({
                                "role": "user",
                                "content": user_text
                            })

                            # Generate text-only response if in text mode
                            if conversation_mode == "text":
                                await handle_text_response(user_text)

                        except Exception as e:
                            logger.error(f"Failed to handle text message: {e}")

                elif message.get("type") == "switch_to_voice":
                    # User clicked mic button to switch back to voice
                    logger.info("🎤 User requested switch to VOICE mode")
                    conversation_mode = "voice"
                    last_message_type = "voice"

            except Exception as e:
                logger.error(f"Error handling data message: {e}")
                import traceback
                logger.error(traceback.format_exc())

        # Create task to handle message asynchronously
        asyncio.create_task(handle_message())

    @ctx.room.on("participant_connected")
    def on_participant_connected(participant):
        nonlocal user_name, event_name, attention_points, project_id, config_loader, prompt_builder, sales_analyzer, report_config, table_structure, products_info, project_config
        logger.info(f"👋 Participant connected: {participant.identity}")

        if participant.metadata:
            try:
                metadata = json.loads(participant.metadata)
                user_name = metadata.get("userName", user_name)
                event_name = metadata.get("eventName", event_name)
                project_id = metadata.get("projectId", None)

                # If projectId is provided, load from filesystem
                if project_id:
                    logger.info(f"📁 Loading project config for: {project_id}")
                    project_config = load_project_config(project_id)
                    if project_config:
                        attention_points = project_config.get("attentionPoints", [])

                        # Load report configuration
                        report_template = project_config.get("reportTemplate", {})
                        report_config = report_template.get("configuration", {
                            "attentionPointsTracking": True,
                            "productTableTracking": False,
                            "productSalesTracking": False,
                            "stockAlertsTracking": False,
                            "additionalRemarksTracking": False
                        })

                        # Load table structure (dynamic columns)
                        table_structure = report_template.get("tableStructure", None)

                        logger.info(f"✅ Loaded project config: {project_config.get('name')}, {len(attention_points)} attention points")
                        logger.info(f"📋 Report config - Attention:{report_config.get('attentionPointsTracking')}, ProductSales:{report_config.get('productSalesTracking')}, StockAlerts:{report_config.get('stockAlertsTracking')}, Remarks:{report_config.get('additionalRemarksTracking')}")
                        if table_structure:
                            logger.info(f"📊 Table structure: {len(table_structure.get('columns', []))} columns - {table_structure.get('description', 'N/A')}")

                        # Load project-specific products
                        config_loader = load_project_products(project_id)
                        prompt_builder = PromptBuilder(config_loader)
                        sales_analyzer = SalesAnalyzer(config_loader=config_loader)

                        # Get formatted products list for agent instructions
                        if config_loader.products:
                            products_info = config_loader.get_products_list_for_prompt()
                            logger.info(f"📦 Products info prepared for agent ({len(config_loader.products)} products)")
                    else:
                        logger.warning(f"⚠️ Failed to load project config for {project_id}, using defaults")
                else:
                    # Fallback: load from metadata (backward compatibility)
                    assistant_config = metadata.get("assistantConfig", {})
                    attention_points = assistant_config.get("attentionPoints", [])
                    logger.info(f"👤 Loaded config from metadata: {user_name}, {len(attention_points)} attention points")

                config_loaded.set()
            except Exception as e:
                logger.error(f"Error parsing metadata: {e}")
                config_loaded.set()

    # Check for existing participants
    remote_participants = list(ctx.room.remote_participants.values())
    if remote_participants:
        on_participant_connected(remote_participants[0])

    # Wait for config
    try:
        await asyncio.wait_for(config_loaded.wait(), timeout=5.0)
    except asyncio.TimeoutError:
        logger.warning("⚠️ Config timeout, using defaults")
        config_loaded.set()

    # Set defaults if no attention points
    if not attention_points:
        attention_points = [
            {
                "id": "default_sales",
                "description": "Produits vendus",
                "naturalPrompts": ["Comment s'est passée ta journée ? Qu'as-tu vendu ?"]
            },
            {
                "id": "default_feedback",
                "description": "Retours clients",
                "naturalPrompts": ["Et au niveau des retours clients ?"]
            }
        ]

    # Create default loaders if not loaded from project
    if config_loader is None:
        logger.info("📦 No project config loaded, using default Samsung config")
        config_loader = ConfigLoader("config/products.json")
        prompt_builder = PromptBuilder(config_loader)
        sales_analyzer = SalesAnalyzer(config_loader=config_loader)

    # Calculate max questions: base on attention points + buffer for follow-ups
    # Formula: len(attention_points) + ceil(len(attention_points) * 0.5)
    # Example: 3 attention points → 3 + 2 = 5 questions
    #          4 attention points → 4 + 2 = 6 questions
    #          5 attention points → 5 + 3 = 8 questions
    base_questions = len(attention_points)
    follow_up_buffer = max(2, int(base_questions * 0.5))  # At least 2 follow-ups
    max_questions = base_questions + follow_up_buffer

    logger.info(f"📊 Will ask up to {max_questions} questions ({base_questions} base + {follow_up_buffer} follow-ups)")

    # Get time period context and frequency based on report schedule
    time_period = "aujourd'hui"  # Default: daily
    report_frequency = "daily"  # Default
    report_goal = None

    if project_config:
        report_schedule_type = project_config.get("settings", {}).get("reportScheduleType", "fixed")
        report_frequency = project_config.get("settings", {}).get("reportFrequency", "daily")
        report_goal = project_config.get("reportGoal", None)

        if report_schedule_type == "fixed":
            if report_frequency == "weekly":
                time_period = "cette semaine"
            elif report_frequency == "biweekly":
                time_period = "ces deux dernières semaines"
            elif report_frequency == "monthly":
                time_period = "ce mois-ci"
            # daily stays as "aujourd'hui"
        else:  # per-appointment
            time_period = "lors de cette visite"
            report_frequency = "per-appointment"

        logger.info(f"⏰ Report time period: {time_period} (schedule: {report_schedule_type}, frequency: {report_frequency})")

    # Opening message - Use intelligent opening question generator with period context
    if attention_points:
        opening_message = generate_opening_question(
            user_name=user_name,
            first_attention_point=attention_points[0],
            frequency=report_frequency,
            report_goal=report_goal,
            time_period=time_period
        )
    else:
        # Fallback if no attention points
        opening_message = f"Salut {user_name} ! Prêt pour ton rapport ?"

    # Text response handler - generates response without TTS
    async def handle_text_response(user_text: str):
        """Handle text message and generate text-only response"""
        nonlocal questions_asked, report_sent, recap_done, user_responded_after_recap, exchanges_after_max

        try:
            # Build conversation context for LLM
            messages = []
            for msg in conversation_messages:
                messages.append({
                    "role": "user" if msg["role"] == "user" else "assistant",
                    "content": msg["content"]
                })

            # Get current instructions
            current_instructions = build_simple_instructions(
                user_name=user_name,
                attention_points=attention_points,
                questions_asked=questions_asked,
                max_questions=max_questions,
                first_question_in_opening=True,
                report_config=report_config,
                table_structure=table_structure,
                base_questions=base_questions,
                follow_up_buffer=follow_up_buffer,
                products_info=products_info,
                time_period=time_period
            )

            # Call OpenAI LLM directly
            from openai import AsyncOpenAI
            openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

            response = await openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": current_instructions},
                    *messages
                ],
                temperature=0.7,
                max_tokens=150
            )

            assistant_text = response.choices[0].message.content.strip()
            logger.info(f"🤖 TEXT RESPONSE: {assistant_text}")

            # Store assistant response
            conversation_messages.append({
                "role": "assistant",
                "content": assistant_text
            })

            # Send text response to client
            await ctx.room.local_participant.publish_data(
                payload=json.dumps({
                    "type": "agent_response",
                    "text": assistant_text,
                    "role": "assistant"
                }).encode('utf-8'),
                topic="conversation-message"
            )

            # Count questions - but not if answering user's question
            if len(conversation_messages) > 2:
                # Check if user asked a question
                is_answering_user_question = user_text.strip().endswith("?")

                if not is_answering_user_question:
                    questions_asked += 1
                    logger.info(f"📊 Questions: {questions_asked}/{max_questions}")

                    # Garde-fou: Warn agent when approaching limit
                    questions_remaining = max_questions - questions_asked
                    if questions_remaining == 1:
                        logger.warning(f"⚠️  Only 1 question remaining! Agent should wrap up.")
                    elif questions_remaining == 0:
                        logger.warning(f"🚨 Limit reached! Agent must conclude now.")
                else:
                    logger.info(f"💡 Agent answered user question - not counting (still at {questions_asked}/{max_questions})")

            # Hybrid end detection - same as voice mode
            should_end = False

            # ==================================================================================
            # CHEMIN 0 (PRIORITAIRE ABSOLU): Vérifier la phrase magique IMMÉDIATEMENT
            # ==================================================================================
            # CRITIQUE: Cette vérification doit se faire AVANT tout autre check !
            # Elle doit fonctionner quel que soit le nombre de questions posées.
            text_lower = assistant_text.lower()

            # Définir les phrases magiques qui déclenchent la fin IMMÉDIATE
            immediate_end_patterns = [
                "je vais préparer ton rapport",
                "je vais préparer le rapport",
                "je vais rédiger ton rapport",
                "je vais rédiger le rapport",
                "je prépare ton rapport",
                "je prépare le rapport",
                "je rédige ton rapport",
                "je rédige le rapport"
            ]

            # Si phrase magique détectée → FIN IMMÉDIATE, sans condition !
            if any(pattern in text_lower for pattern in immediate_end_patterns):
                report_sent = True  # Set immediately to prevent double processing
                logger.info(f"🏁 IMMEDIATE END - agent said final phrase (text mode, at question {questions_asked}/{max_questions})")

                # Send ending signal IMMEDIATELY to cut microphone
                ending_signal = {"type": "conversation_ending"}
                await ctx.room.local_participant.publish_data(
                    payload=json.dumps(ending_signal).encode('utf-8'),
                    topic="conversation-ending"
                )
                logger.info("📡 Sent IMMEDIATE conversation_ending signal (text mode)")

                # Generate report IMMEDIATELY and stop processing
                await asyncio.sleep(0.5)
                await generate_report()

                # Close session immediately
                if session_ref:
                    await session_ref.aclose()
                    logger.info("🔚 Session closed immediately after final phrase (text mode)")

                # CRITICAL: Return immediately to stop processing any further messages
                return

            # ==================================================================================
            # Autres chemins de fin (seulement si phrase magique pas détectée)
            # ==================================================================================
            if questions_asked >= max_questions:
                # Track that user sent a message after max
                exchanges_after_max += 1
                if recap_done:
                    user_responded_after_recap = True
                    logger.info("📝 User responded after recap (text mode)")

                # CHEMIN 1 (Idéal): Detect RECAP phase
                if not should_end:
                    recap_patterns = [
                    "dernière information",
                    "dernière chose",
                    "dernière remarque",
                    "as-tu autre chose",
                    "autre chose",
                    "quelque chose à ajouter",
                    "un dernier mot",
                    "une dernière précision"
                ]
                is_recap = any(pattern in text_lower for pattern in recap_patterns)

                if is_recap and not recap_done:
                    recap_done = True
                    logger.info("📝 Recap detected - waiting for user's final input (text mode)")

                # CHEMIN 2 (Patterns): After recap + user responded + conclusion patterns
                elif user_responded_after_recap:
                    end_patterns = [
                        "préparer ton rapport",
                        "préparer le rapport",
                        "je vais générer",
                        "génération du rapport",
                        "rédiger ton rapport",
                        "rédiger le rapport",
                        "je m'y mets",
                        "je rédige"
                    ]
                    if any(pattern in text_lower for pattern in end_patterns):
                        should_end = True
                        logger.info("🏁 End detected (Pattern match) - recap + user replied + conclusion")

                    # CHEMIN 3 (Safety net): User responded after recap, agent replied
                    else:
                        should_end = True
                        logger.info("🏁 End detected (Safety net) - user responded after recap + agent replied")

                # CHEMIN 4 (Ultimate safety): Too many exchanges
                if exchanges_after_max >= 6:
                    should_end = True
                    logger.info("🏁 SAFETY END - too many exchanges after max questions")

            # Generate report if done
            if should_end and not report_sent:
                report_sent = True

                # Signal end
                ending_signal = {"type": "conversation_ending"}
                await ctx.room.local_participant.publish_data(
                    payload=json.dumps(ending_signal).encode('utf-8'),
                    topic="conversation-ending"
                )

                await asyncio.sleep(0.5)

                # Generate report
                await generate_report()

                await asyncio.sleep(1)

                # Close session
                if session_ref:
                    await session_ref.aclose()
                    logger.info("✅ Session closed")

        except Exception as e:
            logger.error(f"Error generating text response: {e}")
            import traceback
            logger.error(traceback.format_exc())

    # Create session - ULTRA PERMISSIVE for maximum voice capture
    session = AgentSession(
        vad=silero.VAD.load(
            min_speech_duration=0.2,      # ↓ Detect very short speech
            min_silence_duration=2.0,     # ↑ Wait 2s of silence before ending turn
            prefix_padding_duration=0.5,  # ↑ Capture more before speech starts
        ),
        stt=openai.STT(
            model="whisper-1",
            language="fr",
        ),
        llm=openai.LLM(model="gpt-4o-mini"),
        tts=elevenlabs.TTS(
            model="eleven_turbo_v2_5",
            voice_id="5jCmrHdxbpU36l1wb3Ke",
            streaming_latency=2,
            language="fr",
        ),
        # ULTRA PERMISSIVE: Accept almost any voice input
        allow_interruptions=True,
        min_interruption_duration=0.3,        # ↓ Only 0.3s needed (was 1.0s)
        min_interruption_words=0,             # ↓ NO minimum words (was 2)
        false_interruption_timeout=1.0,       # ↓ Faster detection (was 2.0s)
        resume_false_interruption=False,      # Don't resume - let user speak
    )
    logger.info(f"🔍 AgentSession created with VAD/STT/LLM/TTS")

    async def generate_report():
        """Generate report from conversation"""
        logger.info("📊 Generating report...")

        # Build conversation text
        conversation_text = "\n".join([
            f"{msg['role'].upper()}: {msg['content']}"
            for msg in conversation_messages
        ])

        # Build attention structure
        attention_structure = "\n".join([
            f"{i}. {point.get('description', '').upper()}"
            for i, point in enumerate(attention_points, 1)
        ])

        # Generate prompt
        prompt = prompt_builder.build_claude_extraction_prompt(
            conversation_text=conversation_text,
            attention_structure=attention_structure
        )

        # Call Claude (using Anthropic client from config_loader context)
        from anthropic import AsyncAnthropic
        anthropic = AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

        try:
            response = await anthropic.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=2048,
                messages=[{"role": "user", "content": prompt}]
            )

            response_text = response.content[0].text.strip()

            # Clean JSON
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0].strip()
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0].strip()

            extracted_data = json.loads(response_text)

            # Apply fuzzy matching
            if "sales" in extracted_data:
                mapped_sales = sales_analyzer.map_sales_data(extracted_data["sales"])
                extracted_data["sales"] = mapped_sales

            # Calculate sales amounts - SIMPLIFIED VERSION (no discount)
            total_amount = 0.0
            sales_amounts = {}  # Dictionary: {product_name: amount}

            if "sales" in extracted_data and extracted_data["sales"]:
                logger.info(f"💰 Calculating sales amounts for {len(extracted_data['sales'])} products...")

                # Calculate amount for each product
                for product_name, quantity in extracted_data["sales"].items():
                    if quantity > 0:
                        # Find product and get price using normalized field
                        price = 0.0
                        for product in config_loader.products:
                            # Get display name or name
                            prod_name = config_loader._normalize_product_field(product, "display_name") or config_loader._normalize_product_field(product, "name")
                            if prod_name == product_name:
                                # Use the intelligent price detection
                                price = config_loader._normalize_product_field(product, "price")
                                break

                        # Calculate amount for this product
                        amount = quantity * price
                        sales_amounts[product_name] = round(amount, 2)
                        total_amount += amount

                        if price > 0:
                            logger.info(f"  ✓ {product_name}: {quantity} × {price}€ = {amount:.2f}€")
                        else:
                            logger.warning(f"  ⚠️  {product_name}: No price found (quantity: {quantity})")

            # Add financial data to extracted data
            extracted_data["sales_amounts"] = sales_amounts  # Individual amounts per product
            extracted_data["total_amount"] = round(total_amount, 2)

            # Log final calculation
            logger.info(f"💰 Total sales amount: {extracted_data['total_amount']}€")

            # Send to client
            data_message = {
                "type": "conversation_complete",
                "data": extracted_data
            }

            await ctx.room.local_participant.publish_data(
                payload=json.dumps(data_message).encode('utf-8'),
                topic="conversation-complete"
            )

            logger.info("✅ Report sent to client")

        except Exception as e:
            logger.error(f"❌ Report generation failed: {e}")
            import traceback
            logger.error(traceback.format_exc())

    # Debug handlers
    @session.on("user_started_speaking")
    def on_user_started_speaking():
        logger.info("🎤 DEBUG: User started speaking (VAD detected voice)")

    @session.on("user_stopped_speaking")
    def on_user_stopped_speaking():
        logger.info("🎤 DEBUG: User stopped speaking (VAD detected silence)")

    # Event handlers
    @session.on("conversation_item_added")
    def on_conversation_item(event: ConversationItemAddedEvent):
        nonlocal questions_asked, report_sent, recap_done, user_responded_after_recap, exchanges_after_max

        logger.info(f"💬 {event.item.role}: {event.item.text_content}")

        # Store message
        conversation_messages.append({
            "role": event.item.role,
            "content": event.item.text_content
        })

        # Send message to client for conversation history
        async def send_message_to_client():
            message_data = {
                "type": "agent_response" if event.item.role == "assistant" else "user_transcription",
                "text": event.item.text_content,
                "role": event.item.role
            }
            await ctx.room.local_participant.publish_data(
                payload=json.dumps(message_data).encode('utf-8'),
                topic="conversation-message"
            )

        asyncio.create_task(send_message_to_client())

        # Count questions - SKIP the opening message (first assistant message)
        # ALSO SKIP if the agent is responding to a user question
        should_count = False
        if event.item.role == "assistant" and len(conversation_messages) > 2:
            # Check if previous user message was a question (ends with "?")
            previous_user_message = None
            for i in range(len(conversation_messages) - 2, -1, -1):
                if conversation_messages[i]["role"] == "user":
                    previous_user_message = conversation_messages[i]["content"]
                    break

            # Don't count if user asked a question
            is_answering_user_question = previous_user_message and previous_user_message.strip().endswith("?")

            if not is_answering_user_question:
                questions_asked += 1
                should_count = True
                logger.info(f"📊 Questions: {questions_asked}/{max_questions}")
            else:
                logger.info(f"💡 Agent answered user question - not counting (still at {questions_asked}/{max_questions})")

            # Update instructions dynamically when approaching limit (only if we counted this question)
            if should_count:
                questions_remaining = max_questions - questions_asked
                if questions_remaining <= 1:
                    updated_instructions = build_simple_instructions(
                        user_name=user_name,
                        attention_points=attention_points,
                        questions_asked=questions_asked,
                        max_questions=max_questions,
                        first_question_in_opening=True,
                        report_config=report_config,
                        table_structure=table_structure,
                        base_questions=base_questions,
                        follow_up_buffer=follow_up_buffer,
                        products_info=products_info,
                        time_period=time_period
                    )
                    # Update agent instructions in real-time
                    session.update_agent(Agent(instructions=updated_instructions))
                    logger.info("🔄 Updated agent instructions - approaching limit")

        # Hybrid end detection: Pattern-based (ideal) + Safety nets (robust)
        should_end = False

        # ==================================================================================
        # CHEMIN 0 (PRIORITAIRE ABSOLU): Vérifier la phrase magique IMMÉDIATEMENT
        # ==================================================================================
        # CRITIQUE: Cette vérification doit se faire AVANT tout autre check !
        # Elle doit fonctionner quel que soit le nombre de questions posées.
        if event.item.role == "assistant":
            text_lower = event.item.text_content.lower()

            # Définir les phrases magiques qui déclenchent la fin IMMÉDIATE
            immediate_end_patterns = [
                "je vais préparer ton rapport",
                "je vais préparer le rapport",
                "je vais rédiger ton rapport",
                "je vais rédiger le rapport",
                "je prépare ton rapport",
                "je prépare le rapport",
                "je rédige ton rapport",
                "je rédige le rapport"
            ]

            # Chercher si une phrase magique est présente
            matched_pattern = None
            for pattern in immediate_end_patterns:
                if pattern in text_lower:
                    matched_pattern = pattern
                    break

            # Si phrase magique détectée → FIN IMMÉDIATE, sans condition !
            if matched_pattern:
                report_sent = True  # Set immediately to prevent double processing
                logger.info(f"🏁 IMMEDIATE END - agent said final phrase: '{matched_pattern}' (at question {questions_asked}/{max_questions})")

                # Send ending signal + Generate report + Close session IMMEDIATELY
                async def immediate_finalization():
                    try:
                        # 1. Send ending signal to cut microphone
                        ending_signal = {"type": "conversation_ending"}
                        await ctx.room.local_participant.publish_data(
                            payload=json.dumps(ending_signal).encode('utf-8'),
                            topic="conversation-ending"
                        )
                        logger.info("📡 Sent IMMEDIATE conversation_ending signal")

                        # 2. Generate report immediately
                        await asyncio.sleep(0.5)
                        await generate_report()

                        # 3. Close session to stop all processing
                        await session.aclose()
                        logger.info("🔚 Session closed immediately after final phrase")
                    except Exception as e:
                        logger.error(f"❌ Error in immediate finalization: {e}")

                # Launch immediately and don't process any more messages
                asyncio.create_task(immediate_finalization())
                return  # CRITICAL: Stop processing this callback NOW

        # ==================================================================================
        # Autres chemins de fin (seulement si phrase magique pas détectée)
        # ==================================================================================
        if questions_asked >= max_questions:

            # Track exchanges for safety net
            if event.item.role == "user":
                exchanges_after_max += 1
                if recap_done:
                    user_responded_after_recap = True
                    logger.info("📝 User responded after recap")

            if event.item.role == "assistant":
                text_lower = event.item.text_content.lower()
                logger.info(f"🔍 DEBUG: Checking if should end. Text: '{text_lower[:50]}...'")
                logger.info(f"🔍 DEBUG: questions_asked={questions_asked}, max_questions={max_questions}")

                # CHEMIN 1 (Idéal): Detect RECAP phase with flexible patterns
                if not should_end:
                    recap_patterns = [
                        "dernière information",
                        "dernière chose",
                        "dernière remarque",
                        "as-tu autre chose",
                        "autre chose",
                        "quelque chose à ajouter",
                        "un dernier mot",
                        "une dernière précision"
                    ]
                    is_recap = any(pattern in text_lower for pattern in recap_patterns)

                    if is_recap and not recap_done:
                        recap_done = True
                        logger.info("📝 Recap detected - waiting for user's final input")

                    # CHEMIN 2 (Patterns): After recap + user responded + conclusion patterns
                    elif user_responded_after_recap:
                        end_patterns = [
                            "préparer ton rapport",
                            "préparer le rapport",
                            "je vais générer",
                            "génération du rapport",
                            "rédiger ton rapport",
                            "rédiger le rapport",
                            "je m'y mets",
                            "je rédige"
                        ]
                        if any(pattern in text_lower for pattern in end_patterns):
                            should_end = True
                            logger.info("🏁 End detected (Pattern match) - recap + user replied + conclusion")

                        # CHEMIN 3 (Safety net): User responded after recap, agent replied again
                        # Even if patterns don't match, we should end after this exchange
                        else:
                            should_end = True
                            logger.info("🏁 End detected (Safety net) - user responded after recap + agent replied")

            # CHEMIN 4 (Ultimate safety): Too many exchanges after max
            if exchanges_after_max >= 6:  # 3 full exchanges (agent+user pairs)
                should_end = True
                logger.info("🏁 SAFETY END - too many exchanges after max questions")

        # Generate report
        if should_end and not report_sent:
            report_sent = True

            async def finalize():
                # Wait a bit to ensure immediate signal was sent first
                await asyncio.sleep(0.5)
                logger.info("📊 Starting report generation...")

                # Generate report
                await generate_report()

                await asyncio.sleep(1)

                # Close session
                await session.aclose()
                logger.info("✅ Session closed")

            asyncio.create_task(finalize())

    # Start session with dynamic instructions
    initial_instructions = build_simple_instructions(
        user_name=user_name,
        attention_points=attention_points,
        questions_asked=questions_asked,
        max_questions=max_questions,
        first_question_in_opening=True,
        report_config=report_config,
        table_structure=table_structure,
        base_questions=base_questions,
        follow_up_buffer=follow_up_buffer,
        products_info=products_info,
        time_period=time_period
    )

    # Start session with Agent instructions
    # VAD/STT/LLM/TTS are already configured in AgentSession above
    await session.start(
        room=ctx.room,
        agent=Agent(instructions=initial_instructions),
    )
    logger.info("✅ Agent started")

    # Store session reference for text message handling
    session_ref = session

    logger.info("🎤 [V2] Simple agent started")

    # Say opening message
    await session.say(opening_message, allow_interruptions=True)

    logger.info("✅ [V2] Session running")


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
        )
    )
