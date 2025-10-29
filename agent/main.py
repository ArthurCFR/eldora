"""
Voyaltis LiveKit Voice Agent - Self-Hosted Local
Handles real-time conversational AI for sales visit reporting
"""
import asyncio
import logging
import os
import json
from dotenv import load_dotenv

from livekit.agents import (
    JobContext,
    WorkerOptions,
    cli,
    AgentSession,
)
from livekit.agents.voice import Agent, ConversationItemAddedEvent, UserInputTranscribedEvent
from livekit.plugins import openai, silero, elevenlabs

# Import our custom modules
from conversational_engine import ConversationalEngine
from sales_analyzer import SalesAnalyzer
from utils.config_loader import ConfigLoader
from utils.prompt_builder import PromptBuilder

load_dotenv()
logger = logging.getLogger("voyaltis-agent")
logger.setLevel(logging.INFO)


async def entrypoint(ctx: JobContext):
    """
    Main entry point for the LiveKit agent
    Called when a participant joins a room
    """
    logger.info(f"🚀 Starting agent for room: {ctx.room.name}")

    # Load product configuration
    try:
        config_loader = ConfigLoader("config/products.json")
        prompt_builder = PromptBuilder(config_loader)
        logger.info(f"✅ Loaded {config_loader.get_products_count()} products from config")
    except Exception as e:
        logger.error(f"❌ Failed to load products config: {e}")
        raise  # Stop the agent if config can't be loaded

    # Initialize our custom engines with config_loader
    conversation_engine = ConversationalEngine(config_loader=config_loader)
    sales_analyzer = SalesAnalyzer(config_loader=config_loader)

    # Track conversation messages for analysis
    conversation_messages = []
    questions_count = 0
    report_sent = False  # Flag to prevent duplicate reports

    # Will be configured when participant joins with metadata
    user_name = "Thomas"
    event_name = ""
    max_questions = 5  # Default, will be updated from metadata
    existing_report = None  # Will be loaded from metadata if editing
    config_loaded = asyncio.Event()  # Signal when config is loaded

    # Pre-generate a simple opening message for instant delivery
    # This will be replaced with the real one if config provides a better one
    opening_message = f"Salut {user_name} ! Comment s'est passée ta journée ?"

    # Connect to the room first
    await ctx.connect()
    logger.info("🔌 Connected to LiveKit room")

    # Function to load config from participant metadata
    def load_participant_config(participant):
        nonlocal user_name, event_name, max_questions, existing_report, opening_message

        logger.info(f"👤 Loading config from participant: {participant.identity}")

        # Parse participant metadata
        if participant.metadata:
            try:
                metadata = json.loads(participant.metadata)
                logger.info(f"📋 Participant metadata: {metadata}")

                # Update user info
                user_name = metadata.get("userName", user_name)
                event_name = metadata.get("eventName", event_name)

                # Load existing report if provided (edit mode)
                if "existingReport" in metadata and metadata["existingReport"] is not None:
                    existing_report = metadata["existingReport"]
                    logger.info(f"📄 Found existing report - EDIT MODE")
                    logger.info(f"   - Sales data: {existing_report.get('sales', {})}")
                    logger.info(f"   - Last modified: {existing_report.get('lastModifiedAt', 'unknown')}")
                    logger.info(f"   - Previous insights: {len(existing_report.get('keyInsights', []))} insights")
                else:
                    logger.info("📄 No existing report - CREATION MODE")

                # Load assistant config if provided
                if "assistantConfig" in metadata:
                    config = metadata["assistantConfig"]
                    attention_points = config.get("attentionPoints", [])
                    logger.info(f"📋 Received assistant config with {len(attention_points)} attention points")

                    # Update conversation engine with custom config
                    conversation_engine.config = config

                    # Calculate dynamic max_questions
                    # EDIT MODE: Only 2 questions (opening + one follow-up)
                    if existing_report:
                        max_questions = 2
                        logger.info(f"📊 EDIT MODE - max_questions: {max_questions} (1 opening + 1 follow-up)")
                    else:
                        # CREATION MODE: Normal flow with all questions
                        max_questions = 2 + len(attention_points)
                        logger.info(f"📊 CREATION MODE - max_questions: {max_questions} (2 general + {len(attention_points)} attention points)")

                    # Log each attention point
                    for i, point in enumerate(attention_points, 1):
                        desc = point.get('description', 'Unknown')
                        # Clean description for logging
                        clean_desc = desc.split('_')[0] if '_' in desc else desc
                        logger.info(f"   {i}. {clean_desc.strip()}")

                    # Update opening message based on config (for instant delivery)
                    # Priority 1: Custom opening message from manager
                    if config.get("customOpeningMessage"):
                        # Replace {userName} placeholder if present
                        opening_message = config.get("customOpeningMessage").replace("{userName}", user_name)
                        logger.info("💬 Using CUSTOM opening message from manager")
                    # Priority 2: Edit mode message
                    elif existing_report:
                        opening_message = f"Salut {user_name} ! Tu veux compléter ton rapport de la journée ? Dis-moi ce qui a changé ou ce que tu veux ajouter."
                    # Priority 3: First attention point natural prompt
                    elif attention_points and attention_points[0].get("naturalPrompts"):
                        opening_message = f"Salut {user_name} ! {attention_points[0]['naturalPrompts'][0]}"
                    # Priority 4: Event name based message
                    elif event_name:
                        opening_message = f"Salut {user_name} ! Comment s'est passée ta journée au {event_name} ?"
                    # Priority 5: Generic fallback
                    else:
                        opening_message = f"Salut {user_name} ! Comment s'est passée ta journée ?"

                    logger.info(f"💬 Opening message prepared: {opening_message}")

            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse participant metadata: {e}")
        else:
            logger.warning("No metadata provided by participant, using defaults")

        # Signal that config is loaded
        config_loaded.set()

    # Register listener for future participants
    @ctx.room.on("participant_connected")
    def on_participant_connected(participant):
        load_participant_config(participant)

    # Check if participant is already present (common case - participant joins before agent)
    remote_participants = list(ctx.room.remote_participants.values())
    if remote_participants:
        logger.info(f"👥 Found {len(remote_participants)} participant(s) already in room")
        # Load config from first participant
        load_participant_config(remote_participants[0])

    # Wait for config to be loaded (either from existing participant or new connection)
    try:
        await asyncio.wait_for(config_loaded.wait(), timeout=5.0)
        logger.info("✅ Config loaded from participant metadata")
    except asyncio.TimeoutError:
        logger.warning("⚠️ Timeout waiting for participant metadata, using defaults")
        config_loaded.set()  # Unblock to continue with defaults

    # Opening message is now already prepared in load_participant_config for instant delivery
    logger.info(f"💬 Final opening message: {opening_message}")

    # Build system instructions for the agent (voice assistant - no JSON)
    system_prompt = conversation_engine.get_voice_assistant_prompt(existing_report=existing_report)
    instructions = f"{system_prompt}\n\nCommence par dire: {opening_message}"
    logger.info(f"📊 Final max_questions configured: {max_questions}")

    if existing_report:
        logger.info("🔄 EDIT MODE - Agent will focus on NEW or MODIFIED information only")
    else:
        logger.info("📝 CREATION MODE - Agent will collect all information from scratch")

    # Create AgentSession with voice pipeline configuration
    session = AgentSession(
        vad=silero.VAD.load(
            min_speech_duration=0.5,     # ↑ de 0.2 à 0.5s (ignorer bruits très courts)
            min_silence_duration=1.2,    # ↑ de 0.6 à 1.2s (attendre plus longtemps avant de considérer fin de phrase)
            prefix_padding_duration=0.3,  # ↑ de 0.2 à 0.3s (capturer début de phrase mieux)
        ),
        stt=openai.STT(
            model="whisper-1",
            language="fr",  # Force French language for transcription
        ),
        llm=openai.LLM(model="gpt-4o-mini"),
        tts=elevenlabs.TTS(
            model="eleven_turbo_v2_5",  # ✅ model (pas model_id)
            voice_id="5jCmrHdxbpU36l1wb3Ke",  # Voix française naturelle
            streaming_latency=4,  # ↑ de 3 à 4 (latence max pour plus de stabilité)
            language="fr",  # Code langue français
        ),
        # Paramètres anti-interruptions intempestives
        allow_interruptions=True,  # Garder les interruptions, mais filtrées
        min_interruption_duration=1.0,  # ↑ de 0.5s à 1.0s (parler 1s min pour interrompre)
        min_interruption_words=2,  # ↑ de 0 à 2 (au moins 2 mots pour interrompre)
        false_interruption_timeout=2.0,  # Détecter fausses interruptions après 2s
        resume_false_interruption=True,  # Reprendre la parole si fausse interruption
    # Paramètres ElevenLabs TTS valides:
    # model: "eleven_turbo_v2_5" (rapide) ou "eleven_multilingual_v2" (qualité)
    # voice_id: ID de la voix ElevenLabs
    # streaming_latency: 0-4 pour optimiser la latence
    # language: "fr" pour français (supporté par eleven_turbo_v2_5)
    )

    async def analyze_conversation_and_send_report():
        """Analyze the full conversation with Claude and send report to client"""
        logger.info("📊 Analyzing conversation to generate report...")

        # Build conversation history for Claude
        conversation_text = "\n".join([
            f"{msg['role'].upper()}: {msg['content']}"
            for msg in conversation_messages
        ])

        # Build attention points structure for report
        attention_points = conversation_engine.config.get("attentionPoints", [])
        attention_points_sections = []
        for i, point in enumerate(attention_points, 1):
            desc = point.get("description", "")
            # Clean description (remove technical IDs/metadata)
            clean_desc = desc.split('_')[0] if '_' in desc else desc
            clean_desc = clean_desc.strip()
            attention_points_sections.append(f'{i}. {clean_desc.upper()}')

        attention_structure = "\n".join(attention_points_sections) if attention_points_sections else "1. PRODUITS VENDUS\n2. RETOURS CLIENTS"

        # Use Claude to extract data with dynamically built prompt
        try:
            # Build the prompt dynamically from product configuration
            prompt = prompt_builder.build_claude_extraction_prompt(
                conversation_text=conversation_text,
                attention_structure=attention_structure
            )

            logger.info(f"📝 Generated dynamic prompt ({len(prompt)} chars)")

            # Call Claude with the dynamic prompt
            response = await conversation_engine.anthropic.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=2048,
                messages=[{
                    "role": "user",
                    "content": prompt
                }]
            )

            # Parse response (clean JSON from markdown if present)
            response_text = response.content[0].text.strip()

            # Remove markdown code blocks if present
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0].strip()
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0].strip()

            extracted_data = json.loads(response_text)
            logger.info(f"📊 Extracted data (before validation): {json.dumps(extracted_data, indent=2, ensure_ascii=False)}")

            # Validate that all products are present
            expected_products = config_loader.get_product_names_list()
            actual_products = list(extracted_data.get("sales", {}).keys())

            missing_products = set(expected_products) - set(actual_products)
            if missing_products:
                logger.warning(f"⚠️ Missing products in sales data: {missing_products}")
                # Add missing products with 0
                for product_name in missing_products:
                    extracted_data["sales"][product_name] = 0

            logger.info(f"✅ Extracted data validated: {len(extracted_data['sales'])} products")

            # Apply fuzzy matching to sales data using SalesAnalyzer
            if "sales" in extracted_data and extracted_data["sales"]:
                raw_sales = extracted_data["sales"]
                mapped_sales = sales_analyzer.map_sales_data(raw_sales)
                extracted_data["sales"] = mapped_sales
                logger.info(f"📊 Sales after fuzzy matching: {json.dumps(mapped_sales, indent=2, ensure_ascii=False)}")

            # Send data to client via DataReceived event
            data_message = {
                "type": "conversation_complete",
                "data": extracted_data
            }

            # Encode and send
            encoder = json.dumps(data_message).encode('utf-8')
            await ctx.room.local_participant.publish_data(
                payload=encoder,
                topic="conversation-complete"
            )
            logger.info("✅ Report sent to client via DataReceived")

        except Exception as e:
            logger.error(f"Failed to analyze conversation: {e}")
            import traceback
            logger.error(traceback.format_exc())

    # Set up event handlers
    @session.on("user_input_transcribed")
    def on_user_input(event: UserInputTranscribedEvent):
        logger.info(f"👤 User ({event.speaker_id}): {event.transcript} [final={event.is_final}]")

    @session.on("conversation_item_added")
    def on_conversation_item(event: ConversationItemAddedEvent):
        nonlocal questions_count, report_sent

        logger.info(f"💬 {event.item.role}: {event.item.text_content}")

        # Store message for analysis
        conversation_messages.append({
            "role": event.item.role,
            "content": event.item.text_content
        })

        # Count assistant questions (count ALL assistant messages as potential questions)
        if event.item.role == "assistant":
            # Don't count the opening greeting
            if len(conversation_messages) > 1:
                questions_count += 1
                logger.info(f"📊 Questions count: {questions_count}/{max_questions}")

        # Detect EXPLICIT conversation ending keywords in assistant messages
        # ONLY trigger on the explicit closing message
        ending_keywords = [
            "préparer ton rapport", "préparer le rapport", "générer ton rapport",
            "je vais préparer", "vais préparer ton rapport"
        ]

        # Check if conversation should end
        should_end = False
        if event.item.role == "assistant":
            text_lower = event.item.text_content.lower()
            # Only end if assistant explicitly says they will prepare the report
            if any(keyword in text_lower for keyword in ending_keywords):
                should_end = True
                logger.info(f"🏁 Ending keyword detected: {[k for k in ending_keywords if k in text_lower]}")

        # Check if user says the exact phrase to end
        if event.item.role == "user":
            text_lower = event.item.text_content.lower().strip()
            # Only trigger on the exact phrase: "j'ai fini, génère le rapport"
            if "j'ai fini" in text_lower and "génère le rapport" in text_lower:
                should_end = True
                logger.info("🏁 User explicitly requested report generation")

        # Or if max questions reached (but still wait for assistant's closing message)
        if questions_count >= max_questions and event.item.role == "assistant":
            should_end = True
            logger.info(f"🏁 Max questions reached: {questions_count}/{max_questions}")

        # End conversation and generate report ONCE at the end
        if should_end and len(conversation_messages) > 3 and not report_sent:
            logger.info("🏁 Conversation ending detected")
            report_sent = True  # Mark as sent to prevent duplicates

            async def finalize_conversation():
                # Send signal to client to stop recording IMMEDIATELY
                logger.info("📤 Sending 'conversation_ending' signal to client...")
                try:
                    ending_signal = {
                        "type": "conversation_ending",
                        "message": "Recording stopped, generating report..."
                    }
                    encoder = json.dumps(ending_signal).encode('utf-8')
                    await ctx.room.local_participant.publish_data(
                        payload=encoder,
                        topic="conversation-ending"
                    )
                    logger.info("✅ Ending signal sent to client")
                except Exception as e:
                    logger.error(f"Error sending ending signal: {e}")

                # Wait a tiny bit to ensure signal is received
                await asyncio.sleep(0.5)

                # NOW generate the report (client has stopped recording)
                logger.info("🔚 Generating final report (recording stopped on client)...")
                await analyze_conversation_and_send_report()

                # Wait a bit to ensure report is sent
                await asyncio.sleep(1)

                # Close the session after report is sent
                logger.info("🔚 Closing session...")
                await session.aclose()
                logger.info("✅ Conversation fully ended")

            asyncio.create_task(finalize_conversation())

    # Start the session
    await session.start(
        room=ctx.room,
        agent=Agent(instructions=instructions),
    )
    logger.info("🎤 Voice assistant started")

    # Say the opening message directly (bypass LLM for speed)
    logger.info("🔊 Playing opening message instantly...")
    await session.say(opening_message, allow_interruptions=False)
    logger.info("✅ Opening message played")

    # Session stays alive automatically - no need to wait
    logger.info("✅ Session running, agent will stay active until room closes")


if __name__ == "__main__":
    # Start the LiveKit agent worker
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
        )
    )
