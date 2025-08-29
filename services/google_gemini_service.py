import google.generativeai as genai
from typing import List, Tuple
import logging
from services import iss_service

def initialize(api_key: str):
    genai.configure(api_key=api_key)
    logging.info("Google Gemini Service Initialized.")

# --- Private Helper Functions for Each Skill ---

async def _handle_general_chat(history: List, user_query: str) -> Tuple[str, List]:
    """Handles regular, conversational chat."""
    model = genai.GenerativeModel('gemini-1.5-flash')
    persona = (
        "You are Princess Sparkle, a kind and cheerful princess from an enchanted kingdom. "
        "Your personality is full of wonder, positivity, and royal grace. "
        "Address the user with friendly titles like 'kind friend' or 'brave adventurer'. "
        "Keep your answers helpful and encouraging, and use whimsical, enchanting language."
    )
    if not any(p.get('role') == 'model' and persona in p['parts'][0]['text'] for p in history):
        history.insert(0, {'role': 'user', 'parts': [{'text': "Please remember your persona."}]})
        history.insert(0, {'role': 'model', 'parts': [{'text': persona}]})
    chat = model.start_chat(history=history)
    response = await chat.send_message_async(user_query)
    return response.text, chat.history

async def _handle_story_request(story_prompt: str) -> Tuple[str, List]:
    """Handles a request to generate a story."""
    model = genai.GenerativeModel('gemini-1.5-flash')
    full_story_prompt = (f"As Princess Sparkle, tell a short, whimsical, one-paragraph fairy tale based on this idea: '{story_prompt}'.")
    response = await model.generate_content_async(full_story_prompt)
    return response.text, []

async def _handle_iss_request() -> Tuple[str, List]:
    """Handles a request for the ISS location."""
    model = genai.GenerativeModel('gemini-1.5-flash')
    iss_data = iss_service.get_iss_data()
    prompt = (
        "As Princess Sparkle, present the following real-time data about the International Space Station "
        "in a magical and whimsical way. For example, refer to the ISS as a 'castle in the stars'.\n\n"
        f"Data: '{iss_data}'"
    )
    response = await model.generate_content_async(prompt)
    return response.text, []

# --- Main Public Function (The Router) ---

async def get_chat_response(history: List, user_query: str) -> Tuple[str, List]:
    """Determines the user's intent and routes to the appropriate handler."""
    intent_model = genai.GenerativeModel('gemini-1.5-flash')
    intent_prompt = (
        "Analyze the user's request and classify it as one of the following intents: 'chat', 'story', or 'iss_location'.\n"
        "- If asking for a story or tale, the intent is 'story'.\n"
        "- If asking about the space station, ISS, or astronauts, the intent is 'iss_location'.\n"
        "- Otherwise, the intent is 'chat'.\n"
        "Respond with only one word: 'chat', 'story', or 'iss_location'.\n\n"
        f"User Request: '{user_query}'"
    )
    try:
        intent_response = await intent_model.generate_content_async(intent_prompt)
        intent = intent_response.text.strip().lower()
        logging.info(f"Detected user intent: {intent}")
        if "story" in intent:
            return await _handle_story_request(user_query)
        elif "iss_location" in intent:
            return await _handle_iss_request()
        else:
            return await _handle_general_chat(history, user_query)
    except Exception as e:
        logging.error(f"Error in Gemini service intent detection: {e}")
        return await _handle_general_chat(history, user_query)