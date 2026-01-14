# FCM Service Setup Guide

## 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add Project" or "Create a project"
3. Enter project name: `net4think-lab-monitor` (or your choice)
4. Disable Google Analytics (optional, not needed for FCM)
5. Click "Create Project"

## 2. Generate Firebase Admin SDK Private Key

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Navigate to **Service Accounts** tab
3. Click **Generate New Private Key**
4. Click **Generate Key** to download JSON file
5. Rename downloaded file to `firebase-admin-key.json`
6. Place it in project root: `d:\Dataset\nextjs-lab-monitor\firebase-admin-key.json`

⚠️ **IMPORTANT:** Never commit this file to Git! It's already in `.gitignore`

## 3. Add Android App to Firebase

1. In Firebase Console, click "Add app" → Select Android icon
2. Enter Android package name: `com.example.net4think` (check your Flutter app's package)
   - Find in: `d:\Dataset\net4think\android\app\build.gradle` → `applicationId`
3. Download `google-services.json`
4. Place in: `d:\Dataset\net4think\android\app\google-services.json`

## 4. Add iOS App to Firebase (Optional)

1. In Firebase Console, click "Add app" → Select iOS icon
2. Enter iOS bundle ID (check Xcode or `ios/Runner.xcodeproj`)
3. Download `GoogleService-Info.plist`
4. Place in: `d:\Dataset\net4think\ios\Runner\GoogleService-Info.plist`

## 5. Install Dependencies

Backend (Node.js):
```bash
cd d:\Dataset\nextjs-lab-monitor
npm install
```

Flutter app (will do in Phase 2):
```bash
cd d:\Dataset\net4think
flutter pub add firebase_core firebase_messaging http
```

## 6. Test FCM Service

Start the server:
```bash
npm run dev
```

You should see:
```
✅ Server ready on http://localhost:3000
📡 MQTT client initialized
🔌 Socket.io ready for connections
🤖 ML Service URL: http://127.0.0.1:5000
🔥 FCM service initialized
✅ Firebase Admin SDK initialized
```

If you see "⚠️ firebase-admin-key.json not found", go back to step 2.

## 7. API Endpoints

Once server is running, these endpoints are available:

- **Register FCM Token:**
  ```bash
  POST http://localhost:3000/api/fcm/register
  Content-Type: application/json
  
  {
    "token": "FCM_TOKEN_FROM_FLUTTER_APP"
  }
  ```

- **Unregister Token:**
  ```bash
  POST http://localhost:3000/api/fcm/unregister
  Content-Type: application/json
  
  {
    "token": "FCM_TOKEN_FROM_FLUTTER_APP"
  }
  ```

- **List Registered Tokens:**
  ```bash
  GET http://localhost:3000/api/fcm/tokens
  ```

## Next Steps

Continue to **Phase 2: Flutter App Migration** to:
- Configure Firebase in Flutter app
- Implement FCM message handlers
- Register device token to backend
- Remove background service code
