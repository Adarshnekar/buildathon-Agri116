// NourishIQ Domain Types

export type CultivationMethod = "Soil" | "Cocopeat" | "Hydroponics";
export type AreaUnit = "sq_ft" | "sq_m" | "acres" | "hectares";
export type IrrigationMethod =
  | "Drip / Fertigation"
  | "Misting / Fogging"
  | "Sprinkler"
  | "Sub-irrigation"
  | "Manual Drenching";

export interface SoilTestNPK {
  n: number; // ppm or mg/kg
  p: number;
  k: number;
}

export interface CropProfile {
  id: string;
  cropName: string;
  variety: string;
  sowingDate: string; // ISO date YYYY-MM-DD
  transplantingDate?: string; // Optional ISO date
  referenceDateType: "sowing" | "transplanting";
  cultivationMethod: CultivationMethod;
  area: number;
  areaUnit: AreaUnit;
  plantPopulation: number;
  plantSpacingCm: number;
  rowSpacingCm: number;
  irrigationMethod: IrrigationMethod;
  region: string;
  soilTestNPK?: SoilTestNPK;
  soilPH?: number;
  soilEC?: number; // dS/m or mS/cm
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GrowthStageDefinition {
  stageName: string;
  durationDays: number;
  description: string;
  targetNPKRatio: string; // e.g. "2:1:2"
  dailyWaterLitersPerPlant: number;
  targetEC: { min: number; max: number };
  targetPH: { min: number; max: number };
  keyNutrientFocus: string;
  idealTempDayC: { min: number; max: number };
}

export interface CropGrowthProfile {
  cropName: string;
  totalLifecycleDays: number;
  stages: GrowthStageDefinition[];
  standardNRequirementKgPerHa: number;
  standardPRequirementKgPerHa: number;
  standardKRequirementKgPerHa: number;
  commonPests: string[];
  commonDiseases: string[];
}

export interface FertilizerProduct {
  id: string;
  name: string;
  brand: string;
  npk: { n: number; p: number; k: number };
  secondaryNutrients?: string;
  type: "Synthetic" | "Organic" | "Water-Soluble" | "Slow-Release";
  form: "Granular" | "Liquid" | "Soluble Powder";
  defaultMethod: "Fertigation" | "Foliar" | "Basal Soil" | "Top Dress";
  pricePerUnit: number;
  unit: "kg" | "L" | "bag";
  stockQuantity: number;
  safetyPrecautions: string;
}

export interface NutrientRecommendation {
  id: string;
  cropId: string;
  stageName: string;
  targetNutrient: string;
  recommendedFertilizer: string;
  fertilizerComposition: string;
  calculatedQuantity: number;
  quantityUnit: string;
  perUnitArea: string;
  applicationMethod: string;
  dateRange: string;
  frequency: string;
  reason: string;
  source: string;
  precautions: string[];
  wasteWarning?: string;
}

export type ApplicationStatus = "Recommended" | "Accepted" | "Applied" | "Skipped";

export interface FertilizerApplicationRecord {
  id: string;
  cropId: string;
  productName: string;
  productType: "Fertilizer" | "Pesticide" | "Bio-stimulant" | "Foliar Spray";
  npk?: { n: number; p: number; k: number };
  quantity: number;
  unit: string;
  applicationDate: string;
  applicationMethod: string;
  growthStage: string;
  status: ApplicationStatus;
  notes?: string;
  recommendationReference?: string;
  costEstimate?: number;
  createdAt: string;
}

export type ConditionType =
  | "Fungal"
  | "Bacterial"
  | "Viral"
  | "Pest"
  | "Nutrient Deficiency"
  | "Nutrient Toxicity"
  | "Environmental Stress"
  | "Physical Damage";

export interface ChemicalControlOption {
  productName: string;
  activeIngredient: string;
  dosage: string;
  applicationMethod: string;
  maxApplicationsPerSeason: number;
  intervalDays: number;
  ppeRequirements: string[];
  reEntryIntervalHours: number;
  preHarvestIntervalDays: number;
  restrictions: string;
}

export interface TreatmentAdvisory {
  culturalControls: string[];
  mechanicalControls: string[];
  biologicalControls: string[];
  chemicalControls?: ChemicalControlOption[];
  expertDisclaimer: string;
}

export interface PlantHealthInspection {
  id: string;
  cropId: string;
  inspectionDate: string;
  imageUrls: string[];
  symptomsReported: string;
  suspectedDiagnosis: string;
  conditionType: ConditionType;
  confidence: number; // 0 to 100
  severity: "Low" | "Moderate" | "High" | "Severe";
  visibleSymptoms: string[];
  reasoning: string;
  status: "Suspected" | "Follow-up Scheduled" | "Resolved";
  recommendedNextInspection: string;
  treatmentAdvisory: TreatmentAdvisory;
  followUpNotes?: string;
  followUpImageUrls?: string[];
  createdAt: string;
}

export interface CropReminder {
  id: string;
  cropId: string;
  type: "Fertilizer" | "Health Inspection" | "Harvest Window" | "Irrigation";
  title: string;
  description: string;
  dueDate: string;
  status: "Pending" | "Completed" | "Dismissed";
  priority: "Low" | "Medium" | "High";
}

export interface InventoryItem {
  id: string;
  name: string;
  category: "Fertilizer" | "Pesticide" | "Bio-stimulant" | "Substrate";
  quantityAvailable: number;
  unit: string;
  unitPrice: number;
  purchaseDate: string;
  supplier?: string;
  reorderLevel: number;
}

