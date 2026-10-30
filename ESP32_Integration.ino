#include <Arduino.h>
#include <WiFi.h>
#include <esp_now.h>
#include <esp_wifi.h>
#include <esp_mac.h>
#include <time.h>
#include <Firebase_ESP_Client.h>
#include <DHT.h>
#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"

// ================= WIFI =================
#define WIFI_SSID     "Strawhats"
#define WIFI_PASSWORD "shikajm.r9776"

// ================= FIREBASE =================
#define FIREBASE_API_KEY "AIzaSyA0v6MgduPFUY1wOdDmvXkklP8ocWVnreE"
// Note: URL without trailing slash is required by Firebase_ESP_Client
#define DATABASE_URL "https://smart-polyhouse-dc97b-default-rtdb.asia-southeast1.firebasedatabase.app"

#define FIREBASE_USER_EMAIL "polyhouse299@gmail.com"
#define FIREBASE_USER_PASSWORD "Polyhouse@123"

// ================= ESP-NOW =================
uint8_t receiverMAC[] = {
  0xC0, 0xCD, 0xD6,
  0x84, 0x8E, 0x2C
};

// ================= DHT =================
#define DHTTYPE DHT11
#define DHT1_PIN 33
#define DHT2_PIN 25

DHT dht1(DHT1_PIN, DHTTYPE);
DHT dht2(DHT2_PIN, DHTTYPE);

// ================= SENSOR PINS =================
#define LDR1_PIN 36
#define LDR2_PIN 39

#define SOIL1_PIN 35
#define SOIL2_PIN 27

#define MQ2_PIN 34

// ================= LED PINS =================
#define LED1_PIN 18
#define LED2_PIN 19
#define LED3_PIN 5
#define LED4_PIN 4

#define HUMIDIFIER_PIN 23

// ================= LDR CALIBRATION =================
#define LDR_BRIGHT 300
#define LDR_DARK 3500

// ================= TIMING =================
#define SENSOR_INTERVAL 2000
#define FIREBASE_INTERVAL 5000
#define LIGHT_DEBUG_INTERVAL 500

// ================= FIREBASE =================
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// ================= ESP-NOW PACKET =================
typedef struct {
  uint32_t sequence;

  float temp1;
  float temp2;

  float hum1;
  float hum2;

  int ldr1;
  int ldr2;

  int soil1Percent;
  bool soil2Wet;

  int mq2;

  int led12Percent;
  int led34Percent;

  int pwm1;
  int pwm2;

  float hoursLit;

  bool humidifierState;
} SensorData;

SensorData sensorData;

// ================= SENSOR VARIABLES =================
float ldr1Smooth = 2000;
float ldr2Smooth = 2000;

float temp1 = 0;
float temp2 = 0;

float hum1 = 0;
float hum2 = 0;

int soil1Percent = 0;
bool soil2Wet = false;

int mq2 = 0;

bool humidifierState = false;

// ================= LIGHT VARIABLES =================
int rawLdr1 = 0;
int rawLdr2 = 0;

int ldr1 = 0;
int ldr2 = 0;

int bright1 = 0;
int bright2 = 0;

int led12Percent = 0;
int led34Percent = 0;

bool ledPWMReady = false;

// ================= TIMERS =================
float hoursLit = 0;

uint32_t packetSequence = 0;

unsigned long litMillis = 0;
unsigned long sensorMillis = 0;
unsigned long firebaseMillis = 0;
unsigned long lightDebugMillis = 0;

// ================= PRINT MAC =================
void printMasterMAC() {
  uint8_t mac[6];

  esp_read_mac(mac, ESP_MAC_WIFI_STA);

  Serial.print("Master MAC: ");

  for (int i = 0; i < 6; i++) {
    if (mac[i] < 16) Serial.print("0");
    Serial.print(mac[i], HEX);
    if (i < 5) Serial.print(":");
  }

  Serial.println();
}

