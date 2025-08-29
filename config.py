import os
from pathlib import Path
from dotenv import load_dotenv

# This automatically finds the .env file in the root project folder
load_dotenv()

# Load all API keys into constants
MURF_API_KEY = os.getenv("MURF_API_KEY")
ASSEMBLYAI_API_KEY = os.getenv("ASSEMBLYAI_API_KEY")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")


# This check ensures your app fails fast if a key is missing
if not all([MURF_API_KEY, ASSEMBLYAI_API_KEY, GOOGLE_API_KEY]):
    raise RuntimeError("One or more required API keys are not set in the .env file.")