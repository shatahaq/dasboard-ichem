// =============================================================================
// ESP32-S3 N16R8 LAB MONITORING - 3 SENSOR (MQ135, MQ2, MQ7)
// Hardware: ESP32-S3 + DHT22 + MQ135 + MQ2 + MQ7 + LEDs + Buzzer + LCD I2C
// WiFi Manager + MQTT
// =============================================================================

#include <WiFi.h>
#include <WiFiManager.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// ==================== ESP32-S3 N16R8 PIN CONFIG ====================
// DHT22
#define DHTPIN 4
#define DHTTYPE DHT22

// Sensor Gas (ADC1 Pins - Compatible dengan WiFi aktif)
#define MQ135_PIN 1     // GPIO1  - ADC1_CH0
#define MQ2_PIN   2     // GPIO2  - ADC1_CH1
#define MQ7_PIN   3     // GPIO3  - ADC1_CH2

// RGB LED (Common Cathode) & Buzzer
#define RGB_RED    5    // GPIO5 - Red pin
#define RGB_GREEN  6    // GPIO6 - Green pin
#define RGB_BLUE   7    // GPIO7 - Blue pin (not used, for future)
#define BUZZER     15   // GPIO15

// LCD I2C pins for ESP32-S3 (GPIO22 tidak tersedia di ESP32-S3)
#define I2C_SDA 8       // GPIO8 untuk SDA
#define I2C_SCL 9       // GPIO9 untuk SCL
#define LCD_ADDR 0x27   // I2C address (try 0x3F if not working)
#define LCD_COLS 16
#define LCD_ROWS 2

// WiFi Manager Config Button
#define BTN_CONFIG 0    // GPIO0 (Boot button)

// ==================== MQTT CONFIG ====================
const char* mqtt_server = "broker.hivemq.com";
const int mqtt_port = 1883;
const char* mqtt_client_id = "ESP32-LabMonitor-007";

// Topics
const char* pub_topic = "net4think/lab_monitor/data";
const char* sub_topic_mq135 = "net4think/lab_monitor/pred_mq135";
const char* sub_topic_mq2 = "net4think/lab_monitor/pred_mq2";
const char* sub_topic_mq7 = "net4think/lab_monitor/pred_mq7";

// ==================== TIMING ====================
unsigned long lastPublish = 0;
const unsigned long publishInterval = 1000; // 3 detik

// ==================== OBJECTS ====================
WiFiManager wm;
DHT dht(DHTPIN, DHTTYPE);
WiFiClient espClient;
PubSubClient client(espClient);
LiquidCrystal_I2C lcd(LCD_ADDR, LCD_COLS, LCD_ROWS);

// ==================== GLOBAL DATA ====================
float currentTemp = 0;
float currentHum = 0;
float currentMQ135 = 0;
float currentMQ2 = 0;
float currentMQ7 = 0;

String labelMQ135 = "Menunggu...";
String labelMQ2 = "Menunggu...";
String labelMQ7 = "Menunggu...";

// ==================== RGB LED HELPER ====================
void setRGB(bool red, bool green, bool blue) {
  digitalWrite(RGB_RED, red ? HIGH : LOW);
  digitalWrite(RGB_GREEN, green ? HIGH : LOW);
  digitalWrite(RGB_BLUE, blue ? HIGH : LOW);
}

// ==================== LED & BUZZER CONTROL ====================
void updateAlerts() {
  // DEBUG: Print current labels
  Serial.println("=== UPDATE ALERTS DEBUG ===");
  Serial.print("  MQ135: ["); Serial.print(labelMQ135); Serial.println("]");
  Serial.print("  MQ2:   ["); Serial.print(labelMQ2); Serial.println("]");
  Serial.print("  MQ7:   ["); Serial.print(labelMQ7); Serial.println("]");

  // Turn off all
  setRGB(false, false, false);
  noTone(BUZZER);

  bool isDanger = false;
  bool isWarning = false;

  // MQ-135 Check
  if (labelMQ135 == "Berbahaya" || labelMQ135 == "Tidak_Sehat") {
    isDanger = true;
    Serial.println("  ⚠️ MQ135 DANGER condition met!");
  } else if (labelMQ135 == "Sedang") {
    isWarning = true;
    Serial.println("  ⚠️ MQ135 WARNING condition met!");
  }

  // MQ-2 Check (Smoke)
  if (labelMQ2 == "BAHAYA!") {
    isDanger = true;
    Serial.println("  🔥 SMOKE DETECTED!");
  }

  // MQ-7 Check (CO)
  if (labelMQ7 == "BERBAHAYA!") {
    isDanger = true;
    Serial.println("  ☠️ CO/GAS DETECTED!");
  }

  // Set RGB LED colors
  Serial.print("  isDanger="); Serial.print(isDanger);
  Serial.print(", isWarning="); Serial.println(isWarning);

  if (isDanger) {
    setRGB(true, false, false);  // RED
    tone(BUZZER, 1500);
    Serial.println("🔴 ALERT: DANGER!");
  } else if (isWarning) {
    setRGB(true, true, false);   // YELLOW (RED + GREEN)
    Serial.println("🟡 WARNING: Moderate");
  } else {
    setRGB(false, true, false);  // GREEN
    Serial.println("🟢 STATUS: Normal");
  }
  Serial.println("===========================");
}

