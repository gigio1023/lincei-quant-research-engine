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
  });
});
