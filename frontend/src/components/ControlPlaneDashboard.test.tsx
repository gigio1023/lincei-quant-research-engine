import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
    getPaperOrderPlans: vi.fn(),
    runBaselineResearch: vi.fn(),
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
      detail:
        "Paper simulator ledger registered; broker-grade readiness is blocked",
    },
    {
      key: "paperSimulationLedgerReady",
      ready: true,
      detail:
        "Deterministic paper order-plan, fill, and reconciliation ledger is registered",
    },
  ],
  blockers: ["No signed order-plan workflow"],
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

const mockBaselineResearchRun = {
  id: "rr-baseline-api-1",
  budgetEnvelopeId: "budget-baseline-1",
  objective: "Run deterministic dry-run momentum baseline backtest",
  strategyFamily: "cross-sectional momentum",
  hypothesis: "The baseline evaluates historical bars without broker access.",
  status: "proposal_ready",
  phase: "artifacts_persisted",
  advanceEligible: true,
  datasetRefs: [
    {
      id: "krx-daily-bars",
      source: "baseline-runner",
      windowStart: "2025-01-01",
      windowEnd: "2026-05-21",
      availabilityTimestamp: "2026-05-21T23:50:00.000Z",
    },
  ],
  featureRefs: ["return_60d"],
  timestampLagRules: ["Signals use data available before proposal time."],
  noLookaheadChecked: true,
  benchmark: "KOSPI 200 total return proxy",
  costModel: "10 bps per side",
  slippageModel: "5 bps fixed haircut",
  modelName: "deterministic-ranking-baseline",
  validationWindow: {
    start: "2025-01-01",
    end: "2026-05-21",
  },
  backtestMetrics: {
    totalReturnPct: 9.2,
    benchmarkReturnPct: 7.3,
    maxDrawdownPct: 6.8,
    sharpeRatio: 1.05,
    turnoverPct: 88,
    tradeCount: 19,
  },
  artifactRefs: ["s3://research-runs/rr-baseline-api-1/report.json"],
  artifactHashes: {
    "s3://research-runs/rr-baseline-api-1/report.json": "sha256:baseline",
  },
  knownFailureModes: ["Momentum reversal"],
  brokerExecutionEnabled: false,
  liveTradingEnabled: false,
  createdAt: "2026-05-22T09:00:00.000Z",
  updatedAt: "2026-05-22T09:12:00.000Z",
};

