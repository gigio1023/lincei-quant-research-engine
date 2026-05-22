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

describe("API Service", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockedAxios.create.mockReturnValue({
      get: mockGet,
      post: vi.fn(),
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
  });
});