// ==================== LCD DISPLAY UPDATE ====================
void updateLCD() {
  lcd.setCursor(0, 0);
  lcd.print("T:");
  lcd.print(currentTemp, 1);
  lcd.print((char)223);  // Degree symbol
  lcd.print("C ");
  lcd.print("H:");
  lcd.print(currentHum, 0);
  lcd.print("%  ");

  lcd.setCursor(0, 1);
  if (labelMQ135 == "Berbahaya" || labelMQ135 == "Tidak_Sehat" || labelMQ2 == "BAHAYA!" || labelMQ7 == "BERBAHAYA!") {
    lcd.print("!! DANGER !!    ");
  } else if (labelMQ135 == "Sedang") {
    lcd.print("* WARNING *     ");
  } else {
    lcd.print("Status: OK      ");
  }
}

// ==================== MQTT CALLBACK ====================
void callback(char* topic, byte* payload, unsigned int length) {
  Serial.println("=== MQTT CALLBACK RECEIVED ===");
  Serial.print("Topic: "); Serial.println(topic);
  Serial.print("Payload length: "); Serial.println(length);

  // Print raw payload for debugging
  Serial.print("Raw payload: ");
  for (unsigned int i = 0; i < length; i++) {
    Serial.print((char)payload[i]);
  }
  Serial.println();

  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, payload, length);

  if (error) {
    Serial.print("❌ JSON Parse Error: ");
    Serial.println(error.c_str());
    return;
  }

  String topicStr = String(topic);
  const char* label = doc["label"] | "Unknown";

  Serial.print("Parsed label: ["); Serial.print(label); Serial.println("]");

  if (topicStr == sub_topic_mq135) {
    labelMQ135 = String(label);
    Serial.print("📡 MQ135 Updated: "); Serial.println(labelMQ135);
  }
  else if (topicStr == sub_topic_mq2) {
    labelMQ2 = String(label);
    Serial.print("📡 MQ2 Updated: "); Serial.println(labelMQ2);
  }
  else if (topicStr == sub_topic_mq7) {
    labelMQ7 = String(label);
    Serial.print("📡 MQ7 Updated: "); Serial.println(labelMQ7);
  }
  else {
    Serial.println("⚠️ Unknown topic!");
  }

  updateAlerts();
  Serial.println("==============================");
}

// ==================== MQTT RECONNECT ====================
void reconnect() {
  while (!client.connected()) {
    Serial.print("🔄 Connecting MQTT...");
    if (client.connect(mqtt_client_id)) {
      Serial.println(" ✅ Connected!");
      client.subscribe(sub_topic_mq135);
      client.subscribe(sub_topic_mq2);
      client.subscribe(sub_topic_mq7);
    } else {
      Serial.print(" ❌ Failed, rc=");
      Serial.print(client.state());
      delay(5000);
    }
  }
}

