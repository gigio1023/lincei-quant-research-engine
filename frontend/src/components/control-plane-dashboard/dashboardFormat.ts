import {
  ControlPlaneGateStatus,
  ResearchRun,
  RiskGateResponse,
} from "../../types";

export const STATUS_LABELS: Record<ControlPlaneGateStatus, string> = {
  partial: "Partial",
  started: "Started",
  missing: "Missing",
  blocked: "Blocked",
};

export const STATUS_CLASSES: Record<ControlPlaneGateStatus, string> = {
  partial: "border-[#2b3139] bg-[#1e2329] text-[#eaecef]",
  started: "border-[#0ecb81]/30 bg-[#0ecb81]/10 text-[#0ecb81]",
  missing: "border-[#f0b90b]/30 bg-[#f0b90b]/10 text-[#fcd535]",
  blocked: "border-[#f6465d]/30 bg-[#f6465d]/10 text-[#f6465d]",
};

export const decisionClasses: Record<RiskGateResponse["decision"], string> = {
  ALLOW: "border-[#0ecb81]/30 bg-[#0ecb81]/10 text-[#0ecb81]",
  REVIEW: "border-[#f0b90b]/30 bg-[#f0b90b]/10 text-[#fcd535]",
  DENY: "border-[#f6465d]/30 bg-[#f6465d]/10 text-[#f6465d]",
};

export const formatCurrency = (value: number, currency = "KRW") =>
  new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);

export const formatSignedCurrency = (value: number, currency = "KRW") =>
  `${value >= 0 ? "+" : ""}${formatCurrency(value, currency)}`;

export const formatPercent = (value: number) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value) + "%";

export const formatSignedPercent = (value: number) =>
  `${value >= 0 ? "+" : ""}${formatPercent(value)}`;

export const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value);

export const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

export const formatWindow = (windowValue: ResearchRun["validationWindow"]) =>
  typeof windowValue === "string"
    ? windowValue
    : `${windowValue.start}..${windowValue.end}`;

export const formatBoolean = (value: boolean) => (value ? "true" : "false");

export const statusBadge = (status: ControlPlaneGateStatus) =>
  `${STATUS_CLASSES[status]} inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-bold uppercase`;

export const researchRunStatusClass = (status: string) => {
  const normalizedStatus = status.toLowerCase();

  if (
    ["completed", "proposal_ready", "evidence_ready"].includes(normalizedStatus)
  ) {
    return STATUS_CLASSES.started;
  }

  if (
    ["failed", "blocked", "rejected", "halted", "cancelled"].includes(
      normalizedStatus,
    )
  ) {
    return STATUS_CLASSES.blocked;
  }

  return STATUS_CLASSES.partial;
};

export const paperOrderPlanStatusClass = (status: string) => {
  const normalizedStatus = status.toLowerCase();

  if (
    ["active", "completed", "filled", "reconciled", "settled"].includes(
      normalizedStatus,
    )
  ) {
    return STATUS_CLASSES.started;
  }

  if (
    ["blocked", "failed", "rejected", "cancelled", "halted"].includes(
      normalizedStatus,
    )
  ) {
    return STATUS_CLASSES.blocked;
  }

  return STATUS_CLASSES.partial;
};
