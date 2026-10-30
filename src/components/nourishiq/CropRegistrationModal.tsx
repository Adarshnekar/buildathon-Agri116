import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  CropProfile,
  CultivationMethod,
  AreaUnit,
  IrrigationMethod,
} from "@/types/nourishiq";
import { Sprout, Calendar, Ruler, Layers, Droplets, FlaskConical } from "lucide-react";
import { toast } from "sonner";

interface CropRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCropSaved: (crop: CropProfile) => void;
  initialCrop?: CropProfile | null;
}

const SUPPORTED_CROPS = [
  "Tomato",
  "Lettuce",
  "Strawberry",
  "Pepper",
  "Basil",
  "Cucumber",
];

export default function CropRegistrationModal({
  isOpen,
  onClose,
  onCropSaved,
  initialCrop,
}: CropRegistrationModalProps) {
  const [cropName, setCropName] = useState(initialCrop?.cropName || "Tomato");
  const [variety, setVariety] = useState(initialCrop?.variety || "");
  const [sowingDate, setSowingDate] = useState(
    initialCrop?.sowingDate || new Date().toISOString().split("T")[0]
  );
  const [transplantingDate, setTransplantingDate] = useState(
    initialCrop?.transplantingDate || ""
  );
  const [referenceDateType, setReferenceDateType] = useState<"sowing" | "transplanting">(
    initialCrop?.referenceDateType || "sowing"
  );
  const [cultivationMethod, setCultivationMethod] = useState<CultivationMethod>(
    initialCrop?.cultivationMethod || "Cocopeat"
  );
  const [area, setArea] = useState<number>(initialCrop?.area || 500);
  const [areaUnit, setAreaUnit] = useState<AreaUnit>(initialCrop?.areaUnit || "sq_m");
  const [plantPopulation, setPlantPopulation] = useState<number>(
    initialCrop?.plantPopulation || 1200
  );
  const [plantSpacingCm, setPlantSpacingCm] = useState<number>(
    initialCrop?.plantSpacingCm || 45
  );
  const [rowSpacingCm, setRowSpacingCm] = useState<number>(
    initialCrop?.rowSpacingCm || 80
  );
  const [irrigationMethod, setIrrigationMethod] = useState<IrrigationMethod>(
    initialCrop?.irrigationMethod || "Drip / Fertigation"
  );
  const [region, setRegion] = useState(
    initialCrop?.region || "Polyhouse Zone A - East Bay"
  );

  // Optional Soil / Substrate parameters
  const [soilN, setSoilN] = useState<number>(initialCrop?.soilTestNPK?.n || 120);
  const [soilP, setSoilP] = useState<number>(initialCrop?.soilTestNPK?.p || 40);
  const [soilK, setSoilK] = useState<number>(initialCrop?.soilTestNPK?.k || 160);
  const [soilPH, setSoilPH] = useState<number>(initialCrop?.soilPH || 6.2);
  const [soilEC, setSoilEC] = useState<number>(initialCrop?.soilEC || 1.8);
  const [notes, setNotes] = useState(initialCrop?.notes || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!variety.trim()) {
      toast.error("Please enter a crop variety", {
        description: "e.g., Arka Rakshak F1, Romaine, or San Marzano.",
      });
      return;
    }

    const savedCrop: CropProfile = {
      id: initialCrop?.id || `crop_${Date.now()}`,
      cropName,
      variety: variety.trim(),
      sowingDate,
      transplantingDate: transplantingDate || undefined,
      referenceDateType,
      cultivationMethod,
      area: Number(area) || 100,
      areaUnit,
      plantPopulation: Number(plantPopulation) || 500,
      plantSpacingCm: Number(plantSpacingCm) || 45,
      rowSpacingCm: Number(rowSpacingCm) || 80,
      irrigationMethod,
      region: region.trim() || "Protected Polyhouse Bay 1",
      soilTestNPK: {
        n: Number(soilN) || 0,
        p: Number(soilP) || 0,
        k: Number(soilK) || 0,
      },
      soilPH: Number(soilPH) || 6.2,
      soilEC: Number(soilEC) || 1.8,
      notes: notes.trim(),
      createdAt: initialCrop?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onCropSaved(savedCrop);
    toast.success(
      initialCrop ? "Crop Profile Updated" : "Crop Registered Successfully",
      {
        description: `${savedCrop.cropName} (${savedCrop.variety}) saved to Firebase.`,
      }
    );
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl w-[95vw] sm:w-full rounded-2xl max-h-[90vh] overflow-y-auto p-5 sm:p-7">
        <DialogHeader>
          <div className="flex items-center gap-2.5 text-primary">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary border border-primary/20">
              <Sprout className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">
                {initialCrop ? "Edit Crop Profile" : "Register Crop in NourishIQ"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Enter your crop identity, planting dates, canopy area, and substrate test data.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-3">
          {/* Section 1: Crop Identity */}
          <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
              <Sprout className="h-3.5 w-3.5 text-leaf" />
              1. Crop Identity & Cultivar
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Crop Species
                </label>
                <select
                  value={cropName}
                  onChange={(e) => setCropName(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-input bg-card text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {SUPPORTED_CROPS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Variety / Cultivar Name *
                </label>
                <input
                  type="text"
                  required
                  value={variety}
                  onChange={(e) => setVariety(e.target.value)}
                  placeholder="e.g. Arka Rakshak F1 / Romaine"
                  className="w-full h-10 px-3 rounded-xl border border-input bg-card text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Polyhouse Zone / Region
              </label>
              <input
                type="text"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="e.g. Polyhouse Zone A - High-Wire Trellis Bay"
                className="w-full h-10 px-3 rounded-xl border border-input bg-card text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Section 2: Dates & Lifecycle Baseline */}
          <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
              <Calendar className="h-3.5 w-3.5 text-sun" />
              2. Growth Calendar & Reference Dates
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Sowing Date *
                </label>
                <input
                  type="date"
                  required
                  value={sowingDate}
                  onChange={(e) => setSowingDate(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-input bg-card text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Transplanting Date (If applicable)
                </label>
                <input
                  type="date"
                  value={transplantingDate}
                  onChange={(e) => setTransplantingDate(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-input bg-card text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Calculate Age From
                </label>
                <select
                  value={referenceDateType}
                  onChange={(e) =>
                    setReferenceDateType(e.target.value as "sowing" | "transplanting")
                  }
                  className="w-full h-10 px-3 rounded-xl border border-input bg-card text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="sowing">Sowing Date</option>
                  <option value="transplanting">Transplanting Date</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Cultivation & Population Geometry */}
          <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
              <Ruler className="h-3.5 w-3.5 text-leaf" />
              3. Cultivation Method & Canopy Spacing
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Growing Medium
                </label>
                <select
                  value={cultivationMethod}
                  onChange={(e) =>
                    setCultivationMethod(e.target.value as CultivationMethod)
                  }
                  className="w-full h-10 px-3 rounded-xl border border-input bg-card text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="Cocopeat">Cocopeat / Soilless Substrate</option>
                  <option value="Soil">Native Bed Soil</option>
                  <option value="Hydroponics">NFT / Deep Water Hydroponics</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Irrigation Method
                </label>
                <select
                  value={irrigationMethod}
                  onChange={(e) =>
                    setIrrigationMethod(e.target.value as IrrigationMethod)
                  }
                  className="w-full h-10 px-3 rounded-xl border border-input bg-card text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="Drip / Fertigation">Drip / Fertigation</option>
                  <option value="Misting / Fogging">Misting / Fogging</option>
                  <option value="Sprinkler">Micro-Sprinkler</option>
                  <option value="Sub-irrigation">Sub-irrigation / Ebb & Flow</option>
                  <option value="Manual Drenching">Manual Drenching</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Total Plant Population
                </label>
                <input
                  type="number"
                  min="1"
                  value={plantPopulation}
                  onChange={(e) => setPlantPopulation(Number(e.target.value))}
                  placeholder="e.g. 1400"
                  className="w-full h-10 px-3 rounded-xl border border-input bg-card text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5 pt-1">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Cultivated Area
                </label>
                <input
                  type="number"
                  min="1"
                  value={area}
                  onChange={(e) => setArea(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-xl border border-input bg-card text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Area Unit
                </label>
                <select
                  value={areaUnit}
                  onChange={(e) => setAreaUnit(e.target.value as AreaUnit)}
                  className="w-full h-10 px-3 rounded-xl border border-input bg-card text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="sq_m">Square Meters (m²)</option>
                  <option value="sq_ft">Square Feet (sq ft)</option>
                  <option value="acres">Acres</option>
                  <option value="hectares">Hectares</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Plant Spacing (cm)
                </label>
                <input
                  type="number"
                  min="5"
                  value={plantSpacingCm}
                  onChange={(e) => setPlantSpacingCm(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-xl border border-input bg-card text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Row Spacing (cm)
                </label>
                <input
                  type="number"
                  min="10"
                  value={rowSpacingCm}
                  onChange={(e) => setRowSpacingCm(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-xl border border-input bg-card text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Soil / Substrate Lab Test NPK (Optional) */}
          <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
              <FlaskConical className="h-3.5 w-3.5 text-primary" />
              4. Substrate / Soil Test Calibration (Optional)
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                  Nitrogen (N ppm)
                </label>
                <input
                  type="number"
                  value={soilN}
                  onChange={(e) => setSoilN(Number(e.target.value))}
                  className="w-full h-9 px-2.5 rounded-lg border border-input bg-card text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                  Phosphorus (P ppm)
                </label>
                <input
                  type="number"
                  value={soilP}
                  onChange={(e) => setSoilP(Number(e.target.value))}
                  className="w-full h-9 px-2.5 rounded-lg border border-input bg-card text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                  Potassium (K ppm)
                </label>
                <input
                  type="number"
                  value={soilK}
                  onChange={(e) => setSoilK(Number(e.target.value))}
                  className="w-full h-9 px-2.5 rounded-lg border border-input bg-card text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                  Medium pH
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={soilPH}
                  onChange={(e) => setSoilPH(Number(e.target.value))}
                  className="w-full h-9 px-2.5 rounded-lg border border-input bg-card text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                  Medium EC (dS/m)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={soilEC}
                  onChange={(e) => setSoilEC(Number(e.target.value))}
                  className="w-full h-9 px-2.5 rounded-lg border border-input bg-card text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Farmer Notes & Planting Details
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes on trellis arrangement, substrate blend, seed treatment, or grafting..."
                className="w-full p-2.5 rounded-xl border border-input bg-card text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-input bg-card text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Sprout className="h-4 w-4" />
              <span>{initialCrop ? "Save Changes" : "Register Crop"}</span>
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

