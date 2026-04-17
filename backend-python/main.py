import os
import time
import re
import json
import httpx
import numpy as np
import joblib
from sklearn.linear_model import SGDClassifier
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="DeepCheck Guard — AI Inference & ML Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"

# --- MACHINE LEARNING SETUP (HIGH VOLATILITY FOR DEMO) ---
MODEL_PATH = "model.pkl"
DATA_PATH = "data/training_data.json"
os.makedirs("data", exist_ok=True)

def initialize_model():
    if os.path.exists(MODEL_PATH):
        try:
            model = joblib.load(MODEL_PATH)
            print("✓ Loaded existing High-Volatility ML Model")
            return model
        except Exception:
            print("⚠️ Error loading model. Resetting.")

    print("🎲 Initializing High-Jitter SGDClassifier for Adversarial Demo.")
    # Parameters tuned for 'Catastrophic Forgetting' to show Zero-Day drops
    model = SGDClassifier(
        loss='log_loss', 
        learning_rate='constant', 
        eta0=0.03,        # Increased: Makes the model shift weights wildly per generation
        alpha=0.005  ,       # Minimal regularization: Model overfits the current tactic
        penalty='l2',
        warm_start=True,
        random_state=42
    )
    
    # Initialize classes [0: Safe, 1: Threat] with 15 features
    dummy_X = np.zeros((2, 15)) 
    dummy_y = np.array([0, 1])
    model.partial_fit(dummy_X, dummy_y, classes=np.array([0, 1]))
    return model

ml_model = initialize_model()

if not os.path.exists(DATA_PATH):
    with open(DATA_PATH, "w") as f:
        json.dump([], f)

# --- PYDANTIC MODELS ---
class FrameRequest(BaseModel):
    frame: str
    timestamp: Optional[float] = None

class AnalysisResult(BaseModel):
    model_config = {'protected_namespaces': ()}
    deepfake_detected: bool
    confidence: float
    authentic_score: float
    label: str
    model_used: str
    latency_ms: int
    reason: str

class PhishingRequest(BaseModel):
    features: List[float]

class TrainRequest(BaseModel):
    features: List[float]
    label: int

# --- ML PHISHING DETECTION LOGIC ---

@app.post("/analyze/phishing")
async def analyze_phishing(req: PhishingRequest):
    X = np.array(req.features).reshape(1, -1)
    
    try:
        # 1. Get the base probability
        proba = ml_model.predict_proba(X)[0]
        threat_score = float(proba[1])
        
        # 2. ADVERSARIAL DRIFT LOGIC
        # This prevents the score from staying at 100% or 0%
        # It adds a 'breathing' effect to the confidence
        if threat_score > 0.90:
            # If too confident, pull it down slightly to show it's 'thinking'
            threat_score -= np.random.uniform(0.05, 0.12)
        elif threat_score < 0.10 and threat_score > 0:
            # If very low, add a tiny bit of suspicion
            threat_score += np.random.uniform(0.01, 0.05)

        # 3. JITTER (The 'Live' Effect)
        # Adds a +/- 1.5% flicker so the dashboard looks active
        jitter = np.random.uniform(-0.015, 0.015)
        final_score = max(0.01, min(0.99, threat_score + jitter))
        
        return {
            "ml_score": final_score,
            "confidence": round(final_score * 100, 1) # Show 1 decimal place (e.g. 84.2%)
        }
    except Exception as e:
        return {"ml_score": 0.5, "confidence": 50.0}

@app.post("/train")
async def train_model(req: TrainRequest):
    try:
        with open(DATA_PATH, "r+") as f:
            data = json.load(f)
            data.append({"features": req.features, "label": req.label, "timestamp": time.time()})
            f.seek(0)
            json.dump(data, f)
    except Exception as e:
        print(f"Dataset log error: {e}")

    # Online learning step
    X = np.array(req.features).reshape(1, -1)
    y = np.array([req.label])
    
    ml_model.partial_fit(X, y)
    joblib.dump(ml_model, MODEL_PATH)
    
    print(f"🧠 ML Model evolved. Learned Label: {req.label}")
    return {"status": "success", "learned": True}


# --- DEEPFAKE VISION LOGIC (GEMINI) ---
last_analysis_time = 0
last_result = None

@app.get("/health")
async def health():
    return {"status": "ok", "service": "deepcheck-hybrid", "gemini_key_set": bool(GEMINI_API_KEY)}

@app.post("/analyze/frame", response_model=AnalysisResult)
async def analyze_frame(payload: FrameRequest):
    global last_analysis_time, last_result
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not set")

    start_time = time.time()
    time_since_last = time.time() - last_analysis_time
    if time_since_last < 20 and last_result is not None:
        return last_result

    frame_data = payload.frame
    if "," in frame_data:
        frame_data = frame_data.split(",")[1]

    body = {
        "contents": [{
            "parts": [
                {"inline_data": {"mime_type": "image/jpeg", "data": frame_data}},
                {"text": "Analyze this frame for AI generation. Respond ONLY in JSON: {'is_ai_generated': bool, 'confidence': 0-100, 'reason': 'string'}"}
            ]
        }],
        "generationConfig": {"temperature": 0.1}
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(GEMINI_URL, json=body)
            data = response.json()

        text_block = data["candidates"][0]["content"]["parts"][0]["text"].strip()
        json_match = re.search(r'\{.*\}', text_block, re.DOTALL)
        if json_match:
            result = json.loads(json_match.group())
            is_ai = result.get("is_ai_generated", False)
            confidence = float(result.get("confidence", 50))
            
            res_obj = AnalysisResult(
                deepfake_detected=is_ai,
                confidence=confidence if is_ai else (100 - confidence),
                authentic_score=100 - (confidence if is_ai else (100 - confidence)),
                label="FAKE" if is_ai else "REAL",
                model_used="gemini-2.5-flash-vision",
                latency_ms=int((time.time() - start_time) * 1000),
                reason=result.get("reason", "Analysis complete")
            )
            last_analysis_time = time.time()
            last_result = res_obj
            return res_obj
    except Exception as e:
        print(f"Vision error: {e}")
        raise HTTPException(status_code=500, detail="Vision analysis failed")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)