// ================= PWM SETUP =================
void setupLEDs() {

  bool led1OK = ledcAttach(LED1_PIN, 5000, 8);
  bool led2OK = ledcAttach(LED2_PIN, 5000, 8);
  bool led3OK = ledcAttach(LED3_PIN, 5000, 8);
  bool led4OK = ledcAttach(LED4_PIN, 5000, 8);

  ledPWMReady = led1OK && led2OK && led3OK && led4OK;

  Serial.println("\n========== LED PWM SETUP ==========");

  Serial.printf("LED1 GPIO18: %s\n", led1OK ? "OK" : "FAILED");
  Serial.printf("LED2 GPIO19: %s\n", led2OK ? "OK" : "FAILED");
  Serial.printf("LED3 GPIO5 : %s\n", led3OK ? "OK" : "FAILED");
  Serial.printf("LED4 GPIO4 : %s\n", led4OK ? "OK" : "FAILED");

  if (!ledPWMReady) {
    Serial.println("ERROR: One or more LED PWM channels failed!");
    return;
  }

  // Startup LED test
  Serial.println("Testing all LEDs...");

  ledcWrite(LED1_PIN, 255);
  ledcWrite(LED2_PIN, 255);
  ledcWrite(LED3_PIN, 255);
  ledcWrite(LED4_PIN, 255);

  delay(500);

  ledcWrite(LED1_PIN, 0);
  ledcWrite(LED2_PIN, 0);
  ledcWrite(LED3_PIN, 0);
  ledcWrite(LED4_PIN, 0);

  Serial.println("LED test completed");
  Serial.println("==================================\n");
}

// ================= ORIGINAL LDR LIGHT LOGIC =================
void updateLighting() {

  // Read both LDRs
  rawLdr1 = analogRead(LDR1_PIN);
  rawLdr2 = analogRead(LDR2_PIN);

  // Original smoothing logic
  ldr1Smooth = (ldr1Smooth * 0.7) + (rawLdr1 * 0.3);
  ldr2Smooth = (ldr2Smooth * 0.7) + (rawLdr2 * 0.3);

  ldr1 = (int)ldr1Smooth;
  ldr2 = (int)ldr2Smooth;

  // Original brightness mapping
  // Bright sunlight = LED OFF
  // Darkness = LED ON
  bright1 = constrain(
    map(ldr1, LDR_BRIGHT, LDR_DARK, 255, 0),
    0,
    255
  );

  bright2 = constrain(
    map(ldr2, LDR_BRIGHT, LDR_DARK, 255, 0),
    0,
    255
  );

  // Original LED connections
  // LDR1 -> LED3 + LED4
  // LDR2 -> LED1 + LED2
  if (ledPWMReady) {

    ledcWrite(LED3_PIN, bright1);
    ledcWrite(LED4_PIN, bright1);

    ledcWrite(LED1_PIN, bright2);
    ledcWrite(LED2_PIN, bright2);
  }

  // Original percentages
  led12Percent = map(bright2, 0, 255, 0, 100);
  led34Percent = map(bright1, 0, 255, 0, 100);
}

// ================= LIGHT DEBUG =================
void printLightDebug() {

  if (millis() - lightDebugMillis < LIGHT_DEBUG_INTERVAL) {
    return;
  }

  lightDebugMillis = millis();

  Serial.println("\n---------- LIGHT CONTROL ----------");

  Serial.printf("LDR1 raw      : %d\n", rawLdr1);
  Serial.printf("LDR1 smooth   : %d\n", ldr1);
  Serial.printf("LED3 + LED4   : PWM %d (%d%%)\n",
                bright1, led34Percent);

  Serial.println("-----------------------------------");

  Serial.printf("LDR2 raw      : %d\n", rawLdr2);
  Serial.printf("LDR2 smooth   : %d\n", ldr2);
  Serial.printf("LED1 + LED2   : PWM %d (%d%%)\n",
                bright2, led12Percent);

  Serial.println("-----------------------------------");

  Serial.printf("PWM status    : %s\n",
                ledPWMReady ? "READY" : "FAILED");

  Serial.println("-----------------------------------");
}

// ================= ESP-NOW SETUP =================
void setupESPNow() {

  if (esp_now_init() != ESP_OK) {
    Serial.println("ESP-NOW initialization failed!");
    return;
  }

  esp_now_peer_info_t peerInfo = {};

  memcpy(peerInfo.peer_addr, receiverMAC, 6);

  // Use current Wi-Fi channel
  peerInfo.channel = 0;
  peerInfo.encrypt = false;

  if (!esp_now_is_peer_exist(receiverMAC)) {

    if (esp_now_add_peer(&peerInfo) != ESP_OK) {
      Serial.println("ESP-NOW peer registration failed!");
      return;
    }
  }

  Serial.println("ESP-NOW initialized successfully!");
}

