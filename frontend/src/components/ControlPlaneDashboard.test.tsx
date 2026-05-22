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
      key: "paperExecutionReady",
      ready: false,
      detail: "Paper execution enclave is not implemented",
    },
  ],
  blockers: ["No paper execution enclave"],
};

describe("ControlPlaneDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(riskGateApi.getStatus).mockResolvedValue(mockRiskGateStatus);
    vi.mocked(controlPlaneApi.getStatus).mockResolvedValue(
      mockControlPlaneStatus,
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
    expect(screen.getByText("No paper execution enclave")).toBeInTheDocument();
  });

  it("should_show_documented_fallback_when_status_api_fails", async () => {
    vi.mocked(riskGateApi.getStatus).mockRejectedValue(new Error("offline"));
    vi.mocked(controlPlaneApi.getStatus).mockRejectedValue(
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
  });
});
