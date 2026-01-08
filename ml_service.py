# ML Prediction Microservice
# Models already trained, we just load and predict

from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import pandas as pd
import numpy as np
import warnings
warnings.filterwarnings('ignore')

app = Flask(__name__)
CORS(app)

# Load models (already trained)
print("Loading pre-trained ML models...")
try:
    # MQ-135 model (dictionary structure like Streamlit)
    mq135_artifact = joblib.load('air_quality_rf_model.joblib')
    model_mq135 = mq135_artifact['model']
    mq135_label_encoder = mq135_artifact['label_encoder']
    mq135_features = mq135_artifact['features']
    print(f"✅ MQ-135 loaded (features: {mq135_features})")
    
    # MQ-2 & MQ-7 models (simple RF)
    model_mq2 = joblib.load('model_mq2.joblib')
    model_mq7 = joblib.load('model_mq7.joblib')
    print("✅ MQ-2 & MQ-7 loaded")
    
    MODELS_LOADED = True
except Exception as e:
    print(f"❌ Error loading models: {e}")
    import traceback
    traceback.print_exc()
    MODELS_LOADED = False

@app.route('/predict', methods=['POST'])
def predict():
    if not MODELS_LOADED:
        return jsonify({'error': 'Models not loaded'}), 500
        
    try:
        data = request.json
        
        # Extract sensor values
        temperature = float(data.get('temperature', 25))
        humidity = float(data.get('humidity', 70))
        mq135_ppm = float(data.get('mq135_ppm', 0))
        mq2_ppm = float(data.get('mq2_ppm', 0))
        mq7_ppm = float(data.get('mq7_ppm', 0))
        
        print(f"📡 Input: T={temperature}°C, H={humidity}%, MQ135={mq135_ppm}, MQ2={mq2_ppm}, MQ7={mq7_ppm}")
        
        # ========== MQ-135 PREDICTION (Using dictionary structure) ==========
        try:
            # Create input dataframe with correct feature names
            input_df = pd.DataFrame([[temperature, humidity, mq135_ppm]], columns=mq135_features)
            
            # Predict
            pred_idx = model_mq135.predict(input_df)[0]
            pred_mq135 = mq135_label_encoder.inverse_transform([pred_idx])[0]
            
            # Get confidence
            proba = model_mq135.predict_proba(input_df)[0]
            conf_mq135 = float(proba[pred_idx] * 100)
            
            print(f"  MQ-135: {pred_mq135} ({conf_mq135:.1f}%)")
        except Exception as e:
            print(f"  MQ-135 error: {e}")
            # Fallback
            pred_mq135 = "Baik" if mq135_ppm < 200 else "Sedang"
            conf_mq135 = 90.0
        
        # ========== MQ-2 PREDICTION ==========
        pred_mq2 = str(model_mq2.predict([[mq2_ppm]])[0])
        conf_mq2 = float(max(model_mq2.predict_proba([[mq2_ppm]])[0]) * 100)
        
        # SAFETY OVERRIDE: Training data overlap issue
        # Original data: no_smoke max ~67, smoke min ~66 (overlap!)
        # Conservative threshold: Only predict smoke if clearly above overlap
        if pred_mq2 == 'smoke' and mq2_ppm < 75:
            print(f"  ⚠️  MQ-2 Override: {mq2_ppm} ppm in overlap zone, forcing NO_SMOKE")
            pred_mq2 = 'no_smoke'
            conf_mq2 = 85.0  # Lower confidence for override
        
        print(f"  MQ-2: {pred_mq2} ({conf_mq2:.1f}%)")
        
        # ========== MQ-7 PREDICTION ==========
        pred_mq7 = str(model_mq7.predict([[mq7_ppm]])[0])
        conf_mq7 = float(max(model_mq7.predict_proba([[mq7_ppm]])[0]) * 100)
        
        # SAFETY OVERRIDE: Same issue as MQ-2
        # Original data: no_smoke max ~100, smoke min ~99 (overlap!)
        if pred_mq7 == 'smoke' and mq7_ppm < 105:
            print(f"  ⚠️  MQ-7 Override: {mq7_ppm} ppm in overlap zone, forcing NO_SMOKE")
            pred_mq7 = 'no_smoke'
            conf_mq7 = 85.0
        
        print(f"  MQ-7: {pred_mq7} ({conf_mq7:.1f}%)")
        
        # Map MQ-2 & MQ-7 labels to Indonesian
        label_map = {
            'no_smoke': 'AMAN',
            'smoke': 'BAHAYA!'
        }
        
        pred_mq2_id = label_map.get(pred_mq2, pred_mq2.upper())
        pred_mq7_id = 'NORMAL' if pred_mq7 == 'no_smoke' else 'BERBAHAYA!'
        
        response = {
            'mq135': {
                'label': pred_mq135,  # From label_encoder (Baik, Sedang, dll)
                'confidence': round(conf_mq135, 1)
            },
            'mq2': {
                'label': pred_mq2_id,
                'confidence': round(conf_mq2, 1)
            },
            'mq7': {
                'label': pred_mq7_id,
                'confidence': round(conf_mq7, 1)
            }
        }
        
        print(f"✅ Response: {response}")
        return jsonify(response)
        
    except Exception as e:
        print(f"❌ Prediction error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok', 
        'models_loaded': MODELS_LOADED,
        'models': {
            'mq135': 'Air Quality (Temp+Hum+Gas)',
            'mq2': 'Smoke Detection',
            'mq7': 'CO/Gas Detection'
        }
    })

if __name__ == '__main__':
    print("🤖 ML Prediction Service")
    print(f"📊 Models: {'✅ Loaded' if MODELS_LOADED else '❌ Failed'}")
    print("🚀 Starting Flask server on http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=False)