// ================= SEND ESP-NOW DATA =================
void sendSensorData() {

  sensorData.sequence = ++packetSequence;

  sensorData.temp1 = temp1;
  sensorData.temp2 = temp2;

  sensorData.hum1 = hum1;
  sensorData.hum2 = hum2;

  sensorData.ldr1 = ldr1;
  sensorData.ldr2 = ldr2;

  sensorData.soil1Percent = soil1Percent;
  sensorData.soil2Wet = soil2Wet;

  sensorData.mq2 = mq2;

  sensorData.led12Percent = led12Percent;
  sensorData.led34Percent = led34Percent;

  sensorData.pwm1 = bright1;
  sensorData.pwm2 = bright2;

  sensorData.hoursLit = hoursLit;

  sensorData.humidifierState = humidifierState;

  esp_err_t result = esp_now_send(
    receiverMAC,
    (uint8_t *)&sensorData,
    sizeof(sensorData)
  );

  if (result == ESP_OK) {
    Serial.println("ESP-NOW: Packet queued");
  } else {
    Serial.printf("ESP-NOW error: %d\n", result);
  }
}

// ================= FIREBASE SETUP =================
void setupFirebase() {

  config.api_key = FIREBASE_API_KEY;
  config.database_url = DATABASE_URL;

  auth.user.email = FIREBASE_USER_EMAIL;
  auth.user.password = FIREBASE_USER_PASSWORD;

  config.token_status_callback = tokenStatusCallback;

  // Optional: Set buffer size if needed
  fbdo.setResponseSize(2048);

  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  Serial.println("Firebase initialized");
}

// ================= FIREBASE UPLOAD =================
void uploadFirebase() {

  if (!Firebase.ready()) {
    Serial.println("Firebase waiting for token readiness...");
    return;
  }

  // Calculate aggregated values for dashboard compatibility
  float avgTemp = (temp1 > 0 && temp2 > 0) ? ((temp1 + temp2) / 2.0) : (temp1 > 0 ? temp1 : temp2);
  float avgHum  = (hum1 > 0 && hum2 > 0) ? ((hum1 + hum2) / 2.0) : (hum1 > 0 ? hum1 : hum2);
  int avgLdr    = (ldr1 + ldr2) / 2;
  int luxEst    = map(constrain(avgLdr, LDR_BRIGHT, LDR_DARK), LDR_DARK, LDR_BRIGHT, 150, 45000);

  FirebaseJson json;

  // Hardware Raw & Dual Readings
  json.set("sensors/temp1", temp1);
  json.set("sensors/temp2", temp2);
  json.set("sensors/hum1", hum1);
  json.set("sensors/hum2", hum2);
  json.set("sensors/ldr1", ldr1);
  json.set("sensors/ldr2", ldr2);
  json.set("sensors/led12Percent", led12Percent);
  json.set("sensors/led34Percent", led34Percent);
  json.set("sensors/pwm1", bright1);
  json.set("sensors/pwm2", bright2);
  json.set("sensors/hoursLit", hoursLit);
  json.set("sensors/soil1Percent", soil1Percent);
  json.set("sensors/soil2Wet", soil2Wet);
  json.set("sensors/mq2", mq2);

  // Standard Polyhouse Dashboard Fields
  json.set("sensors/temperature", avgTemp);
  json.set("sensors/humidity", avgHum);
  json.set("sensors/lux", luxEst);
  json.set("sensors/soilMoisture", soil1Percent);
  json.set("sensors/lightRaw", avgLdr);
  json.set("sensors/ledBrightness", (led12Percent + led34Percent) / 2);

  // Actuators
  json.set("actuators/humidifier", humidifierState);

  if (Firebase.RTDB.updateNode(&fbdo, "/", &json)) {
    Serial.println("Firebase upload successful: Realtime data synchronized!");
  } else {
    Serial.print("Firebase upload error: ");
    Serial.println(fbdo.errorReason());
  }
}

