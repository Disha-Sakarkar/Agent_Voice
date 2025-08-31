# main.py
import logging
import asyncio
import uuid
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from assemblyai.streaming.v3 import (
    StreamingClient,
    StreamingClientOptions,
    StreamingEvents,
    StreamingParameters,
    StreamingError,
    TurnEvent,
    BeginEvent
)

# Import her specific services
from services import google_gemini_service, murf_ai_service, iss_service

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI()
app.mount("/static", StaticFiles(directory="frontend"), name="static")
templates = Jinja2Templates(directory="frontend")

@app.get("/")
async def read_index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    # --- This outer loop allows the endpoint to handle multiple sessions ---
    while True:
        try:
            await websocket.accept()
            logger.info("WebSocket connection established.")

            assemblyai_key = websocket.query_params.get('assemblyai_key')
            google_gemini_key = websocket.query_params.get('google_gemini_key')
            murf_ai_key = websocket.query_params.get('murf_ai_key')
            
            if not all([assemblyai_key, google_gemini_key, murf_ai_key]):
                await websocket.close(code=1008, reason="API keys are missing.")
                continue # Wait for a new connection with proper keys

            google_gemini_service.initialize(google_gemini_key)

            audio_queue = asyncio.Queue()
            main_loop = asyncio.get_running_loop()
            full_transcript = ""
            chat_history = []

            def on_turn(self, event: TurnEvent):
                nonlocal full_transcript, chat_history
                transcript = event.transcript
                if transcript:
                    full_transcript = transcript
                    asyncio.run_coroutine_threadsafe(websocket.send_text(full_transcript), main_loop)
                    
                    if event.end_of_turn:
                        logger.info(f"End of turn: '{full_transcript}'")
                        # Send final transcript before processing
                        asyncio.run_coroutine_threadsafe(
                            websocket.send_text(f"FINAL_TRANSCRIPT:{full_transcript}"), 
                            main_loop
                        )
                        async def get_gemini_and_respond_task(text):
                            nonlocal chat_history
                            try:
                                llm_response, new_history = await google_gemini_service.get_chat_response(chat_history, text)
                                if new_history:
                                    chat_history = new_history
                                
                                await websocket.send_text(f"AI_RESPONSE:{llm_response}")
                                await murf_ai_service.stream_tts_audio(llm_response, murf_ai_key, str(uuid.uuid4()), websocket)
                            except Exception as e:
                                logger.error(f"Error in Gemini/Murf pipeline: {e}")

                        asyncio.run_coroutine_threadsafe(get_gemini_and_respond_task(full_transcript), main_loop)
                        full_transcript = ""

            def on_error(self, error: StreamingError):
                logger.error(f"AssemblyAI Streaming Error: {error}")

            client = StreamingClient(
                StreamingClientOptions(api_key=assemblyai_key)
            )
            
            client.on(StreamingEvents.Turn, on_turn)
            client.on(StreamingEvents.Error, on_error)

            client.connect(StreamingParameters(sample_rate=16000))

            def audio_generator():
                while True:
                    try:
                        future = asyncio.run_coroutine_threadsafe(audio_queue.get(), main_loop)
                        chunk = future.result()
                        if chunk is None: break
                        yield chunk
                    except Exception as e:
                        logger.error(f"Error in audio generator: {e}")
                        break

            async def receive_audio():
                try:
                    while True:
                        data = await websocket.receive_bytes()
                        await audio_queue.put(data)
                except WebSocketDisconnect:
                    logger.info("Client disconnected.")
                    await audio_queue.put(None)

            stream_task = main_loop.run_in_executor(
                None,
                client.stream,
                audio_generator()
            )
            
            await receive_audio()

        except WebSocketDisconnect:
            logger.info("Client disconnected gracefully. Endpoint is ready for a new connection.")
        except Exception as e:
            logger.error(f"An unexpected error occurred in WebSocket endpoint: {e}")
            break # Exit the main while loop on critical server error
