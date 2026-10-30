import {
  CropProfile,
  FertilizerProduct,
  FertilizerApplicationRecord,
  NutrientRecommendation,
  AreaUnit,
} from "@/types/nourishiq";
import { getCropProfile } from "./cropProfiles";
import { calculateCropStage } from "./growthStageEngine";

export const COMMON_FERTILIZERS: FertilizerProduct[] = [
  {
    id: "fert_191919",
    name: "NPK 19-19-19 (Water Soluble)",
    brand: "Poly-Feed AgTech",
    npk: { n: 19, p: 19, k: 19 },
    type: "Water-Soluble",
    form: "Soluble Powder",
    defaultMethod: "Fertigation",
    pricePerUnit: 3.2,
    unit: "kg",
    stockQuantity: 45,
    safetyPrecautions: "Dissolve fully in stock tank before injection. Compatible with micronutrients.",
  },
  {
    id: "fert_calnit",
    name: "Calcium Nitrate (15.5-0-0 + 19% Ca)",
    brand: "YaraLiva Calcinit",
    npk: { n: 15.5, p: 0, k: 0 },
    secondaryNutrients: "19% Water-Soluble Calcium (Ca)",
    type: "Water-Soluble",
    form: "Soluble Powder",
    defaultMethod: "Fertigation",
    pricePerUnit: 2.8,
    unit: "kg",
    stockQuantity: 50,
    safetyPrecautions:
      "DO NOT mix in same concentrated stock tank as sulfates or phosphates to prevent calcium precipitation.",
  },
  {
    id: "fert_potnit",
    name: "Potassium Nitrate (13-0-45)",
    brand: "Multi-K AgTech",
    npk: { n: 13, p: 0, k: 45 },
    type: "Water-Soluble",
    form: "Soluble Powder",
    defaultMethod: "Fertigation",
    pricePerUnit: 4.1,
    unit: "kg",
    stockQuantity: 30,
    safetyPrecautions: "Ideal for flowering and fruit bulking stages. Chlorine-free.",
  },
  {
    id: "fert_mkp",
    name: "Mono Potassium Phosphate / MKP (0-52-34)",
    brand: "PeaK Haifa",
    npk: { n: 0, p: 52, k: 34 },
    type: "Water-Soluble",
    form: "Soluble Powder",
    defaultMethod: "Fertigation",
    pricePerUnit: 4.5,
    unit: "kg",
    stockQuantity: 25,
    safetyPrecautions: "Excellent source of P & K with zero nitrogen. Buffers spray solution pH.",
  },
  {
    id: "fert_urea",
    name: "Agricultural Urea (46-0-0)",
    brand: "AgriSupply Standard",
    npk: { n: 46, p: 0, k: 0 },
    type: "Synthetic",
    form: "Granular",
    defaultMethod: "Basal Soil",
    pricePerUnit: 1.4,
    unit: "kg",
    stockQuantity: 60,
    safetyPrecautions: "High volatilization risk if surface applied without soil incorporation or irrigation.",
  },
  {
    id: "fert_dap",
    name: "DAP (Diammonium Phosphate 18-46-0)",
    brand: "AgriSupply Standard",
    npk: { n: 18, p: 46, k: 0 },
    type: "Synthetic",
    form: "Granular",
    defaultMethod: "Basal Soil",
    pricePerUnit: 1.9,
    unit: "kg",
    stockQuantity: 40,
    safetyPrecautions: "Apply close to root zone during basal bed preparation. Do not mix with free lime.",
  },
  {
    id: "fert_mop",
    name: "MOP (Muriate of Potash 0-0-60)",
    brand: "AgriSupply Standard",
    npk: { n: 0, p: 0, k: 60 },
    type: "Synthetic",
    form: "Granular",
    defaultMethod: "Basal Soil",
    pricePerUnit: 1.7,
    unit: "kg",
    stockQuantity: 35,
    safetyPrecautions: "Contains chloride. Avoid in closed recirculating hydroponics or chloride-sensitive crops.",
  },
  {
    id: "fert_mgso4",
    name: "Magnesium Sulfate / Epsom Salt (9.8% Mg, 12.9% S)",
    brand: "VitaMag Ag",
    npk: { n: 0, p: 0, k: 0 },
    secondaryNutrients: "9.8% Mg, 12.9% S",
    type: "Water-Soluble",
    form: "Soluble Powder",
    defaultMethod: "Fertigation",
    pricePerUnit: 2.1,
    unit: "kg",
    stockQuantity: 20,
    safetyPrecautions: "Prevents interveinal chlorosis under intense LED grow lighting.",
  },
];

