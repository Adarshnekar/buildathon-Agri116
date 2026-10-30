import React, { useState, useEffect } from "react";
import {
  CropProfile,
  FertilizerApplicationRecord,
  PlantHealthInspection,
  CropReminder,
  InventoryItem,
  NutrientRecommendation,
} from "@/types/nourishiq";
import { cropService } from "@/services/nourishiq/cropService";
import { calculateCropStage } from "@/lib/nourishiq/growthStageEngine";
import { getCropProfile } from "@/lib/nourishiq/cropProfiles";
import { generateNutrientRecommendations } from "@/lib/nourishiq/fertilizerCalculator";
import { runPlantHealthDiagnosis } from "@/lib/nourishiq/plantHealthDiagnosisEngine";
import CropRegistrationModal from "./CropRegistrationModal";
import FertilizerCalculatorModal from "./FertilizerCalculatorModal";
import {
  Sprout,
  FlaskConical,
  Activity,
  Calendar,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Camera,
  Upload,
  Plus,
  Calculator,
  Layers,
  Sparkles,
  Droplets,
  DollarSign,
  Package,
  Ruler,
  ChevronRight,
  TrendingUp,
  FileText,
  Trash2,
  Info,
  Thermometer,
  CloudSun,
} from "lucide-react";
import { toast } from "sonner";

interface NourishIQDashboardProps {
  currentTemp?: number;
  currentHumidity?: number;
}

type TabType =
  | "overview"
  | "profile"
  | "nutrient_planner"
  | "plant_health"
  | "activity_history"
  | "inventory";

