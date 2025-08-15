# 🎙️ My AI Voice Agent Project

Welcome! This is my project for the **"30 Days of AI Voice Agents" challenge**. Over the last couple of weeks, I've been building a fully functional, voice-driven conversational AI from scratch, and I'm really excited to share my progress.

The goal was to create an agent you can actually talk to, that remembers your conversation, and feels intuitive to use. It's been a fantastic learning journey, and you can see the progress in action below!
---

## ✨ What It Can Do (Features)

I've packed a bunch of cool features into this agent:

* **Real-time Conversation:** You can speak directly to the bot and it talks back!
* **It Remembers! (Chat History):** The bot keeps track of the conversation, so you can ask follow-up questions without having to repeat yourself.
* **Multiple Chats:** Just like a real messaging app, you can have multiple, separate conversations. There's a side menu to switch between them.
* **Smart Naming:** I thought this was a neat touch – new chats get automatically named based on what you first talk about (e.g., "Planning a Trip").
* **Graceful Error Handling:** If one of the backend services has a hiccup, the bot will tell you it's having trouble, instead of just breaking.

---

## 🏛️ How It's Built (Architecture)

I kept the architecture straightforward and effective:

* **The Brains (Backend):** I built the server using Python and **FastAPI**. It's the core of the operation, handling all the logic and talking to the different AI services.
* **The Face (Frontend):** The user interface is built with plain old **HTML, CSS, and JavaScript**. No heavy frameworks, just clean, functional code to make the chat experience smooth.

When you talk to the agent, here's the journey your voice takes:
`Your Voice` -> `AssemblyAI (Speech-to-Text)` -> `My Python Server` -> `Google Gemini (LLM)` -> `My Python Server` -> `Murf AI (Text-to-Speech)` -> `Audio Response`

---

## 🛠️ The Tech Stack

Here are the key technologies and services I used to bring this project to life:

* **Backend:** Python, FastAPI, Uvicorn
* **Frontend:** HTML5, CSS3, JavaScript
* **Speech-to-Text:** AssemblyAI API
* **The AI Brain:** Google Gemini API
* **The Voice:** Murf AI API

---

## 🚀 Get It Running Yourself!

Want to try it out? Here’s how you can get this running on your machine.

### Prerequisites

First, you'll need **Python** installed. You'll also need to grab your own API keys from Murf AI, AssemblyAI, and Google Gemini.

### Installation Steps

1.  **Clone this repository:**
    ```bash
    git clone [https://your-repo-url.com/project-name.git](https://your-repo-url.com/project-name.git)
    cd project-name
    ```

2.  **Set up a virtual environment (always a good idea!):**
    ```bash
    python -m venv venv
    venv\Scripts\activate  # On Windows
    # source venv/bin/activate  # On macOS/Linux
    ```

3.  **Install the dependencies:**
    I've listed all the required packages in a `requirements.txt` file. Just run:
    ```bash
    pip install -r requirements.txt
    ```
    *(**Note:** You'll need to create a `requirements.txt` file and add `fastapi`, `uvicorn[standard]`, `python-dotenv`, `requests`, `google-generativeai`, and `assemblyai` to it.)*

4.  **Add your secret keys:**
    Create a file named `.env` in the main folder and paste your keys inside like this:
    ```env
    MURF_API_KEY="your_murf_api_key_here"
    ASSEMBLYAI_API_KEY="your_assemblyai_api_key_here"
    GOOGLE_API_KEY="your_google_api_key_here"
    ```

### Let's Go!

1.  **Start the server:**
    ```bash
    uvicorn main:app --reload
    ```

2.  **Open the app:**
    Head over to `http://127.0.0.1:8000` in your browser.

And that's it! You should be able to start chatting with your own AI voice agent. Enjoy!