import axios from "axios";
import {
  ControlPlaneStatus,
  PaperOrderPlan,
  PaperExecuteProposalRequest,
  Report,
  ReportsResponse,
  ResearchRun,
  RunBaselineResearchRequest,
  RiskGateStatus,
} from "../types";

const env = (
  import.meta as ImportMeta & {
    env: Record<string, string | undefined>;
  }
).env;

const API_BASE_URL =
  env.VITE_API_URL ?? env.REACT_APP_API_URL ?? "http://localhost:3001";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

export const reportsApi = {
  getReports: async (page = 1, limit = 10): Promise<ReportsResponse> => {
    const response = await api.get(`/reports?page=${page}&limit=${limit}`);
    return response.data;
  },

  getReport: async (id: number): Promise<Report> => {
    const response = await api.get(`/reports/${id}`);
    return response.data;
  },

  getReportsByDate: async (date: string): Promise<Report[]> => {
    const response = await api.get(`/reports/date/${date}`);
    return response.data;
  },
};

export const riskGateApi = {
  getStatus: async (): Promise<RiskGateStatus> => {
    const response = await api.get("/risk-gate/status");
    return response.data;
  },
};

export const controlPlaneApi = {
  getStatus: async (): Promise<ControlPlaneStatus> => {
    const response = await api.get("/control-plane/status");
    return response.data;
  },

  getResearchRuns: async (): Promise<ResearchRun[]> => {
    const response = await api.get("/control-plane/research-runs");
    return response.data;
  },

  getPaperOrderPlans: async (): Promise<PaperOrderPlan[]> => {
    const response = await api.get("/control-plane/paper-order-plans");
    return response.data;
  },

  executeProposalPaper: async (
    proposalId: string | number,
    request: PaperExecuteProposalRequest = {},
  ): Promise<PaperOrderPlan> => {
    const response = await api.post(
      `/control-plane/proposals/${proposalId}/paper-execute`,
      request,
    );
    return response.data;
  },

  runBaselineResearch: async (
    request: RunBaselineResearchRequest = {},
  ): Promise<ResearchRun> => {
    const response = await api.post(
      "/control-plane/research-runs/run-baseline",
      request,
    );
    return response.data;
  },
};

export default api;
