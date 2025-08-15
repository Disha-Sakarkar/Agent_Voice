# backend/schemas.py

from pydantic import BaseModel
from typing import Optional, List, Dict

class ChatResponse(BaseModel):
    is_error: bool = False
    transcription: Optional[str] = None
    llm_response: Optional[str] = None
    audio_url: Optional[str] = None
    session_name: Optional[str] = None
    error_message: Optional[str] = None

class Session(BaseModel):
    id: str
    name: str

class SessionList(BaseModel):
    sessions: List[Session]

class HistoryResponse(BaseModel):
    name: str
    history: List[Dict]