export default function NourishIQDashboard({
  currentTemp = 24.8,
  currentHumidity = 68,
}: NourishIQDashboardProps) {
  // ── State ─────────────────────────────────────────────────────────
  const [crops, setCrops] = useState<CropProfile[]>([]);
  const [activeCropId, setActiveCropId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [applications, setApplications] = useState<FertilizerApplicationRecord[]>([]);
  const [inspections, setInspections] = useState<PlantHealthInspection[]>([]);
  const [reminders, setReminders] = useState<CropReminder[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modals
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [isCalculatorModalOpen, setIsCalculatorModalOpen] = useState(false);
  const [editingCrop, setEditingCrop] = useState<CropProfile | null>(null);

  // Health Scanner state
  const [symptomsInput, setSymptomsInput] = useState("");
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [activeDiagnosis, setActiveDiagnosis] = useState<PlantHealthInspection | null>(null);

  // Application Record Form state
  const [showLogAppModal, setShowLogAppModal] = useState(false);
  const [logFertName, setLogFertName] = useState("");
  const [logQuantity, setLogQuantity] = useState(3.0);
  const [logMethod, setLogMethod] = useState("Drip Fertigation");
  const [logNotes, setLogNotes] = useState("");

  // Load Data
  const loadData = async () => {
    setLoading(true);
    try {
      const loadedCrops = await cropService.getCrops();
      setCrops(loadedCrops);

      let currentId = activeCropId;
      if (!currentId && loadedCrops.length > 0) {
        currentId = loadedCrops[0].id;
        setActiveCropId(currentId);
      }

      if (currentId) {
        const [apps, insps, rems, inv] = await Promise.all([
          cropService.getApplications(currentId),
          cropService.getInspections(currentId),
          cropService.getReminders(currentId),
          cropService.getInventory(),
        ]);
        setApplications(apps);
        setInspections(insps);
        setReminders(rems);
        setInventory(inv);
      }
    } catch (e) {
      console.error("Failed to load NourishIQ data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeCropId]);

  const activeCrop = crops.find((c) => c.id === activeCropId) || crops[0];
  const stageInfo = activeCrop ? calculateCropStage(activeCrop) : null;
  const cropProfileDef = activeCrop ? getCropProfile(activeCrop.cropName) : null;
  const recommendations = activeCrop
    ? generateNutrientRecommendations(activeCrop, applications)
    : [];

  // ── Actions ───────────────────────────────────────────────────────
  const handleCropSaved = async (saved: CropProfile) => {
    await cropService.saveCrop(saved);
    setActiveCropId(saved.id);
    await loadData();
  };

  const handleMarkApplication = async (appId: string, status: "Applied" | "Skipped") => {
    const target = applications.find((a) => a.id === appId);
    if (!target) return;
    const updated: FertilizerApplicationRecord = {
      ...target,
      status,
      applicationDate: new Date().toISOString().split("T")[0],
    };
    await cropService.logApplication(updated);
    toast.success(
      status === "Applied"
        ? `Applied ${target.quantity} ${target.unit} of ${target.productName}`
        : `Application marked as ${status}`
    );
    await loadData();
  };

  const handleLogManualApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCrop) return;

    const newRecord: FertilizerApplicationRecord = {
      id: `app_${Date.now()}`,
      cropId: activeCrop.id,
      productName: logFertName.trim() || "NPK 19-19-19 (Water Soluble)",
      productType: "Fertilizer",
      quantity: Number(logQuantity) || 1,
      unit: "kg",
      applicationDate: new Date().toISOString().split("T")[0],
      applicationMethod: logMethod,
      growthStage: stageInfo?.currentStage.stageName || "Vegetative",
      status: "Applied",
      notes: logNotes.trim(),
      createdAt: new Date().toISOString(),
    };

    await cropService.logApplication(newRecord);
    toast.success("Application Logged Successfully", {
      description: `Deducted ${newRecord.quantity} kg from inventory stock.`,
    });
    setShowLogAppModal(false);
    setLogFertName("");
    setLogNotes("");
    await loadData();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const url = URL.createObjectURL(file);
      setUploadedPhotos((prev) => [...prev, url]);
    });
    toast.success(`${files.length} photo(s) attached for plant inspection`);
  };

  const handleRunDiagnosis = () => {
    if (!activeCrop || !stageInfo) return;
    if (!symptomsInput.trim() && uploadedPhotos.length === 0) {
      toast.error("Please upload a photo or describe observed symptoms");
      return;
    }

    setIsDiagnosing(true);
    setTimeout(async () => {
      const diagnosis = runPlantHealthDiagnosis({
        cropId: activeCrop.id,
        cropName: activeCrop.cropName,
        variety: activeCrop.variety,
        growthStage: stageInfo.currentStage.stageName,
        imageUrls: uploadedPhotos,
        symptomsReported: symptomsInput.trim() || "General leaf spot and chlorosis observed on mid canopy.",
        currentTemp,
        currentHumidity,
      });

      await cropService.saveInspection(diagnosis);
      setActiveDiagnosis(diagnosis);
      setIsDiagnosing(false);
      toast.success("AI Plant Health Inspection Complete", {
        description: `Preliminary finding: ${diagnosis.suspectedDiagnosis} (${diagnosis.confidence}% confidence).`,
      });
      await loadData();
    }, 900);
  };

  // Pre-Harvest Interval Safety Checks
  const activePesticideApplications = applications.filter(
    (a) => a.productType === "Pesticide" && a.status === "Applied"
  );

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* ────────────────────────────────────────────────────────────
          PAGE HEADER: NOURISHIQ TITLE & CROP SELECTOR
      ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between pb-2 border-b border-border/70">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-leaf-soft text-leaf">
              <FlaskConical className="h-3.5 w-3.5" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-leaf">
              Feed Smarter · Protect Better · Grow Healthier
            </span>
          </div>
          <h2 className="text-2xl font-extrabold text-foreground tracking-tight flex items-center gap-2.5 mt-1">
            NourishIQ
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              Crop Nutrition & Plant Health Intelligence
            </span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Precision fertilizer calculation, AI leaf health diagnosis, and lifecycle crop-care tracking.
          </p>
        </div>

        {/* Right Header Controls */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {crops.length > 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-1.5 shadow-2xs">
              <Sprout className="h-4 w-4 text-leaf" />
              <select
                value={activeCropId}
                onChange={(e) => setActiveCropId(e.target.value)}
                className="bg-transparent text-xs font-bold text-foreground focus:outline-none cursor-pointer"
              >
                {crops.map((c) => (
                  <option key={c.id} value={c.id} className="bg-card text-foreground">
                    {c.cropName} – {c.variety}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setEditingCrop(null);
              setIsCropModalOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-xs cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Register Crop</span>
          </button>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────
          ACTIVE CROP QUICK STATUS BAR
      ──────────────────────────────────────────────────────────── */}
      {activeCrop && stageInfo && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
          <div className="rounded-xl border border-border bg-card p-3 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Cultivar
            </span>
            <p className="text-sm font-bold text-foreground truncate mt-0.5">
              {activeCrop.cropName} ({activeCrop.variety})
            </p>
            <span className="text-[10px] text-muted-foreground font-medium">
              Medium: {activeCrop.cultivationMethod}
            </span>
          </div>

          <div className="rounded-xl border border-border bg-card p-3 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Crop Age
            </span>
            <p className="text-sm font-extrabold text-foreground mt-0.5">
              {stageInfo.effectiveAgeDays} Days
            </p>
            <span className="text-[10px] text-muted-foreground">
              Ref: {activeCrop.referenceDateType === "transplanting" ? "Transplanting" : "Sowing"}
            </span>
          </div>

          <div className="rounded-xl border border-border bg-card p-3 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Growth Stage
            </span>
            <p className="text-sm font-bold text-leaf truncate mt-0.5">
              {stageInfo.currentStage.stageName}
            </p>
            <span className="text-[10px] text-muted-foreground">
              {stageInfo.stageProgressPercent}% completed ({stageInfo.daysRemainingInStage}d left)
            </span>
          </div>

          <div className="rounded-xl border border-border bg-card p-3 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Target NPK Ratio
            </span>
            <p className="text-sm font-extrabold text-foreground mt-0.5">
              {stageInfo.currentStage.targetNPKRatio}
            </p>
            <span className="text-[10px] text-muted-foreground">
              EC: {stageInfo.currentStage.targetEC.min}–{stageInfo.currentStage.targetEC.max} dS/m
            </span>
          </div>

          <div className="rounded-xl border border-border bg-card p-3 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Canopy Coverage
            </span>
            <p className="text-sm font-bold text-foreground mt-0.5">
              {activeCrop.area} {activeCrop.areaUnit}
            </p>
            <span className="text-[10px] text-muted-foreground">
              {activeCrop.plantPopulation.toLocaleString()} Plants
            </span>
          </div>

          <div className="rounded-xl border border-border bg-card p-3 shadow-2xs flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Irrigation Mode
            </span>
            <div className="flex items-center gap-1.5 text-xs font-bold text-water">
              <Droplets className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{activeCrop.irrigationMethod}</span>
            </div>
            <span className="text-[10px] text-muted-foreground">
              {stageInfo.currentStage.dailyWaterLitersPerPlant} L / plant / day
            </span>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────
          NAVIGATION TABS
      ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 border-b border-border/80 overflow-x-auto pb-1 text-xs">
        {[
          { id: "overview", label: "Overview", icon: Activity },
          { id: "profile", label: "Crop Profile", icon: Sprout },
          { id: "nutrient_planner", label: "Nutrient Planner", icon: Calculator },
          { id: "plant_health", label: "Plant Health Scanner", icon: Camera },
          { id: "activity_history", label: "Activity & Harvest Safety", icon: Calendar },
          { id: "inventory", label: "Inventory & Cost", icon: Package },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ────────────────────────────────────────────────────────────
          TAB 1: OVERVIEW SUMMARY CARDS
      ──────────────────────────────────────────────────────────── */}
      {activeTab === "overview" && activeCrop && stageInfo && (
        <div className="space-y-5">
          {/* Weather Contextual Advisory */}
          <div className="rounded-2xl border border-border/80 bg-secondary/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sun-soft text-sun border border-sun/20">
                <CloudSun className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">
                  Weather-Aware Application Advisory
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Polyhouse sensor conditions: {currentTemp}°C · {currentHumidity}% RH. Favorable morning transpiration window. Safe for foliar and drip fertigation.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsCalculatorModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl border border-border bg-card text-xs font-bold text-foreground hover:bg-secondary flex items-center gap-1.5 shadow-2xs self-start sm:self-auto cursor-pointer"
            >
              <Calculator className="h-3.5 w-3.5 text-leaf" />
              Calculate Next Dose
            </button>
          </div>

          {/* 4 Core Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Crop Overview */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <Sprout className="h-4 w-4 text-leaf" />
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Crop Overview
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-leaf bg-leaf-soft px-2 py-0.5 rounded-full">
                  Active
                </span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Crop / Variety:</span>
                  <span className="font-semibold text-foreground">
                    {activeCrop.cropName} ({activeCrop.variety})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sowing Date:</span>
                  <span className="font-semibold text-foreground">{activeCrop.sowingDate}</span>
                </div>
                {activeCrop.transplantingDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Transplanted:</span>
                    <span className="font-semibold text-foreground">{activeCrop.transplantingDate}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Growth Stage:</span>
                  <span className="font-bold text-leaf">{stageInfo.currentStage.stageName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cultivation:</span>
                  <span className="font-semibold text-foreground">{activeCrop.cultivationMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Area & Spacing:</span>
                  <span className="font-semibold text-foreground">
                    {activeCrop.area} {activeCrop.areaUnit} ({activeCrop.plantSpacingCm}×{activeCrop.rowSpacingCm}cm)
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: Nutrition Overview */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <FlaskConical className="h-4 w-4 text-primary" />
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Nutrition Overview
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-primary bg-primary-soft px-2 py-0.5 rounded-full">
                  Stage Balanced
                </span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Upcoming Activity:</span>
                  <span className="font-semibold text-foreground">
                    {recommendations[0]?.recommendedFertilizer || "Weekly NPK Pulse"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Application:</span>
                  <span className="font-semibold text-foreground">
                    {applications[0]?.applicationDate || "None recorded"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pending Recommendations:</span>
                  <span className="font-bold text-primary">{recommendations.length} Active</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Recorded Applications:</span>
                  <span className="font-semibold text-foreground">
                    {applications.filter((a) => a.status === "Applied").length} Completed
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nutrient Balance:</span>
                  <span className="font-semibold text-leaf">Optimal (No waste detected)</span>
                </div>
              </div>
            </div>

            {/* Card 3: Plant Health Overview */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <Camera className="h-4 w-4 text-sun" />
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Plant Health Overview
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-sun bg-sun-soft px-2 py-0.5 rounded-full">
                  Monitored
                </span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Inspection:</span>
                  <span className="font-semibold text-foreground">
                    {inspections[0]?.inspectionDate || "Ready for scan"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Active Suspected Issues:</span>
                  <span className="font-bold text-foreground">
                    {inspections.filter((i) => i.status === "Suspected").length} Pending
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Primary Finding:</span>
                  <span className="font-semibold text-foreground truncate max-w-[130px]">
                    {inspections[0]?.suspectedDiagnosis || "Canopy healthy"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Next Scheduled Check:</span>
                  <span className="font-semibold text-foreground">
                    {inspections[0]?.recommendedNextInspection || "In 4 days"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Inspection Protocol:</span>
                  <span className="font-semibold text-foreground">IPM 5-Tier Guided</span>
                </div>
              </div>
            </div>

            {/* Card 4: Crop Care Activity */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-water" />
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Crop Care Activity
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-water bg-water-soft px-2 py-0.5 rounded-full">
                  On Schedule
                </span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Upcoming Tasks:</span>
                  <span className="font-semibold text-foreground">
                    {reminders.filter((r) => r.status === "Pending").length} Scheduled
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Completed Applications:</span>
                  <span className="font-bold text-leaf">
                    {applications.filter((a) => a.status === "Applied").length} Verified
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Missed / Skipped:</span>
                  <span className="font-semibold text-muted-foreground">
                    {applications.filter((a) => a.status === "Skipped").length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Active Harvest Safety:</span>
                  <span className="font-semibold text-leaf">No Active Restrictions</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Inventory Status:</span>
                  <span className="font-semibold text-foreground">{inventory.length} SKUs in stock</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Action Shortcuts */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <button
              type="button"
              onClick={() => setActiveTab("nutrient_planner")}
              className="p-4 rounded-2xl border border-border bg-card hover:bg-secondary/40 text-left transition-all group shadow-2xs cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-primary font-bold text-sm">
                  <Calculator className="h-4 w-4" />
                  <span>Fertilizer Planner & Calendar</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                View stage-specific fertilizer doses, prevent nutrient waste, and mark applications.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("plant_health")}
              className="p-4 rounded-2xl border border-border bg-card hover:bg-secondary/40 text-left transition-all group shadow-2xs cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sun font-bold text-sm">
                  <Camera className="h-4 w-4" />
                  <span>Scan Plant Foliage</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Upload leaf and fruit photos for AI pest, disease, and deficiency diagnosis.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("activity_history")}
              className="p-4 rounded-2xl border border-border bg-card hover:bg-secondary/40 text-left transition-all group shadow-2xs cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-water font-bold text-sm">
                  <Calendar className="h-4 w-4" />
                  <span>Harvest Safety & Timeline</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Track pre-harvest intervals (PHI) and verify chronological crop-care treatments.
              </p>
            </button>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────
          TAB 2: CROP PROFILE & LIFECYCLE TIMELINE
      ──────────────────────────────────────────────────────────── */}
      {activeTab === "profile" && activeCrop && stageInfo && cropProfileDef && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  Crop Profile: {activeCrop.cropName} ({activeCrop.variety})
                </h3>
                <p className="text-xs text-muted-foreground">
                  Location: {activeCrop.region} · Planted on {activeCrop.sowingDate}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingCrop(activeCrop);
                  setIsCropModalOpen(true);
                }}
                className="px-3.5 py-1.5 rounded-xl border border-input bg-card text-xs font-semibold text-foreground hover:bg-secondary transition-colors cursor-pointer"
              >
                Edit Crop Parameters
              </button>
            </div>

            {/* Growth Stage Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-foreground">
                <span>Lifecycle Progress ({stageInfo.effectiveAgeDays} / {stageInfo.totalLifecycleDays} Days)</span>
                <span className="text-leaf">{stageInfo.lifecycleProgressPercent}% Complete</span>
              </div>
              <div className="w-full h-3 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-leaf rounded-full transition-all duration-500"
                  style={{ width: `${stageInfo.lifecycleProgressPercent}%` }}
                />
              </div>
            </div>

            {/* All Stages Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {cropProfileDef.stages.map((st, idx) => {
                const isCurrent = st.stageName === stageInfo.currentStage.stageName;
                const isPast = idx < stageInfo.currentStageIndex;

                return (
                  <div
                    key={st.stageName}
                    className={`rounded-xl p-4 border transition-all ${
                      isCurrent
                        ? "border-primary bg-primary-soft/30 shadow-2xs"
                        : isPast
                        ? "border-border/60 bg-secondary/20 opacity-75"
                        : "border-border bg-card"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Stage {idx + 1} ({st.durationDays} days)
                      </span>
                      {isCurrent ? (
                        <span className="text-[10px] font-bold text-leaf bg-leaf-soft px-2 py-0.5 rounded-full border border-leaf/30">
                          Active Stage
                        </span>
                      ) : isPast ? (
                        <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-leaf" />
                          Done
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">Upcoming</span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-foreground">{st.stageName}</h4>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {st.description}
                    </p>

                    <div className="mt-3 pt-2 border-t border-border/50 text-[11px] space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">NPK Ratio:</span>
                        <strong className="text-foreground">{st.targetNPKRatio}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Target EC:</span>
                        <strong className="text-foreground">{st.targetEC.min}–{st.targetEC.max} dS/m</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Water Demand:</span>
                        <strong className="text-foreground">{st.dailyWaterLitersPerPlant} L/plant/day</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Substrate & Lab Test Data */}
            <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Substrate & Soil Test Calibration
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Nitrogen (N)</span>
                  <span className="font-bold text-foreground">{activeCrop.soilTestNPK?.n || "—"} ppm</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Phosphorus (P)</span>
                  <span className="font-bold text-foreground">{activeCrop.soilTestNPK?.p || "—"} ppm</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Potassium (K)</span>
                  <span className="font-bold text-foreground">{activeCrop.soilTestNPK?.k || "—"} ppm</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Medium pH</span>
                  <span className="font-bold text-foreground">{activeCrop.soilPH || "6.2"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Medium EC</span>
                  <span className="font-bold text-foreground">{activeCrop.soilEC || "1.8"} dS/m</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────
          TAB 3: NUTRIENT PLANNER & FERTILIZER CALENDAR
      ──────────────────────────────────────────────────────────── */}
      {activeTab === "nutrient_planner" && activeCrop && stageInfo && (
        <div className="space-y-5">
          {/* Top Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-border bg-card shadow-xs">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Calculator className="h-4 w-4 text-leaf" />
                Verified Stage Nutrient Recommendations
              </h3>
              <p className="text-xs text-muted-foreground">
                Customized for {activeCrop.cropName} in {stageInfo.currentStage.stageName} stage.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCalculatorModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
              >
                <Calculator className="h-3.5 w-3.5" />
                <span>Quantity Calculator</span>
              </button>
              <button
                type="button"
                onClick={() => setShowLogAppModal(true)}
                className="px-3.5 py-2 rounded-xl border border-input bg-card text-xs font-bold text-foreground hover:bg-secondary transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Log Application</span>
              </button>
            </div>
          </div>

          {/* Recommendations List */}
          <div className="space-y-4">
            {recommendations.map((rec) => (
              <div
                key={rec.id}
                className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary-soft px-2 py-0.5 rounded-full">
                        {rec.targetNutrient}
                      </span>
                      <span className="text-xs font-semibold text-muted-foreground">
                        {rec.dateRange} · {rec.frequency}
                      </span>
                    </div>
                    <h4 className="text-base font-bold text-foreground mt-1">
                      {rec.recommendedFertilizer} ({rec.fertilizerComposition})
                    </h4>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-extrabold text-foreground tabular-nums">
                      {rec.calculatedQuantity}
                    </span>
                    <span className="text-xs font-bold text-muted-foreground ml-1">
                      {rec.quantityUnit} total
                    </span>
                    <p className="text-[11px] text-muted-foreground">{rec.perUnitArea}</p>
                  </div>
                </div>

                {/* Nutrient Waste Warning Alert */}
                {rec.wasteWarning && (
                  <div className="p-3 rounded-xl border border-warning/40 bg-warning-soft text-warning flex items-start gap-2.5 text-xs">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Nutrient Waste Prevention Alert</p>
                      <p className="text-[11px] text-warning/90 mt-0.5">{rec.wasteWarning}</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="font-bold text-foreground text-[11px] uppercase tracking-wider">
                      Agronomic Justification
                    </p>
                    <p className="text-muted-foreground mt-0.5 leading-relaxed">{rec.reason}</p>
                    <p className="text-[10px] text-muted-foreground/80 mt-1 font-mono">
                      Ref: {rec.source}
                    </p>
                  </div>
                  <div>
                    <p className="font-bold text-foreground text-[11px] uppercase tracking-wider">
                      Method & Precautions
                    </p>
                    <p className="text-muted-foreground mt-0.5">Method: {rec.applicationMethod}</p>
                    <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-0.5 text-[11px]">
                      {rec.precautions.map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setLogFertName(rec.recommendedFertilizer);
                      setLogQuantity(rec.calculatedQuantity);
                      setLogMethod(rec.applicationMethod);
                      setShowLogAppModal(true);
                    }}
                    className="px-4 py-1.5 rounded-xl bg-leaf text-white text-xs font-bold hover:bg-leaf/90 transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Apply This Recommendation</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Visual Fertilizer Calendar & Activity Tracker */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-sun" />
                  Fertilizer Schedule & Activity Timeline
                </h3>
                <p className="text-xs text-muted-foreground">
                  Complete history of planned and applied crop nutrients.
                </p>
              </div>
              <span className="text-xs font-bold text-muted-foreground">
                {applications.length} Entries
              </span>
            </div>

            {applications.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No fertilizer applications recorded yet. Log your first application above.
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {applications.map((app) => (
                  <div
                    key={app.id}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground text-sm">{app.productName}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            app.status === "Applied"
                              ? "bg-leaf-soft text-leaf border border-leaf/20"
                              : app.status === "Skipped"
                              ? "bg-destructive/10 text-destructive border border-destructive/20"
                              : "bg-sun-soft text-sun border border-sun/20"
                          }`}
                        >
                          {app.status}
                        </span>
                        <span className="text-muted-foreground font-medium">
                          Stage: {app.growthStage}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Date: {app.applicationDate} · Method: {app.applicationMethod}
                        {app.notes && ` · Notes: ${app.notes}`}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      <span className="font-extrabold text-foreground text-sm tabular-nums">
                        {app.quantity} {app.unit}
                      </span>
                      {app.status !== "Applied" && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleMarkApplication(app.id, "Applied")}
                            className="px-2.5 py-1 rounded-lg bg-leaf-soft text-leaf font-bold hover:bg-leaf hover:text-white transition-colors cursor-pointer text-[11px]"
                          >
                            Mark Applied
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMarkApplication(app.id, "Skipped")}
                            className="px-2 py-1 rounded-lg text-muted-foreground hover:bg-secondary font-medium transition-colors cursor-pointer text-[11px]"
                          >
                            Skip
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────
          TAB 4: PLANT HEALTH SCANNER (AI Vision Diagnosis & IPM)
      ──────────────────────────────────────────────────────────── */}
      {activeTab === "plant_health" && activeCrop && stageInfo && (
        <div className="space-y-5">
          {/* Image Upload & Guided Capture Console */}
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs space-y-4">
            <div className="border-b border-border/60 pb-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Camera className="h-4 w-4 text-sun" />
                Plant Foliage & Fruit Health Scanner
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Capture high-resolution photographs of affected canopy leaves, stems, or fruit for automated diagnostic evaluation.
              </p>
            </div>

            {/* Guided tips */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px] text-muted-foreground">
              <div className="p-2.5 rounded-xl border border-border bg-secondary/30">
                <strong className="text-foreground block">1. Upper & Lower Leaf:</strong>
                Capture close-ups of both top surface and undersides for spider mites and conidia.
              </div>
              <div className="p-2.5 rounded-xl border border-border bg-secondary/30">
                <strong className="text-foreground block">2. Margin & Vein Pattern:</strong>
                Ensure sharp focus on yellowing halos, necrotic spots, or interveinal patterns.
              </div>
              <div className="p-2.5 rounded-xl border border-border bg-secondary/30">
                <strong className="text-foreground block">3. Whole Plant Context:</strong>
                Take a wider shot showing whether lower or upper apical leaves are affected.
              </div>
            </div>

            {/* Upload Area */}
            <div className="flex flex-col sm:flex-row gap-4">
              <label className="flex-1 border-2 border-dashed border-input rounded-2xl p-6 flex flex-col items-center justify-center text-center hover:bg-secondary/30 transition-colors cursor-pointer group">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <div className="h-12 w-12 rounded-2xl bg-secondary flex items-center justify-center text-muted-foreground group-hover:scale-110 transition-transform">
                  <Upload className="h-6 w-6" />
                </div>
                <p className="text-xs font-bold text-foreground mt-2">
                  Click to Upload or Drag & Drop Photos
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Supports JPG, PNG, WEBP from mobile camera or desktop storage.
                </p>
              </label>

              {/* Text Symptoms Description */}
              <div className="flex-1 flex flex-col justify-between space-y-2">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Describe Observed Symptoms
                  </label>
                  <textarea
                    rows={4}
                    value={symptomsInput}
                    onChange={(e) => setSymptomsInput(e.target.value)}
                    placeholder="e.g. Small yellow spots with concentric rings on lower leaves, powdery white spots, or web-like silk on shoot tips..."
                    className="w-full p-3 rounded-xl border border-input bg-card text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <button
                  type="button"
                  disabled={isDiagnosing}
                  onClick={handleRunDiagnosis}
                  className="w-full py-2.5 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-2xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isDiagnosing ? (
                    <>
                      <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Analyzing Foliage with Vision Engine...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Run AI Diagnostic Evaluation
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Photo Previews */}
            {uploadedPhotos.length > 0 && (
              <div className="flex items-center gap-3 overflow-x-auto pt-2">
                {uploadedPhotos.map((url, i) => (
                  <div key={i} className="relative h-20 w-20 rounded-xl overflow-hidden border border-border shrink-0 group">
                    <img src={url} alt={`Inspection Photo ${i + 1}`} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setUploadedPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                      className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Diagnosis Output */}
          {activeDiagnosis && (
            <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-sun bg-sun-soft px-2.5 py-0.5 rounded-full border border-sun/20">
                      Condition Type: {activeDiagnosis.conditionType}
                    </span>
                    <span className="text-xs font-bold text-foreground">
                      Severity: <strong className={activeDiagnosis.severity === "High" ? "text-destructive" : "text-sun"}>{activeDiagnosis.severity}</strong>
                    </span>
                  </div>
                  <h3 className="text-xl font-extrabold text-foreground tracking-tight mt-1">
                    {activeDiagnosis.suspectedDiagnosis}
                  </h3>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-leaf tabular-nums">
                    {activeDiagnosis.confidence}%
                  </span>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                    Confidence Level
                  </p>
                </div>
              </div>

              {/* Reasoning & Observed Symptoms */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-xl border border-border bg-secondary/30 space-y-1.5">
                  <p className="font-bold text-foreground text-[11px] uppercase tracking-wider">
                    Agronomic Reasoning & Environmental Triggers
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    {activeDiagnosis.reasoning}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-secondary/30 space-y-1.5">
                  <p className="font-bold text-foreground text-[11px] uppercase tracking-wider">
                    Visible Symptom Patterns
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    {activeDiagnosis.visibleSymptoms.map((sym, i) => (
                      <li key={i}>{sym}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* 5-Tier Integrated Pest Management (IPM) Advisory */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-leaf" />
                  5-Tier Integrated Pest Management (IPM) Advisory
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  {/* Tier 1: Cultural */}
                  <div className="p-3.5 rounded-xl border border-border bg-card space-y-1.5">
                    <p className="font-bold text-leaf text-xs flex items-center gap-1.5">
                      <span className="flex h-4 w-4 rounded-full bg-leaf text-white items-center justify-center text-[10px]">1</span>
                      Cultural & Preventive
                    </p>
                    <ul className="text-muted-foreground space-y-1 text-[11px]">
                      {activeDiagnosis.treatmentAdvisory.culturalControls.map((c, i) => (
                        <li key={i}>• {c}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Tier 2: Mechanical */}
                  <div className="p-3.5 rounded-xl border border-border bg-card space-y-1.5">
                    <p className="font-bold text-water text-xs flex items-center gap-1.5">
                      <span className="flex h-4 w-4 rounded-full bg-water text-white items-center justify-center text-[10px]">2</span>
                      Mechanical & Physical
                    </p>
                    <ul className="text-muted-foreground space-y-1 text-[11px]">
                      {activeDiagnosis.treatmentAdvisory.mechanicalControls.map((c, i) => (
                        <li key={i}>• {c}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Tier 3: Biological */}
                  <div className="p-3.5 rounded-xl border border-border bg-card space-y-1.5">
                    <p className="font-bold text-sun text-xs flex items-center gap-1.5">
                      <span className="flex h-4 w-4 rounded-full bg-sun text-white items-center justify-center text-[10px]">3</span>
                      Biological & Biocontrol
                    </p>
                    <ul className="text-muted-foreground space-y-1 text-[11px]">
                      {activeDiagnosis.treatmentAdvisory.biologicalControls.map((c, i) => (
                        <li key={i}>• {c}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Tier 4: Chemical Protection (Only When Justified) */}
                {activeDiagnosis.treatmentAdvisory.chemicalControls && (
                  <div className="p-4 rounded-xl border border-warning/30 bg-warning-soft/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-warning text-xs flex items-center gap-1.5 uppercase tracking-wider">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Label-Approved Chemical Treatment Option (Justified Only)
                      </p>
                      <span className="text-[10px] text-muted-foreground">
                        Verified Agronomic References
                      </span>
                    </div>

                    {activeDiagnosis.treatmentAdvisory.chemicalControls.map((chem, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg border border-border bg-card text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-foreground text-sm">{chem.productName}</span>
                          <span className="font-mono text-xs text-primary font-bold">
                            Dosage: {chem.dosage}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Active Ingredient: <strong className="text-foreground">{chem.activeIngredient}</strong> · Method: {chem.applicationMethod}
                        </p>
                        <div className="pt-1 flex flex-wrap items-center gap-4 text-[10px] text-muted-foreground border-t border-border/50">
                          <span>Pre-Harvest Interval (PHI): <strong className="text-destructive font-bold">{chem.preHarvestIntervalDays} days</strong></span>
                          <span>Re-Entry Interval: <strong>{chem.reEntryIntervalHours} hours</strong></span>
                          <span>PPE: <strong>{chem.ppeRequirements.join(", ")}</strong></span>
                        </div>
                        <p className="text-[10px] text-muted-foreground italic">
                          Restrictions: {chem.restrictions}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Expert Disclaimer Banner */}
              <div className="p-3 rounded-xl border border-border/80 bg-secondary/40 text-[11px] text-muted-foreground flex items-start gap-2">
                <Info className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                <p>{activeDiagnosis.treatmentAdvisory.expertDisclaimer}</p>
              </div>

              {/* Follow-up Scheduler */}
              <div className="pt-2 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Recommended Follow-up Inspection: <strong className="text-foreground">{activeDiagnosis.recommendedNextInspection}</strong>
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    await cropService.saveReminder({
                      id: `rem_followup_${Date.now()}`,
                      cropId: activeCrop.id,
                      type: "Health Inspection",
                      title: `Follow-up: ${activeDiagnosis.suspectedDiagnosis}`,
                      description: `Re-inspect foliage to verify symptom improvement following IPM protocol.`,
                      dueDate: activeDiagnosis.recommendedNextInspection,
                      status: "Pending",
                      priority: "High",
                    });
                    toast.success("Follow-up Inspection Scheduled in Reminders");
                  }}
                  className="px-4 py-1.5 rounded-xl border border-input bg-card text-xs font-bold text-foreground hover:bg-secondary transition-colors cursor-pointer"
                >
                  Schedule Follow-up Reminder
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────
          TAB 5: ACTIVITY TIMELINE & HARVEST SAFETY CALENDAR
      ──────────────────────────────────────────────────────────── */}
      {activeTab === "activity_history" && activeCrop && (
        <div className="space-y-5">
          {/* Dedicated Harvest Safety Calendar */}
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-leaf" />
                  Pre-Harvest Interval (PHI) Safety Calendar
                </h3>
                <p className="text-xs text-muted-foreground">
                  Enforces strict chemical withholding periods to guarantee zero chemical pesticide residues in harvested food crops.
                </p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-leaf-soft text-leaf">
                Compliance Active
              </span>
            </div>

            {activePesticideApplications.length === 0 ? (
              <div className="p-4 rounded-xl border border-leaf/30 bg-leaf-soft/30 text-xs text-leaf font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>
                  No restricted chemical pesticides currently recorded within active withholding windows. Polyhouse produce is safe for scheduled harvest.
                </span>
              </div>
            ) : (
              <div className="space-y-3">
                {activePesticideApplications.map((app) => (
                  <div
                    key={app.id}
                    className="p-3.5 rounded-xl border border-warning/40 bg-warning-soft/30 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <p className="font-bold text-foreground text-sm">{app.productName}</p>
                      <p className="text-[11px] text-muted-foreground">
                        Applied Date: {app.applicationDate} · Stage: {app.growthStage}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-destructive font-bold text-xs uppercase tracking-wider block">
                        Harvest Restriction Active
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        Earliest Permitted Harvest: <strong>{new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0]}</strong>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Unified Timeline List */}
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Unified Crop-Care Chronological Timeline
            </h3>

            <div className="divide-y divide-border/60">
              {applications.concat(
                inspections.map((i) => ({
                  id: i.id,
                  cropId: i.cropId,
                  productName: `Health Scan: ${i.suspectedDiagnosis}`,
                  productType: "Foliar Spray" as const,
                  quantity: 0,
                  unit: "scan",
                  applicationDate: i.inspectionDate,
                  applicationMethod: "Foliar Inspection",
                  growthStage: "Monitored",
                  status: "Applied" as const,
                  notes: `Condition: ${i.conditionType} (${i.confidence}% conf)`,
                  createdAt: i.createdAt,
                }))
              )
                .sort((a, b) => new Date(b.applicationDate).getTime() - new Date(a.applicationDate).getTime())
                .map((event) => (
                  <div key={event.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-foreground text-sm">{event.productName}</span>
                      <p className="text-[11px] text-muted-foreground">
                        {event.applicationDate} · {event.applicationMethod} · {event.notes}
                      </p>
                    </div>
                    <span className="font-semibold text-leaf bg-leaf-soft px-2.5 py-0.5 rounded-full text-[10px]">
                      {event.status}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────
          TAB 6: INVENTORY & COST TRACKING
      ──────────────────────────────────────────────────────────── */}
      {activeTab === "inventory" && (
        <div className="space-y-5">
          {/* Inventory Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl border border-border bg-card">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Total Products in Stock
              </p>
              <p className="text-2xl font-extrabold text-foreground mt-1 tabular-nums">
                {inventory.length} SKUs
              </p>
              <span className="text-[10px] text-leaf font-semibold">Ready for fertigation</span>
            </div>

            <div className="p-4 rounded-2xl border border-border bg-card">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Estimated Inventory Value
              </p>
              <p className="text-2xl font-extrabold text-foreground mt-1 tabular-nums">
                $
                {inventory
                  .reduce((sum, item) => sum + item.quantityAvailable * item.unitPrice, 0)
                  .toFixed(2)}
              </p>
              <span className="text-[10px] text-muted-foreground">Based on purchase rates</span>
            </div>

            <div className="p-4 rounded-2xl border border-border bg-card">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Crop-Care Expenditure (Current Crop)
              </p>
              <p className="text-2xl font-extrabold text-primary mt-1 tabular-nums">
                $
                {applications
                  .reduce((sum, app) => sum + (app.costEstimate || app.quantity * 2.8), 0)
                  .toFixed(2)}
              </p>
              <span className="text-[10px] text-muted-foreground">Applied nutrients & protection</span>
            </div>
          </div>

          {/* Inventory Table */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                Polyhouse Agricultural Inventory
              </h3>
              <span className="text-xs text-muted-foreground">
                Stock automatically deducts upon application confirmation
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground font-semibold">
                    <th className="py-2.5 px-3">Product Name</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Stock Available</th>
                    <th className="py-2.5 px-3">Unit Price</th>
                    <th className="py-2.5 px-3">Total Value</th>
                    <th className="py-2.5 px-3">Supplier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {inventory.map((item) => {
                    const isLow = item.quantityAvailable <= item.reorderLevel;
                    return (
                      <tr key={item.id} className="hover:bg-secondary/30 transition-colors">
                        <td className="py-3 px-3 font-bold text-foreground">
                          {item.name}
                          {isLow && (
                            <span className="ml-2 text-[9px] font-bold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">
                              Low Stock
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-muted-foreground">{item.category}</td>
                        <td className="py-3 px-3 font-semibold text-foreground">
                          {item.quantityAvailable} {item.unit}
                        </td>
                        <td className="py-3 px-3 text-muted-foreground">
                          ${item.unitPrice.toFixed(2)} / {item.unit}
                        </td>
                        <td className="py-3 px-3 font-bold text-foreground tabular-nums">
                          ${(item.quantityAvailable * item.unitPrice).toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-muted-foreground">{item.supplier || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────
          MODALS
      ──────────────────────────────────────────────────────────── */}
      {/* 1. Crop Registration Modal */}
      <CropRegistrationModal
        isOpen={isCropModalOpen}
        onClose={() => setIsCropModalOpen(false)}
        onCropSaved={handleCropSaved}
        initialCrop={editingCrop}
      />

      {/* 2. Deterministic Fertilizer Calculator Modal */}
      {activeCrop && stageInfo && (
        <FertilizerCalculatorModal
          isOpen={isCalculatorModalOpen}
          onClose={() => setIsCalculatorModalOpen(false)}
          crop={activeCrop}
          currentStageName={stageInfo.currentStage.stageName}
          onApplyCalculated={(fertName, qty) => {
            setLogFertName(fertName);
            setLogQuantity(qty);
            setShowLogAppModal(true);
          }}
        />
      )}

      {/* 3. Manual Log Application Modal */}
      {showLogAppModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="text-base font-bold text-foreground">
                Log Fertilizer Application
              </h3>
              <button
                type="button"
                onClick={() => setShowLogAppModal(false)}
                className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleLogManualApplication} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Product Applied
                </label>
                <input
                  type="text"
                  required
                  value={logFertName}
                  onChange={(e) => setLogFertName(e.target.value)}
                  placeholder="e.g. NPK 19-19-19 (Water Soluble)"
                  className="w-full h-10 px-3 rounded-xl border border-input bg-card text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Quantity Used (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    value={logQuantity}
                    onChange={(e) => setLogQuantity(Number(e.target.value))}
                    className="w-full h-10 px-3 rounded-xl border border-input bg-card text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Application Method
                  </label>
                  <select
                    value={logMethod}
                    onChange={(e) => setLogMethod(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-input bg-card text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="Drip Fertigation">Drip Fertigation</option>
                    <option value="Foliar Spray">Foliar Spray</option>
                    <option value="Basal Soil">Basal Soil Application</option>
                    <option value="Manual Drench">Manual Soil Drench</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Farmer Notes / Observations
                </label>
                <textarea
                  rows={2}
                  value={logNotes}
                  onChange={(e) => setLogNotes(e.target.value)}
                  placeholder="EC before and after injection, weather, or tank recipe notes..."
                  className="w-full p-2.5 rounded-xl border border-input bg-card text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLogAppModal(false)}
                  className="px-4 py-2 rounded-xl border border-input bg-card text-xs font-semibold text-muted-foreground hover:bg-secondary cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-2xs cursor-pointer"
                >
                  Confirm & Deduct Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