const mockPaperOrderPlans = [
  {
    id: "paper-plan-api-1",
    proposalId: "proposal-api-1",
    researchRunId: "rr-api-1",
    budgetEnvelopeId: "budget-api-1",
    riskEvaluationId: "risk-api-1",
    proposalHash: "sha256:proposal-api",
    riskRequestHash: "sha256:risk-api",
    planHash: "sha256:plan-api",
    idempotencyKey: "paper-api-1",
    status: "filled",
    mode: "paper",
    submittedAt: "2026-05-22T09:05:00.000Z",
    completedAt: "2026-05-22T09:06:00.000Z",
    readinessSnapshot: {
      budgetActive: true,
      latestRiskAllow: true,
      riskMatchesProposal: true,
      paperEngineEnabled: true,
      brokerExecutionDisabled: true,
      liveTradingDisabled: true,
      killSwitchArmed: true,
      killSwitchTripped: false,
      cashSufficient: true,
      positionsSufficient: true,
      noDuplicatePlan: true,
    },
    orders: [
      {
        paperOrderId: "paper-order:api:0",
        proposalOrderIndex: 0,
        symbol: "005930",
        side: "BUY",
        orderType: "MARKET",
        requestedNotional: 500000,
        targetPositionPct: 5,
        marketDataTimestamp: "2026-05-22T09:00:00.000Z",
        feeModelRef: "fixed-10bps-paper-fee-v1",
        slippageModelRef: "fixed-5bps-paper-slippage-v1",
        sourceOrder: {
          symbol: "005930",
          assetClass: "domestic_stock",
          side: "BUY",
          orderType: "MARKET",
          notional: 500000,
          targetPositionPct: 5,
        },
      },
    ],
    fills: [
      {
        paperFillId: "paper-order:api:0:fill:0",
        paperOrderId: "paper-order:api:0",
        timestamp: "2026-05-22T09:05:00.000Z",
        symbol: "005930",
        side: "BUY",
        quantity: 6.80027211,
        fillPrice: 73500,
        grossNotional: 499850,
        requestedNotional: 500000,
        filledNotional: 499850,
        fee: 500,
        feeCurrency: "KRW",
        slippage: 150,
        netCashDelta: -500500,
        positionDelta: 6.80027211,
        status: "filled",
      },
    ],
    portfolioBefore: {
      currency: "KRW",
      equity: 10000000,
      cash: 10000000,
      grossExposurePct: 0,
    },
    portfolioAfter: {
      currency: "KRW",
      equity: 9999850,
      cash: 9500000,
      grossExposurePct: 5,
    },
    cashLedger: [
      {
        paperCashEventId: "paper-order:api:0:fill:0:cash",
        paperFillId: "paper-order:api:0:fill:0",
        timestamp: "2026-05-22T09:05:00.000Z",
        currency: "KRW",
        amount: -500500,
        balanceAfter: 9500000,
        reason: "BUY paper fill net cash delta",
      },
    ],
    positionLedger: [
      {
        paperPositionEventId: "paper-order:api:0:fill:0:position",
        paperFillId: "paper-order:api:0:fill:0",
        timestamp: "2026-05-22T09:05:00.000Z",
        symbol: "005930",
        quantityDelta: 6.80027211,
        notionalDelta: 499850,
        positionNotionalAfter: 499850,
      },
    ],
    startingCash: 10000000,
    endingCash: 9500000,
    startingEquity: 10000000,
    endingEquity: 9999850,
    brokerExecutionEnabled: false,
    liveTradingEnabled: false,
    reconciliation: {
      status: "matched",
      reconciledAt: "2026-05-22T09:06:00.000Z",
      cashMatched: true,
      positionsMatched: true,
      expectedCash: 9500000,
      actualCash: 9500000,
      cashDiff: 0,
      expectedPositions: {
        "005930": 499850,
      },
      actualPositions: {
        "005930": 499850,
      },
      positionDiffs: {
        "005930": 0,
      },
      tolerance: 0.01,
      notes: ["Paper cash ledger matched simulated fills."],
    },
    killSwitchSnapshot: {
      armed: true,
      tripped: false,
      checkedAt: "2026-05-22T09:05:00.000Z",
      reason: "Execution control state is active.",
    },
    blockedReasons: [],
    createdAt: "2026-05-22T09:04:00.000Z",
    updatedAt: "2026-05-22T09:06:30.000Z",
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
    vi.mocked(controlPlaneApi.getPaperOrderPlans).mockResolvedValue(
      mockPaperOrderPlans,
    );
    vi.mocked(controlPlaneApi.runBaselineResearch).mockResolvedValue(
      mockBaselineResearchRun,
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
    expect(
      screen.getAllByText(
        "Paper simulator ledger registered; broker-grade readiness is blocked",
      ).length,
    ).toBeGreaterThanOrEqual(1);

    expect(screen.getByText("Research Run Ledger")).toBeInTheDocument();
    expect(screen.getByText("Live research ledger")).toBeInTheDocument();
    expect(screen.getByText("Baseline research dry-run")).toBeInTheDocument();
    expect(screen.getByText("Run dry-run backtest")).toBeInTheDocument();
    expect(
      screen.getByText("Validate API momentum baseline"),
    ).toBeInTheDocument();
    expect(screen.getByText("Backtest Metrics")).toBeInTheDocument();
    expect(screen.getByText("+12.4%")).toBeInTheDocument();
    expect(screen.getByText("Broker disabled")).toBeInTheDocument();

    expect(screen.getByText("Paper Execution Enclave")).toBeInTheDocument();
    expect(screen.getByText("Live paper plans")).toBeInTheDocument();
    expect(screen.getByText("paper-plan-api-1")).toBeInTheDocument();
    expect(screen.getByText("Proposal proposal-api-1")).toBeInTheDocument();
    expect(screen.getByText("Paper fills")).toBeInTheDocument();
    expect(screen.getByText("Reconciliation")).toBeInTheDocument();
    expect(screen.getByText("Plan hash: sha256:plan-api")).toBeInTheDocument();
    expect(screen.getByText("Expected cash")).toBeInTheDocument();
    expect(
      screen.getByText("Paper cash ledger matched simulated fills."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("brokerExecutionEnabled: false"),
    ).toBeInTheDocument();
  });

  it("should_show_documented_fallback_when_status_api_fails", async () => {
    vi.mocked(riskGateApi.getStatus).mockRejectedValue(new Error("offline"));
    vi.mocked(controlPlaneApi.getStatus).mockRejectedValue(
      new Error("offline"),
    );
    vi.mocked(controlPlaneApi.getResearchRuns).mockRejectedValue(
      new Error("offline"),
    );
    vi.mocked(controlPlaneApi.getPaperOrderPlans).mockRejectedValue(
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
    expect(screen.getByText("Documented sample plans")).toBeInTheDocument();
    expect(
      screen.getByText((content) =>
        content.includes("Paper order-plan API is unavailable"),
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("paper-docs-plan-001")).toBeInTheDocument();
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

  it("should_show_empty_state_when_live_paper_plan_ledger_is_empty", async () => {
    vi.mocked(controlPlaneApi.getPaperOrderPlans).mockResolvedValue([]);

    render(<ControlPlaneDashboard />);

    await waitFor(() => {
      expect(screen.getByText("Live paper plans")).toBeInTheDocument();
    });

    expect(
      screen.getByText("No paper order plans recorded yet."),
    ).toBeInTheDocument();
  });

  it("should_run_baseline_dry_run_backtest_and_add_returned_research_run", async () => {
    render(<ControlPlaneDashboard />);

    await waitFor(() => {
      expect(screen.getByText("Live research ledger")).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Run dry-run backtest" }),
    );

    await waitFor(() => {
      expect(controlPlaneApi.runBaselineResearch).toHaveBeenCalledWith({
        objective: "Run deterministic dry-run momentum baseline backtest",
        strategyFamily: "cross-sectional momentum",
        symbol: "005930",
        benchmark: "KOSPI 200 total return proxy",
        initialCapital: 10000000,
      });
    });

    expect(
      await screen.findByText(
        "Baseline dry-run completed. Returned research run added to the ledger.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Run deterministic dry-run momentum baseline backtest"),
    ).toBeInTheDocument();
    expect(screen.getByText("+9.2%")).toBeInTheDocument();
  });

  it("should_show_failure_when_baseline_dry_run_backtest_fails", async () => {
    vi.mocked(controlPlaneApi.runBaselineResearch).mockRejectedValue(
      new Error("runner failed"),
    );

    render(<ControlPlaneDashboard />);

    await waitFor(() => {
      expect(screen.getByText("Live research ledger")).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Run dry-run backtest" }),
    );

    expect(
      await screen.findByText(
        "Baseline dry-run failed. No broker or live order path was called.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Validate API momentum baseline"),
    ).toBeInTheDocument();
  });
});
