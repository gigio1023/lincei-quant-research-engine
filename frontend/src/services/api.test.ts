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
        liveTradingGate: {
          enabled: false,
          mode: "disabled",
          checkedAt: "2026-05-22T09:00:00.000Z",
          orderEndpointImplemented: false,
          brokerWriteEnabled: false,
          killSwitchReady: true,
          credentialCustodyRequired: true,
          blockers: ["Live order endpoint is not implemented"],
          detail: "Live trading gate is disabled.",
        },
        killSwitch: {
          armed: true,
          tripped: false,
          runtimeReady: true,
          executionControlState: "active",
          lastEventId: "execution-control-api-test",
          lastActor: "system",
          lastReason:
            "Default execution-control state for paper simulation only.",
          lastChangedAt: "2026-05-22T09:00:00.000Z",
          brokerExecutionEnabled: false,
          liveTradingEnabled: false,
          detail: "Kill switch is armed; execution control is active.",
        },
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

    it("should_get_action_timeline_with_limit", async () => {
      const mockTimeline = [
        {
          id: "broker_fill:broker-fill-1",
          at: "2026-05-22T09:08:00.000Z",
          severity: "ready",
          category: "broker",
          sourceType: "broker_fill",
          sourceId: "broker-fill-1",
          title: "Broker fill matched",
          detail: "Broker fill matched paper fill report.",
          brokerExecutionEnabled: false,
          liveTradingEnabled: false,
        },
      ];

      mockGet.mockResolvedValue({ data: mockTimeline });

      const { controlPlaneApi } = await import("./api");
      const result = await controlPlaneApi.getActionTimeline(25);

      expect(mockGet).toHaveBeenCalledWith("/control-plane/action-timeline", {
        params: { limit: 25 },
      });
      expect(result).toEqual(mockTimeline);
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

    it("should_import_and_get_market_data_bars", async () => {
      const mockRequest = {
        datasetId: "manual-daily-bars",
        provider: "manual",
        symbol: "005930",
        timeframe: "1d",
        bars: [
          {
            timestamp: "2026-05-20T00:00:00.000Z",
            availabilityTimestamp: "2026-05-20T15:30:00.000Z",
            open: 100,
            high: 103,
            low: 99,
            close: 102,
            volume: 10000,
          },
        ],
      };
      const mockResponse = {
        datasetId: "manual-daily-bars",
        symbol: "005930",
        provider: "manual",
        imported: 1,
        replaced: 0,
        bars: [
          {
            id: 1,
            datasetId: "manual-daily-bars",
            provider: "manual",
            symbol: "005930",
            timeframe: "1d",
            timestamp: "2026-05-20T00:00:00.000Z",
            availabilityTimestamp: "2026-05-20T15:30:00.000Z",
            currency: "KRW",
            open: 100,
            high: 103,
            low: 99,
            close: 102,
            notes: [],
            brokerExecutionEnabled: false,
            liveTradingEnabled: false,
            createdAt: "2026-05-23T00:00:00.000Z",
            updatedAt: "2026-05-23T00:00:00.000Z",
          },
        ],
        brokerExecutionEnabled: false,
        liveTradingEnabled: false,
      };

      mockPost.mockResolvedValueOnce({ data: mockResponse });
      mockGet.mockResolvedValueOnce({ data: mockResponse.bars });

      const { controlPlaneApi } = await import("./api");
      const importResult =
        await controlPlaneApi.importMarketDataBars(mockRequest);
      const barsResult = await controlPlaneApi.getMarketDataBars({
        datasetId: "manual-daily-bars",
        symbol: "005930",
      });

      expect(mockPost).toHaveBeenCalledWith(
        "/control-plane/market-data/bars/import",
        mockRequest,
      );
      expect(mockGet).toHaveBeenCalledWith("/control-plane/market-data/bars", {
        params: { datasetId: "manual-daily-bars", symbol: "005930" },
      });
      expect(importResult).toEqual(mockResponse);
      expect(barsResult).toEqual(mockResponse.bars);
    });

    it("should_get_and_trip_kill_switch", async () => {
      const mockStatus = {
        armed: true,
        tripped: false,
        runtimeReady: true,
        executionControlState: "active",
        lastEventId: "execution-control-api-test",
        lastActor: "system",
        lastReason:
          "Default execution-control state for paper simulation only.",
        lastChangedAt: "2026-05-22T09:00:00.000Z",
        brokerExecutionEnabled: false,
        liveTradingEnabled: false,
        detail: "Kill switch is armed; execution control is active.",
      };
      const mockTripped = {
        ...mockStatus,
        tripped: true,
        executionControlState: "halted",
        lastActor: "dashboard-operator",
        lastReason: "Kill switch trip: Dashboard emergency stop",
      };
      const request = {
        actor: "dashboard-operator",
        reason: "Dashboard emergency stop",
      };

      mockGet.mockResolvedValueOnce({ data: mockStatus });
      mockPost.mockResolvedValueOnce({ data: mockTripped });

      const { controlPlaneApi } = await import("./api");
      const status = await controlPlaneApi.getKillSwitchStatus();
      const tripped = await controlPlaneApi.tripKillSwitch(request);

      expect(mockGet).toHaveBeenCalledWith("/control-plane/kill-switch/status");
      expect(mockPost).toHaveBeenCalledWith(
        "/control-plane/kill-switch/trip",
        request,
      );
      expect(status).toEqual(mockStatus);
      expect(tripped).toEqual(mockTripped);
    });

    it("should_get_market_data_ingestion_status_and_runs", async () => {
      const mockStatus = {
        enabled: false,
        provider: "stooq",
        datasetId: "scheduled-daily-bars",
        symbols: ["005930"],
        benchmark: "KOSPI200",
        timeframe: "1d",
        currency: "KRW",
        lookbackDays: 30,
        cron: "*/30 * * * *",
        running: false,
        brokerExecutionEnabled: false,
        liveTradingEnabled: false,
      };
      const mockRuns = [
        {
          id: "market-data-ingestion-1",
          trigger: "manual",
          status: "skipped",
          provider: "stooq",
          datasetId: "scheduled-daily-bars",
          symbols: ["005930", "KOSPI200"],
          timeframe: "1d",
          currency: "KRW",
          windowStart: "2026-04-23T00:00:00.000Z",
          windowEnd: "2026-05-23T00:00:00.000Z",
          requestHash: "sha256:market-data-ingestion",
          imported: 0,
          replaced: 0,
          importedSymbols: [],
          failedSymbols: [],
          blockedReasons: ["Market data ingestion is disabled"],
          brokerExecutionEnabled: false,
          liveTradingEnabled: false,
          createdAt: "2026-05-23T00:00:00.000Z",
          updatedAt: "2026-05-23T00:00:00.000Z",
        },
      ];
      const mockPollResponse = {
        run: mockRuns[0],
        status: "skipped",
        imported: 0,
        replaced: 0,
        importedSymbols: [],
        failedSymbols: [],
        blockedReasons: ["Market data ingestion is disabled"],
        brokerExecutionEnabled: false,
        liveTradingEnabled: false,
      };

      mockGet.mockResolvedValueOnce({ data: mockStatus });
      mockGet.mockResolvedValueOnce({ data: mockRuns });
      mockPost.mockResolvedValueOnce({ data: mockPollResponse });

      const { controlPlaneApi } = await import("./api");
      const status = await controlPlaneApi.getMarketDataIngestionStatus();
      const runs = await controlPlaneApi.getMarketDataIngestionRuns();
      const poll = await controlPlaneApi.pollMarketDataIngestion();

      expect(mockGet).toHaveBeenCalledWith(
        "/control-plane/market-data/ingestion/status",
      );
      expect(mockGet).toHaveBeenCalledWith(
        "/control-plane/market-data/ingestion-runs",
      );
      expect(mockPost).toHaveBeenCalledWith(
        "/control-plane/market-data/ingestion/poll",
        {},
      );
      expect(status).toEqual(mockStatus);
      expect(runs).toEqual(mockRuns);
      expect(poll).toEqual(mockPollResponse);
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

    it("should_assess_funding_readiness_from_broker_snapshot", async () => {
      const mockFundingReadiness = {
        id: "funding-readiness-1",
        brokerSnapshotId: "broker-snapshot-1",
        status: "ready",
        expectedDepositAmount: 9500000,
        actualBrokerCash: 9500000,
        brokerExecutionEnabled: false,
        liveTradingEnabled: false,
      };
      const request = {
        expectedDepositAmount: 9500000,
        maxAgeMinutes: 60,
        idempotencyKey: "funding-1",
      };

      mockPost.mockResolvedValue({ data: mockFundingReadiness });

      const { controlPlaneApi } = await import("./api");
      const result = await controlPlaneApi.assessFundingReadiness(
        "broker-snapshot-1",
        request,
      );

      expect(mockPost).toHaveBeenCalledWith(
        "/control-plane/broker-snapshots/broker-snapshot-1/assess-funding-readiness",
        request,
      );
      expect(result).toEqual(mockFundingReadiness);
    });

    it("should_get_funding_readiness_records", async () => {
      const mockRecords = [
        {
          id: "funding-readiness-1",
          brokerSnapshotId: "broker-snapshot-1",
          status: "ready",
          expectedDepositAmount: 9500000,
          brokerExecutionEnabled: false,
          liveTradingEnabled: false,
        },
      ];

      mockGet.mockResolvedValue({ data: mockRecords });

      const { controlPlaneApi } = await import("./api");
      const result = await controlPlaneApi.getFundingReadinessRecords();

      expect(mockGet).toHaveBeenCalledWith("/control-plane/funding-readiness");
      expect(result).toEqual(mockRecords);
    });

    it("should_assess_live_pilot_readiness_from_funding_record", async () => {
      const mockReadiness = {
        id: "live-pilot-readiness-1",
        fundingReadinessId: "funding-readiness-1",
        status: "blocked",
        pilotBudgetAmount: 500000,
        brokerExecutionEnabled: false,
        liveTradingEnabled: false,
      };
      const request = {
        pilotBudgetAmount: 500000,
        maxPilotBudgetAmount: 1000000,
        maxSingleOrderNotional: 100000,
        idempotencyKey: "live-pilot-1",
      };

      mockPost.mockResolvedValue({ data: mockReadiness });

      const { controlPlaneApi } = await import("./api");
      const result = await controlPlaneApi.assessLivePilotReadiness(
        "funding-readiness-1",
        request,
      );

      expect(mockPost).toHaveBeenCalledWith(
        "/control-plane/funding-readiness/funding-readiness-1/assess-live-pilot-readiness",
        request,
      );
      expect(result).toEqual(mockReadiness);
    });

    it("should_get_live_pilot_readiness_records", async () => {
      const mockRecords = [
        {
          id: "live-pilot-readiness-1",
          fundingReadinessId: "funding-readiness-1",
          status: "blocked",
          brokerExecutionEnabled: false,
          liveTradingEnabled: false,
        },
      ];

      mockGet.mockResolvedValue({ data: mockRecords });

      const { controlPlaneApi } = await import("./api");
      const result = await controlPlaneApi.getLivePilotReadinessRecords();

      expect(mockGet).toHaveBeenCalledWith(
        "/control-plane/live-pilot-readiness",
      );
      expect(result).toEqual(mockRecords);
    });

    it("should_prepare_broker_order_command_from_paper_plan", async () => {
      const request = {
        livePilotReadinessId: "live-pilot-readiness-1",
        idempotencyKey: "broker-command-1",
        notes: ["review before broker write implementation"],
      };
      const mockCommand = {
        id: "broker-order-command-1",
        paperOrderPlanId: "paper-plan-1",
        commandType: "submit_order_plan",
        status: "blocked",
        mode: "dry_run",
        brokerExecutionEnabled: false,
        liveTradingEnabled: false,
      };

      mockPost.mockResolvedValue({ data: mockCommand });

      const { controlPlaneApi } = await import("./api");
      const result = await controlPlaneApi.prepareBrokerOrderCommand(
        "paper-plan-1",
        request,
      );

      expect(mockPost).toHaveBeenCalledWith(
        "/control-plane/paper-order-plans/paper-plan-1/prepare-broker-order-command",
        request,
      );
      expect(result).toEqual(mockCommand);
    });

    it("should_run_broker_emergency_command_dry_run", async () => {
      const request = {
        commandType: "cancel_open_orders" as const,
        livePilotReadinessId: "live-pilot-readiness-1",
        idempotencyKey: "cancel-dry-run-1",
        reason: "Operator wants to verify emergency controls.",
        notes: ["no broker endpoint called"],
      };
      const mockCommand = {
        id: "broker-order-command-2",
        commandType: "cancel_open_orders",
        status: "blocked",
        mode: "dry_run",
        brokerExecutionEnabled: false,
        liveTradingEnabled: false,
      };

      mockPost.mockResolvedValue({ data: mockCommand });

      const { controlPlaneApi } = await import("./api");
      const result =
        await controlPlaneApi.runBrokerEmergencyCommandDryRun(request);

      expect(mockPost).toHaveBeenCalledWith(
        "/control-plane/broker-order-commands/emergency-dry-run",
        request,
      );
      expect(result).toEqual(mockCommand);
    });

    it("should_get_broker_order_commands", async () => {
      const mockCommands = [
        {
          id: "broker-order-command-1",
          commandType: "submit_order_plan",
          status: "blocked",
          mode: "dry_run",
          brokerExecutionEnabled: false,
          liveTradingEnabled: false,
        },
      ];

      mockGet.mockResolvedValue({ data: mockCommands });

      const { controlPlaneApi } = await import("./api");
      const result = await controlPlaneApi.getBrokerOrderCommands();

      expect(mockGet).toHaveBeenCalledWith(
        "/control-plane/broker-order-commands",
      );
      expect(result).toEqual(mockCommands);
    });

    it("should_import_broker_order_status", async () => {
      const request = {
        provider: "manual" as const,
        brokerOrderRefHash: "sha256:broker-order-open",
        externalStatus: "open" as const,
        symbol: "005930",
        side: "BUY" as const,
        orderType: "MARKET" as const,
        requestedNotional: 140000,
      };
      const mockStatus = {
        id: "broker-order-status-1",
        brokerOrderRefHash: "sha256:broker-order-open",
        externalStatus: "open",
        brokerExecutionEnabled: false,
        liveTradingEnabled: false,
      };

      mockPost.mockResolvedValue({ data: mockStatus });

      const { controlPlaneApi } = await import("./api");
      const result = await controlPlaneApi.importBrokerOrderStatus(request);

      expect(mockPost).toHaveBeenCalledWith(
        "/control-plane/broker-order-statuses/import-read-only",
        request,
      );
      expect(result).toEqual(mockStatus);
    });

    it("should_get_broker_order_statuses", async () => {
      const mockStatuses = [
        {
          id: "broker-order-status-1",
          brokerOrderRefHash: "sha256:broker-order-open",
          externalStatus: "open",
          brokerExecutionEnabled: false,
          liveTradingEnabled: false,
        },
      ];

      mockGet.mockResolvedValue({ data: mockStatuses });

      const { controlPlaneApi } = await import("./api");
      const result = await controlPlaneApi.getBrokerOrderStatuses();

      expect(mockGet).toHaveBeenCalledWith(
        "/control-plane/broker-order-statuses",
      );
      expect(result).toEqual(mockStatuses);
    });

    it("should_get_open_broker_order_statuses", async () => {
      const mockStatuses = [
        {
          id: "broker-order-status-1",
          brokerOrderRefHash: "sha256:broker-order-open",
          externalStatus: "open",
          brokerExecutionEnabled: false,
          liveTradingEnabled: false,
        },
      ];

      mockGet.mockResolvedValue({ data: mockStatuses });

      const { controlPlaneApi } = await import("./api");
      const result = await controlPlaneApi.getOpenBrokerOrderStatuses();

      expect(mockGet).toHaveBeenCalledWith(
        "/control-plane/broker-order-statuses/open",
      );
      expect(result).toEqual(mockStatuses);
    });

    it("should_get_broker_adapter_status", async () => {
      const mockStatus = {
        provider: "toss",
        configured: false,
        readOnlyEnabled: false,
        paperTradingEnabled: false,
        liveTradingEnabled: false,
        authMethod: "oauth2_client_credentials",
        credentialRef: "missing",
        credentialCustody: {
          mode: "missing",
          configured: false,
          productionReady: false,
          secretRef: "missing",
          detail: "External secret custody is required.",
        },
        schemaVerified: false,
        sandboxVerified: false,
        readOnlyPoll: {
          provider: "toss",
          enabled: false,
          configured: false,
          schemaVerified: false,
          canPoll: false,
          baseUrl: "https://openapi.tossinvest.com",
          accountRef: "missing",
          allowedEndpoints: [
            "POST /oauth2/token",
            "GET /api/v1/accounts",
            "GET /v1/holdings",
          ],
          cron: "*/5 * * * *",
          running: false,
          lastReconciliationStatus: "not_checked",
          brokerExecutionEnabled: false,
          liveTradingEnabled: false,
        },
        emergencyControls: {
          runtimeKillSwitchReady: true,
          brokerCancelReady: false,
          brokerFlattenReady: false,
          openOrderPollingReady: false,
          brokerWriteEnabled: false,
          dryRunOnly: true,
          checkedAt: "2026-05-22T09:00:00.000Z",
          blockers: [
            "Broker write access is disabled.",
            "Broker open-order polling is not implemented.",
            "Broker cancel/replace endpoint is not implemented.",
            "Broker flatten-position order path is not implemented.",
            "Emergency broker action reconciliation is not implemented.",
          ],
          detail:
            "Runtime stop can halt autonomous advancement, but broker-order cancel/flatten emergency controls are not implemented.",
        },
        capabilities: [
          {
            key: "orderPlacement",
            status: "blocked",
            detail: "Live order placement is intentionally blocked.",
          },
        ],
        blockers: ["orderPlacement: blocked"],
        brokerExecutionEnabled: false,
      };

      mockGet.mockResolvedValue({ data: mockStatus });

      const { controlPlaneApi } = await import("./api");
      const result = await controlPlaneApi.getBrokerAdapterStatus();

      expect(mockGet).toHaveBeenCalledWith(
        "/control-plane/broker-adapter/status",
      );
      expect(result).toEqual(mockStatus);
    });

    it("should_get_broker_fills", async () => {
      const mockBrokerFills = [
        {
          id: "broker-fill-1",
          provider: "manual",
          brokerFillRefHash: "sha256:fill",
          status: "matched",
          symbol: "005930",
          side: "BUY",
          quantity: 1,
          fillPrice: 50_000,
          grossNotional: 50_000,
          fee: 50,
          feeCurrency: "KRW",
          currency: "KRW",
          filledAt: "2026-05-22T09:00:00.000Z",
          asOf: "2026-05-22T09:00:00.000Z",
          reconciliation: {
            status: "matched",
            checkedAt: "2026-05-22T09:01:00.000Z",
            paperOrderPlanId: "paper-plan-1",
            paperFillId: "paper-order:1:0:fill:0",
            symbolMatched: true,
            sideMatched: true,
            quantityMatched: true,
            notionalMatched: true,
            feeMatched: true,
            brokerQuantity: 1,
            brokerGrossNotional: 50_000,
            brokerFee: 50,
            expectedQuantity: 1,
            expectedGrossNotional: 50_000,
            expectedFee: 50,
            quantityDiff: 0,
            notionalDiff: 0,
            feeDiff: 0,
            tolerance: 0.01,
            notes: [],
          },
          brokerExecutionEnabled: false,
          liveTradingEnabled: false,
          createdAt: "2026-05-22T09:00:00.000Z",
          updatedAt: "2026-05-22T09:00:00.000Z",
        },
      ];

      mockGet.mockResolvedValue({ data: mockBrokerFills });

      const { controlPlaneApi } = await import("./api");
      const result = await controlPlaneApi.getBrokerFills();

      expect(mockGet).toHaveBeenCalledWith("/control-plane/broker-fills");
      expect(result).toEqual(mockBrokerFills);
    });

    it("should_reconcile_broker_fill", async () => {
      const mockBrokerFill = {
        id: "broker-fill-1",
        provider: "manual",
        brokerFillRefHash: "sha256:fill",
        status: "matched",
        symbol: "005930",
        side: "BUY",
        quantity: 1,
        fillPrice: 50_000,
        grossNotional: 50_000,
        fee: 50,
        feeCurrency: "KRW",
        currency: "KRW",
        filledAt: "2026-05-22T09:00:00.000Z",
        asOf: "2026-05-22T09:00:00.000Z",
        reconciliation: {
          status: "matched",
          paperOrderPlanId: "paper-plan-1",
          paperFillId: "paper-order:1:0:fill:0",
          symbolMatched: true,
          sideMatched: true,
          quantityMatched: true,
          notionalMatched: true,
          feeMatched: true,
          brokerQuantity: 1,
          brokerGrossNotional: 50_000,
          brokerFee: 50,
          expectedQuantity: 1,
          expectedGrossNotional: 50_000,
          expectedFee: 50,
          quantityDiff: 0,
          notionalDiff: 0,
          feeDiff: 0,
          tolerance: 0.01,
          notes: ["Broker fill compared against paper fill."],
        },
        brokerExecutionEnabled: false,
        liveTradingEnabled: false,
        createdAt: "2026-05-22T09:00:00.000Z",
        updatedAt: "2026-05-22T09:01:00.000Z",
      };

      mockPost.mockResolvedValue({ data: mockBrokerFill });

      const { controlPlaneApi } = await import("./api");
      const result = await controlPlaneApi.reconcileBrokerFill(
        "broker-fill-1",
        {
          paperOrderPlanId: "paper-plan-1",
          paperFillId: "paper-order:1:0:fill:0",
          tolerance: 0.01,
        },
      );

      expect(mockPost).toHaveBeenCalledWith(
        "/control-plane/broker-fills/broker-fill-1/reconcile-paper",
        {
          paperOrderPlanId: "paper-plan-1",
          paperFillId: "paper-order:1:0:fill:0",
          tolerance: 0.01,
        },
      );
      expect(result).toEqual(mockBrokerFill);
    });

    it("should_poll_broker_read_only_fills", async () => {
      const mockResponse = {
        status: {
          provider: "toss",
          enabled: true,
          configured: true,
          schemaVerified: true,
          fillPollingEnabled: true,
          fillSchemaVerified: true,
          fillPathConfigured: true,
          canPoll: true,
          canPollFills: true,
          baseUrl: "https://openapi.tossinvest.com",
          accountRef: "acc***456",
          allowedEndpoints: ["GET /v1/fills"],
          cron: "*/5 * * * *",
          running: false,
          lastBrokerFillIds: ["broker-fill-1"],
          lastFillCount: 1,
          lastFillReconciliationStatus: "matched",
          brokerExecutionEnabled: false,
          liveTradingEnabled: false,
        },
        fills: [],
      };

      mockPost.mockResolvedValue({ data: mockResponse });

      const { controlPlaneApi } = await import("./api");
      const result = await controlPlaneApi.pollBrokerReadOnlyFills();

      expect(mockPost).toHaveBeenCalledWith(
        "/control-plane/broker-adapter/poll-read-only-fills",
      );
      expect(result).toEqual(mockResponse);
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
          paperAccountId: "paper-account-1",
          paperAccountEventHash: "sha256:account-event",
          paperAccountEventSequence: 2,
          custodyMode: "local_hash_signature",
          signerKeyRef: "local-paper-approval-key-v1",
          canonicalPayloadHash: "sha256:canonical",
          signature: "local-sha256:signature",
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
            paperAccountId: 1,
            paperAccountEventHash: "sha256:account-event",
            paperAccountEventSequence: 2,
            custodyMode: "local_hash_signature",
            signerKeyRef: "local-paper-approval-key-v1",
            canonicalPayloadHash: "sha256:canonical",
            signature: "local-sha256:signature",
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

    it("should_get_autonomous_run_schedule_worker_status", async () => {
      const mockStatus = {
        enabled: true,
        cron: "*/1 * * * *",
        workerId: "unit-worker",
        maxSchedulesPerTick: 5,
        leaseTtlSeconds: 120,
        currentTime: "2026-05-22T09:00:00.000Z",
      };

      mockGet.mockResolvedValue({ data: mockStatus });

      const { controlPlaneApi } = await import("./api");
      const result = await controlPlaneApi.getRunScheduleWorkerStatus();

      expect(mockGet).toHaveBeenCalledWith(
        "/control-plane/run-schedules/worker-status",
      );
      expect(result).toEqual(mockStatus);
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

    it("should_run_recovery_proposal", async () => {
      const mockRequest = {
        paperAccountId: 1,
        budgetEnvelopeId: 2,
        maxPositions: 5,
      };
      const mockResponse = {
        researchRun: {
          id: "rr-recovery-1",
          objective: "Reduce paper account exposure",
          strategyFamily: "paper_recovery",
          status: "proposal_ready",
        },
        proposal: {
          id: "proposal-recovery-1",
          orders: [{ symbol: "005930", side: "SELL", notional: 500000 }],
          brokerExecutionEnabled: false,
        },
        riskEvaluation: {
          id: "risk-recovery-1",
          proposalId: "proposal-recovery-1",
          decision: "REVIEW",
          brokerExecutionEnabled: false,
        },
      };

      mockPost.mockResolvedValue({ data: mockResponse });

      const { controlPlaneApi } = await import("./api");
      const result = await controlPlaneApi.runRecoveryProposal(mockRequest);

      expect(mockPost).toHaveBeenCalledWith(
        "/control-plane/recovery/run-baseline",
        mockRequest,
      );
      expect(result).toEqual(mockResponse);
    });
  });
});
