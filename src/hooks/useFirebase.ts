/**
 * useFirebase — Real-time Firebase hook for Grow Guardian & QuantumGrow
 *
 * READS  (Firebase → UI):
 *   sensors/temperature   number  °C  (or computed from temp1, temp2)
 *   sensors/humidity      number  %   (or computed from hum1, hum2)
 *   sensors/lux           number  raw lux (or computed from ldr1, ldr2)
 *   sensors/hoursLit      number  hours today
 *   sensors/soilMoisture  number  %   (or soil1Percent)
 *   sensors/mq2           number  raw ppm
 *
 * WRITES (UI → Firebase → Hardware):
 *   controls/mode         "Auto" | "Manual"
 *   controls/ledOn        boolean
 *   controls/ledIntensity number (0–100)
 *   controls/mistOn       boolean
 */

import { useEffect, useRef, useState } from "react";
import { ref, onValue, set } from "firebase/database";
import { db } from "@/lib/firebase";
import { toast } from "sonner";

type Mode = "Auto" | "Manual";

export interface FirebaseState {
  // ── Sensor readings ──────────────────────────────────────────
  temp: number;
  humidity: number;
  lux: number;
  hoursLit: number;
  soilMoisture: number;
  mq2: number;
  soil1: number;
  soil2: number;
  lightRaw: number;
  ledBrightness: number;
  solarVoltage: number;
  lastUpdated: string | null;

  // ── Control state ─────────────────────────────────────────────
  mode: Mode;
  ledOn: boolean;
  ledIntensity: number;
  mistOn: boolean;

  // ── Status ────────────────────────────────────────────────────
  connected: boolean;   // true when WebSocket is connected and synced
  loading: boolean;     // true during initial fetch

  // ── Write helpers ─────────────────────────────────────────────
  setMode: (mode: Mode) => Promise<void>;
  setLedOn: (on: boolean) => Promise<void>;
  setLedIntensity: (pct: number) => Promise<void>;
  setMistOn: (on: boolean) => Promise<void>;
}

/** Fallback values shown while Firebase is connecting */
const DEFAULTS = {
  temp: 26.4,
  humidity: 58,
  lux: 18000,
  hoursLit: 6.2,
  soilMoisture: 42,
  mq2: 340,
  soil1: 2150,
  soil2: 2280,
  lightRaw: 1650,
  ledBrightness: 0,
  solarVoltage: 18.2,
  mode: "Auto" as Mode,
  ledOn: false,
  ledIntensity: 0,
  mistOn: false,
};

// Safe parsing helpers for robust hardware deserialization
function parseNum(val: unknown): number | null {
  if (typeof val === "number" && !isNaN(val)) return val;
  if (typeof val === "string") {
    const parsed = parseFloat(val);
    if (!isNaN(parsed)) return parsed;
  }
  return null;
}

function parseBool(val: unknown): boolean | null {
  if (typeof val === "boolean") return val;
  if (typeof val === "string") {
    if (val.toLowerCase() === "true" || val === "1") return true;
    if (val.toLowerCase() === "false" || val === "0") return false;
  }
  if (typeof val === "number") return val !== 0;
  return null;
}