// ================= READ SENSORS =================
void readOtherSensors() {

  // DHT sensors
  float t1 = dht1.readTemperature();
  float h1 = dht1.readHumidity();

  float t2 = dht2.readTemperature();
  float h2 = dht2.readHumidity();

  if (!isnan(t1)) temp1 = t1;
  if (!isnan(h1)) hum1 = h1;

  if (!isnan(t2)) temp2 = t2;
  if (!isnan(h2)) hum2 = h2;

  // Soil sensor 1
  long soilTotal = 0;

  for (int i = 0; i < 5; i++) {
    soilTotal += analogRead(SOIL1_PIN);
  }

  soil1Percent = constrain(
    map(soilTotal / 5, 4095, 1500, 0, 100),
    0,
    100
  );

  // Soil sensor 2
  soil2Wet = (digitalRead(SOIL2_PIN) == LOW);

  // MQ2
  mq2 = analogRead(MQ2_PIN);

  // Original humidifier logic
  humidifierState = (hum1 < 60 && hum2 < 60);

  digitalWrite(
    HUMIDIFIER_PIN,
    humidifierState ? HIGH : LOW
  );
}

// ================= SERIAL OUTPUT =================
void printSensorData() {

  Serial.println("\n========== PRAKRUTHI SMART POLYHOUSE ==========");

  Serial.printf("Temperature 1 : %.1f C\n", temp1);
  Serial.printf("Temperature 2 : %.1f C\n", temp2);

  Serial.printf("Humidity 1    : %.1f %%\n", hum1);
  Serial.printf("Humidity 2    : %.1f %%\n", hum2);

  Serial.println("-----------------------------------------------");

  Serial.printf("LDR 1         : %d\n", ldr1);
  Serial.printf("LDR 2         : %d\n", ldr2);

  Serial.printf("LED 1 + 2     : %d %%\n", led12Percent);
  Serial.printf("LED 3 + 4     : %d %%\n", led34Percent);

  Serial.printf("PWM 1         : %d\n", bright1);
  Serial.printf("PWM 2         : %d\n", bright2);

  Serial.printf("Hours Lit     : %.3f\n", hoursLit);

  Serial.println("-----------------------------------------------");

  Serial.printf("Soil 1        : %d %%\n", soil1Percent);
  Serial.printf("Soil 2        : %s\n", soil2Wet ? "WET" : "DRY");

  Serial.printf("MQ2           : %d\n", mq2);

  Serial.printf("Humidifier    : %s\n",
                humidifierState ? "ON" : "OFF");

  Serial.printf("ESP-NOW Seq   : %lu\n",
                (unsigned long)packetSequence);

  Serial.println("===============================================");
}

// ================= SETUP =================
void setup() {

  Serial.begin(115200);
  delay(1000);

  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);

  dht1.begin();
  dht2.begin();

  pinMode(SOIL2_PIN, INPUT);

  pinMode(HUMIDIFIER_PIN, OUTPUT);
  digitalWrite(HUMIDIFIER_PIN, LOW);

  // LED PWM
  setupLEDs();

  // Wi-Fi
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.print("Connecting to WiFi");

  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(300);
  }

  Serial.println("\nWiFi connected!");

  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());

  printMasterMAC();

  Serial.print("WiFi channel: ");
  Serial.println(WiFi.channel());

  // Configure NTP time (required for SSL certificate & token validation)
  configTime(19800, 0, "pool.ntp.org", "time.google.com");

  // ESP-NOW
  setupESPNow();

  // Firebase
  setupFirebase();

  litMillis = millis();
  sensorMillis = millis();
  firebaseMillis = millis();
}

// ================= MAIN LOOP =================
void loop() {

  // =========================================
  // FAST LIGHTING BLOCK
  // Preserve original LDR logic
  // =========================================

  updateLighting();

  // Hours lit tracker
  unsigned long now = millis();

  if (bright1 > 10 || bright2 > 10) {
    hoursLit += (now - litMillis) / 3600000.0;
  }

  litMillis = now;

  // Light diagnostics
  printLightDebug();

  // =========================================
  // SENSOR + ESP-NOW BLOCK
  // =========================================

  if (millis() - sensorMillis >= SENSOR_INTERVAL) {

    sensorMillis = millis();

    readOtherSensors();

    sendSensorData();

    printSensorData();
  }

  // =========================================
  // FIREBASE BLOCK
  // Upload less frequently to reduce interruptions
  // to the fast LDR sampling loop.
  // =========================================

  if (millis() - firebaseMillis >= FIREBASE_INTERVAL) {

    firebaseMillis = millis();

    uploadFirebase();
  }

  yield();
}