// Convert any supported area into Hectares
export function convertAreaToHectares(area: number, unit: AreaUnit): number {
  switch (unit) {
    case "hectares":
      return area;
    case "acres":
      return area * 0.404686;
    case "sq_m":
      return area / 10000;
    case "sq_ft":
      return area / 107639;
    default:
      return area / 10000;
  }
}

// Convert any supported area into Acres
export function convertAreaToAcres(area: number, unit: AreaUnit): number {
  switch (unit) {
    case "acres":
      return area;
    case "hectares":
      return area * 2.47105;
    case "sq_m":
      return area / 4046.86;
    case "sq_ft":
      return area / 43560;
    default:
      return area / 4046.86;
  }
}

export interface CalculationResult {
  targetNutrientKg: number;
  soilCreditKg: number;
  netRequiredNutrientKg: number;
  nutrientFraction: number;
  fertilizerRequiredKg: number;
  quantityPerAcreKg: number;
  quantityPerHectareKg: number;
  totalForRegisteredAreaKg: number;
  methodEfficiencyFactor: number;
  mathematicalExplanation: string;
}

export function calculateFertilizerDose(params: {
  targetNutrientType: "N" | "P" | "K";
  stageGrossNutrientRequirementKgPerHa: number;
  cropArea: number;
  cropAreaUnit: AreaUnit;
  fertilizer: FertilizerProduct;
  cultivationMethod: "Soil" | "Cocopeat" | "Hydroponics";
  soilTestPpm?: number;
  priorAppliedKgThisStage?: number;
}): CalculationResult {
  const {
    targetNutrientType,
    stageGrossNutrientRequirementKgPerHa,
    cropArea,
    cropAreaUnit,
    fertilizer,
    cultivationMethod,
    soilTestPpm = 0,
    priorAppliedKgThisStage = 0,
  } = params;

  // Efficiency factor based on method
  let methodEfficiencyFactor = 0.85; // Drip Fertigation baseline
  if (cultivationMethod === "Hydroponics") methodEfficiencyFactor = 0.95;
  if (cultivationMethod === "Soil") methodEfficiencyFactor = 0.70;

  // Fraction of target nutrient in fertilizer (e.g., Urea 46% N = 0.46)
  let percentage = 0;
  if (targetNutrientType === "N") percentage = fertilizer.npk.n;
  if (targetNutrientType === "P") percentage = fertilizer.npk.p;
  if (targetNutrientType === "K") percentage = fertilizer.npk.k;

  const nutrientFraction = Math.max(0.01, percentage / 100);

  // Area in hectares
  const areaHa = convertAreaToHectares(cropArea, cropAreaUnit);
  const areaAcres = convertAreaToAcres(cropArea, cropAreaUnit);

  // Gross requirement for registered area
  const grossAreaRequirementKg = stageGrossNutrientRequirementKgPerHa * areaHa;

  // Soil credit (20% of soil test ppm considered available per ha in top 30cm)
  let soilCreditKg = 0;
  if (cultivationMethod === "Soil" && soilTestPpm > 0) {
    soilCreditKg = Math.min(grossAreaRequirementKg * 0.4, (soilTestPpm * 0.15) * areaHa);
  }

  // Net requirement after subtracting soil reserve and prior applications in current stage
  const netRequiredNutrientKg = Math.max(
    0,
    grossAreaRequirementKg - soilCreditKg - priorAppliedKgThisStage
  );

  // Core formula adjusted for efficiency:
  // Fertilizer = (Net Required / Nutrient Fraction) / Method Efficiency
  const totalForRegisteredAreaKg =
    (netRequiredNutrientKg / nutrientFraction) / methodEfficiencyFactor;

  const quantityPerHectareKg = areaHa > 0 ? totalForRegisteredAreaKg / areaHa : 0;
  const quantityPerAcreKg = areaAcres > 0 ? totalForRegisteredAreaKg / areaAcres : 0;

  const mathematicalExplanation = `Formula: [(${grossAreaRequirementKg.toFixed(
    2
  )} kg target - ${soilCreditKg.toFixed(2)} kg soil credit - ${priorAppliedKgThisStage.toFixed(
    2
  )} kg prior applied) ÷ ${(nutrientFraction * 100).toFixed(
    1
  )}% nutrient fraction] ÷ ${(methodEfficiencyFactor * 100).toFixed(0)}% application efficiency = ${totalForRegisteredAreaKg.toFixed(2)} kg ${fertilizer.name}`;

  return {
    targetNutrientKg: grossAreaRequirementKg,
    soilCreditKg,
    netRequiredNutrientKg,
    nutrientFraction,
    fertilizerRequiredKg: totalForRegisteredAreaKg,
    quantityPerAcreKg: +quantityPerAcreKg.toFixed(2),
    quantityPerHectareKg: +quantityPerHectareKg.toFixed(2),
    totalForRegisteredAreaKg: +totalForRegisteredAreaKg.toFixed(2),
    methodEfficiencyFactor,
    mathematicalExplanation,
  };
}

