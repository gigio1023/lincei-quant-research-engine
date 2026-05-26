import type { V1SystemStageStatus } from "../../types/v1Pilot";
import type { CycleMetric } from "./cycleModel";

export const stageBadgeClass: Record<V1SystemStageStatus, string> = {
  ready: "border-[#0ecb81]/30 bg-[#0ecb81]/10 text-[#0ecb81]",
  blocked: "border-[#f0b90b]/30 bg-[#f0b90b]/10 text-[#fcd535]",
  missing: "border-[#707a8a]/30 bg-[#707a8a]/10 text-[#929aa5]",
};

export const stageRailClass: Record<V1SystemStageStatus, string> = {
  ready: "bg-[#0ecb81]",
  blocked: "bg-[#fcd535]",
  missing: "bg-[#707a8a]",
};

export const metricToneClass: Record<CycleMetric["tone"], string> = {
  neutral: "text-[#eaecef]",
  positive: "text-[#0ecb81]",
  warning: "text-[#fcd535]",
  danger: "text-[#f6465d]",
};

export const laneClass = {
  data: "border-[#2b3139] bg-[#0b0e11]",
  alpha: "border-[#2b3139] bg-[#11151a]",
  lean: "border-[#fcd535]/30 bg-[#1e2329]",
  execution: "border-[#2b3139] bg-[#11151a]",
  learning: "border-[#2b3139] bg-[#0b0e11]",
};
