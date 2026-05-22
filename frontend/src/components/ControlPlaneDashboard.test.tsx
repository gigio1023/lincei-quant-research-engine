import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ControlPlaneDashboard from "./ControlPlaneDashboard";
import { riskGateApi } from "../services/api";

vi.mock("../services/api", () => ({
  riskGateApi: {
    getStatus: vi.fn(),
  },
  controlPlaneApi: {
    getStatus: vi.fn(),
    getResearchRuns: vi.fn(),
  },
}));

import { controlPlaneApi } from "../services/api";

const mockRiskGateStatus = {
  brokerExecutionEnabled: false,
  liveTradingEnabled: false,
  defaultPolicy: {
    maxGrossExposurePct: 100,
    maxSinglePositionPct: 20,
    maxOrderNotional: 1000000,
    maxDailyLossPct: 3,
    maxDrawdownPct: 10,
    maxDataAgeMinutes: 60,
    allowedAssetClasses: [
      "cash",
      "domestic_stock",
      "foreign_stock",
      "domestic_etf",
      "foreign_etf",
    ],
    allowLiveTrading: false,
    requireHumanApproval: true,
  },
};

const mockControlPlaneStatus = {
  brokerExecutionEnabled: false,
  liveTradingReady: false,
  readiness: [
    {
      key: "riskGateReady",
      ready: true,
      detail: "Deterministic risk gate is registered",
    },
    {
      key: "researchRunLedgerReady",
      ready: true,
      detail: "Research-run ledger exposes reproducible backtest records",
    },
    {
      key: "paperExecutionReady",
      ready: false,
      detail: "Paper execution enclave is not implemented",
    },
  ],
  blockers: ["No paper execution enclave"],
};

const mockResearchRuns = [
  {
    id: "rr-api-1",
    budgetEnvelopeId: "budget-api-1",
    objective: "Validate API momentum baseline",
    strategyFamily: "cross-sectional momentum",
    hypothesis: "Momentum should beat the benchmark after costs.",
    status: "proposal_ready",
    phase: "artifacts_persisted",
    advanceEligible: true,
    datasetRefs: [
      {
        id: "krx-daily-bars",
        source: "sample",
        windowStart: "2025-01-01",
        windowEnd: "2026-05-21",
        availabilityTimestamp: "2026-05-21T23:50:00.000Z",
      },
    ],
    featureRefs: ["return_60d", "volatility_20d"],
    timestampLagRules: ["Signals use data available before proposal time."],
    noLookaheadChecked: true,
    benchmark: "KOSPI 200",
    costModel: "10 bps per side",
    slippageModel: "5 bps fixed haircut",
    modelName: "deterministic-ranking-baseline",
    validationWindow: {
      start: "2025-01-01",
      end: "2026-05-21",
    },
    backtestMetrics: {
      totalReturnPct: 12.4,
      benchmarkReturnPct: 8.1,
      maxDrawdownPct: 7.6,
      sharpeRatio: 1.22,
      turnoverPct: 96,
      tradeCount: 31,
    },
    artifactRefs: ["s3://research-runs/rr-api-1/report.json"],
    artifactHashes: {
      "s3://research-runs/rr-api-1/report.json": "sha256:test",
    },
    knownFailureModes: ["Momentum reversal"],
    brokerExecutionEnabled: false,
    liveTradingEnabled: false,
    createdAt: "2026-05-22T08:30:00.000Z",
    updatedAt: "2026-05-22T08:42:00.000Z",
  },
];

describe("ControlPlaneDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(riskGateApi.getStatus).mockResolvedValue(mockRiskGateStatus);
    vi.mocked(controlPlaneApi.getStatus).mockResolvedValue(
      mockControlPlaneStatus,
    );
    vi.mocked(controlPlaneApi.getResearchRuns).mockResolvedValue(
      mockResearchRuns,
    );
  });

  it("should_render_read_only_control_plane_status", async () => {
    render(<ControlPlaneDashboard />);

    expect(
      screen.getByRole("heading", { name: "Control Plane Dashboard" }),
    ).toBeInTheDocument();
    expect(screen.getByText("No live trading")).toBeInTheDocument();
    expect(screen.getByText("brokerExecutionEnabled")).toBeInTheDocument();
    expect(screen.getAllByText("false").length).toBeGreaterThanOrEqual(2);

    await waitFor(() => {
      expect(screen.getByText("Live API status")).toBeInTheDocument();
    });
    expect(screen.getByText("System Readiness Matrix")).toBeInTheDocument();
    expect(screen.getByText("riskGateReady")).toBeInTheDocument();
    expect(screen.getByText("researchRunLedgerReady")).toBeInTheDocument();
    expect(screen.getByText("No paper execution enclave")).toBeInTheDocument();

    expect(screen.getByText("Research Run Ledger")).toBeInTheDocument();
    expect(screen.getByText("Live research ledger")).toBeInTheDocument();
    expect(
      screen.getByText("Validate API momentum baseline"),
    ).toBeInTheDocument();
    expect(screen.getByText("Backtest Metrics")).toBeInTheDocument();
    expect(screen.getByText("+12.4%")).toBeInTheDocument();
    expect(screen.getByText("Broker disabled")).toBeInTheDocument();
  });

  it("should_show_documented_fallback_when_status_api_fails", async () => {
    vi.mocked(riskGateApi.getStatus).mockRejectedValue(new Error("offline"));
    vi.mocked(controlPlaneApi.getStatus).mockRejectedValue(
      new Error("offline"),
    );
    vi.mocked(controlPlaneApi.getResearchRuns).mockRejectedValue(
      new Error("offline"),
    );

    render(<ControlPlaneDashboard />);

    await waitFor(() => {
      expect(screen.getByText("Documented fallback")).toBeInTheDocument();
    });

    expect(
      screen.getByText((content) =>
        content.includes("control-plane status APIs are unavailable"),
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Live trading")).toBeInTheDocument();
    expect(screen.getAllByText("Blocked").length).toBeGreaterThan(0);
    expect(screen.getByText("Documented sample runs")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Validate a dry-run momentum baseline before any proposal",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText((content) =>
        content.includes("Research-run ledger API is unavailable"),
      ),
    ).toBeInTheDocument();
  });

  it("should_show_empty_state_when_live_research_ledger_is_empty", async () => {
    vi.mocked(controlPlaneApi.getResearchRuns).mockResolvedValue([]);

    render(<ControlPlaneDashboard />);

    await waitFor(() => {
      expect(screen.getByText("Live research ledger")).toBeInTheDocument();
    });

    expect(
      screen.getByText("No research runs recorded yet."),
    ).toBeInTheDocument();
  });
});
