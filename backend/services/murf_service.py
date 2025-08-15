# backend/services/murf_service.py

import requests
import os

MURF_API_KEY = os.getenv("MURF_API_KEY")

def text_to_speech(text: str, voice: str = "en-IN-priya") -> str:
    """Converts a string of text to speech using Murf AI and returns the audio URL."""
    try:
        url = "https://api.murf.ai/v1/speech/generate"
        headers = {"api-key": MURF_API_KEY, "Content-Type": "application/json"}
        body = {"text": text, "voiceId": voice, "format": "mp3"}
        
        response = requests.post(url, headers=headers, json=body)
        response.raise_for_status() # Raises an exception for bad status codes
        
        data = response.json()
        return data.get("audioFile")
    except Exception as e:
        raise e