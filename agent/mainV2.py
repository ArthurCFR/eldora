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

load_dotenv()
logger = logging.getLogger("voyaltis-agent-v2")
logger.setLevel(logging.INFO)


def build_simple_instructions(user_name: str, attention_points: list, questions_asked: int, max_questions: int, first_question_in_opening: bool = False) -> str:
    """
    Build ultra-simple instructions for the agent
    No complex rules, just linear question flow
    """

    # Build attention points questions
    questions_list = []
    start_index = 2 if first_question_in_opening else 1

    for i, point in enumerate(attention_points, 1):
        desc = point.get("description", "")
        natural_prompts = point.get("naturalPrompts", [])

        if natural_prompts:
            questions_list.append(f"Question {i}: {natural_prompts[0]}")
        else:
            questions_list.append(f"Question {i}: Parle-moi de {desc.lower()}")

    if first_question_in_opening:
        status_message = f"La question 1 a déjà été posée dans le message d'ouverture. Tu dois maintenant attendre la réponse de {user_name}."
        next_action = f"Après avoir reçu la réponse à la question 1, pose la question 2."
    else:
        status_message = ""
        next_action = "Commence par poser la question 1."

    instructions = f"""Tu es un assistant vocal sympathique qui aide {user_name} à créer un rapport de vente.

TON RÔLE :
- Poser exactement {len(attention_points)} questions
- Une question à la fois
- Courtes et naturelles (max 15 mots)
- Écouter la réponse
- Passer à la question suivante

QUESTIONS À POSER (dans l'ordre) :
{chr(10).join(questions_list)}

PROGRESSION : Question {questions_asked}/{max_questions}
{status_message}

RÈGLES SIMPLES :
1. {next_action}
2. Attends la réponse
3. Passe à la suivante
4. Après la dernière question, dis : "Parfait ! Je vais préparer ton rapport."

IMPORTANT :
- Réponds en texte naturel conversationnel
- PAS de JSON
- Questions courtes et directes
- Reste sympathique et détendu
"""

    return instructions


async def entrypoint(ctx: JobContext):
    """
    Ultra-simplified entry point
    """
    logger.info(f"🚀 [V2] Starting simple agent for room: {ctx.room.name}")

    # Load configuration
    config_loader = ConfigLoader("config/products.json")
    prompt_builder = PromptBuilder(config_loader)
    sales_analyzer = SalesAnalyzer(config_loader=config_loader)

    # Simple state tracking
    conversation_messages = []
    questions_asked = 0
    report_sent = False
    session_ref = None  # Will hold session reference

    # Participant info
    user_name = "Thomas"
    event_name = ""
    attention_points = []

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
        nonlocal user_name, event_name, attention_points
        logger.info(f"👋 Participant connected: {participant.identity}")

        if participant.metadata:
            try:
                metadata = json.loads(participant.metadata)
                user_name = metadata.get("userName", user_name)
                event_name = metadata.get("eventName", event_name)

                assistant_config = metadata.get("assistantConfig", {})
                attention_points = assistant_config.get("attentionPoints", [])

                logger.info(f"👤 Loaded config: {user_name}, {len(attention_points)} attention points")
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

    max_questions = len(attention_points)
    logger.info(f"📊 Will ask {max_questions} questions")

    # Opening message - Include first question directly
    first_question = ""
    if attention_points:
        natural_prompts = attention_points[0].get("naturalPrompts", [])
        if natural_prompts:
            first_question = natural_prompts[0]
        else:
            desc = attention_points[0].get("description", "")
            first_question = f"Parle-moi de {desc.lower()}"

    opening_message = f"Salut {user_name} ! {first_question}"

    # Text response handler - generates response without TTS
    async def handle_text_response(user_text: str):
        """Handle text message and generate text-only response"""
        nonlocal questions_asked, report_sent

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
                first_question_in_opening=True
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

            # Count questions
            if len(conversation_messages) > 2:
                questions_asked += 1
                logger.info(f"📊 Questions: {questions_asked}/{max_questions}")

            # Check for conversation end
            should_end = False
            if questions_asked >= max_questions:
                text_lower = assistant_text.lower()
                if "préparer ton rapport" in text_lower or "préparer le rapport" in text_lower:
                    should_end = True
                    logger.info("🏁 End detected - all questions asked + closing message")

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
            streaming_latency=4,
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
                model="claude-3-5-sonnet-20241022",
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
        nonlocal questions_asked, report_sent

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
        if event.item.role == "assistant" and len(conversation_messages) > 2:
            questions_asked += 1
            logger.info(f"📊 Questions: {questions_asked}/{max_questions}")

        # Simple end detection: all questions asked + closing keyword
        should_end = False
        if event.item.role == "assistant" and questions_asked >= max_questions:
            text_lower = event.item.text_content.lower()
            if "préparer ton rapport" in text_lower or "préparer le rapport" in text_lower:
                should_end = True
                logger.info("🏁 End detected - all questions asked + closing message")
            elif questions_asked > max_questions:
                # Force end if we've exceeded max questions (safety)
                should_end = True
                logger.info("🏁 FORCE END - exceeded max questions")

        # Generate report
        if should_end and not report_sent:
            report_sent = True

            async def finalize():
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
                await session.aclose()
                logger.info("✅ Session closed")

            asyncio.create_task(finalize())

    # Start session with dynamic instructions
    initial_instructions = build_simple_instructions(
        user_name=user_name,
        attention_points=attention_points,
        questions_asked=questions_asked,
        max_questions=max_questions,
        first_question_in_opening=True
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