export function useFirebase(): FirebaseState {
  const [temp, setTemp] = useState(DEFAULTS.temp);
  const [humidity, setHumidity] = useState(DEFAULTS.humidity);
  const [lux, setLux] = useState(DEFAULTS.lux);
  const [hoursLit, setHoursLit] = useState(DEFAULTS.hoursLit);
  const [soilMoisture, setSoilMoisture] = useState(DEFAULTS.soilMoisture);
  const [mq2, setMq2] = useState(DEFAULTS.mq2);
  const [soil1, setSoil1] = useState(DEFAULTS.soil1);
  const [soil2, setSoil2] = useState(DEFAULTS.soil2);
  const [lightRaw, setLightRaw] = useState(DEFAULTS.lightRaw);
  const [ledBrightness, setLedBrightness] = useState(DEFAULTS.ledBrightness);
  const [solarVoltage, setSolarVoltage] = useState(DEFAULTS.solarVoltage);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const [mode, setModeState] = useState<Mode>(DEFAULTS.mode);
  const [ledOn, setLedOnState] = useState(DEFAULTS.ledOn);
  const [ledIntensity, setLedIntensityState] = useState(DEFAULTS.ledIntensity);
  const [mistOn, setMistOnState] = useState(DEFAULTS.mistOn);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  const arrivedCount = useRef(0);

  function markArrived() {
    arrivedCount.current += 1;
    setLoading(false);
    setConnected(true);
    setLastUpdated(
      new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    );
  }

  useEffect(() => {
    // ── 1. Firebase Native Connection State Listener ──────────────
    const connectedRef = ref(db, ".info/connected");
    const unsubConnected = onValue(connectedRef, (snap) => {
      const isOnline = !!snap.val();
      if (isOnline) {
        setConnected(true);
        setLoading(false);
      }
    });

    // ── 2. Primary Real-time Sensors Listener ──────────────────────
    const sensorsRef = ref(db, "sensors");
    const unsubSensors = onValue(
      sensorsRef,
      (snap) => {
        const data = snap.val();
        if (!data) return;

        // Temperature (reads aggregate, or averages dual DHT sensors)
        const temperatureVal = parseNum(data.temperature);
        const temp1Val = parseNum(data.temp1);
        const temp2Val = parseNum(data.temp2);

        if (temperatureVal !== null) {
          setTemp(Number(temperatureVal.toFixed(1)));
        } else if (temp1Val !== null || temp2Val !== null) {
          const t1 = temp1Val ?? temp2Val!;
          const t2 = temp2Val ?? temp1Val!;
          setTemp(Number(((t1 + t2) / 2).toFixed(1)));
        }

        // Humidity (reads aggregate, or averages dual DHT sensors)
        const humidityVal = parseNum(data.humidity);
        const hum1Val = parseNum(data.hum1);
        const hum2Val = parseNum(data.hum2);

        if (humidityVal !== null) {
          setHumidity(Number(humidityVal.toFixed(1)));
        } else if (hum1Val !== null || hum2Val !== null) {
          const h1 = hum1Val ?? hum2Val!;
          const h2 = hum2Val ?? hum1Val!;
          setHumidity(Number(((h1 + h2) / 2).toFixed(1)));
        }

        // Lux & Light Calibration
        const luxVal = parseNum(data.lux);
        const ldr1Val = parseNum(data.ldr1);
        const ldr2Val = parseNum(data.ldr2);

        if (luxVal !== null) {
          setLux(Math.round(luxVal));
        } else if (ldr1Val !== null || ldr2Val !== null) {
          const l1 = ldr1Val ?? 2000;
          const l2 = ldr2Val ?? 2000;
          const avgLdr = (l1 + l2) / 2;
          const calculatedLux = Math.round(
            Math.max(100, Math.min(60000, 45000 - ((avgLdr - 300) / 3200) * 44850))
          );
          setLux(calculatedLux);
        }

        // Raw Light
        const lightRawVal = parseNum(data.lightRaw);
        if (lightRawVal !== null) {
          setLightRaw(Math.round(lightRawVal));
        } else if (ldr1Val !== null || ldr2Val !== null) {
          const l1 = ldr1Val ?? 0;
          const l2 = ldr2Val ?? 0;
          setLightRaw(Math.round((l1 + l2) / 2));
        }

        // Hours Lit
        const hoursLitVal = parseNum(data.hoursLit);
        if (hoursLitVal !== null) {
          setHoursLit(Number(hoursLitVal.toFixed(2)));
        }

        // Soil Moisture (%)
        const soilMoistureVal = parseNum(data.soilMoisture);
        const soil1PercentVal = parseNum(data.soil1Percent);
        if (soilMoistureVal !== null) {
          setSoilMoisture(Math.round(soilMoistureVal));
        } else if (soil1PercentVal !== null) {
          setSoilMoisture(Math.round(soil1PercentVal));
        }

        // MQ2 Gas Sensor
        const mq2Val = parseNum(data.mq2);
        if (mq2Val !== null) {
          setMq2(Math.round(mq2Val));
        }

        // Soil Probes
        const soil1Val = parseNum(data.soil1);
        if (soil1Val !== null) {
          setSoil1(Math.round(soil1Val));
        } else if (soil1PercentVal !== null) {
          setSoil1(Math.round(soil1PercentVal));
        }

        const soil2Val = parseNum(data.soil2);
        const soil2WetVal = parseBool(data.soil2Wet);
        if (soil2Val !== null) {
          setSoil2(Math.round(soil2Val));
        } else if (soil2WetVal !== null) {
          setSoil2(soil2WetVal ? 85 : 15);
        }

        // LED Brightness
        const ledBrightnessVal = parseNum(data.ledBrightness);
        const led12Val = parseNum(data.led12Percent);
        const led34Val = parseNum(data.led34Percent);
        if (ledBrightnessVal !== null) {
          setLedBrightness(Math.round(ledBrightnessVal));
        } else if (led12Val !== null || led34Val !== null) {
          const b1 = led12Val ?? 0;
          const b2 = led34Val ?? 0;
          setLedBrightness(Math.round((b1 + b2) / 2));
        }

        // Solar Voltage
        const solarVal = parseNum(data.solarVoltage);
        if (solarVal !== null) {
          setSolarVoltage(Number(solarVal.toFixed(1)));
        }

        markArrived();
      },
      (error) => {
        console.error("Firebase sensors onValue error:", error);
      }
    );

    // ── 3. Real-time Control Listeners ─────────────────────────────
    const modeRef   = ref(db, "controls/mode");
    const ledOnRef  = ref(db, "controls/ledOn");
    const ledIntRef = ref(db, "controls/ledIntensity");
    const mistOnRef = ref(db, "controls/mistOn");

    const unsubMode = onValue(modeRef, (snap) => {
      const v = snap.val();
      if (v === "Auto" || v === "Manual") setModeState(v);
      markArrived();
    });

    const unsubLedOn = onValue(ledOnRef, (snap) => {
      const v = parseBool(snap.val());
      if (v !== null) setLedOnState(v);
      markArrived();
    });

    const unsubLedInt = onValue(ledIntRef, (snap) => {
      const v = parseNum(snap.val());
      if (v !== null) setLedIntensityState(Math.round(v));
      markArrived();
    });

    const unsubMist = onValue(mistOnRef, (snap) => {
      const v = parseBool(snap.val());
      if (v !== null) setMistOnState(v);
      markArrived();
    });

    // Cleanup all listeners on unmount
    return () => {
      unsubConnected();
      unsubSensors();
      unsubMode();
      unsubLedOn();
      unsubLedInt();
      unsubMist();
    };
  }, []);

  // ── Write helpers ──────────────────────────────────────────────
  async function writeControl<T>(path: string, value: T) {
    try {
      await set(ref(db, path), value);
    } catch (err) {
      console.error(`Firebase write failed [${path}]:`, err);
      toast.error("Could not sync with Firebase. Check your connection.");
      throw err;
    }
  }

  const setMode = async (m: Mode) => {
    const prev = mode;
    setModeState(m); // optimistic update
    try {
      await writeControl("controls/mode", m);
    } catch (err) {
      setModeState(prev);
      throw err;
    }
  };

  const setLedOn = async (on: boolean) => {
    const prev = ledOn;
    setLedOnState(on);
    try {
      await writeControl("controls/ledOn", on);
    } catch (err) {
      setLedOnState(prev);
      throw err;
    }
  };

  const setLedIntensity = async (pct: number) => {
    const prev = ledIntensity;
    setLedIntensityState(pct);
    try {
      await writeControl("controls/ledIntensity", pct);
    } catch (err) {
      setLedIntensityState(prev);
      throw err;
    }
  };

  const setMistOn = async (on: boolean) => {
    const prev = mistOn;
    setMistOnState(on);
    try {
      await writeControl("controls/mistOn", on);
    } catch (err) {
      setMistOnState(prev);
      throw err;
    }
  };

  return {
    temp,
    humidity,
    lux,
    hoursLit,
    soilMoisture,
    mq2,
    soil1,
    soil2,
    lightRaw,
    ledBrightness,
    solarVoltage,
    lastUpdated,
    mode,
    ledOn,
    ledIntensity,
    mistOn,
    connected,
    loading,
    setMode,
    setLedOn,
    setLedIntensity,
    setMistOn,
  };
}
