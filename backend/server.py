import os
import json
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
# Import the new library
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Configuration
app = Flask(__name__)
# CORS allows your browser-based React app to talk to this local Python script
CORS(app) 

# You can set your key here or in your environment variables
# Fetch the key securely
API_KEY = os.getenv("GEMINI_API_KEY") 
# Check if key exists
if not API_KEY:
    print("WARNING: GEMINI_API_KEY not found in environment variables.")
MODEL_NAME = "gemini-2.5-flash-preview-09-2025"
API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL_NAME}:generateContent"

@app.route('/generate-plan', methods=['POST'])
def generate_plan():
    """
    Receives user data from React, calls Gemini via Python, 
    and returns the structured plan.
    """
    try:
        data = request.json
        prompt = data.get('prompt')

        if not prompt:
            return jsonify({"error": "No prompt provided"}), 400

        if not API_KEY:
            return jsonify({"error": "Server missing API Key. Please set GEMINI_API_KEY env var."}), 500

        # Construct the request payload for Gemini
        payload = {
            "contents": [{ "parts": [{ "text": prompt }] }],
            "generationConfig": {
                "responseMimeType": "application/json"
            }
        }

        # Make the request to Google's API using Python's requests library
        response = requests.post(
            f"{API_URL}?key={API_KEY}",
            headers={'Content-Type': 'application/json'},
            json=payload
        )

        response.raise_for_status()
        gemini_data = response.json()

        # Parse the text response into a dictionary
        generated_text = gemini_data['candidates'][0]['content']['parts'][0]['text']
        
        # Clean potential markdown formatting
        clean_json = generated_text.replace("```json", "").replace("```", "").strip()
        plan = json.loads(clean_json)

        return jsonify(plan)

    except requests.exceptions.RequestException as e:
        print(f"API Request Error: {e}")
        return jsonify({"error": str(e)}), 500
    except json.JSONDecodeError as e:
        print(f"JSON Parsing Error: {e}")
        return jsonify({"error": "Failed to parse AI response"}), 500
    except Exception as e:
        print(f"Server Error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("Starting Python Logic Server on http://127.0.0.1:5000")
    app.run(debug=True, port=5000)