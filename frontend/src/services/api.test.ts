import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";

// Mock the entire axios module
vi.mock("axios", () => ({
  default: {
    create: vi.fn(() => ({
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    })),
  },
}));

const mockedAxios = vi.mocked(axios);
const mockGet = vi.fn();
const mockPost = vi.fn();

describe("API Service", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockedAxios.create.mockReturnValue({
      get: mockGet,
      post: mockPost,
      put: vi.fn(),
      delete: vi.fn(),
    } as never);
  });

  describe("reportsApi", () => {
    it("should_create_axios_instance", async () => {
      // Import after mocking
      await import("./api");

      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: "http://localhost:3001",
        timeout: 10000,
      });
    });

    it("should_get_reports_with_pagination", async () => {
      const mockResponse = {
        data: {
          reports: [],
          total: 0,
          page: 1,
          limit: 10,
        },
      };

      mockGet.mockResolvedValue(mockResponse);

      // Import after mocking
      const { reportsApi } = await import("./api");
      const result = await reportsApi.getReports(1, 10);

      expect(mockGet).toHaveBeenCalledWith("/reports?page=1&limit=10");
      expect(result).toEqual(mockResponse.data);
    });

    it("should_get_single_report_by_id", async () => {
      const mockReport = {
        id: 1,
        title: "Test Report",
        content: "Test content",
        summary: "Test summary",
        reportType: "morning" as const,
        createdAt: "2025-06-24T00:00:00Z",
        updatedAt: "2025-06-24T00:00:00Z",
      };

      mockGet.mockResolvedValue({ data: mockReport });

      // Import after mocking
      const { reportsApi } = await import("./api");
      const result = await reportsApi.getReport(1);

      expect(mockGet).toHaveBeenCalledWith("/reports/1");
      expect(result).toEqual(mockReport);
    });
  });

  describe("riskGateApi", () => {
    it("should_get_risk_gate_status", async () => {
      const mockStatus = {
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

      mockGet.mockResolvedValue({ data: mockStatus });

      const { riskGateApi } = await import("./api");
      const result = await riskGateApi.getStatus();

      expect(mockGet).toHaveBeenCalledWith("/risk-gate/status");
      expect(result).toEqual(mockStatus);
    });
  });

  describe("controlPlaneApi", () => {
    it("should_get_control_plane_status", async () => {
      const mockStatus = {
        brokerExecutionEnabled: false,
        liveTradingReady: false,
        readiness: [
          {
            key: "riskGateReady",
            ready: true,
            detail: "Deterministic risk gate is registered",
          },
        ],
        blockers: ["No paper execution enclave"],
      };

      mockGet.mockResolvedValue({ data: mockStatus });

      const { controlPlaneApi } = await import("./api");
      const result = await controlPlaneApi.getStatus();

      expect(mockGet).toHaveBeenCalledWith("/control-plane/status");
      expect(result).toEqual(mockStatus);
    });

    it("should_get_budgets", async () => {
      const mockBudgets = [
        {
          id: "budget-1",
          name: "Dry-run budget",
          status: "active",
          mode: "dry_run",
          currency: "KRW",
          totalBudget: 10000000,
          cashReservePct: 20,
          allowedAssetClasses: ["cash", "domestic_stock"],
          policy: {
            maxGrossExposurePct: 100,
            maxSinglePositionPct: 20,
            maxOrderNotional: 1000000,
            maxDailyLossPct: 3,
            maxDrawdownPct: 10,
            maxDataAgeMinutes: 60,
            allowedAssetClasses: ["cash", "domestic_stock"],
            allowLiveTrading: false,
            requireHumanApproval: true,
          },
          brokerExecutionEnabled: false,
          liveTradingEnabled: false,
          createdAt: "2026-05-22T09:00:00.000Z",
          updatedAt: "2026-05-22T09:00:00.000Z",
        },
      ];

      mockGet.mockResolvedValue({ data: mockBudgets });

      const { controlPlaneApi } = await import("./api");
      const result = await controlPlaneApi.getBudgets();

      expect(mockGet).toHaveBeenCalledWith("/control-plane/budgets");
      expect(result).toEqual(mockBudgets);
    });

    it("should_get_research_runs", async () => {
      const mockResearchRuns = [
        {
          id: "rr-1",
          objective: "Validate a dry-run momentum baseline",
          strategyFamily: "cross-sectional momentum",
          hypothesis: "Momentum outperforms the benchmark after costs.",
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
          featureRefs: ["return_60d"],
          timestampLagRules: [
            "Signals use data available before proposal time.",
          ],
          noLookaheadChecked: true,
          benchmark: "KOSPI 200",
          costModel: "10 bps per side",
          slippageModel: "5 bps fixed haircut",
          validationWindow: {
            start: "2025-01-01",
            end: "2026-05-21",
          },
          backtestMetrics: {
            totalReturnPct: 11.8,
            benchmarkReturnPct: 7.2,
            maxDrawdownPct: 8.9,
            sharpeRatio: 1.14,
            turnoverPct: 138,
            tradeCount: 42,
          },
          artifactRefs: ["s3://research-runs/rr-1/report.json"],
          artifactHashes: {
            "s3://research-runs/rr-1/report.json": "sha256:test",
          },
          knownFailureModes: ["Momentum reversal"],
          brokerExecutionEnabled: false,
          liveTradingEnabled: false,
          createdAt: "2026-05-22T08:30:00.000Z",
          updatedAt: "2026-05-22T08:42:00.000Z",
        },
      ];

      mockGet.mockResolvedValue({ data: mockResearchRuns });

      const { controlPlaneApi } = await import("./api");
      const result = await controlPlaneApi.getResearchRuns();

      expect(mockGet).toHaveBeenCalledWith("/control-plane/research-runs");
      expect(result).toEqual(mockResearchRuns);
    });

    it("should_get_proposals", async () => {
      const mockProposals = [
        {
          id: "proposal-1",
          budgetEnvelopeId: "budget-1",
          researchRunId: "rr-1",
          strategyId: "momentum-v1",
          ruleId: "long-only-breakout",
          actor: "strategy",
          status: "paper_ready",
          generatedAt: "2026-05-22T09:00:00.000Z",
          marketDataTimestamp: "2026-05-22T08:55:00.000Z",
          portfolioSnapshot: {
            currency: "KRW",
            equity: 10000000,
            cash: 10000000,
            grossExposurePct: 0,
          },
          orders: [],
          brokerExecutionEnabled: false,
          requiresHumanApproval: false,
          createdAt: "2026-05-22T09:00:00.000Z",
          updatedAt: "2026-05-22T09:00:00.000Z",
        },
      ];

      mockGet.mockResolvedValue({ data: mockProposals });

      const { controlPlaneApi } = await import("./api");
      const result = await controlPlaneApi.getProposals();

      expect(mockGet).toHaveBeenCalledWith("/control-plane/proposals");
      expect(result).toEqual(mockProposals);
    });

    it("should_get_risk_evaluations", async () => {
      const mockRiskEvaluations = [
        {
          id: "risk-1",
          proposalId: "proposal-1",
          decision: "ALLOW",
          reasons: ["Inside limits."],
          requestSnapshot: {
            mode: "paper",
            actor: "strategy",
            generatedAt: "2026-05-22T09:00:00.000Z",
            portfolio: {
              currency: "KRW",
              equity: 10000000,
              cash: 10000000,
              grossExposurePct: 0,
            },
            orders: [],
          },
          responseSnapshot: {
            decision: "ALLOW",
            evaluatedAt: "2026-05-22T09:01:00.000Z",
            mode: "paper",
            brokerExecutionEnabled: false,
            requiresHumanApproval: false,
            reasons: ["Inside limits."],
            policy: {
              maxGrossExposurePct: 100,
              maxSinglePositionPct: 20,
              maxOrderNotional: 1000000,
              maxDailyLossPct: 3,
              maxDrawdownPct: 10,
              maxDataAgeMinutes: 60,
              allowedAssetClasses: ["cash", "domestic_stock"],
              allowLiveTrading: false,
              requireHumanApproval: true,
            },
            approvedOrderCount: 1,
          },
          brokerExecutionEnabled: false,
          requiresHumanApproval: false,
          evaluatedAt: "2026-05-22T09:01:00.000Z",
          createdAt: "2026-05-22T09:01:00.000Z",
        },
      ];

      mockGet.mockResolvedValue({ data: mockRiskEvaluations });

      const { controlPlaneApi } = await import("./api");
      const result = await controlPlaneApi.getRiskEvaluations();

      expect(mockGet).toHaveBeenCalledWith("/control-plane/risk-evaluations");
      expect(result).toEqual(mockRiskEvaluations);
    });

    it("should_get_paper_order_plans", async () => {
      const mockPaperOrderPlans = [
        {
          id: "paper-plan-1",
          proposalId: "proposal-1",
          researchRunId: "rr-1",
          budgetEnvelopeId: "budget-1",
          status: "completed",
          mode: "paper",
          submittedAt: "2026-05-22T09:05:00.000Z",
          completedAt: "2026-05-22T09:06:00.000Z",
          orders: [
            {
              symbol: "005930",
              assetClass: "domestic_stock",
              side: "BUY",
              orderType: "MARKET",
              notional: 500000,
            },
          ],
          fills: [
            {
              symbol: "005930",
              side: "BUY",
              requestedNotional: 500000,
              filledNotional: 499850,
              fillPrice: 73500,
              fee: 500,
              slippage: 150,
              status: "filled",
            },
          ],
          startingCash: 10000000,
          endingCash: 9500000,
          startingEquity: 10000000,
          endingEquity: 9999850,
          brokerExecutionEnabled: false,
          liveTradingEnabled: false,
          reconciliation: {
            cashMatched: true,
            positionsMatched: true,
            notes: ["Paper cash ledger matched simulated fills."],
          },
          blockedReasons: [],
          createdAt: "2026-05-22T09:04:00.000Z",
          updatedAt: "2026-05-22T09:06:30.000Z",
        },
      ];

      mockGet.mockResolvedValue({ data: mockPaperOrderPlans });

      const { controlPlaneApi } = await import("./api");
      const result = await controlPlaneApi.getPaperOrderPlans();

      expect(mockGet).toHaveBeenCalledWith("/control-plane/paper-order-plans");
      expect(result).toEqual(mockPaperOrderPlans);
    });

    it("should_get_paper_account", async () => {
      const mockPaperAccount = {
        id: "paper-account-1",
        name: "Paper account",
        status: "active",
        currency: "KRW",
        cash: 9499250,
        equity: 9999250,
        grossExposurePct: 5,
        positions: [],
        cashLedger: [],
        positionLedger: [],
        appliedPlanIds: ["paper-plan-1"],
        brokerExecutionEnabled: false,
        liveTradingEnabled: false,
        createdAt: "2026-05-22T09:00:00.000Z",
        updatedAt: "2026-05-22T09:05:00.000Z",
      };

      mockGet.mockResolvedValue({ data: mockPaperAccount });

      const { controlPlaneApi } = await import("./api");
      const result = await controlPlaneApi.getPaperAccount();

      expect(mockGet).toHaveBeenCalledWith("/control-plane/paper-account");
      expect(result).toEqual(mockPaperAccount);
    });

    it("should_get_paper_account_events", async () => {
      const mockPaperAccountEvents = [
        {
          id: "paper-account-event-1",
          paperAccountId: "paper-account-1",
          eventType: "explicit_seed",
          idempotencyKey: "seed-1",
          actor: "operator",
          reason: "Seed account.",
          sequence: 1,
          currency: "KRW",
          cashBefore: 0,
          cashAfter: 10000000,
          equityBefore: 0,
          equityAfter: 10000000,
          cashDelta: 10000000,
          equityDelta: 10000000,
          requestHash: "sha256:request",
          eventHash: "sha256:event",
          eventSnapshot: {
            paperAccountId: 1,
            eventType: "explicit_seed",
            idempotencyKey: "seed-1",
            actor: "operator",
            reason: "Seed account.",
            sequence: 1,
            currency: "KRW",
            cashBefore: 0,
            cashAfter: 10000000,
            equityBefore: 0,
            equityAfter: 10000000,
            positionsBefore: [],
            positionsAfter: [],
            requestHash: "sha256:request",
            recordedAt: "2026-05-22T09:00:00.000Z",
          },
          brokerExecutionEnabled: false,
          liveTradingEnabled: false,
          createdAt: "2026-05-22T09:00:00.000Z",
        },
      ];

      mockGet.mockResolvedValue({ data: mockPaperAccountEvents });

      const { controlPlaneApi } = await import("./api");
      const result = await controlPlaneApi.getPaperAccountEvents();

      expect(mockGet).toHaveBeenCalledWith(
        "/control-plane/paper-account/events",
      );
      expect(result).toEqual(mockPaperAccountEvents);
    });

    it("should_get_broker_snapshots", async () => {
      const mockBrokerSnapshots = [
        {
          id: "broker-snapshot-1",
          provider: "manual",
          status: "matched",
          currency: "KRW",
          cash: 9499250,
          equity: 9999250,
          grossExposurePct: 5,
          positions: [],
          asOf: "2026-05-22T09:00:00.000Z",
          reconciliation: {
            status: "matched",
            cashMatched: true,
            equityMatched: true,
            positionsMatched: true,
            actualBrokerCash: 9499250,
            actualBrokerEquity: 9999250,
            actualBrokerPositions: {},
            tolerance: 0.01,
            maxAgeMinutes: 60,
            notes: [],
          },
          brokerExecutionEnabled: false,
          liveTradingEnabled: false,
          createdAt: "2026-05-22T09:00:00.000Z",
          updatedAt: "2026-05-22T09:05:00.000Z",
        },
      ];

      mockGet.mockResolvedValue({ data: mockBrokerSnapshots });

      const { controlPlaneApi } = await import("./api");
      const result = await controlPlaneApi.getBrokerSnapshots();

      expect(mockGet).toHaveBeenCalledWith("/control-plane/broker-snapshots");
      expect(result).toEqual(mockBrokerSnapshots);
    });

    it("should_get_order_plan_approvals", async () => {
      const mockApprovals = [
        {
          id: "approval-1",
          proposalId: "proposal-1",
          riskEvaluationId: "risk-1",
          idempotencyKey: "paper-1",
          mode: "paper",
          approver: "operator",
          reason: "Approve paper plan.",
          status: "active",
          proposalHash: "sha256:proposal",
          riskRequestHash: "sha256:risk",
          approvalHash: "sha256:approval",
          approvalSnapshot: {
            proposalId: 1,
            riskEvaluationId: 1,
            mode: "paper",
            approver: "operator",
            reason: "Approve paper plan.",
            idempotencyKey: "paper-1",
            approvedOrderCount: 1,
            approvedAt: "2026-05-22T09:00:00.000Z",
            proposalHash: "sha256:proposal",
            riskRequestHash: "sha256:risk",
          },
          approvedAt: "2026-05-22T09:00:00.000Z",
          brokerExecutionEnabled: false,
          liveTradingEnabled: false,
          createdAt: "2026-05-22T09:00:00.000Z",
          updatedAt: "2026-05-22T09:00:00.000Z",
        },
      ];

      mockGet.mockResolvedValue({ data: mockApprovals });

      const { controlPlaneApi } = await import("./api");
      const result = await controlPlaneApi.getOrderPlanApprovals();

      expect(mockGet).toHaveBeenCalledWith(
        "/control-plane/order-plan-approvals",
      );
      expect(result).toEqual(mockApprovals);
    });

    it("should_get_execution_control", async () => {
      const mockExecutionControl = {
        id: "execution-control-1",
        state: "active",
        actor: "system",
        reason: "Default execution-control state.",
        createdAt: "2026-05-22T09:00:00.000Z",
      };

      mockGet.mockResolvedValue({ data: mockExecutionControl });

      const { controlPlaneApi } = await import("./api");
      const result = await controlPlaneApi.getExecutionControl();

      expect(mockGet).toHaveBeenCalledWith("/control-plane/execution-control");
      expect(result).toEqual(mockExecutionControl);
    });

    it("should_get_autonomous_runs", async () => {
      const mockRuns = [
        {
          id: "run-1",
          objective: "Autonomously prepare a paper allocation",
          status: "risk_checked",
          currentStage: "risk_evaluated",
          budgetEnvelopeId: "budget-1",
          researchRunId: "rr-1",
          proposalId: "proposal-1",
          riskEvaluationId: "risk-1",
          timeline: [
            {
              at: "2026-05-22T09:00:00.000Z",
              stage: "risk_checked",
              message: "Risk evaluation returned ALLOW.",
            },
          ],
          lastAction: "Risk evaluation returned ALLOW",
          nextAction: "Wait for signed paper approval.",
          createdAt: "2026-05-22T08:55:00.000Z",
          updatedAt: "2026-05-22T09:00:00.000Z",
        },
      ];

      mockGet.mockResolvedValue({ data: mockRuns });

      const { controlPlaneApi } = await import("./api");
      const result = await controlPlaneApi.getRuns();

      expect(mockGet).toHaveBeenCalledWith("/control-plane/runs");
      expect(result).toEqual(mockRuns);
    });

    it("should_get_autonomous_run_schedules", async () => {
      const mockSchedules = [
        {
          id: "schedule-1",
          budgetEnvelopeId: "budget-1",
          objective: "Run scheduled autonomous paper allocation",
          mode: "dry_run",
          cadenceMinutes: 60,
          nextRunAt: "2026-05-22T10:00:00.000Z",
          enabled: true,
          attemptPaperExecution: false,
          lastRunId: "run-1",
          lastCycleKey: "schedule:1:2026-05-22T09:00:00.000Z",
          lastTickAt: "2026-05-22T09:00:00.000Z",
          leaseOwner: null,
          leaseExpiresAt: null,
          lastError: null,
          brokerExecutionEnabled: false,
          liveTradingEnabled: false,
          createdAt: "2026-05-22T08:55:00.000Z",
          updatedAt: "2026-05-22T09:00:00.000Z",
        },
      ];

      mockGet.mockResolvedValue({ data: mockSchedules });

      const { controlPlaneApi } = await import("./api");
      const result = await controlPlaneApi.getRunSchedules();

      expect(mockGet).toHaveBeenCalledWith("/control-plane/run-schedules");
      expect(result).toEqual(mockSchedules);
    });

    it("should_tick_autonomous_run_schedule", async () => {
      const mockRun = {
        id: "run-1",
        objective: "Autonomously prepare a paper allocation",
        status: "risk_checked",
        currentStage: "risk_evaluated",
        scheduleId: "schedule-1",
        cycleKey: "schedule:1:2026-05-22T09:00:00.000Z",
        timeline: [],
        createdAt: "2026-05-22T08:55:00.000Z",
        updatedAt: "2026-05-22T09:00:00.000Z",
      };

      mockPost.mockResolvedValue({ data: mockRun });

      const { controlPlaneApi } = await import("./api");
      const result = await controlPlaneApi.tickRunSchedule("schedule-1", {
        leaseOwner: "browser",
        attemptPaperExecution: false,
      });

      expect(mockPost).toHaveBeenCalledWith(
        "/control-plane/run-schedules/schedule-1/tick",
        {
          leaseOwner: "browser",
          attemptPaperExecution: false,
        },
      );
      expect(result).toEqual(mockRun);
    });

    it("should_advance_autonomous_run", async () => {
      const mockRun = {
        id: "run-1",
        objective: "Autonomously prepare a paper allocation",
        status: "risk_checked",
        currentStage: "risk_evaluated",
        timeline: [],
        createdAt: "2026-05-22T08:55:00.000Z",
        updatedAt: "2026-05-22T09:00:00.000Z",
      };

      mockPost.mockResolvedValue({ data: mockRun });

      const { controlPlaneApi } = await import("./api");
      const result = await controlPlaneApi.advanceRun("run-1", {
        attemptPaperExecution: false,
      });

      expect(mockPost).toHaveBeenCalledWith(
        "/control-plane/runs/run-1/advance",
        {
          attemptPaperExecution: false,
        },
      );
      expect(result).toEqual(mockRun);
    });

    it("should_execute_proposal_paper", async () => {
      const mockPaperOrderPlan = {
        id: "paper-plan-1",
        proposalId: "proposal-1",
        status: "submitted",
        mode: "paper",
        submittedAt: "2026-05-22T09:05:00.000Z",
        orders: [],
        fills: [],
        startingCash: 10000000,
        endingCash: 10000000,
        startingEquity: 10000000,
        endingEquity: 10000000,
        brokerExecutionEnabled: false,
        liveTradingEnabled: false,
        reconciliation: {
          cashMatched: true,
          positionsMatched: true,
          notes: [],
        },
        blockedReasons: [],
        createdAt: "2026-05-22T09:04:00.000Z",
        updatedAt: "2026-05-22T09:05:00.000Z",
      };

      mockPost.mockResolvedValue({ data: mockPaperOrderPlan });

      const { controlPlaneApi } = await import("./api");
      const result = await controlPlaneApi.executeProposalPaper("proposal-1");

      expect(mockPost).toHaveBeenCalledWith(
        "/control-plane/proposals/proposal-1/paper-execute",
        {},
      );
      expect(result).toEqual(mockPaperOrderPlan);
    });

    it("should_run_baseline_research", async () => {
      const mockRequest = {
        objective: "Run deterministic dry-run momentum baseline",
        strategyFamily: "cross-sectional momentum",
        symbol: "005930",
        benchmark: "KOSPI 200",
        initialCapital: 10000000,
      };
      const mockResearchRun = {
        id: "rr-baseline-1",
        objective: mockRequest.objective,
        strategyFamily: mockRequest.strategyFamily,
        hypothesis: "Deterministic baseline evaluates historical data only.",
        status: "proposal_ready",
        datasetRefs: [],
        featureRefs: [],
        benchmark: mockRequest.benchmark,
        costModel: "10 bps per side",
        slippageModel: "5 bps fixed haircut",
        validationWindow: "2025-01-01..2026-05-21",
        backtestMetrics: {
          totalReturnPct: 10,
          benchmarkReturnPct: 8,
          maxDrawdownPct: 6,
          sharpeRatio: 1.1,
          turnoverPct: 50,
          tradeCount: 12,
        },
        artifactRefs: [],
        knownFailureModes: [],
        brokerExecutionEnabled: false,
        liveTradingEnabled: false,
        createdAt: "2026-05-22T08:30:00.000Z",
        updatedAt: "2026-05-22T08:42:00.000Z",
      };

      mockPost.mockResolvedValue({ data: mockResearchRun });

      const { controlPlaneApi } = await import("./api");
      const result = await controlPlaneApi.runBaselineResearch(mockRequest);

      expect(mockPost).toHaveBeenCalledWith(
        "/control-plane/research-runs/run-baseline",
        mockRequest,
      );
      expect(result).toEqual(mockResearchRun);
    });
  });
});
