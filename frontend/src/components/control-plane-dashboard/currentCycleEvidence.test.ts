import { describe, expect, it } from "vitest";
import { buildCurrentCycleEvidence } from "./currentCycleEvidence";

type CurrentCycleEvidenceInput = Parameters<
  typeof buildCurrentCycleEvidence
>[0];

const baseInput = {
  runs: [
    {
      id: "run-1",
      scheduleId: "schedule-1",
      cycleKey: "schedule:schedule-1:2026-05-22T09:00:00.000Z",
      researchRunId: "research-1",
      proposalId: "proposal-1",
      riskEvaluationId: "risk-1",
      paperOrderPlanId: "paper-1",
      status: "paper_ready",
      nextAction: "Reconcile paper order plan and broker read-only snapshot",
      updatedAt: "2026-05-22T09:10:00.000Z",
    },
  ],
  schedules: [
    {
      id: "schedule-1",
      mode: "paper",
      researchDatasetId: "api-daily-bars",
      researchSymbol: "005930",
      researchBenchmark: "KOSPI200",
      researchMaxDataAgeMinutes: 30,
      lastCycleKey: "schedule:schedule-1:2026-05-22T09:00:00.000Z",
      updatedAt: "2026-05-22T09:10:00.000Z",
    },
  ],
  researchRuns: [
    {
      id: "research-1",
      strategyFamily: "momentum",
      datasetRefs: [
        {
          id: "api-daily-bars",
          availabilityTimestamp: "2026-05-22T08:55:00.000Z",
          marketDataTimestamp: "2026-05-22T08:55:00.000Z",
          universe: ["005930", "KOSPI200"],
        },
      ],
      updatedAt: "2026-05-22T09:01:00.000Z",
    },
  ],
  proposals: [
    {
      id: "proposal-1",
      researchRunId: "research-1",
      ruleId: "budget-capped-single-position-v1",
      updatedAt: "2026-05-22T09:02:00.000Z",
    },
  ],
  riskEvaluations: [
    {
      id: "risk-1",
      proposalId: "proposal-1",
      decision: "ALLOW",
      evaluatedAt: "2026-05-22T09:03:00.000Z",
    },
  ],
  approvals: [
    {
      id: "approval-1",
      proposalId: "proposal-1",
      approvalSource: "paper_auto",
      status: "consumed",
      autoApprovalPolicyRef: "sha256:auto-policy",
      consumedByPaperOrderPlanId: "paper-1",
      updatedAt: "2026-05-22T09:04:00.000Z",
    },
  ],
  paperPlans: [
    {
      id: "paper-1",
      proposalId: "proposal-1",
      status: "filled",
      orders: [{}],
      fills: [{}],
      reconciliation: { status: "not_checked" },
      readinessSnapshot: {
        currentPaperAccountEventHash: "sha256:event",
        paperAccountEventSequence: 3,
      },
      updatedAt: "2026-05-22T09:05:00.000Z",
    },
  ],
  paperAccount: {
    positions: [],
  },
  workerStatus: {
    enabled: true,
    currentTime: "2026-05-22T09:10:00.000Z",
    lastResult: {
      ticked: 1,
      failed: 0,
    },
  },
} as unknown as CurrentCycleEvidenceInput;

describe("buildCurrentCycleEvidence", () => {
  it("summarizes a fresh auto-approved paper cycle", () => {
    const evidence = buildCurrentCycleEvidence(baseInput);

    expect(evidence.freshness).toBe("fresh");
    expect(evidence.datasetId).toBe("api-daily-bars");
    expect(evidence.approval.source).toBe("paper_auto");
    expect(evidence.paper.status).toBe("filled");
    expect(evidence.recoveryState).toBe("not_needed");
  });

  it("marks stale data and exposes recovery availability", () => {
    const evidence = buildCurrentCycleEvidence({
      ...baseInput,
      researchRuns: [
        {
          ...baseInput.researchRuns[0],
          datasetRefs: [
            {
              ...baseInput.researchRuns[0].datasetRefs[0],
              availabilityTimestamp: "2026-05-22T07:00:00.000Z",
            },
          ],
        },
      ],
      paperAccount: {
        positions: [
          {
            symbol: "005930",
            marketValue: 1_000_000,
          },
        ],
      },
      proposals: [],
      approvals: [],
      paperPlans: [],
    } as unknown as CurrentCycleEvidenceInput);

    expect(evidence.freshness).toBe("stale");
    expect(evidence.recoveryState).toBe("available");
  });
});
