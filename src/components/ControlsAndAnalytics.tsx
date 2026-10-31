import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Sliders,
  SlidersHorizontal,
  BarChart3,
  Lightbulb,
  Droplets,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Zap,
  Sun,
  Thermometer,
  Sprout,
  Flame,
  Activity,
  Clock,
  Wifi,
  WifiOff,
  Loader2,
  TrendingUp,
  Gauge,
  Layers,
  ArrowUpRight,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Stage, GROWTH_STAGES } from "@/lib/growthStages";

export type Mode = "Auto" | "Manual";


export interface ControlsAndAnalyticsProps {
  // Real-time sensor readings from Firebase
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

  // Actuator control states
  mode: Mode;
  ledOn: boolean;
  ledIntensity: number;
  mistOn: boolean;

  // Connection status
  connected: boolean;
  loading: boolean;

  // Write helpers
  setMode: (mode: Mode) => Promise<void>;
  setLedOn: (on: boolean) => Promise<void>;
  setLedIntensity: (pct: number) => Promise<void>;
  setMistOn: (on: boolean) => Promise<void>;

  // Derived agronomic context
  stage: Stage;
  crop: string;
  ledHoursToday: number;
  targetDLI: number;
  naturalDLI: number;
  ledDLI: number;
  achievedDLI: number;
  dliPct: number;
  dliStatus: string;
  photoperiodTarget: number;
  remainingHours: number;
  solarShare: number;
  energySavedPct: number;
}

