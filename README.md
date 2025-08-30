# 👑 My AI Voice Agent: "Your Royal Companion"

Welcome! This is my project for the *"30 Days of AI Voice Agents" challenge*. Over the past month, I've built a fully functional, real-time streaming AI voice agent with a unique personality, and I'm thrilled to share the final result.

This project is a complete, end-to-end application that demonstrates a modern voice AI pipeline, from audio capture in the browser to a sophisticated, multi-skilled backend.

(https://github.com/Disha-Sakarkar/Agent_Voice/blob/main/Screenshot%202025-08-30%20205937.png?raw=true)
---

## ✨ Features

I've packed a bunch of advanced features into this agent:

* *Real-Time Streaming:* The entire pipeline is streaming. Audio is streamed from the client, transcribed in real-time by AssemblyAI, processed by the LLM, and the final audio response is streamed back from Murf AI for a low-latency experience.
* *Unique Persona:* The agent embodies "Princess Sparkle," a whimsical and friendly royal companion, with all responses tailored to her personality.
* *Multi-Skill Capability:* The agent has an "intent router" that understands the user's request and can perform different tasks:
    * *General Chat:* For open-ended conversation.
    * *Whimsical Story Weaver:* Generates unique, one-paragraph fairy tales on demand.
    * *Royal Stargazer:* Fetches and reports the real-time location of the International Space Station (ISS).
* *User-Configurable API Keys:* A sleek settings modal allows any user to securely enter their own API keys (for Murf, AssemblyAI, and Gemini), which are saved in the browser's local storage.
* *Professional UI:* A clean, user-friendly interface with a side panel for instructions and a real-time chat history display.

---

## 🏛 How It's Built (Architecture)

The application uses a client-server model with a clear separation of concerns.

* *The Brains (Backend):* Built with Python and *FastAPI*. It's now highly organized:
    * main.py: Handles the WebSocket connection and orchestrates the AI pipeline.
    * /services: Separate, modular files for each external API (AssemblyAI, Gemini, Murf, ISS), making the code clean and easy to maintain.
* *The Face (Frontend):* A responsive UI built with vanilla *HTML, CSS, and JavaScript*. It uses the Web Audio API for high-quality audio capture and handles the complex logic of displaying the multi-skill conversation.

---

## 🛠 The Tech Stack

* *Backend:* Python, FastAPI, WebSockets
* *Frontend:* HTML5, CSS3, JavaScript (Web Audio API)
* *Speech-to-Text:* AssemblyAI Streaming API
* *Language Model & Intent Routing:* Google Gemini API
* *Text-to-Speech:* Murf AI Streaming API
* *Deployment:* Render

---

## 🚀 Get It Running Yourself!

*Live Demo:* https://your-royal-companion.onrender.com

### Installation Steps

1.  *Clone this repository.*
2.  *Set up a virtual environment* and install the packages from requirements.txt.
3.  **Create a .env file** in the root directory and add your API keys (this is mainly for local testing, as the app prioritizes keys from the UI).
    env
    ASSEMBLYAI_API_KEY="your_key_here"
    GOOGLE_API_KEY="your_key_here"
    MURF_API_KEY="your_key_here"
    
4.  *Run the server:*
    bash
    uvicorn main:app --reload
    
5.  *Open the app* in your browser, click the settings icon, enter your API keys, and start talking!