// ==================== SETUP ====================
void setup() {
  Serial.begin(115200);

  // Tunggu Serial ready (penting untuk ESP32-S3 USB-CDC)
  delay(3000);  // Delay 3 detik agar Serial Monitor siap
  while (!Serial) {
    delay(100); // Tunggu Serial tersambung
  }

  Serial.println();
  Serial.println("=====================================");
  Serial.println("  ESP32-S3 LAB MONITOR STARTING...   ");
  Serial.println("=====================================");

  // Initialize RGB LED pins
  pinMode(RGB_RED, OUTPUT);
  pinMode(RGB_GREEN, OUTPUT);
  pinMode(RGB_BLUE, OUTPUT);
  pinMode(BUZZER, OUTPUT);
  pinMode(BTN_CONFIG, INPUT_PULLUP);

  Serial.println("✓ GPIO Initialized");

  // Initialize LCD dengan pin custom untuk ESP32-S3
  Wire.begin(I2C_SDA, I2C_SCL);
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("I-Chem Monitor");
  lcd.setCursor(0, 1);
  lcd.print("Starting...");
  Serial.println("✓ LCD Initialized");

  dht.begin();
  Serial.println("✓ DHT22 Initialized");

  // ========== WIFI MANAGER ==========
  bool openPortal = false;

  // Cek tombol ditekan saat boot
  if (digitalRead(BTN_CONFIG) == LOW) {
    Serial.println("📶 Mode CONFIG WiFi aktif");
    openPortal = true;
    // Blink LED untuk indikasi config mode (Yellow = R+G)
    for (int i = 0; i < 5; i++) {
      setRGB(true, true, false);  // Yellow
      delay(200);
      setRGB(false, false, false);
      delay(200);
    }
    lcd.clear();
    lcd.print("WiFi Config");
    lcd.setCursor(0, 1);
    lcd.print("Mode...");
  }

  // Auto connect ke WiFi tersimpan
  if (!openPortal) {
    Serial.println("🔄 Connecting to saved WiFi...");
    if (!wm.autoConnect("I-Chem", "12345678")) {
      Serial.println("❌ WiFi Failed! Restarting...");
      ESP.restart();
    }
  }

  // Buka portal config jika tombol ditekan
  if (openPortal) {
    wm.setConfigPortalTimeout(180); // 3 menit timeout
    wm.startConfigPortal("I-Chem", "12345678");
  }

  Serial.println("✅ WiFi Connected!");
  Serial.print("📍 IP: ");
  Serial.println(WiFi.localIP());

  // MQTT Setup
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);

  Serial.println("🚀 Lab Monitor Ready!");

  // Indikasi ready (Green LED)
  setRGB(false, true, false);  // Green
  lcd.clear();
  lcd.print("I-Chem Ready!");
  lcd.setCursor(0, 1);
  lcd.print(WiFi.localIP());
  delay(2000);
  setRGB(false, false, false);
}

// ==================== LOOP ====================
void loop() {
  if (!client.connected()) reconnect();
  client.loop();

  unsigned long currentMillis = millis();

  // --- PUBLISH DATA (Every 3 seconds) ---
  if (currentMillis - lastPublish >= publishInterval) {
    lastPublish = currentMillis;

    // Read DHT22
    float temp = dht.readTemperature();
    float hum = dht.readHumidity();

    // Read Gas Sensors
    int mq135Raw = analogRead(MQ135_PIN);
    int mq2Raw = analogRead(MQ2_PIN);
    int mq7Raw = analogRead(MQ7_PIN);

    // Convert to PPM - SCALING KE ARDUINO TRAINING DATA (ADJUSTED)
    // Training data Arduino: no_smoke MQ2 ~55 ppm, MQ7 ~82 ppm
    // Adjusted scaling untuk menghindari false positive
    // Target: MQ2 ~48-50 ppm, MQ7 ~78-80 ppm (lebih rendah dari overlap zone)
    float mq135_ppm = (mq135Raw / 4095.0) * 1000.0 *0.5;
    float mq2_ppm = (mq2Raw / 4095.0) * 1000.0 * 0.30;   // Scale lebih rendah
    float mq7_ppm = (mq7Raw / 4095.0) * 1000.0 * 0.40;

    if (isnan(temp) || isnan(hum)) {
      Serial.println("❌ DHT Sensor Error");
      return;
    }

    // Update globals
    currentTemp = temp;
    currentHum = hum;
    currentMQ135 = mq135_ppm;
    currentMQ2 = mq2_ppm;
    currentMQ7 = mq7_ppm;

    // Update LCD display
    updateLCD();

    // Create JSON payload
    StaticJsonDocument<512> doc;
    doc["temperature"] = round(temp * 10) / 10.0;
    doc["humidity"] = round(hum * 10) / 10.0;
    doc["mq135_ppm"] = round(mq135_ppm * 10) / 10.0;
    doc["mq2_ppm"] = round(mq2_ppm * 10) / 10.0;
    doc["mq7_ppm"] = round(mq7_ppm * 10) / 10.0;

    char buffer[512];
    serializeJson(doc, buffer);
    client.publish(pub_topic, buffer);

    Serial.print("📡 T:"); Serial.print(temp, 1);
    Serial.print("°C H:"); Serial.print(hum, 1);
    Serial.print("% | MQ135:"); Serial.print(mq135_ppm, 1);
    Serial.print(" MQ2:"); Serial.print(mq2_ppm, 1);
    Serial.print(" MQ7:"); Serial.println(mq7_ppm, 1);

    // Update LED & Buzzer status setiap publish
    updateAlerts();
  }
}