export default function ControlsAndAnalytics({
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
  stage,
  crop,
  ledHoursToday,
  targetDLI,
  naturalDLI,
  ledDLI,
  achievedDLI,
  dliPct,
  dliStatus,
  photoperiodTarget,
  remainingHours,
  solarShare,
  energySavedPct,
}: ControlsAndAnalyticsProps) {
  const profile = GROWTH_STAGES[stage];

  // ── Syncing / Pending state to prevent duplicate commands ───────
  const [isSyncingMode, setIsSyncingMode] = useState(false);
  const [isSyncingLed, setIsSyncingLed] = useState(false);
  const [isSyncingMist, setIsSyncingMist] = useState(false);
  const [isSyncingIntensity, setIsSyncingIntensity] = useState(false);

  // ── Local slider buffer to make drag smooth ─────────────────────
  const [sliderVal, setSliderVal] = useState(ledIntensity);
  useEffect(() => {
    setSliderVal(ledIntensity);
  }, [ledIntensity]);


  // ── Handler: Operating Mode Toggle ──────────────────────────────
  const handleModeChange = async (targetMode: Mode) => {
    if (isSyncingMode || mode === targetMode) return;
    setIsSyncingMode(true);
    try {
      await setMode(targetMode);
      toast.success(`${targetMode.toUpperCase()} mode activated`);
    } catch {
      toast.error("Failed to switch operating mode. Check connection.");
    } finally {
      setIsSyncingMode(false);
    }
  };

  // ── Handler: Grow Light Toggle ──────────────────────────────────
  const handleToggleLed = async () => {
    if (isSyncingLed) return;
    if (mode === "Auto") {
      toast.info("Switch to Manual mode to override Grow Light");
      return;
    }
    const nextState = !ledOn;
    setIsSyncingLed(true);
    try {
      await setLedOn(nextState);
      await setLedIntensity(nextState ? (sliderVal > 0 ? sliderVal : 80) : 0);
      toast.success(`Grow Lights switched ${nextState ? "ON" : "OFF"}`);
    } catch {
      toast.error("Failed to update Grow Light status.");
    } finally {
      setIsSyncingLed(false);
    }
  };

  // ── Handler: Brightness Slider ──────────────────────────────────
  const handleIntensityCommit = async (val: number) => {
    if (mode !== "Manual" || isSyncingIntensity) return;
    setIsSyncingIntensity(true);
    try {
      await setLedIntensity(val);
      toast.success(`Grow Light brightness set to ${val}%`);
    } catch {
      toast.error("Failed to update Grow Light brightness.");
    } finally {
      setIsSyncingIntensity(false);
    }
  };

  // ── Handler: Misting Toggle / Pulse ─────────────────────────────
  const handleToggleMist = async () => {
    if (isSyncingMist) return;
    if (mode === "Auto") {
      toast.info("Switch to Manual mode to override Misting system");
      return;
    }
    const nextState = !mistOn;
    setIsSyncingMist(true);
    try {
      await setMistOn(nextState);
      toast.success(`Misting system ${nextState ? "ACTIVATED" : "DEACTIVATED"}`);
    } catch {
      toast.error("Failed to update Misting system.");
    } finally {
      setIsSyncingMist(false);
    }
  };

  // ── Dual Soil Probes Calibration (ESP32 ADC -> %) ──────────────
  // ESP32 formula: map(raw, 4095, 1500, 0, 100)
  const zone1Moisture = Math.round(
    Math.max(0, Math.min(100, ((4095 - soil1) / (4095 - 1500)) * 100))
  );
  const zone2Moisture = Math.round(
    Math.max(0, Math.min(100, ((4095 - soil2) / (4095 - 1500)) * 100))
  );
  const zoneDifference = Math.abs(zone1Moisture - zone2Moisture);

  return (
    <div className="space-y-6">
      {/* ────────────────────────────────────────────────────────────
          PAGE HEADER: Title, Description & Status Badges
      ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/70">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              QuantumGrow Ecosystem
            </span>
            <Badge
              variant="outline"
              className="border-leaf/30 text-leaf bg-leaf-soft text-[10px] font-bold"
            >
              PRODUCTION NODE #01
            </Badge>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
            Controls & Analytics
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground">
            Manage your smart polyhouse and monitor its performance.
          </p>
        </div>

        {/* Live Indicators: Connection & Operating Mode */}
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {/* Device Connection Indicator */}
          <div
            className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all ${
              connected
                ? "border-leaf/30 bg-leaf-soft text-leaf"
                : loading
                ? "border-border bg-secondary text-muted-foreground"
                : "border-warning/30 bg-warning-soft text-warning"
            }`}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : connected ? (
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-leaf opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-leaf" />
              </span>
            ) : (
              <WifiOff className="h-4 w-4 text-warning" />
            )}
            <div className="flex flex-col text-left leading-tight">
              <span className="font-bold text-[11px]">
                {connected
                  ? "ESP32 NODE ONLINE"
                  : loading
                  ? "SYNCING TELEMETRY..."
                  : "NODE OFFLINE"}
              </span>
              <span className="text-[9px] opacity-80">
                {connected && lastUpdated
                  ? `Sync: ${lastUpdated}`
                  : "Firebase RTDB Stream"}
              </span>
            </div>
          </div>

          {/* Current Operating Mode Indicator */}
          <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary/80 px-3.5 py-2 text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Mode:
            </span>
            <Badge
              className={`text-xs font-extrabold px-2.5 py-0.5 ${
                mode === "Auto"
                  ? "bg-leaf text-white"
                  : "bg-warning text-white"
              }`}
            >
              {mode.toUpperCase()}
            </Badge>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────
          TABS: Controls (default) & Analytics
      ──────────────────────────────────────────────────────────── */}
      <Tabs defaultValue="controls" className="w-full space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2 rounded-xl bg-secondary/80 p-1 border border-border">
          <TabsTrigger
            value="controls"
            className="rounded-lg py-2 text-xs md:text-sm font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all flex items-center justify-center gap-2"
          >
            <Sliders className="h-4 w-4" />
            Controls
          </TabsTrigger>
          <TabsTrigger
            value="analytics"
            className="rounded-lg py-2 text-xs md:text-sm font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all flex items-center justify-center gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* ════════════════════════════════════════════════════════════
            TAB 1: DEVICE CONTROLS (Section A)
        ════════════════════════════════════════════════════════════ */}
        <TabsContent value="controls" className="space-y-6 mt-0">
          {/* Section Card: Device Controls */}
          <div className="glass-card rounded-2xl p-5 md:p-6 border border-border shadow-xs space-y-6">
            {/* Header + Operating Mode Selector */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-5 border-b border-border/60">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary border border-primary/20 shadow-xs">
                  <SlidersHorizontal className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">
                    Industrial Actuator Control Station
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Direct hardware synchronization over Firebase RTDB
                  </p>
                </div>
              </div>

              {/* Operating Mode Selector */}
              <div className="flex items-center justify-between w-full sm:w-auto gap-2 rounded-xl border border-border bg-secondary/60 p-1 self-start sm:self-auto">
                <span className="px-2.5 text-xs font-semibold text-muted-foreground">
                  Operating Mode:
                </span>
                {(["Auto", "Manual"] as Mode[]).map((m) => {
                  const isCurrent = mode === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      disabled={isSyncingMode}
                      onClick={() => handleModeChange(m)}
                      className={`relative rounded-lg px-4 py-1.5 text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                        isCurrent
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {isSyncingMode && isCurrent ? (
                        <span className="flex items-center gap-1.5">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          SYNCING...
                        </span>
                      ) : (
                        m.toUpperCase()
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2-Column Actuator Grid */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* 1. Grow Lights Panel */}
              <div className="rounded-xl border border-border bg-secondary/30 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-leaf-soft text-leaf border border-leaf/20">
                      <Lightbulb className="h-5 w-5" />
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-foreground">
                        Grow Light System
                      </h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge
                      className={`text-xs font-semibold ${
                        ledOn
                          ? "bg-leaf text-white"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {isSyncingLed ? (
                        <span className="flex items-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          SYNCING
                        </span>
                      ) : ledOn ? (
                        "● ACTIVE"
                      ) : (
                        "OFF"
                      )}
                    </Badge>
                    <Switch
                      checked={ledOn}
                      onCheckedChange={handleToggleLed}
                      disabled={mode === "Auto" || isSyncingLed}
                      aria-label="Toggle Grow Lights"
                    />
                  </div>
                </div>

                {/* Actual Hardware PWM Telemetry Display */}
                <div className="rounded-lg bg-card p-3 border border-border/80 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">
                      Hardware Telemetry (ESP32)
                    </span>
                    <span className="font-bold text-foreground">
                      {ledBrightness > 0
                        ? `${ledBrightness} / 255 PWM (${Math.round(
                            (ledBrightness / 255) * 100
                          )}% duty)`
                        : "0 PWM · Standby"}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">
                      Target Intensity
                    </span>
                    <span className="font-bold text-leaf">{ledIntensity}%</span>
                  </div>
                </div>

                {/* Brightness Slider */}
                <div className="space-y-2 pt-1">
                  <div className="flex justify-between text-xs font-medium text-muted-foreground">
                    <span>Brightness Duty Cycle</span>
                    <span className="font-bold text-foreground">
                      {sliderVal}%
                    </span>
                  </div>

                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={sliderVal}
                    onChange={(e) => setSliderVal(+e.target.value)}
                    onMouseUp={() => handleIntensityCommit(sliderVal)}
                    onTouchEnd={() => handleIntensityCommit(sliderVal)}
                    disabled={mode === "Auto" || !ledOn || isSyncingIntensity}
                    aria-label="Grow Light intensity slider"
                    className="w-full accent-[oklch(0.52_0.15_150)] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  />

                  {/* Preset quick buttons */}
                  <div className="flex items-center justify-between pt-1">
                    {[25, 50, 75, 100].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        disabled={mode === "Auto" || !ledOn || isSyncingIntensity}
                        onClick={() => {
                          setSliderVal(preset);
                          handleIntensityCommit(preset);
                        }}
                        className={`rounded-md px-2.5 py-1 text-[10px] font-bold border transition-all ${
                          sliderVal === preset && ledOn
                            ? "bg-leaf-soft border-leaf/30 text-leaf"
                            : "border-border/60 bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                      >
                        {preset}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 2. Misting & Humidity Control Panel */}
              <div className="rounded-xl border border-border bg-secondary/30 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-water-soft text-water border border-water/20">
                      <Droplets className="h-5 w-5" />
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-foreground">
                        High-Pressure Misting System
                      </h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge
                      className={`text-xs font-semibold ${
                        mistOn
                          ? "bg-water text-white"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {isSyncingMist ? (
                        <span className="flex items-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          SYNCING
                        </span>
                      ) : mistOn ? (
                        "● MISTING"
                      ) : (
                        "IDLE"
                      )}
                    </Badge>
                    <Switch
                      checked={mistOn}
                      onCheckedChange={handleToggleMist}
                      disabled={mode === "Auto" || isSyncingMist}
                      aria-label="Toggle Misting system"
                    />
                  </div>
                </div>

                {/* Actual Hardware Actuator Telemetry Display */}
                <div className="rounded-lg bg-card p-3 border border-border/80 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">
                      Valve State
                    </span>
                    <span className="font-bold text-foreground">
                      {mistOn
                        ? "OPEN (Spraying)"
                        : "CLOSED (Standby)"}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">
                      Current Humidity
                    </span>
                    <span className="font-bold text-water">{humidity}% RH</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleToggleMist}
                    disabled={mode === "Auto" || isSyncingMist}
                    className={`w-full rounded-xl py-2.5 text-xs font-bold uppercase tracking-wider transition-all shadow-xs ${
                      mistOn
                        ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        : "bg-water text-white hover:bg-water/90"
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    {isSyncingMist ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        DISPATCHING COMMAND...
                      </span>
                    ) : mistOn ? (
                      "Deactivate Misting"
                    ) : (
                      "Trigger Manual Mist Pulse"
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Hardware write notice & Node summary */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl bg-secondary/50 px-4 py-3 border border-border/70 text-xs">
              <span className="flex items-center gap-2 text-foreground/80 font-medium">
                <CheckCircle2 className="h-4 w-4 text-leaf shrink-0" />
                Firebase Realtime Database synchronization: Commands sync with
                ESP32 dual-core loop every 2000ms.
              </span>
              <span className="text-[11px] font-semibold text-muted-foreground shrink-0">
                Endpoint: smart-polyhouse-694e6
              </span>
            </div>
          </div>
        </TabsContent>

        {/* ════════════════════════════════════════════════════════════
            TAB 2: ANALYTICS & PERFORMANCE (Section B)
        ════════════════════════════════════════════════════════════ */}
        <TabsContent value="analytics" className="space-y-6 mt-0">
          {/* ────────────────────────────────────────────────────────
              PAIR 1: LIGHTING & ENERGY (DLI & HARVESTING)
              (Exactly matching the QuantumGrow visual layout)
          ──────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Daily Light Integral (DLI) Accumulator */}
            <div className="glass-card rounded-2xl p-6 border border-border shadow-xs lg:col-span-2 flex flex-col justify-between">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-border/60">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-leaf-soft text-leaf">
                      <Gauge className="h-4 w-4" />
                    </span>
                    <div>
                      <h4 className="text-base font-bold text-foreground">
                        Daily Light Integral (DLI) Accumulator
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Natural solar + LED quantum photon delivery
                      </p>
                    </div>
                  </div>
                  <Badge
                    className={`text-xs font-semibold ${
                      dliStatus === "Optimal"
                        ? "bg-leaf text-white"
                        : "bg-secondary text-foreground"
                    }`}
                  >
                    Status: {dliStatus}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-baseline justify-between gap-4 my-3">
                  <div>
                    <span className="text-3xl md:text-4xl font-bold tracking-tight text-foreground tabular-nums">
                      {achievedDLI}
                    </span>
                    <span className="ml-1.5 text-sm font-semibold text-muted-foreground">
                      / {targetDLI} mol·m⁻²·d⁻¹ Target
                    </span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Natural solar: <span className="font-semibold text-foreground">{naturalDLI}</span> · LED supplementary: <span className="font-semibold text-foreground">{ledDLI}</span>
                    </p>
                  </div>
                  <span className="text-3xl font-bold text-leaf tabular-nums">
                    {dliPct}%
                  </span>
                </div>

                <Progress value={dliPct} className="h-2.5 bg-secondary my-3" />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
                <div className="rounded-xl border border-border/60 bg-secondary/40 p-2 sm:p-3 text-center">
                  <p className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-muted-foreground truncate">
                    Solar Share
                  </p>
                  <p className="text-sm sm:text-base font-bold text-foreground mt-0.5">{solarShare}%</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-secondary/40 p-2 sm:p-3 text-center">
                  <p className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-muted-foreground truncate">
                    LED Hours
                  </p>
                  <p className="text-sm sm:text-base font-bold text-foreground mt-0.5">{ledHoursToday.toFixed(1)}h</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-secondary/40 p-2 sm:p-3 text-center">
                  <p className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-muted-foreground truncate">
                    Saved Energy
                  </p>
                  <p className="text-sm sm:text-base font-bold text-leaf mt-0.5">{energySavedPct}%</p>
                </div>
              </div>
            </div>

            {/* Energy Harvesting Card */}
            <div className="glass-card rounded-2xl p-6 border border-border shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-border/60">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sun-soft text-sun">
                    <Zap className="h-4 w-4" />
                  </span>
                  <div>
                    <h4 className="text-base font-bold text-foreground">Energy Harvesting</h4>
                    <p className="text-xs text-muted-foreground">Grid offset via natural solar</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span>Solar vs Artificial Photon Mix</span>
                      <span className="text-leaf">{solarShare}% Solar</span>
                    </div>
                    <div className="flex h-2.5 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="bg-sun transition-all duration-500"
                        style={{ width: `${solarShare}%` }}
                      />
                      <div
                        className="bg-leaf transition-all duration-500"
                        style={{ width: `${100 - solarShare}%` }}
                      />
                    </div>
                    <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-sun" /> Sunlight
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-leaf" /> Grow LED
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl bg-secondary/50 p-3.5 border border-border/60 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Photoperiod Target:</span>
                      <span className="font-semibold text-foreground">{photoperiodTarget}h / day</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sunlight Captured:</span>
                      <span className="font-semibold text-foreground">{hoursLit.toFixed(1)}h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Remaining Deficit:</span>
                      <span className="font-semibold text-leaf">{remainingHours}h remaining</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-border/60 text-[11px] text-muted-foreground flex items-center justify-between">
                <span>Carbon Reduction Index</span>
                <span className="font-bold text-leaf">Grade A · High Efficiency</span>
              </div>
            </div>
          </div>

          {/* ────────────────────────────────────────────────────────
              PAIR 2: ENVIRONMENTAL PERFORMANCE (CLIMATE & GAS)
          ──────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Environmental Microclimate Index */}
            <div className="glass-card rounded-2xl p-6 border border-border shadow-xs lg:col-span-2 flex flex-col justify-between">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-border/60">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-leaf-soft text-leaf">
                      <Thermometer className="h-4 w-4" />
                    </span>
                    <div>
                      <h4 className="text-base font-bold text-foreground">
                        Microclimate Environmental Index
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Canopy temperature, humidity & solar lux matrix
                      </p>
                    </div>
                  </div>
                  <Badge
                    className={`text-xs font-semibold ${
                      temp >= profile.tempDayMin && temp <= profile.tempDayMax
                        ? "bg-leaf text-white"
                        : "bg-warning text-white"
                    }`}
                  >
                    Status: {temp >= profile.tempDayMin && temp <= profile.tempDayMax ? "Optimal" : "Attention"}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-baseline justify-between gap-4 my-3">
                  <div>
                    <span className="text-3xl md:text-4xl font-bold tracking-tight text-foreground tabular-nums">
                      {temp}°C
                    </span>
                    <span className="ml-1.5 text-sm font-semibold text-muted-foreground">
                      / {profile.tempDayMin}–{profile.tempDayMax}°C Target
                    </span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Humidity: <span className="font-semibold text-foreground">{humidity}%</span> (Target: {profile.humidityMin}–{profile.humidityMax}%) · Canopy Light: <span className="font-semibold text-foreground">{(lux / 1000).toFixed(1)}k lux</span>
                    </p>
                  </div>
                  <span className="text-3xl font-bold text-leaf tabular-nums">
                    {humidity}% RH
                  </span>
                </div>

                <Progress
                  value={Math.min(100, Math.max(10, Math.round((temp / profile.tempDayMax) * 100)))}
                  className="h-2.5 bg-secondary my-3"
                />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
                <div className="rounded-xl border border-border/60 bg-secondary/40 p-2 sm:p-3 text-center">
                  <p className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-muted-foreground truncate">
                    Ambient Temp
                  </p>
                  <p className="text-sm sm:text-base font-bold text-foreground mt-0.5">{temp}°C</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-secondary/40 p-2 sm:p-3 text-center">
                  <p className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-muted-foreground truncate">
                    Humidity
                  </p>
                  <p className="text-sm sm:text-base font-bold text-foreground mt-0.5">{humidity}%</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-secondary/40 p-2 sm:p-3 text-center">
                  <p className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-muted-foreground truncate">
                    Canopy Light
                  </p>
                  <p className="text-sm sm:text-base font-bold text-leaf mt-0.5">{(lux / 1000).toFixed(1)}k lux</p>
                </div>
              </div>
            </div>

            {/* Air Quality & Gas (MQ-2) Card */}
            <div className="glass-card rounded-2xl p-6 border border-border shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-border/60">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-leaf-soft text-leaf">
                    <Flame className="h-4 w-4" />
                  </span>
                  <div>
                    <h4 className="text-base font-bold text-foreground">Air Quality & Gas (MQ-2)</h4>
                    <p className="text-xs text-muted-foreground">Atmospheric purity & safety monitoring</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span>Gas Concentration vs Threshold</span>
                      <span className={mq2 < 700 ? "text-leaf font-bold" : "text-warning font-bold"}>
                        {mq2 < 700 ? "Clean Atmosphere" : "Warning Level"}
                      </span>
                    </div>
                    <div className="flex h-2.5 overflow-hidden rounded-full bg-secondary">
                      <div
                        className={mq2 < 700 ? "bg-leaf transition-all duration-500" : "bg-warning transition-all duration-500"}
                        style={{ width: `${Math.min(100, Math.round((mq2 / 1000) * 100))}%` }}
                      />
                    </div>
                    <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-leaf" /> Clean Band (&lt; 700)
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-warning" /> Threshold
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl bg-secondary/50 p-3.5 border border-border/60 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">MQ-2 Gas Reading:</span>
                      <span className="font-semibold text-foreground">{mq2} ADC</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Safety Threshold:</span>
                      <span className="font-semibold text-foreground">&lt; 700 ADC</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sensor Status:</span>
                      <span className="font-semibold text-leaf">Operational (Safe)</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-border/60 text-[11px] text-muted-foreground flex items-center justify-between">
                <span>Atmospheric Index</span>
                <span className="font-bold text-leaf">{mq2 < 700 ? "Grade A · Clean Air" : "Notice"}</span>
              </div>
            </div>
          </div>

          {/* ────────────────────────────────────────────────────────
              PAIR 3: SOIL SUBSTRATE MOISTURE & IRRIGATION ACTIVITY
          ──────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Soil Moisture Substrate Matrix */}
            <div className="glass-card rounded-2xl p-6 border border-border shadow-xs lg:col-span-2 flex flex-col justify-between">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-border/60">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-leaf-soft text-leaf">
                      <Sprout className="h-4 w-4" />
                    </span>
                    <div>
                      <h4 className="text-base font-bold text-foreground">
                        Soil Substrate Moisture Matrix
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Dual-zone root hydration across capacitive probes
                      </p>
                    </div>
                  </div>
                  <Badge
                    className={`text-xs font-semibold ${
                      soilMoisture >= 40 && soilMoisture <= 70
                        ? "bg-leaf text-white"
                        : "bg-secondary text-foreground"
                    }`}
                  >
                    Status: {soilMoisture >= 40 && soilMoisture <= 70 ? "Optimal Moisture" : "Check Moisture"}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-baseline justify-between gap-4 my-3">
                  <div>
                    <span className="text-3xl md:text-4xl font-bold tracking-tight text-foreground tabular-nums">
                      {soilMoisture}%
                    </span>
                    <span className="ml-1.5 text-sm font-semibold text-muted-foreground">
                      / 40%–70% Target Band
                    </span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Zone 1: <span className="font-semibold text-foreground">{zone1Moisture}% ({soil1} ADC)</span> · Zone 2: <span className="font-semibold text-foreground">{zone2Moisture}% ({soil2} ADC)</span>
                    </p>
                  </div>
                  <span className="text-3xl font-bold text-leaf tabular-nums">
                    {soilMoisture}%
                  </span>
                </div>

                <Progress value={soilMoisture} className="h-2.5 bg-secondary my-3" />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
                <div className="rounded-xl border border-border/60 bg-secondary/40 p-2 sm:p-3 text-center">
                  <p className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-muted-foreground truncate">
                    Zone 1 (S1)
                  </p>
                  <p className="text-sm sm:text-base font-bold text-foreground mt-0.5">{zone1Moisture}%</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-secondary/40 p-2 sm:p-3 text-center">
                  <p className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-muted-foreground truncate">
                    Zone 2 (S2)
                  </p>
                  <p className="text-sm sm:text-base font-bold text-foreground mt-0.5">{zone2Moisture}%</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-secondary/40 p-2 sm:p-3 text-center">
                  <p className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-muted-foreground truncate">
                    Delta
                  </p>
                  <p className="text-sm sm:text-base font-bold text-leaf mt-0.5">{zoneDifference}%</p>
                </div>
              </div>
            </div>

            {/* Irrigation & Misting Activity Card */}
            <div className="glass-card rounded-2xl p-6 border border-border shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-border/60">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-water-soft text-water">
                    <Droplets className="h-4 w-4" />
                  </span>
                  <div>
                    <h4 className="text-base font-bold text-foreground">Irrigation & Misting Activity</h4>
                    <p className="text-xs text-muted-foreground">Sub-canopy humidity booster & cooling</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span>Misting Actuator State</span>
                      <span className={mistOn ? "text-water font-bold" : "text-muted-foreground font-semibold"}>
                        {mistOn ? "Active (Spraying)" : "Idle (Standby)"}
                      </span>
                    </div>
                    <div className="flex h-2.5 overflow-hidden rounded-full bg-secondary">
                      <div
                        className={mistOn ? "bg-water transition-all duration-500 w-full" : "bg-muted transition-all duration-500 w-0"}
                      />
                    </div>
                    <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-water" /> Spraying
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-muted-foreground" /> Standby
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl bg-secondary/50 p-3.5 border border-border/60 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Valve Actuator:</span>
                      <span className="font-semibold text-foreground">{mistOn ? "OPEN (Active)" : "CLOSED (Idle)"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Auto-Trigger Threshold:</span>
                      <span className="font-semibold text-foreground">&lt; 60% Humidity</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Operating Authority:</span>
                      <span className="font-semibold text-leaf">{mode} Mode</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-border/60 text-[11px] text-muted-foreground flex items-center justify-between">
                <span>Root Hydration Index</span>
                <span className="font-bold text-leaf">{zoneDifference <= 10 ? "Grade A · Uniform" : "Grade B · Variance"}</span>
              </div>
            </div>
          </div>

          {/* ────────────────────────────────────────────────────────
              PAIR 4: SYSTEM CONNECTIVITY & ACTUATOR HARDWARE
          ──────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* System Connectivity & Hardware Telemetry */}
            <div className="glass-card rounded-2xl p-6 border border-border shadow-xs lg:col-span-2 flex flex-col justify-between">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-border/60">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-leaf-soft text-leaf">
                      <Cpu className="h-4 w-4" />
                    </span>
                    <div>
                      <h4 className="text-base font-bold text-foreground">
                        System Connectivity & Hardware Telemetry
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        ESP32 dual-core microcontroller & Firebase RTDB stream health
                      </p>
                    </div>
                  </div>
                  <Badge
                    className={`text-xs font-semibold ${
                      connected
                        ? "bg-leaf text-white"
                        : "bg-warning text-white"
                    }`}
                  >
                    Status: {connected ? "Online" : loading ? "Syncing" : "Offline"}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-baseline justify-between gap-4 my-3">
                  <div>
                    <span className="text-3xl md:text-4xl font-bold tracking-tight text-foreground tabular-nums">
                      {connected ? "Production Node #01" : "Connecting..."}
                    </span>
                    <span className="ml-1.5 text-sm font-semibold text-muted-foreground">
                      · Live Stream
                    </span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Transport: <span className="font-semibold text-foreground">Firebase RTDB WebSocket</span> · Last Sync: <span className="font-semibold text-foreground">{lastUpdated || "Awaiting Stream"}</span>
                    </p>
                  </div>
                  <span className="text-3xl font-bold text-leaf tabular-nums">
                    {connected ? "100%" : "0%"}
                  </span>
                </div>

                <Progress value={connected ? 100 : 0} className="h-2.5 bg-secondary my-3" />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-border/60 bg-secondary/40 p-3 text-center">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                    Controller
                  </p>
                  <p className="text-base font-bold text-foreground mt-0.5">ESP32 240MHz</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-secondary/40 p-3 text-center">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                    Firmware Cycle
                  </p>
                  <p className="text-base font-bold text-foreground mt-0.5">2000ms Loop</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-secondary/40 p-3 text-center">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                    Sensors Online
                  </p>
                  <p className="text-base font-bold text-leaf mt-0.5">5 / 5 Active</p>
                </div>
              </div>
            </div>

            {/* Actuator Hardware State Card */}
            <div className="glass-card rounded-2xl p-6 border border-border shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-border/60">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-leaf-soft text-leaf">
                    <ShieldCheck className="h-4 w-4" />
                  </span>
                  <div>
                    <h4 className="text-base font-bold text-foreground">Actuator Hardware State</h4>
                    <p className="text-xs text-muted-foreground">Direct hardware output synchronization</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span>Grow LED Output</span>
                      <span className="text-leaf font-bold">{ledOn ? `${ledIntensity}% PWM` : "Off (0 PWM)"}</span>
                    </div>
                    <div className="flex h-2.5 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="bg-leaf transition-all duration-500"
                        style={{ width: `${ledOn ? ledIntensity : 0}%` }}
                      />
                    </div>
                    <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-leaf" /> Active Duty Cycle
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-muted" /> Standby
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl bg-secondary/50 p-3.5 border border-border/60 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Operating Mode:</span>
                      <span className="font-semibold text-foreground">{mode}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Hardware PWM:</span>
                      <span className="font-semibold text-foreground">{ledBrightness > 0 ? `${ledBrightness}/255 PWM` : "0 PWM"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Misting Valve:</span>
                      <span className="font-semibold text-leaf">{mistOn ? "Active (Open)" : "Standby (Closed)"}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-border/60 text-[11px] text-muted-foreground flex items-center justify-between">
                <span>Hardware Synchronization</span>
                <span className="font-bold text-leaf">Realtime Active</span>
              </div>
            </div>
          </div>

        </TabsContent>
      </Tabs>
    </div>
  );
}

