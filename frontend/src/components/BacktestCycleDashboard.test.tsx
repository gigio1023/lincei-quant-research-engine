import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import BacktestCycleDashboard from "./BacktestCycleDashboard";

vi.mock("../services/api", () => ({
  v1PilotApi: {
    getStatus: vi.fn(() =>
      Promise.resolve({
        checkedAt: "2026-05-26T07:12:56.000Z",
        verdict: "blocked",
        leanRun: {
          runId: "qc-import-ecd033aae81e",
          status: "passed",
          projectName: "aggressive_llm_momentum",
        },
        alpha: {
          featureSnapshotCount: 12,
          numericDecisionCount: 12,
          llmDecisionCount: 8,
          metaDecisionCount: 8,
          latestFeatureAsOf: "2025-12-31T16:00:00.000Z",
          latestAlphaAsOf: "2025-12-31T16:00:00.000Z",
          mlModelStatus: "ready",
          mlModelName: "lgbm-baseline",
        },
        portfolioTarget: {
          id: "target-1",
          leanRunId: "qc-import-ecd033aae81e",
          targetCount: 6,
          grossExposurePct: 95,
          maxSingleNamePct: 20,
        },
        paper: {
          planId: 42,
          status: "filled",
          reconciliationStatus: "matched",
          fillCount: 6,
        },
        broker: {
          provider: "toss",
          snapshotStatus: "missing",
          openOrderCount: 0,
        },
        livePilot: { realOrderSent: false },
        preflight: {
          status: "blocked",
          checkedAt: "2026-05-26T07:12:56.000Z",
          maxPilotNotionalUsd: 10,
          broker: "toss",
          blockers: ["Broker writes require a future approved spec."],
          requiredFlags: {},
          openOrderRefs: [],
          credentialMode: "missing",
        },
        stages: [
          {
            key: "lean_backtest",
            label: "LEAN Backtest",
            status: "ready",
            detail: "qc-import-ecd033aae81e / passed",
            blockers: [],
            refs: ["qc-import-ecd033aae81e"],
          },
          {
            key: "live_preflight",
            label: "Live Preflight",
            status: "blocked",
            detail: "blocked",
            blockers: ["Broker writes require a future approved spec."],
            refs: [],
          },
        ],
        nextActions: [
          "Resolve Live Preflight: Broker writes require a future approved spec.",
        ],
      }),
    ),
  },
}));

describe("BacktestCycleDashboard", () => {
  it("renders_backtest_cycle_status_and_runbook", async () => {
    render(<BacktestCycleDashboard />);

    expect(
      screen.getByRole("heading", {
        name: "Backtest-Based Architecture Cycle",
      }),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getAllByText("qc-import-ecd033aae81e").length,
      ).toBeGreaterThan(0);
    });

    expect(
      screen.getAllByText("Cloud/LEAN Backtest Evidence").length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("One-Cycle Runbook")).toBeInTheDocument();
    expect(
      screen.getAllByText("./scripts/run-learning-loop").length,
    ).toBeGreaterThan(0);
  });
});
