import { CropProfile, GrowthStageDefinition } from "@/types/nourishiq";
import { getCropProfile } from "./cropProfiles";

export interface CropStageCalculation {
  daysSinceSowing: number;
  daysSinceTransplanting: number | null;
  effectiveAgeDays: number;
  currentStageIndex: number;
  currentStage: GrowthStageDefinition;
  nextStage: GrowthStageDefinition | null;
  stageProgressPercent: number;
  lifecycleProgressPercent: number;
  daysRemainingInStage: number;
  totalLifecycleDays: number;
}

export function parseISODate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function calculateDaysBetween(startDateStr: string, endDate: Date = new Date()): number {
  if (!startDateStr) return 0;
  const start = parseISODate(startDateStr);
  const diffTime = endDate.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

export function calculateCropStage(crop: CropProfile): CropStageCalculation {
  const profile = getCropProfile(crop.cropName);
  const stages = profile.stages;

  const daysSinceSowing = calculateDaysBetween(crop.sowingDate);
  const daysSinceTransplanting = crop.transplantingDate
    ? calculateDaysBetween(crop.transplantingDate)
    : null;

  // Determine effective age based on reference date type
  let effectiveAgeDays =
    crop.referenceDateType === "transplanting" && daysSinceTransplanting !== null
      ? daysSinceTransplanting
      : daysSinceSowing;

  // If cultivation is via transplanting, offset by nursery duration if evaluating total lifecycle
  let accumulatedDays = 0;
  let currentStageIndex = 0;

  for (let i = 0; i < stages.length; i++) {
    const stageDuration = stages[i].durationDays;
    if (effectiveAgeDays < accumulatedDays + stageDuration || i === stages.length - 1) {
      currentStageIndex = i;
      break;
    }
    accumulatedDays += stageDuration;
  }

  const currentStage = stages[currentStageIndex];
  const nextStage = currentStageIndex < stages.length - 1 ? stages[currentStageIndex + 1] : null;

  const daysIntoCurrentStage = effectiveAgeDays - accumulatedDays;
  const stageProgressPercent = Math.min(
    100,
    Math.max(0, Math.round((daysIntoCurrentStage / currentStage.durationDays) * 100))
  );

  const totalLifecycleDays = profile.totalLifecycleDays;
  const lifecycleProgressPercent = Math.min(
    100,
    Math.max(0, Math.round((effectiveAgeDays / totalLifecycleDays) * 100))
  );

  const daysRemainingInStage = Math.max(0, currentStage.durationDays - daysIntoCurrentStage);

  return {
    daysSinceSowing,
    daysSinceTransplanting,
    effectiveAgeDays,
    currentStageIndex,
    currentStage,
    nextStage,
    stageProgressPercent,
    lifecycleProgressPercent,
    daysRemainingInStage,
    totalLifecycleDays,
  };
}

