from fastapi import FastAPI, Request, HTTPException, UploadFile, File
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from dotenv import load_dotenv
import logging
import os

# Import our new schemas and services
from backend import schemas
from backend.services import assemblyai_service, gemini_service, murf_service

# --- Basic Setup & Configuration ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
load_dotenv(dotenv_path="C:/Users/disha/OneDrive/Desktop/murfai_agent/backend/.env")

# Initialize API keys for services (this ensures they are configured on startup)
import google.generativeai as genai
import assemblyai as aai
aai.settings.api_key = os.getenv("ASSEMBLYAI_API_KEY")
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

# --- FastAPI App Setup ---
app = FastAPI(title="AI Voice Agent API")
app.mount("/static", StaticFiles(directory="frontend"), name="static")
templates = Jinja2Templates(directory="frontend")

# In-memory datastore
chat_history_db = {}

# --- API Endpoints ---
@app.get("/", response_class=HTMLResponse, include_in_schema=False)
async def read_index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/agent/chat/{session_id}", 
          response_model=schemas.ChatResponse, 
          summary="Full conversational pipeline")
async def agent_chat(session_id: str, file: UploadFile = File(...)):
    if session_id not in chat_history_db:
        chat_history_db[session_id] = {"name": "New Chat", "history": []}

    try:
        # 1. Transcribe Audio
        temp_path = f"temp_chat_{session_id}.webm"
        with open(temp_path, "wb") as f: f.write(await file.read())
        user_text = assemblyai_service.transcribe_audio(temp_path)
        logging.info(f"Session {session_id}: User said - '{user_text}'")
        chat_history_db[session_id]["history"].append({"role": "user", "parts": [{"text": user_text}]})

        # 2. Get LLM Response
        llm_text = gemini_service.get_llm_response(chat_history_db[session_id]["history"])
        logging.info(f"Session {session_id}: Bot response - '{llm_text}'")
        chat_history_db[session_id]["history"].append({"role": "model", "parts": [{"text": llm_text}]})

        # 3. Generate Smart Title for New Chats
        if len(chat_history_db[session_id]["history"]) == 2:
            session_name = gemini_service.generate_session_title(user_text, llm_text)
            chat_history_db[session_id]["name"] = session_name
            logging.info(f"Session {session_id}: New name - '{session_name}'")

        # 4. Convert Response to Speech
        audio_url = murf_service.text_to_speech(llm_text)

        return schemas.ChatResponse(
            transcription=user_text,
            llm_response=llm_text,
            audio_url=audio_url,
            session_name=chat_history_db[session_id]["name"]
        )

    except Exception as e:
        logging.error(f"Session {session_id}: An error occurred in the pipeline - {e}")
        error_message = "I'm having trouble connecting right now. Please try again."
        try:
            # Attempt to generate a fallback audio response
            fallback_audio_url = murf_service.text_to_speech(error_message, voice="en-US-linda")
            return schemas.ChatResponse(is_error=True, error_message=error_message, audio_url=fallback_audio_url)
        except Exception as fallback_e:
            logging.error(f"Session {session_id}: Failed to generate fallback audio - {fallback_e}")
            raise HTTPException(status_code=503, detail="Core services are down.")

@app.get("/agent/sessions", 
         response_model=schemas.SessionList,
         summary="Get all session IDs and names")
async def get_sessions():
    sessions = [{"id": session_id, "name": data["name"]} for session_id, data in chat_history_db.items()]
    return schemas.SessionList(sessions=sessions)

@app.get("/agent/chat/{session_id}", 
         response_model=schemas.HistoryResponse,
         summary="Get chat history for a session")
async def get_chat_history(session_id: str):
    if session_id not in chat_history_db:
        raise HTTPException(status_code=404, detail="Session not found")
    return chat_history_db[session_id]