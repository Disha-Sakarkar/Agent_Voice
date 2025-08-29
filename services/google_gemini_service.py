# services/google_gemini_service.py
import google.generativeai as genai
from typing import List, Tuple
import logging
from services import iss_service # Keep her special skill import

def initialize(api_key: str):
    genai.configure(api_key=api_key)
    logging.info("Google Gemini Service Initialized.")

async def get_chat_response(history: List, user_query: str) -> Tuple[str, List]:
    # --- Define ALL her tools in one place, just like in your code ---
    tools = [
        genai.protos.Tool(
            function_declarations=[
                # Skill 1: Story Weaver
                genai.protos.FunctionDeclaration(
                    name="create_fairy_tale",
                    description="Creates a short, whimsical fairy tale about a subject.",
                    parameters=genai.protos.Schema(
                        type=genai.protos.Type.OBJECT,
                        properties={
                            "subject": genai.protos.Schema(type=genai.protos.Type.STRING)
                        },
                        required=["subject"]
                    )
                ),
                # Skill 2: Royal Stargazer (ISS Location)
                genai.protos.FunctionDeclaration(
                    name="get_iss_location",
                    description="Gets the current location of the International Space Station and who is on board.",
                )
            ]
        )
    ]

    model = genai.GenerativeModel('gemini-1.5-flash', tools=tools)

    persona = (
        "You are Princess Sparkle, a kind and cheerful princess. You can tell stories and find the location of the royal space castle (the ISS). "
        "You must use your tools when asked."
    )

    # Reformat history to prevent errors on subsequent turns
    reformatted_history = []
    for item in history:
        if isinstance(item, dict):
            reformatted_history.append(item)
        elif hasattr(item, 'to_dict'):
            reformatted_history.append(item.to_dict())

    if not history:
        full_query = f"{persona}\n\nUSER: {user_query}\nPRINCESS SPARKLE:"
    else:
        full_query = user_query

    chat = model.start_chat(history=reformatted_history, enable_automatic_function_calling=False)
    response = await chat.send_message_async(full_query)

    try:
        function_call = response.candidates[0].content.parts[0].function_call
        result = None
        function_name = function_call.name

        if function_name == "create_fairy_tale":
            subject = function_call.args["subject"]
            # The "result" is just the LLM's own creativity, so we pass the prompt back
            result = f"You are Princess Sparkle. Tell a short, whimsical fairy tale about {subject}."

        elif function_name == "get_iss_location":
            # Call the actual ISS service
            result = iss_service.get_iss_data()

        if result:
            final_response = await chat.send_message_async(
                genai.protos.Part(
                    function_response=genai.protos.FunctionResponse(
                        name=function_name,
                        response={"result": result}
                    )
                )
            )
            return final_response.text, chat.history

    except (ValueError, AttributeError):
        # Not a function call, return the direct text response
        pass

    return response.text, chat.history