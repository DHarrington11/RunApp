import os
import json
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# --- CONFIGURATION ---
# Database (Creates a local file named 'site.db')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///site.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
# Secret key for signing cookies/tokens (In production, move this to .env)
app.config['JWT_SECRET_KEY'] = os.getenv("JWT_SECRET_KEY", "super-secret-dev-key")

API_KEY = os.getenv("GEMINI_API_KEY")
MODEL_NAME = "gemini-2.5-flash-preview-09-2025"
API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL_NAME}:generateContent"

# --- INIT EXTENSIONS ---
db = SQLAlchemy(app)
bcrypt = Bcrypt(app)
jwt = JWTManager(app)

# --- DATABASE MODELS ---
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(60), nullable=False)

# Create tables automatically
with app.app_context():
    db.create_all()

# --- AUTH ROUTES ---

@app.route('/register', methods=['POST'])
def register():
    data = request.json
    email = data.get('email')
    password = data.get('password')

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already exists"}), 400

    # Hash the password so we don't store it in plain text
    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
    new_user = User(email=email, password=hashed_password)
    db.session.add(new_user)
    db.session.commit()

    access_token = create_access_token(identity=str(new_user.id))
    return jsonify({"token": access_token, "email": new_user.email}), 201

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')

    user = User.query.filter_by(email=email).first()

    if user and bcrypt.check_password_hash(user.password, data.get('password')):
        # CHANGE THIS LINE: Cast user.id to string
        access_token = create_access_token(identity=str(user.id)) 
        return jsonify({"token": access_token, "email": user.email}), 200
    else:
        return jsonify({"error": "Invalid email or password"}), 401

# --- CORE APP ROUTES ---

@app.route('/generate-plan', methods=['POST'])
@jwt_required() # Protect this route! User must be logged in.
def generate_plan():
    try:
        current_user_id = get_jwt_identity() # We can use this to save plans to specific users later
        data = request.json
        prompt = data.get('prompt')

        if not prompt:
            return jsonify({"error": "No prompt provided"}), 400

        if not API_KEY:
            return jsonify({"error": "Server missing API Key"}), 500

        payload = {
            "contents": [{ "parts": [{ "text": prompt }] }],
            "generationConfig": { "responseMimeType": "application/json" }
        }

        response = requests.post(
            f"{API_URL}?key={API_KEY}",
            headers={'Content-Type': 'application/json'},
            json=payload
        )

        response.raise_for_status()
        gemini_data = response.json()

        text = gemini_data['candidates'][0]['content']['parts'][0]['text']
        clean_json = text.replace("```json", "").replace("```", "").strip()
        plan = json.loads(clean_json)

        return jsonify(plan)

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("Starting Python Logic Server on http://127.0.0.1:5000")
    app.run(debug=True, port=5000)