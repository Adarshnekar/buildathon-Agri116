import { ChemicalControlOption } from "@/types/nourishiq";

export interface VerifiedProtectionProduct {
  id: string;
  tradeName: string;
  activeIngredient: string;
  targetIssues: string[];
  applicableCrops: string[];
  labelDosage: string;
  applicationMethod: string;
  maxApplicationsPerSeason: number;
  intervalDays: number;
  reEntryIntervalHours: number;
  preHarvestIntervalDays: number;
  ppeRequirements: string[];
  modeOfAction: string;
  restrictions: string;
}

export const VERIFIED_PESTICIDES: VerifiedProtectionProduct[] = [
  {
    id: "pest_bt",
    tradeName: "Dipel Pro / Bio-BT",
    activeIngredient: "Bacillus thuringiensis subsp. kurstaki (Btk)",
    targetIssues: ["Tomato Hornworm", "Cabbage Looper", "Leafminer larvae", "Fruitworm"],
    applicableCrops: ["Tomato", "Pepper", "Lettuce", "Strawberry", "Cucumber", "Basil"],
    labelDosage: "1.5 to 2.0 g per Liter of water",
    applicationMethod: "Foliar mist spray (Complete upper and lower leaf coverage)",
    maxApplicationsPerSeason: 6,
    intervalDays: 7,
    reEntryIntervalHours: 4,
    preHarvestIntervalDays: 0, // 0 days PHI for organic biological BT
    ppeRequirements: ["N95 particulate respirator", "Nitrile gloves", "Eye protection goggles"],
    modeOfAction: "Stomach toxin active only inside caterpillar alkaline digestive gut.",
    restrictions: "Apply late afternoon to avoid UV degradation. Target young first-instar larvae.",
  },
  {
    id: "pest_neem",
    tradeName: "EcoNeem 10000 ppm",
    activeIngredient: "Azadirachtin (Neem seed extract 1% EC)",
    targetIssues: ["Whiteflies", "Aphids", "Spider Mites", "Thrips"],
    applicableCrops: ["Tomato", "Pepper", "Lettuce", "Strawberry", "Cucumber", "Basil"],
    labelDosage: "2.5 to 3.0 mL per Liter of water",
    applicationMethod: "Fine droplet foliar spray during low light / dusk",
    maxApplicationsPerSeason: 4,
    intervalDays: 7,
    reEntryIntervalHours: 4,
    preHarvestIntervalDays: 1, // 1 day PHI
    ppeRequirements: ["Chemical resistant gloves", "Protective glasses", "Long sleeves"],
    modeOfAction: "Insect growth regulator (IGR) disrupting ecdysone molting hormone & feeding deterrent.",
    restrictions: "Do not apply in direct midday sunlight (>30°C) to prevent phytotoxic leaf scorch.",
  },
  {
    id: "pest_potbicarb",
    tradeName: "MilStop / Armicarb",
    activeIngredient: "Potassium Bicarbonate (85% SP)",
    targetIssues: ["Powdery Mildew", "Botrytis Gray Mold", "Early Blight"],
    applicableCrops: ["Tomato", "Pepper", "Strawberry", "Cucumber", "Basil", "Lettuce"],
    labelDosage: "3.0 to 4.0 g per Liter of water",
    applicationMethod: "Preventive or early therapeutic foliar spray",
    maxApplicationsPerSeason: 8,
    intervalDays: 7,
    reEntryIntervalHours: 4,
    preHarvestIntervalDays: 1, // 1 day PHI
    ppeRequirements: ["Standard workwear", "Goggles", "Rubber gloves"],
    modeOfAction: "Disrupts fungal cell membrane osmotic pressure and inhibits mycelial germination.",
    restrictions: "Ensure complete droplet coverage. Do not mix with highly acidic tank solutions.",
  },
  {
    id: "pest_coppersulf",
    tradeName: "Kocide 3000 Ag",
    activeIngredient: "Copper Hydroxide (46.1% WG)",
    targetIssues: ["Bacterial Canker", "Bacterial Leaf Spot", "Late Blight", "Anthracnose"],
    applicableCrops: ["Tomato", "Pepper", "Cucumber"],
    labelDosage: "1.5 to 2.0 g per Liter of water",
    applicationMethod: "Preventive protective foliar shield",
    maxApplicationsPerSeason: 4,
    intervalDays: 10,
    reEntryIntervalHours: 24,
    preHarvestIntervalDays: 3, // 3 days PHI
    ppeRequirements: ["Chemical goggles", "Waterproof gloves", "Coveralls over long pants", "Respirator"],
    modeOfAction: "Multi-site inorganic copper ions denature fungal and bacterial enzyme complexes.",
    restrictions: "Phytotoxicity risk on open floral blossom petals. Do not apply if temperatures exceed 32°C.",
  },
  {
    id: "pest_spinosad",
    tradeName: "Entrust SC / Tracer",
    activeIngredient: "Spinosad (Fermentation metabolite of Saccharopolyspora spinosa)",
    targetIssues: ["Western Flower Thrips", "Leafminers", "Armyworms", "Fruit Fly"],
    applicableCrops: ["Tomato", "Pepper", "Strawberry", "Lettuce", "Cucumber"],
    labelDosage: "0.4 to 0.6 mL per Liter of water",
    applicationMethod: "Targeted foliar spray to leaf undersides and flowers",
    maxApplicationsPerSeason: 3,
    intervalDays: 7,
    reEntryIntervalHours: 12,
    preHarvestIntervalDays: 1, // 1 day PHI
    ppeRequirements: ["Chemical-resistant gloves", "Protective eyewear", "Long sleeves"],
    modeOfAction: "Allosteric nicotinic acetylcholine receptor activator causing rapid insect paralysis.",
    restrictions: "Toxic to honeybees until spray deposits dry completely. Apply after dusk inside polyhouse.",
  },
];

export function findMatchingPesticides(targetIssue: string, cropName: string): ChemicalControlOption[] {
  return VERIFIED_PESTICIDES.filter((p) => {
    const issueMatch = p.targetIssues.some((issue) =>
      issue.toLowerCase().includes(targetIssue.toLowerCase()) ||
      targetIssue.toLowerCase().includes(issue.toLowerCase())
    );
    const cropMatch = p.applicableCrops.includes(cropName);
    return issueMatch && cropMatch;
  }).map((p) => ({
    productName: p.tradeName,
    activeIngredient: p.activeIngredient,
    dosage: p.labelDosage,
    applicationMethod: p.applicationMethod,
    maxApplicationsPerSeason: p.maxApplicationsPerSeason,
    intervalDays: p.intervalDays,
    ppeRequirements: p.ppeRequirements,
    reEntryIntervalHours: p.reEntryIntervalHours,
    preHarvestIntervalDays: p.preHarvestIntervalDays,
    restrictions: p.restrictions,
  }));
}

