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
    getResearchRuns: vi.fn(() => Promise.resolve([])),
    getPaperAccount: vi.fn(() => Promise.reject(new Error("not configured"))),
    getExecutionControl: vi.fn(() =>
      Promise.resolve({
        id: "execution-control-test",
        state: "active",
        actor: "system",
        reason: "Test state",
        createdAt: "2026-05-22T09:00:00.000Z",
      }),
    ),
    getPaperOrderPlans: vi.fn(() => Promise.resolve([])),
    getBrokerSnapshots: vi.fn(() => Promise.resolve([])),
    getOrderPlanApprovals: vi.fn(() => Promise.resolve([])),
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
