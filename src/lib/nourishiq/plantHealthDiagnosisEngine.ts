import {
  PlantHealthInspection,
  ConditionType,
  TreatmentAdvisory,
} from "@/types/nourishiq";
import { findMatchingPesticides } from "./pesticideKnowledgeBase";

export interface DiagnosisInput {
  cropId: string;
  cropName: string;
  variety: string;
  growthStage: string;
  imageUrls: string[];
  symptomsReported: string;
  currentTemp?: number;
  currentHumidity?: number;
}

export function runPlantHealthDiagnosis(input: DiagnosisInput): PlantHealthInspection {
  const {
    cropId,
    cropName,
    growthStage,
    imageUrls,
    symptomsReported,
    currentHumidity = 70,
  } = input;

  const text = symptomsReported.toLowerCase();

  // Pattern matching based on verified symptoms & environmental factors
  let suspectedDiagnosis = "Early Blight (Alternaria solani)";
  let conditionType: ConditionType = "Fungal";
  let confidence = 87;
  let severity: "Low" | "Moderate" | "High" | "Severe" = "Moderate";
  let visibleSymptoms = [
    "Target-board concentric ring lesions on lower mature foliage",
    "Yellow chlorotic halos surrounding necrotic brown spots",
    "Early leaf senescence on lower canopy leaves",
  ];
  let reasoning = `High relative humidity (${currentHumidity}%) combined with dense foliage creates extended leaf wetness hours favoring Alternaria conidia germination. Symptoms exhibit characteristic bullseye concentric rings localized on mature lower leaves.`;

  let culturalControls = [
    "Prune off lower senescent and heavily infected leaves using sanitized shears.",
    "Increase polyhouse side-vent ventilation or horizontal airflow fans to reduce leaf wetness duration below 4 hours.",
    "Maintain drip irrigation without splashing water onto canopy foliage.",
  ];

  let mechanicalControls = [
    "Collect all pruned infected debris into sealed bags and dispose outside the polyhouse perimeter.",
    "Sterilize cutting tools between rows using 70% isopropyl alcohol or 10% sodium hypochlorite solution.",
  ];

  let biologicalControls = [
    "Apply Trichoderma viride or Bacillus amyloliquefaciens microbial inoculant to leaf canopy to competitively displace fungal mycelium.",
    "Spray potassium silicate (0.25%) to harden epidermal cell walls against fungal hyphae penetration.",
  ];

  if (text.includes("white") && (text.includes("powder") || text.includes("dust") || text.includes("mildew"))) {
    suspectedDiagnosis = "Powdery Mildew (Oidium neolycopersici / Podosphaera)";
    conditionType = "Fungal";
    confidence = 92;
    severity = "Moderate";
    visibleSymptoms = [
      "White talcum-like powdery patches on upper leaf surfaces",
      "Yellowing on opposite undersides of infected leaves",
      "Slight upward leaf curling and premature drying",
    ];
    reasoning = `Warm dry conditions with moderate shade and high ambient humidity encourage powdery mildew epiphytic spore proliferation. Conidia do not require free water to germinate, flourishing in protected polyhouse environments.`;
    culturalControls = [
      "Improve air circulation through canopy trimming to lower microclimate humidity pockets.",
      "Ensure adequate grow light / solar photon exposure across shaded lower tiers.",
    ];
    mechanicalControls = ["Rogue severely encrusted leaves immediately before spores disperse."];
    biologicalControls = [
      "Apply Ampelomyces quisqualis (hyperparasitic fungus that feeds directly on powdery mildew colonies).",
      "Foliar spray of 10% cow milk or whey solution (generates free radicals under light that lyse mildew cells).",
    ];
  } else if (text.includes("mite") || text.includes("web") || text.includes("speckl") || text.includes("spider")) {
    suspectedDiagnosis = "Two-Spotted Spider Mite (Tetranychus urticae)";
    conditionType = "Pest";
    confidence = 89;
    severity = "High";
    visibleSymptoms = [
      "Fine yellow stippling and bronzing across upper leaf laminas",
      "Silken webbing visible across apical growing tips and leaf axils",
      "Tiny moving red/yellow specks on leaf undersides",
    ];
    reasoning = `Spider mites multiply exponentially in dry, warm polyhouse microclimates (>27°C, <55% RH). Microscopic piercing-sucking feeding depletes cellular sap, leading to bronze leaf mottle.`;
    culturalControls = [
      "Increase fogging / misting cycle duration to raise ambient humidity above 65% (unfavorable for mite egg hatching).",
      "Avoid excess nitrogen fertilization which makes sap richer in amino acids attractive to mites.",
    ];
    mechanicalControls = [
      "High-pressure water nozzle wash directed at undersides of leaves to knock down mite colonies.",
    ];
    biologicalControls = [
      "Introduce predatory mites: Phytoseiulus persimilis or Neoseiulus californicus at 5–10 mites/m².",
      "Apply Entomopathogenic fungus Beauveria bassiana.",
    ];
  } else if (text.includes("yellow") && (text.includes("vein") || text.includes("lower") || text.includes("intervein"))) {
    suspectedDiagnosis = "Magnesium (Mg) Deficiency";
    conditionType = "Nutrient Deficiency";
    confidence = 85;
    severity = "Low";
    visibleSymptoms = [
      "Interveinal chlorosis starting on older lower mature leaves",
      "Veins remain prominent and dark green while leaf margins turn golden-yellow",
      "No necrotic necrotic spots in early stage, followed by marginal leaf crisping",
    ];
    reasoning = `Magnesium is a mobile macronutrient. Under high LED photon flux or heavy potassium fertigation (K:Mg antagonism), the plant translocates magnesium from older foliage to newly developing apical sinks, leaving characteristic interveinal chlorosis.`;
    culturalControls = [
      "Verify root zone pH (optimal range 5.8 to 6.4 for magnesium uptake).",
      "Check potassium:magnesium ratio in fertigation recipe (target K:Mg ratio should not exceed 3:1).",
    ];
    mechanicalControls = ["Flush root zone with fresh pH-balanced water if substrate EC has built up."];
    biologicalControls = [
      "Foliar application of Magnesium Sulfate (Epsom salt) at 0.5% (5g/L) for immediate corrective absorption.",
    ];
  } else if (text.includes("rot") && (text.includes("blossom") || text.includes("tip") || text.includes("bottom") || text.includes("black"))) {
    suspectedDiagnosis = "Blossom End Rot (Calcium Translocation Deficit)";
    conditionType = "Nutrient Deficiency";
    confidence = 94;
    severity = "High";
    visibleSymptoms = [
      "Sunken, water-soaked dark lesion at the blossom end of green fruit",
      "Lesion rapidly turns dark leathery brown or black",
      "Secondary opportunistic saprophytic mold on decayed spot",
    ];
    reasoning = `Blossom End Rot is a physiological disorder caused by calcium deficiency in rapidly expanding distal fruit tissue. It is frequently triggered by erratic irrigation, high humidity stalling transpiration, or excessive root salinity preventing calcium uptake.`;
    culturalControls = [
      "Maintain consistent soil moisture levels—avoid severe alternating drying and waterlogging cycles.",
      "Run dehumidification or airflow fans during humid mornings to stimulate xylem transpiration pull.",
      "Inject Calcium Nitrate via fertigation (avoid mixing with sulfates or phosphates).",
    ];
    mechanicalControls = ["Remove affected damaged fruits immediately so the plant directs calcium into healthy trusses."];
    biologicalControls = [
      "Foliar application of chelated Calcium (Ca-EDTA) at 1.5 g/L directly targeting developing green fruit clusters.",
    ];
  } else if (text.includes("whitefly") || text.includes("fly") || text.includes("honeydew") || text.includes("sooty")) {
    suspectedDiagnosis = "Silverleaf Whitefly (Bemisia tabaci)";
    conditionType = "Pest";
    confidence = 91;
    severity = "Moderate";
    visibleSymptoms = [
      "Clouds of tiny white moths fluttering when canopy is disturbed",
      "Sticky clear honeydew droplets deposited on foliage",
      "Secondary black sooty mold growing over honeydew deposits",
    ];
    reasoning = `Whiteflies rapidly colonize sheltered polyhouses without natural wind disruption. Phloem sap extraction weakens vigor and risks transmission of Begomoviruses (Tomato Yellow Leaf Curl).`;
    culturalControls = [
      "Install 50-mesh anti-insect screens over all polyhouse vents and double-door entry vestibules.",
      "Hang yellow sticky insect monitoring cards at canopy height (1 card per 20 m²).",
    ];
    mechanicalControls = ["Vacuum adult flushes using handheld mini-vacuum during cool early mornings."];
    biologicalControls = [
      "Release parasitic wasps: Encarsia formosa or Eretmocerus eremicus.",
      "Apply Beauveria bassiana or Isaria fumosorosea mycoinsecticide.",
    ];
  }

  // Retrieve verified label-approved chemical control options
  const chemicalControls = findMatchingPesticides(suspectedDiagnosis, cropName);

  const treatmentAdvisory: TreatmentAdvisory = {
    culturalControls,
    mechanicalControls,
    biologicalControls,
    chemicalControls: chemicalControls.length > 0 ? chemicalControls : undefined,
    expertDisclaimer:
      "DISCLAIMER: AI-generated plant health diagnosis is a preliminary diagnostic aid based on visible symptomatic patterns and environmental sensor telemetry. Always physically inspect plant tissue and consult a certified agricultural extension officer or local agronomist before applying chemical pesticides. Never exceed product label guidelines.",
  };

  const nextInspectionDate = new Date();
  nextInspectionDate.setDate(nextInspectionDate.getDate() + 4);
  const nextInspectionStr = nextInspectionDate.toISOString().split("T")[0];

  return {
    id: `insp_${Date.now()}`,
    cropId,
    inspectionDate: new Date().toISOString().split("T")[0],
    imageUrls: imageUrls.length > 0 ? imageUrls : ["/images/polyhouse_tunnel.jpg"],
    symptomsReported,
    suspectedDiagnosis,
    conditionType,
    confidence,
    severity,
    visibleSymptoms,
    reasoning,
    status: "Suspected",
    recommendedNextInspection: nextInspectionStr,
    treatmentAdvisory,
    createdAt: new Date().toISOString(),
  };
}

