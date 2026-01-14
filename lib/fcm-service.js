// lib/fcm-service.js - Firebase Cloud Messaging Service
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Path to FCM tokens storage
const FCM_TOKENS_FILE = path.join(__dirname, '..', 'fcm-tokens.json');

// In-memory tracking of previous status to detect changes
const previousStatus = {
    mq135: null,
    mq2: null,
    mq7: null
};

let fcmInitialized = false;

/**
 * Initialize Firebase Admin SDK
 * Requires firebase-admin-key.json in project root
 */
function initializeFCM() {
    if (fcmInitialized) {
        console.log('🔥 FCM already initialized');
        return;
    }

    try {
        const serviceAccountPath = path.join(__dirname, '..', 'firebase-admin-key.json');

        if (!fs.existsSync(serviceAccountPath)) {
            console.warn('⚠️  firebase-admin-key.json not found. FCM notifications disabled.');
            console.warn('   Download from Firebase Console: Project Settings > Service Accounts > Generate Private Key');
            return;
        }

        const serviceAccount = require(serviceAccountPath);

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });

        fcmInitialized = true;
        console.log('✅ Firebase Admin SDK initialized');

        // Ensure tokens file exists
        if (!fs.existsSync(FCM_TOKENS_FILE)) {
            fs.writeFileSync(FCM_TOKENS_FILE, JSON.stringify({ tokens: [] }, null, 2));
            console.log('📄 Created fcm-tokens.json');
        }
    } catch (error) {
        console.error('❌ FCM initialization error:', error.message);
    }
}

/**
 * Load FCM tokens from file
 * @returns {Array<string>} Array of FCM tokens
 */
function loadTokens() {
    try {
        if (!fs.existsSync(FCM_TOKENS_FILE)) {
            return [];
        }
        const data = fs.readFileSync(FCM_TOKENS_FILE, 'utf8');
        const json = JSON.parse(data);
        return json.tokens || [];
    } catch (error) {
        console.error('❌ Error loading FCM tokens:', error.message);
        return [];
    }
}

/**
 * Save FCM tokens to file
 * @param {Array<string>} tokens - Array of FCM tokens
 */
function saveTokens(tokens) {
    try {
        fs.writeFileSync(FCM_TOKENS_FILE, JSON.stringify({ tokens }, null, 2));
    } catch (error) {
        console.error('❌ Error saving FCM tokens:', error.message);
    }
}

/**
 * Register a new FCM token
 * @param {string} token - FCM token from Flutter app
 * @returns {boolean} Success status
 */
function registerToken(token) {
    if (!token || typeof token !== 'string') {
        return false;
    }

    try {
        const tokens = loadTokens();

        // Avoid duplicates
        if (tokens.includes(token)) {
            console.log('ℹ️  Token already registered');
            return true;
        }

        tokens.push(token);
        saveTokens(tokens);
        console.log('✅ FCM token registered:', token.substring(0, 20) + '...');
        return true;
    } catch (error) {
        console.error('❌ Error registering token:', error.message);
        return false;
    }
}

/**
 * Unregister an FCM token
 * @param {string} token - FCM token to remove
 * @returns {boolean} Success status
 */
function unregisterToken(token) {
    if (!token || typeof token !== 'string') {
        return false;
    }

    try {
        const tokens = loadTokens();
        const filtered = tokens.filter(t => t !== token);

        if (filtered.length === tokens.length) {
            console.log('ℹ️  Token not found');
            return false;
        }

        saveTokens(filtered);
        console.log('✅ FCM token unregistered');
        return true;
    } catch (error) {
        console.error('❌ Error unregistering token:', error.message);
        return false;
    }
}

/**
 * Get all registered tokens
 * @returns {Array<string>} Array of FCM tokens
 */
function getTokens() {
    return loadTokens();
}

/**
 * Determine notification priority and type based on status label
 * @param {string} label - Prediction label (e.g., "AMAN", "BAHAYA", etc.)
 * @returns {Object} Notification config
 */
function getNotificationConfig(label) {
    const upperLabel = (label || '').toUpperCase();

    // Danger keywords
    if (upperLabel.includes('BAHAYA') ||
        upperLabel.includes('BURUK') ||
        upperLabel.includes('TIDAK SEHAT') ||
        upperLabel.includes('TIDAK AMAN') ||
        upperLabel.includes('BERBAHAYA')) {
        return {
            priority: 'high',
            type: 'danger',
            icon: '🚨',
            color: '#EF4444', // Red
            sound: 'alarm'
        };
    }

    // Warning keywords
    if (upperLabel.includes('WASPADA') ||
        upperLabel.includes('SEDANG') ||
        upperLabel.includes('PERHATIAN')) {
        return {
            priority: 'high',
            type: 'warning',
            icon: '⚠️',
            color: '#F59E0B', // Amber
            sound: 'default'
        };
    }

    // Safe keywords
    return {
        priority: 'default',
        type: 'safe',
        icon: '✅',
        color: '#10B981', // Green
        sound: 'default'
    };
}

