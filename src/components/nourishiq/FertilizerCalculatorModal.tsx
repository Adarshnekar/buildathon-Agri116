import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CropProfile, FertilizerProduct } from "@/types/nourishiq";
import {
  COMMON_FERTILIZERS,
  calculateFertilizerDose,
  convertAreaToAcres,
  convertAreaToHectares,
} from "@/lib/nourishiq/fertilizerCalculator";
import { Calculator, ArrowRight, Check, AlertCircle, Sparkles } from "lucide-react";

interface FertilizerCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  crop: CropProfile;
  currentStageName: string;
  onApplyCalculated?: (fertilizerName: string, quantityKg: number) => void;
}

export default function FertilizerCalculatorModal({
  isOpen,
  onClose,
  crop,
  currentStageName,
  onApplyCalculated,
}: FertilizerCalculatorModalProps) {
  const [targetNutrient, setTargetNutrient] = useState<"N" | "P" | "K">("N");
  const [selectedFertilizerId, setSelectedFertilizerId] = useState<string>("fert_191919");
  const [targetRateKgPerHa, setTargetRateKgPerHa] = useState<number>(35);
  const [deductSoilCredit, setDeductSoilCredit] = useState<boolean>(true);

  const selectedFertilizer =
    COMMON_FERTILIZERS.find((f) => f.id === selectedFertilizerId) ||
    COMMON_FERTILIZERS[0];

  // Soil test ppm based on selected nutrient
  let soilTestPpm = 0;
  if (deductSoilCredit && crop.soilTestNPK) {
    if (targetNutrient === "N") soilTestPpm = crop.soilTestNPK.n;
    if (targetNutrient === "P") soilTestPpm = crop.soilTestNPK.p;
    if (targetNutrient === "K") soilTestPpm = crop.soilTestNPK.k;
  }

  const result = calculateFertilizerDose({
    targetNutrientType: targetNutrient,
    stageGrossNutrientRequirementKgPerHa: targetRateKgPerHa,
    cropArea: crop.area,
    cropAreaUnit: crop.areaUnit,
    fertilizer: selectedFertilizer,
    cultivationMethod: crop.cultivationMethod,
    soilTestPpm,
  });

  const areaHa = convertAreaToHectares(crop.area, crop.areaUnit);
  const areaAcres = convertAreaToAcres(crop.area, crop.areaUnit);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-[95vw] sm:w-full rounded-2xl max-h-[90vh] overflow-y-auto p-5 sm:p-7">
        <DialogHeader>
          <div className="flex items-center gap-2.5 text-primary">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary border border-primary/20">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">
                Deterministic Fertilizer Quantity Calculator
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Transparent agronomic calculations based on nutrient fraction, soil test calibration, and method efficiency.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Active Context Banner */}
          <div className="flex items-center justify-between rounded-xl bg-secondary/50 border border-border p-3 text-xs">
            <div>
              <span className="font-bold text-foreground">{crop.cropName}</span>
              <span className="text-muted-foreground ml-1.5">({crop.variety})</span>
              <p className="text-[11px] text-muted-foreground">
                Stage: <strong className="text-leaf">{currentStageName}</strong> · Area:{" "}
                <strong>
                  {crop.area} {crop.areaUnit} ({areaAcres.toFixed(2)} acres / {areaHa.toFixed(3)} ha)
                </strong>
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
              {crop.cultivationMethod}
            </span>
          </div>

          {/* Configuration Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Target Nutrient */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Target Element
              </label>
              <div className="grid grid-cols-3 gap-1">
                {(["N", "P", "K"] as const).map((elem) => (
                  <button
                    key={elem}
                    type="button"
                    onClick={() => setTargetNutrient(elem)}
                    className={`h-9 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                      targetNutrient === elem
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-foreground border-input hover:bg-secondary"
                    }`}
                  >
                    {elem === "N" ? "N (Nitrogen)" : elem === "P" ? "P (Phos)" : "K (Potash)"}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Nutrient Rate */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Stage Target Rate (kg/ha)
              </label>
              <input
                type="number"
                min="1"
                max="250"
                value={targetRateKgPerHa}
                onChange={(e) => setTargetRateKgPerHa(Number(e.target.value))}
                className="w-full h-9 px-3 rounded-xl border border-input bg-card text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Selected Fertilizer Formulation */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Fertilizer Product
              </label>
              <select
                value={selectedFertilizerId}
                onChange={(e) => setSelectedFertilizerId(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-input bg-card text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {COMMON_FERTILIZERS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Soil Test Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-card text-xs">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="soilCreditToggle"
                checked={deductSoilCredit}
                onChange={(e) => setDeductSoilCredit(e.target.checked)}
                className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
              />
              <label htmlFor="soilCreditToggle" className="cursor-pointer font-medium text-foreground">
                Deduct existing soil/substrate test reserve
              </label>
            </div>
            <span className="text-[11px] text-muted-foreground font-mono">
              Available Test: {soilTestPpm} ppm
            </span>
          </div>

          {/* Calculation Output Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl border border-primary/30 bg-primary-soft/50 text-foreground">
              <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
                Total for Polyhouse Area
              </p>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-extrabold text-foreground tabular-nums">
                  {result.totalForRegisteredAreaKg}
                </span>
                <span className="text-xs font-bold text-muted-foreground">kg</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                For {crop.area} {crop.areaUnit} canopy
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border bg-card text-foreground">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Quantity Per Acre
              </p>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-extrabold text-foreground tabular-nums">
                  {result.quantityPerAcreKg}
                </span>
                <span className="text-xs font-bold text-muted-foreground">kg/acre</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Field normalized</p>
            </div>

            <div className="p-4 rounded-xl border border-border bg-card text-foreground">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Quantity Per Hectare
              </p>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-extrabold text-foreground tabular-nums">
                  {result.quantityPerHectareKg}
                </span>
                <span className="text-xs font-bold text-muted-foreground">kg/ha</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Reference rate</p>
            </div>
          </div>

          {/* Mathematical Proof & Agronomic Explanation */}
          <div className="p-3.5 rounded-xl border border-border/80 bg-secondary/30 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-foreground text-[11px] uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Agronomic Calculation Step-by-Step
            </div>
            <p className="font-mono text-[11px] text-muted-foreground leading-relaxed">
              {result.mathematicalExplanation}
            </p>
            <div className="pt-1 flex items-center justify-between text-[10px] text-muted-foreground border-t border-border/50">
              <span>Nutrient Fraction: <strong>{(result.nutrientFraction * 100).toFixed(1)}%</strong></span>
              <span>Efficiency Factor: <strong>{(result.methodEfficiencyFactor * 100).toFixed(0)}% ({crop.cultivationMethod})</strong></span>
              <span>Soil Credit: <strong>{result.soilCreditKg.toFixed(2)} kg</strong></span>
            </div>
          </div>

          {/* Alternate Fertilizer Formulations Comparison */}
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-foreground">
              Compare Alternative Formulations for {targetNutrient}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {COMMON_FERTILIZERS.filter((f) => {
                if (targetNutrient === "N") return f.npk.n > 0;
                if (targetNutrient === "P") return f.npk.p > 0;
                if (targetNutrient === "K") return f.npk.k > 0;
                return true;
              }).map((alt) => {
                const altCalc = calculateFertilizerDose({
                  targetNutrientType: targetNutrient,
                  stageGrossNutrientRequirementKgPerHa: targetRateKgPerHa,
                  cropArea: crop.area,
                  cropAreaUnit: crop.areaUnit,
                  fertilizer: alt,
                  cultivationMethod: crop.cultivationMethod,
                  soilTestPpm,
                });
                const isSelected = alt.id === selectedFertilizer.id;

                return (
                  <button
                    key={alt.id}
                    type="button"
                    onClick={() => setSelectedFertilizerId(alt.id)}
                    className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? "border-primary bg-primary-soft/40 shadow-2xs"
                        : "border-border bg-card hover:bg-secondary/40"
                    }`}
                  >
                    <div>
                      <p className="font-bold text-foreground text-xs">{alt.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Composition: N-P-K {alt.npk.n}-{alt.npk.p}-{alt.npk.k}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-foreground text-sm">
                        {altCalc.totalForRegisteredAreaKg}
                      </span>
                      <span className="text-[10px] text-muted-foreground ml-1">kg</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-input bg-card text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
            >
              Close
            </button>
            {onApplyCalculated && (
              <button
                type="button"
                onClick={() => {
                  onApplyCalculated(selectedFertilizer.name, result.totalForRegisteredAreaKg);
                  onClose();
                }}
                className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Check className="h-4 w-4" />
                <span>Record as Recommended ({result.totalForRegisteredAreaKg} kg)</span>
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

