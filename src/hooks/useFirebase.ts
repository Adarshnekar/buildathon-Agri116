/**
 * useFirebase — Real-time Firebase hook for Grow Guardian
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
  connected: boolean;   // true once at least one Firebase value arrived
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
    setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  }

  useEffect(() => {
    // ── Primary unified sensors listener ──────────────────────────
    const sensorsRef = ref(db, "sensors");
    const unsubSensors = onValue(sensorsRef, (snap) => {
      const data = snap.val();
      if (!data) return;

      // Temperature
      if (typeof data.temperature === "number") {
        setTemp(Number(data.temperature.toFixed(1)));
      } else if (typeof data.temp1 === "number" || typeof data.temp2 === "number") {
        const t1 = typeof data.temp1 === "number" ? data.temp1 : data.temp2;
        const t2 = typeof data.temp2 === "number" ? data.temp2 : data.temp1;
        setTemp(Number(((t1 + t2) / 2).toFixed(1)));
      }

      // Humidity
      if (typeof data.humidity === "number") {
        setHumidity(Number(data.humidity.toFixed(1)));
      } else if (typeof data.hum1 === "number" || typeof data.hum2 === "number") {
        const h1 = typeof data.hum1 === "number" ? data.hum1 : data.hum2;
        const h2 = typeof data.hum2 === "number" ? data.hum2 : data.hum1;
        setHumidity(Number(((h1 + h2) / 2).toFixed(1)));
      }

      // Lux & Light
      if (typeof data.lux === "number") {
        setLux(Math.round(data.lux));
      } else if (typeof data.ldr1 === "number" || typeof data.ldr2 === "number") {
        const l1 = typeof data.ldr1 === "number" ? data.ldr1 : 2000;
        const l2 = typeof data.ldr2 === "number" ? data.ldr2 : 2000;
        const avgLdr = (l1 + l2) / 2;
        // LDR calibration map: 300 (bright) -> ~45000 lux, 3500 (dark) -> ~150 lux
        const calculatedLux = Math.round(Math.max(100, Math.min(60000, 45000 - ((avgLdr - 300) / 3200) * 44850)));
        setLux(calculatedLux);
      }

      if (typeof data.lightRaw === "number") {
        setLightRaw(Math.round(data.lightRaw));
      } else if (typeof data.ldr1 === "number" || typeof data.ldr2 === "number") {
        const l1 = typeof data.ldr1 === "number" ? data.ldr1 : 0;
        const l2 = typeof data.ldr2 === "number" ? data.ldr2 : 0;
        setLightRaw(Math.round((l1 + l2) / 2));
      }

      // Hours Lit
      if (typeof data.hoursLit === "number") {
        setHoursLit(Number(data.hoursLit.toFixed(2)));
      }

      // Soil Moisture
      if (typeof data.soilMoisture === "number") {
        setSoilMoisture(Math.round(data.soilMoisture));
      } else if (typeof data.soil1Percent === "number") {
        setSoilMoisture(Math.round(data.soil1Percent));
      }

      // MQ2 Gas Sensor
      if (typeof data.mq2 === "number") {
        setMq2(Math.round(data.mq2));
      }

      // Soil Probes
      if (typeof data.soil1 === "number") {
        setSoil1(Math.round(data.soil1));
      } else if (typeof data.soil1Percent === "number") {
        setSoil1(Math.round(data.soil1Percent));
      }

      if (typeof data.soil2 === "number") {
        setSoil2(Math.round(data.soil2));
      } else if (typeof data.soil2Wet === "boolean") {
        setSoil2(data.soil2Wet ? 85 : 15);
      }

      // LED Brightness
      if (typeof data.ledBrightness === "number") {
        setLedBrightness(Math.round(data.ledBrightness));
      } else if (typeof data.led12Percent === "number" || typeof data.led34Percent === "number") {
        const b1 = typeof data.led12Percent === "number" ? data.led12Percent : 0;
        const b2 = typeof data.led34Percent === "number" ? data.led34Percent : 0;
        setLedBrightness(Math.round((b1 + b2) / 2));
      }

      // Solar Voltage
      if (typeof data.solarVoltage === "number") {
        setSolarVoltage(Number(data.solarVoltage.toFixed(1)));
      }

      markArrived();
    });

    // ── Control listeners (sync UI ↔ Firebase) ────────────────────
    const modeRef      = ref(db, "controls/mode");
    const ledOnRef     = ref(db, "controls/ledOn");
    const ledIntRef    = ref(db, "controls/ledIntensity");
    const mistOnRef    = ref(db, "controls/mistOn");

    const unsubMode = onValue(modeRef, (snap) => {
      const v = snap.val();
      if (v === "Auto" || v === "Manual") setModeState(v);
      markArrived();
    });

    const unsubLedOn = onValue(ledOnRef, (snap) => {
      const v = snap.val();
      if (v !== null && typeof v === "boolean") setLedOnState(v);
      markArrived();
    });

    const unsubLedInt = onValue(ledIntRef, (snap) => {
      const v = snap.val();
      if (v !== null && typeof v === "number") setLedIntensityState(v);
      markArrived();
    });

    const unsubMist = onValue(mistOnRef, (snap) => {
      const v = snap.val();
      if (v !== null && typeof v === "boolean") setMistOnState(v);
      markArrived();
    });

    // Cleanup all listeners on unmount
    return () => {
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
    setModeState(m); // optimistic local update
    try {
      await writeControl("controls/mode", m);
    } catch (err) {
      setModeState(prev); // revert on failure
      throw err;
    }
  };

  const setLedOn = async (on: boolean) => {
    const prev = ledOn;
    setLedOnState(on); // optimistic
    try {
      await writeControl("controls/ledOn", on);
    } catch (err) {
      setLedOnState(prev); // revert on failure
      throw err;
    }
  };

  const setLedIntensity = async (pct: number) => {
    const prev = ledIntensity;
    setLedIntensityState(pct); // optimistic
    try {
      await writeControl("controls/ledIntensity", pct);
    } catch (err) {
      setLedIntensityState(prev); // revert on failure
      throw err;
    }
  };

  const setMistOn = async (on: boolean) => {
    const prev = mistOn;
    setMistOnState(on); // optimistic
    try {
      await writeControl("controls/mistOn", on);
    } catch (err) {
      setMistOnState(prev); // revert on failure
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
