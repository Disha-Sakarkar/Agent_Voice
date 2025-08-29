import logging
import asyncio
import uuid
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect, Query
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from assemblyai import RealtimeError
from assemblyai.streaming.v3 import (
    StreamingClient,
    StreamingClientOptions,
    StreamingEvents,
    StreamingParameters,
    TurnEvent
)

from services import google_gemini_service, murf_ai_service, iss_service

# --- Setup ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s | %(levelname)s | %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI()
app.mount("/static", StaticFiles(directory="frontend"), name="static")
templates = Jinja2Templates(directory="frontend")

# --- Endpoints ---
@app.get("/")
async def read_index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    assembly_key: str = Query(...),
    google_key: str = Query(...),
    murf_key: str = Query(...),
):
    await websocket.accept()
    logger.info("WebSocket connection established.")

    google_gemini_service.initialize(google_key)
    
    chat_history = []
    main_loop = asyncio.get_running_loop()
    transcript_queue = asyncio.Queue()

    def on_turn(self, event: TurnEvent):
        if event.transcript and event.end_of_turn:
            logger.info(f"Final transcript received: '{event.transcript}'")
            asyncio.run_coroutine_threadsafe(transcript_queue.put(event.transcript), main_loop)
        elif event.transcript:
            asyncio.run_coroutine_threadsafe(websocket.send_text(event.transcript), main_loop)

    async def process_final_transcript(text: str):
        await websocket.send_text("END_OF_TURN")
        nonlocal chat_history
        try:
            llm_response, updated_history = await google_gemini_service.get_chat_response(chat_history, text)
            chat_history = updated_history
            await websocket.send_text(f"AI_RESPONSE:{llm_response}")
            await murf_ai_service.stream_tts_audio(llm_response, murf_key, str(uuid.uuid4()), websocket)
        except Exception as e:
            logger.error(f"Error in Gemini/Murf pipeline: {e}")

    def on_error(error: RealtimeError):
        logger.error(f"AssemblyAI Streaming Error: {error}")

    client = StreamingClient(StreamingClientOptions(api_key=assembly_key))
    client.on(StreamingEvents.Turn, on_turn)
    client.on(StreamingEvents.Error, on_error)

    try:
        client.connect(StreamingParameters(sample_rate=16000))
        
        # --- 🎯 THIS IS THE CORRECTED PART 🎯 ---
        # We run the blocking stream method in a separate thread
        # and create tasks for receiving and processing.

        async def receive_audio():
            while True:
                data = await websocket.receive_bytes()
                # Use asyncio.to_thread to run the blocking function without blocking the event loop
                await asyncio.to_thread(client.stream, data)

        async def process_transcripts():
            while True:
                final_transcript = await transcript_queue.get()
                await process_final_transcript(final_transcript)
        
        # Run both tasks concurrently
        await asyncio.gather(receive_audio(), process_transcripts())
        # --- End of Correction ---

    except WebSocketDisconnect:
        logger.info("Client disconnected.")
    except Exception as e:
        logger.error(f"An error occurred in the main WebSocket task: {e}")
    finally:
        logger.info("Closing AssemblyAI connection.")
        client.disconnect()