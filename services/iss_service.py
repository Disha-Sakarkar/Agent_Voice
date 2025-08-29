# services/iss_service.py

import requests
import logging

def get_iss_data() -> str:
    """
    Fetches real-time data about the International Space Station (ISS).
    
    :return: A formatted string with the ISS location and astronaut names.
    """
    try:
        logging.info("Fetching ISS location...")
        location_response = requests.get("http://api.open-notify.org/iss-now.json")
        location_response.raise_for_status()
        location_data = location_response.json()
        
        lat = location_data['iss_position']['latitude']
        lon = location_data['iss_position']['longitude']
        
        logging.info("Fetching astronaut data...")
        people_response = requests.get("http://api.open-notify.org/astros.json")
        people_response.raise_for_status()
        people_data = people_response.json()
        
        astronauts = [person['name'] for person in people_data['people'] if person['craft'] == 'ISS']
        
        # We will return the raw data and let the LLM make it sound magical
        return f"The ISS is currently at latitude {lat} and longitude {lon}. The astronauts on board are: {', '.join(astronauts)}."

    except Exception as e:
        logging.error(f"Could not fetch ISS data: {e}")
        return "I'm sorry, a mysterious nebula is blocking my view of the stars right now."