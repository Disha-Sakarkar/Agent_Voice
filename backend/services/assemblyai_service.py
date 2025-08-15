# backend/services/assemblyai_service.py

import assemblyai as aai

def transcribe_audio(file_path: str) -> str:
    """Transcribes audio from a file path using AssemblyAI."""
    try:
        transcriber = aai.Transcriber()
        transcript = transcriber.transcribe(file_path)

        if transcript.error:
            raise Exception(f"AssemblyAI Error: {transcript.error}")
        if not transcript.text:
            raise Exception("Transcription returned empty text.")
            
        return transcript.text
    except Exception as e:
        # Re-raise the exception to be handled by the main endpoint
        raise e