/**
 * Send FCM notification to all registered devices
 * @param {string} sensor - Sensor name (e.g., "MQ-135")
 * @param {string} newStatus - New status label
 * @param {number} confidence - ML confidence score
 */
async function sendStatusChangeNotification(sensor, newStatus, confidence) {
    if (!fcmInitialized) {
        console.log('⚠️  FCM not initialized, skipping notification');
        return;
    }

    const tokens = loadTokens();

    if (tokens.length === 0) {
        console.log('ℹ️  No FCM tokens registered, skipping notification');
        return;
    }

    const config = getNotificationConfig(newStatus);

    // Notification payload
    const message = {
        notification: {
            title: `${config.icon} ${config.type === 'danger' ? 'ALERT BAHAYA' : 'Status Update'}: ${sensor}`,
            body: `Status berubah menjadi ${newStatus} (Confidence: ${confidence}%)${config.type === 'danger' ? ' - SEGERA EVAKUASI!' : ''}`,
        },
        data: {
            sensor: sensor.toLowerCase(),
            status: newStatus,
            confidence: confidence.toString(),
            type: config.type,
            timestamp: new Date().toISOString()
        },
        android: {
            priority: config.priority,
            notification: {
                sound: config.sound,
                color: config.color,
                channelId: 'chem_monitor_channel'
            }
        },
        apns: {
            payload: {
                aps: {
                    sound: config.sound,
                    badge: 1
                }
            }
        },
        tokens: tokens
    };

    try {
        // Use sendEachForMulticast for better compatibility
        const response = await admin.messaging().sendEachForMulticast(message);

        console.log(`📤 Sent ${config.type} notification for ${sensor}:`, newStatus);
        console.log(`   ✅ Success: ${response.successCount}, ❌ Failed: ${response.failureCount}`);

        // Clean up invalid tokens
        if (response.failureCount > 0) {
            const validTokens = [];
            response.responses.forEach((resp, idx) => {
                if (resp.success) {
                    validTokens.push(tokens[idx]);
                } else {
                    console.log(`   ⚠️  Removed invalid token: ${tokens[idx].substring(0, 20)}...`);
                }
            });
            saveTokens(validTokens);
        }
    } catch (error) {
        console.error('❌ Error sending FCM notification:', error.message);
    }
}

/**
 * Check for status changes and send notifications
 * Called after ML predictions are received
 * @param {Object} predictions - ML predictions object from Python service
 */
async function checkAndNotifyStatusChanges(predictions) {
    if (!fcmInitialized) {
        return;
    }

    try {
        // Check MQ-135
        if (predictions.mq135 && predictions.mq135.label) {
            const newStatus = predictions.mq135.label;
            const confidence = Math.round(predictions.mq135.confidence || 0);

            if (previousStatus.mq135 && previousStatus.mq135 !== newStatus) {
                await sendStatusChangeNotification('MQ-135', newStatus, confidence);
            }
            previousStatus.mq135 = newStatus;
        }

        // Check MQ-2
        if (predictions.mq2 && predictions.mq2.label) {
            const newStatus = predictions.mq2.label;
            const confidence = Math.round(predictions.mq2.confidence || 0);

            if (previousStatus.mq2 && previousStatus.mq2 !== newStatus) {
                await sendStatusChangeNotification('MQ-2', newStatus, confidence);
            }
            previousStatus.mq2 = newStatus;
        }

        // Check MQ-7
        if (predictions.mq7 && predictions.mq7.label) {
            const newStatus = predictions.mq7.label;
            const confidence = Math.round(predictions.mq7.confidence || 0);

            if (previousStatus.mq7 && previousStatus.mq7 !== newStatus) {
                await sendStatusChangeNotification('MQ-7', newStatus, confidence);
            }
            previousStatus.mq7 = newStatus;
        }
    } catch (error) {
        console.error('❌ Error in checkAndNotifyStatusChanges:', error.message);
    }
}

module.exports = {
    initializeFCM,
    registerToken,
    unregisterToken,
    getTokens,
    checkAndNotifyStatusChanges
};
