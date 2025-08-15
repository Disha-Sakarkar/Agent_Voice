# backend/services/gemini_service.py

import google.generativeai as genai

def get_llm_response(history: list) -> str:
    """Gets a response from the Gemini LLM based on chat history."""
    try:
        model = genai.GenerativeModel('gemini-1.5-flash-latest')
        llm_response = model.generate_content(history)
        
        if not llm_response.text:
            raise Exception("LLM failed to generate a response text.")
            
        return llm_response.text
    except Exception as e:
        raise e

def generate_session_title(user_text: str, llm_text: str) -> str:
    """Generates a short, smart title for a new chat session."""
    try:
        prompt = f"Summarize the following conversation in 2 to 4 words to use as a short title. Be concise. \n\nUser: '{user_text}'\nBot: '{llm_text}'"
        model = genai.GenerativeModel('gemini-1.5-flash-latest')
        response = model.generate_content(prompt)
        
        return response.text.strip().replace('"', '') if response.text else "New Chat"
    except Exception:
        return "New Chat"