// Generate stage-aware verified recommendations with nutrient waste detection
export function generateNutrientRecommendations(
  crop: CropProfile,
  previousApplications: FertilizerApplicationRecord[] = []
): NutrientRecommendation[] {
  const profile = getCropProfile(crop.cropName);
  const stageInfo = calculateCropStage(crop);
  const currentStage = stageInfo.currentStage;

  // Calculate nutrients already applied during this current stage
  let appliedN = 0;
  let appliedP = 0;
  let appliedK = 0;

  previousApplications
    .filter((a) => a.status === "Applied" && a.growthStage === currentStage.stageName)
    .forEach((app) => {
      if (app.npk) {
        appliedN += app.quantity * (app.npk.n / 100);
        appliedP += app.quantity * (app.npk.p / 100);
        appliedK += app.quantity * (app.npk.k / 100);
      }
    });

  const areaHa = convertAreaToHectares(crop.area, crop.areaUnit);
  const stageFraction = currentStage.durationDays / profile.totalLifecycleDays;

  // Stage target nutrient quotas
  const stageTargetN = profile.standardNRequirementKgPerHa * stageFraction * areaHa;
  const stageTargetP = profile.standardPRequirementKgPerHa * stageFraction * areaHa;
  const stageTargetK = profile.standardKRequirementKgPerHa * stageFraction * areaHa;

  const recommendations: NutrientRecommendation[] = [];

  // Recommendation 1: Stage-specific primary formulation
  if (currentStage.stageName.includes("Nursery") || currentStage.stageName.includes("Seedling")) {
    const fert = COMMON_FERTILIZERS.find((f) => f.id === "fert_mkp") || COMMON_FERTILIZERS[0];
    const calc = calculateFertilizerDose({
      targetNutrientType: "P",
      stageGrossNutrientRequirementKgPerHa: profile.standardPRequirementKgPerHa * stageFraction,
      cropArea: crop.area,
      cropAreaUnit: crop.areaUnit,
      fertilizer: fert,
      cultivationMethod: crop.cultivationMethod,
      soilTestPpm: crop.soilTestNPK?.p,
      priorAppliedKgThisStage: appliedP,
    });

    const isWasteRisk = appliedP >= stageTargetP * 0.95;

    recommendations.push({
      id: "rec_nursery_p",
      cropId: crop.id,
      stageName: currentStage.stageName,
      targetNutrient: "Phosphorus (P2O5) for Root Anchoring",
      recommendedFertilizer: fert.name,
      fertilizerComposition: "0-52-34 (Soluble P & K)",
      calculatedQuantity: calc.totalForRegisteredAreaKg,
      quantityUnit: "kg",
      perUnitArea: `${calc.quantityPerAcreKg} kg/acre`,
      applicationMethod: crop.cultivationMethod === "Soil" ? "Drip fertigation or soil drench" : "Injected via A/B dosing tank",
      dateRange: `Days 1–${currentStage.durationDays}`,
      frequency: "Split into 2 weekly fertigation pulses",
      reason: `Seedlings require high orthophosphate concentrations to rapidly stimulate primary root branching and cotyledon vigor.`,
      source: "QuantumGrow Agronomic Database (Polyhouse Protected Cultivation Manual)",
      precautions: [
        "Avoid applying during extreme solar midday heat.",
        "Ensure water electrical conductivity (EC) remains below 1.4 dS/m to prevent osmotic root shock.",
      ],
      wasteWarning: isWasteRisk
        ? "Warning: Recorded prior applications already provide sufficient phosphorus for this nursery stage. Extra doses risk salt accumulation."
        : undefined,
    });
  } else if (currentStage.stageName.includes("Vegetative")) {
    const fert19 = COMMON_FERTILIZERS.find((f) => f.id === "fert_191919") || COMMON_FERTILIZERS[0];
    const calc = calculateFertilizerDose({
      targetNutrientType: "N",
      stageGrossNutrientRequirementKgPerHa: profile.standardNRequirementKgPerHa * stageFraction,
      cropArea: crop.area,
      cropAreaUnit: crop.areaUnit,
      fertilizer: fert19,
      cultivationMethod: crop.cultivationMethod,
      soilTestPpm: crop.soilTestNPK?.n,
      priorAppliedKgThisStage: appliedN,
    });

    const isWasteRisk = appliedN >= stageTargetN * 0.95;

    recommendations.push({
      id: "rec_veg_npk",
      cropId: crop.id,
      stageName: currentStage.stageName,
      targetNutrient: "Balanced NPK for Biomass & Leaf Elongation",
      recommendedFertilizer: fert19.name,
      fertilizerComposition: "19-19-19 (Fully Soluble NPK)",
      calculatedQuantity: calc.totalForRegisteredAreaKg,
      quantityUnit: "kg",
      perUnitArea: `${calc.quantityPerAcreKg} kg/acre`,
      applicationMethod: "Drip Fertigation (Morning pulse cycle)",
      dateRange: `Current Vegetative Cycle`,
      frequency: "Every 4 to 5 days",
      reason: `Canopy biomass is expanding rapidly. Sustained nitrate-nitrogen and balanced phosphorus prevent chlorosis and support photosynthetic leaf area.`,
      source: "ICAR / FAO Protected Agriculture Guidelines",
      precautions: [
        "Maintain fertigation water pH between 5.8 and 6.4 for optimal macronutrient absorption.",
        "Flush irrigation lines with fresh water for 5 minutes after fertigation to prevent emitter clogging.",
      ],
      wasteWarning: isWasteRisk
        ? "Warning: Nitrogen saturation detected from prior applications. Excess nitrogen now will lead to weak elongated stems."
        : undefined,
    });
  } else if (
    currentStage.stageName.includes("Flowering") ||
    currentStage.stageName.includes("Bloom")
  ) {
    const calnit = COMMON_FERTILIZERS.find((f) => f.id === "fert_calnit") || COMMON_FERTILIZERS[1];
    const calc = calculateFertilizerDose({
      targetNutrientType: "N",
      stageGrossNutrientRequirementKgPerHa: profile.standardNRequirementKgPerHa * stageFraction * 0.7,
      cropArea: crop.area,
      cropAreaUnit: crop.areaUnit,
      fertilizer: calnit,
      cultivationMethod: crop.cultivationMethod,
      priorAppliedKgThisStage: appliedN,
    });

    recommendations.push({
      id: "rec_flower_ca",
      cropId: crop.id,
      stageName: currentStage.stageName,
      targetNutrient: "Calcium & Nitrate for Pollen Tube & Cell Walls",
      recommendedFertilizer: calnit.name,
      fertilizerComposition: "15.5-0-0 + 19% Soluble Ca",
      calculatedQuantity: calc.totalForRegisteredAreaKg,
      quantityUnit: "kg",
      perUnitArea: `${calc.quantityPerAcreKg} kg/acre`,
      applicationMethod: "Dedicated Drip Pulse (Tank A)",
      dateRange: `Flowering onset`,
      frequency: "Weekly",
      reason: `Entering the flowering stage triggers rapid demand for translocatable calcium. Soluble calcium strengthens floral cell walls and prevents early blossom drop.`,
      source: "Greenhouse Horticulture Research Station (Wageningen UR protocols)",
      precautions: [
        "DO NOT blend Calcium Nitrate with Phosphates or Sulfates in concentrated stock tanks.",
        "Apply early in the morning when crop transpiration drives calcium movement toward upper flower trusses.",
      ],
      wasteWarning:
        appliedN > stageTargetN
          ? "Excess Nitrogen Warning: Excessive vegetative N suppresses flower bud initiation. Prioritize calcium and boron."
          : undefined,
    });
  } else {
    // Fruit Formation / Bulking / Harvest
    const potnit = COMMON_FERTILIZERS.find((f) => f.id === "fert_potnit") || COMMON_FERTILIZERS[2];
    const calc = calculateFertilizerDose({
      targetNutrientType: "K",
      stageGrossNutrientRequirementKgPerHa: profile.standardKRequirementKgPerHa * stageFraction,
      cropArea: crop.area,
      cropAreaUnit: crop.areaUnit,
      fertilizer: potnit,
      cultivationMethod: crop.cultivationMethod,
      soilTestPpm: crop.soilTestNPK?.k,
      priorAppliedKgThisStage: appliedK,
    });

    const isWasteRisk = appliedK >= stageTargetK * 0.95;

    recommendations.push({
      id: "rec_fruit_k",
      cropId: crop.id,
      stageName: currentStage.stageName,
      targetNutrient: "Potassium Dominance for Fruit Bulking & Brix",
      recommendedFertilizer: potnit.name,
      fertilizerComposition: "13-0-45 (Potassium Nitrate)",
      calculatedQuantity: calc.totalForRegisteredAreaKg,
      quantityUnit: "kg",
      perUnitArea: `${calc.quantityPerAcreKg} kg/acre`,
      applicationMethod: "Drip Fertigation proportional injection",
      dateRange: `Fruit Development Window`,
      frequency: "Every 3 days in divided fertigation shots",
      reason: `Maturing fruit sinks over 60% of daily absorbed potassium. Sufficient potassium ensures uniform skin coloring, optimal sugar-to-acid ratio, and heavy fruit bulking.`,
      source: "International Potash Institute (IPI) Polyhouse Standards",
      precautions: [
        "Monitor drainage EC daily; avoid exceeding 3.0 dS/m in substrate to prevent root tip dieback.",
        "Coordinate with soil moisture sensors to ensure soil is moist before fertigation injection.",
      ],
      wasteWarning: isWasteRisk
        ? "Warning: Potassium ceiling approached. Excessive potassium may antagonize magnesium and calcium uptake."
        : undefined,
    });
  }

  return recommendations;
}

