# ML Prediction Microservice
# Models are loaded from local joblib artifacts and used for realtime predictions.

from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import os
import pandas as pd
import numpy as np
import warnings

warnings.filterwarnings('ignore')

app = Flask(__name__)
CORS(app)


def safe_float(value, default=0.0):
    if value is None:
        return default

    try:
        number = float(value)
    except (TypeError, ValueError):
        return default

    return number if np.isfinite(number) else default


def normalize_mq2_label(label):
    normalized = str(label).strip().lower()

    if normalized in {'no_smoke', 'aman', 'normal', 'safe', '0'}:
        return 'AMAN'

    if normalized in {'smoke', 'bahaya', 'berbahaya', 'danger', 'unsafe', '1'}:
        return 'BAHAYA!'

    return str(label).upper()


def normalize_mq7_label(label):
    normalized = str(label).strip().lower()

    if normalized in {'no_smoke', 'no_gas', 'aman', 'normal', 'safe', '0'}:
        return 'NORMAL'

    if normalized in {'smoke', 'gas', 'co', 'bahaya', 'berbahaya', 'danger', 'unsafe', '1'}:
        return 'BERBAHAYA!'

    return str(label).upper()


print("Loading pre-trained ML models...")
try:
    mq135_artifact = joblib.load('air_quality_rf_model.joblib')
    model_mq135 = mq135_artifact['model']
    mq135_label_encoder = mq135_artifact['label_encoder']
    mq135_features = mq135_artifact['features']
    print(f"MQ-135 loaded (features: {mq135_features})")

    model_mq2 = joblib.load('model_mq2.joblib')
    model_mq7 = joblib.load('model_mq7.joblib')
    print("MQ-2 and MQ-7 loaded")

    MODELS_LOADED = True
except Exception as e:
    print(f"Error loading models: {e}")
    import traceback
    traceback.print_exc()
    MODELS_LOADED = False


@app.route('/predict', methods=['POST'])
def predict():
    if not MODELS_LOADED:
        return jsonify({'error': 'Models not loaded'}), 500

    try:
        data = request.json or {}

        temperature = safe_float(data.get('temperature'))
        humidity = safe_float(data.get('humidity'))
        mq135_ppm = safe_float(data.get('mq135_ppm'))
        mq2_ppm = safe_float(data.get('mq2_ppm'))
        mq7_ppm = safe_float(data.get('mq7_ppm'))

        print(
            "Input: "
            f"T={temperature} deg C, H={humidity}%, "
            f"MQ135={mq135_ppm}, MQ2={mq2_ppm}, MQ7={mq7_ppm}"
        )

        try:
            input_df = pd.DataFrame([[temperature, humidity, mq135_ppm]], columns=mq135_features)
            pred_idx = model_mq135.predict(input_df)[0]
            pred_mq135 = mq135_label_encoder.inverse_transform([pred_idx])[0]

            proba = model_mq135.predict_proba(input_df)[0]
            conf_mq135 = float(proba[pred_idx] * 100)

            print(f"  MQ-135: {pred_mq135} ({conf_mq135:.1f}%)")
        except Exception as e:
            print(f"  MQ-135 error: {e}")
            if mq135_ppm < 200:
                pred_mq135 = "Baik"
            elif mq135_ppm < 350:
                pred_mq135 = "Sedang"
            elif mq135_ppm < 500:
                pred_mq135 = "Tidak_Sehat"
            else:
                pred_mq135 = "Berbahaya"
            conf_mq135 = 75.0

        pred_mq2 = str(model_mq2.predict([[mq2_ppm]])[0])
        conf_mq2 = float(max(model_mq2.predict_proba([[mq2_ppm]])[0]) * 100)
        pred_mq2_id = normalize_mq2_label(pred_mq2)
        print(f"  MQ-2: {pred_mq2_id} ({conf_mq2:.1f}%)")

        pred_mq7 = str(model_mq7.predict([[mq7_ppm]])[0])
        conf_mq7 = float(max(model_mq7.predict_proba([[mq7_ppm]])[0]) * 100)
        pred_mq7_id = normalize_mq7_label(pred_mq7)
        print(f"  MQ-7: {pred_mq7_id} ({conf_mq7:.1f}%)")

        response = {
            'mq135': {
                'label': pred_mq135,
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

        print(f"Response: {response}")
        return jsonify(response)

    except Exception as e:
        print(f"Prediction error: {e}")
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
    host = os.getenv('ML_HOST', '0.0.0.0')
    port = int(os.getenv('ML_PORT', '5000'))

    print("ML Prediction Service")
    print(f"Models: {'Loaded' if MODELS_LOADED else 'Failed'}")
    print(f"Starting Flask server on http://{host}:{port}")
    app.run(host=host, port=port, debug=False)
