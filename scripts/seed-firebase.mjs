/**
 * seed-firebase.mjs
 * Run once to populate your Firebase Realtime Database with
 * initial sensor readings and control defaults.
 *
 * Usage:
 *   node scripts/seed-firebase.mjs
 */

import { initializeApp } from "firebase/app";
import { getDatabase, ref, set } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyA0v6MgduPFUY1wOdDmvXkklP8ocWVnreE",
  authDomain: "smart-polyhouse-dc97b.firebaseapp.com",
  databaseURL:
    "https://smart-polyhouse-dc97b-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "smart-polyhouse-dc97b",
  storageBucket: "smart-polyhouse-dc97b.firebasestorage.app",
  messagingSenderId: "1001801846441",
  appId: "1:1001801846441:web:19cf298455d8edd61a23b8",
};

const app = initializeApp(firebaseConfig);
const db  = getDatabase(app);

async function seed() {
  console.log("🌱  Seeding Firebase Realtime Database for smart-polyhouse-dc97b…\n");

  // ── Sensor readings (ESP32 hardware fields & dashboard fields) ──
  const initialSensors = {
    // Primary / Calculated dashboard fields
    temperature: 26.4,
    humidity: 58.0,
    lux: 18000,
    hoursLit: 6.2,
    soilMoisture: 42,
    mq2: 340,
    soil1: 2150,
    soil2: 2280,
    lightRaw: 1650,
    ledBrightness: 0,
    solarVoltage: 18.2,

    // Hardware specific dual-sensor fields
    temp1: 26.2,
    temp2: 26.6,
    hum1: 57.5,
    hum2: 58.5,
    ldr1: 1620,
    ldr2: 1680,
    led12Percent: 0,
    led34Percent: 0,
    pwm1: 0,
    pwm2: 0,
    soil1Percent: 42,
    soil2Wet: false
  };

  await set(ref(db, "sensors"), initialSensors);
  console.log("✅  sensors/  seeded");

  // ── Actuators ──────────────────────────────────────────────────
  await set(ref(db, "actuators"), {
    humidifier: false
  });
  console.log("✅  actuators/ seeded");

  // ── Control defaults (written by dashboard) ─────────────────────
  await set(ref(db, "controls"), {
    mode: "Auto",
    ledOn: false,
    ledIntensity: 0,
    mistOn: false
  });
  console.log("✅  controls/ seeded");

  console.log("\n🎉  Done! Your Firebase database now has initial values.");
  console.log("    Open the dashboard — it will show 'Live · Firebase' immediately.\n");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌  Seed failed:", err.message);
  process.exit(1);
});
