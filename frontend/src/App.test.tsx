import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import App from "./App";

vi.mock("./services/api", () => ({
  reportsApi: {
    getReports: vi.fn(() =>
      Promise.resolve({
        reports: [],
        total: 0,
        page: 1,
        limit: 10,
      }),
    ),
    getReport: vi.fn(),
    getReportsByDate: vi.fn(),
  },
  riskGateApi: {
    getStatus: vi.fn(() =>
      Promise.resolve({
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
      }),
    ),
  },
  controlPlaneApi: {
    getStatus: vi.fn(() =>
      Promise.resolve({
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
          lastEventId: "execution-control-test",
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
          {
            key: "researchRunLedgerReady",
            ready: true,
            detail: "Research-run ledger exposes reproducible backtest records",
          },
        ],
        blockers: ["No paper execution enclave"],
      }),
    ),
    getBudgets: vi.fn(() => Promise.resolve([])),
    getResearchRuns: vi.fn(() => Promise.resolve([])),
    getProposals: vi.fn(() => Promise.resolve([])),
    getRiskEvaluations: vi.fn(() => Promise.resolve([])),
    getPaperAccount: vi.fn(() => Promise.reject(new Error("not configured"))),
    getPaperAccountEvents: vi.fn(() => Promise.resolve([])),
    getExecutionControl: vi.fn(() =>
      Promise.resolve({
        id: "execution-control-test",
        state: "active",
        actor: "system",
        reason: "Test state",
        createdAt: "2026-05-22T09:00:00.000Z",
      }),
    ),
    tripKillSwitch: vi.fn(() =>
      Promise.resolve({
        armed: true,
        tripped: true,
        runtimeReady: true,
        executionControlState: "halted",
        lastActor: "dashboard-operator",
        lastReason: "Kill switch trip: Dashboard emergency stop",
        lastChangedAt: "2026-05-22T09:00:00.000Z",
        brokerExecutionEnabled: false,
        liveTradingEnabled: false,
        detail: "Kill switch is tripped.",
      }),
    ),
    getPaperOrderPlans: vi.fn(() => Promise.resolve([])),
    getBrokerSnapshots: vi.fn(() => Promise.resolve([])),
    getFundingReadinessRecords: vi.fn(() => Promise.resolve([])),
    getLivePilotReadinessRecords: vi.fn(() => Promise.resolve([])),
    getBrokerOrderCommands: vi.fn(() => Promise.resolve([])),
    getBrokerOrderStatuses: vi.fn(() => Promise.resolve([])),
    getBrokerFills: vi.fn(() => Promise.resolve([])),
    reconcileBrokerFill: vi.fn(() => Promise.resolve({})),
    pollBrokerReadOnlyFills: vi.fn(() =>
      Promise.resolve({
        status: {
          provider: "toss",
          enabled: false,
          configured: false,
          schemaVerified: false,
          canPoll: false,
          canPollFills: false,
          baseUrl: "https://openapi.tossinvest.com",
          accountRef: "missing",
          allowedEndpoints: [],
          cron: "*/5 * * * *",
          running: false,
          brokerExecutionEnabled: false,
          liveTradingEnabled: false,
        },
        fills: [],
      }),
    ),
    getBrokerAdapterStatus: vi.fn(() =>
      Promise.resolve({
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
          fillPollingEnabled: false,
          fillSchemaVerified: false,
          fillPathConfigured: false,
          canPoll: false,
          canPollFills: false,
          baseUrl: "https://openapi.tossinvest.com",
          accountRef: "missing",
          allowedEndpoints: [],
          cron: "*/5 * * * *",
          running: false,
          lastFillCount: 0,
          lastReconciliationStatus: "not_checked",
          lastFillReconciliationStatus: "not_checked",
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
        capabilities: [],
        blockers: [],
        brokerExecutionEnabled: false,
      }),
    ),
    getOrderPlanApprovals: vi.fn(() => Promise.resolve([])),
    getMarketDataIngestionStatus: vi.fn(() =>
      Promise.resolve({
        enabled: false,
        running: false,
        cron: "0 6 * * *",
        provider: "stooq",
        datasetId: "scheduled-daily-bars",
        symbols: [],
        timeframe: "1d",
        currency: "KRW",
        windowDays: 30,
        lastRun: null,
        brokerExecutionEnabled: false,
        liveTradingEnabled: false,
      }),
    ),
    getMarketDataIngestionRuns: vi.fn(() => Promise.resolve([])),
    getRuns: vi.fn(() => Promise.resolve([])),
    getRunSchedules: vi.fn(() => Promise.resolve([])),
    getRunScheduleWorkerStatus: vi.fn(() =>
      Promise.resolve({
        enabled: false,
        cron: "*/1 * * * *",
        workerId: "test-worker",
        maxSchedulesPerTick: 5,
        leaseTtlSeconds: 120,
        currentTime: "2026-05-22T09:00:00.000Z",
      }),
    ),
    getActionTimeline: vi.fn(() => Promise.resolve([])),
    runBaselineResearch: vi.fn(),
    runRecoveryProposal: vi.fn(),
    advanceRun: vi.fn(),
    tickRunSchedule: vi.fn(),
  },
  v1PilotApi: {
    getStatus: vi.fn(() =>
      Promise.resolve({
        checkedAt: "2026-05-22T09:00:00.000Z",
        verdict: "blocked",
        leanRun: null,
        alpha: {
          featureSnapshotCount: 0,
          numericDecisionCount: 0,
          llmDecisionCount: 0,
          metaDecisionCount: 0,
          mlModelStatus: "not_promoted",
        },
        portfolioTarget: { targetCount: 0 },
        paper: { status: "missing", fillCount: 0 },
        broker: { snapshotStatus: "missing", openOrderCount: 0 },
        livePilot: { realOrderSent: false },
        preflight: {
          status: "blocked",
          checkedAt: "2026-05-22T09:00:00.000Z",
          maxPilotNotionalUsd: 10,
          broker: "toss",
          blockers: ["Test preflight blocked."],
          requiredFlags: {},
          openOrderRefs: [],
          credentialMode: "missing",
        },
        stages: [
          {
            key: "live_preflight",
            label: "Live Preflight",
            status: "blocked",
            detail: "blocked",
            blockers: ["Test preflight blocked."],
            refs: [],
          },
        ],
        nextActions: ["Resolve Live Preflight: Test preflight blocked."],
      }),
    ),
    listLeanRuns: vi.fn(() => Promise.resolve([])),
  },
}));

describe("App", () => {
  it("should_render_without_crashing", async () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );
    expect(document.body).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByText("선택한 필터에 해당하는 리포트가 없습니다."),
      ).toBeInTheDocument();
    });
  });

  it("should_render_main_container", async () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );
    expect(document.querySelector(".min-h-screen")).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByText("선택한 필터에 해당하는 리포트가 없습니다."),
      ).toBeInTheDocument();
    });
  });

  it("should_render_control_plane_route", async () => {
    render(
      <MemoryRouter initialEntries={["/control-plane"]}>
        <App />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: "Control Plane Dashboard" }),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Live API status")).toBeInTheDocument();
    });
  });
});
