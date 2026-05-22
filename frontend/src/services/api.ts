import axios from "axios";
import {
  AdvanceAutonomousRunRequest,
  AutonomousRun,
  AutonomousRunSchedule,
  BrokerSnapshot,
  BudgetEnvelope,
  ControlPlaneStatus,
  ExecutionControlState,
  InvestmentProposal,
  OrderPlanApproval,
  PaperAccount,
  PaperAccountEvent,
  PaperOrderPlan,
  PaperExecuteProposalRequest,
  Report,
  ReportsResponse,
  ResearchRun,
  RiskEvaluation,
  RunBaselineResearchRequest,
  RiskGateStatus,
  TickAutonomousRunScheduleRequest,
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

  getBudgets: async (): Promise<BudgetEnvelope[]> => {
    const response = await api.get("/control-plane/budgets");
    return response.data;
  },

  getResearchRuns: async (): Promise<ResearchRun[]> => {
    const response = await api.get("/control-plane/research-runs");
    return response.data;
  },

  getProposals: async (): Promise<InvestmentProposal[]> => {
    const response = await api.get("/control-plane/proposals");
    return response.data;
  },

  getRiskEvaluations: async (): Promise<RiskEvaluation[]> => {
    const response = await api.get("/control-plane/risk-evaluations");
    return response.data;
  },

  getPaperAccount: async (): Promise<PaperAccount> => {
    const response = await api.get("/control-plane/paper-account");
    return response.data;
  },

  getPaperAccountEvents: async (): Promise<PaperAccountEvent[]> => {
    const response = await api.get("/control-plane/paper-account/events");
    return response.data;
  },

  getExecutionControl: async (): Promise<ExecutionControlState> => {
    const response = await api.get("/control-plane/execution-control");
    return response.data;
  },

  getPaperOrderPlans: async (): Promise<PaperOrderPlan[]> => {
    const response = await api.get("/control-plane/paper-order-plans");
    return response.data;
  },

  getBrokerSnapshots: async (): Promise<BrokerSnapshot[]> => {
    const response = await api.get("/control-plane/broker-snapshots");
    return response.data;
  },

  getOrderPlanApprovals: async (): Promise<OrderPlanApproval[]> => {
    const response = await api.get("/control-plane/order-plan-approvals");
    return response.data;
  },

  getRuns: async (): Promise<AutonomousRun[]> => {
    const response = await api.get("/control-plane/runs");
    return response.data;
  },

  getRunSchedules: async (): Promise<AutonomousRunSchedule[]> => {
    const response = await api.get("/control-plane/run-schedules");
    return response.data;
  },

  tickRunSchedule: async (
    scheduleId: string | number,
    request: TickAutonomousRunScheduleRequest = {},
  ): Promise<AutonomousRun> => {
    const response = await api.post(
      `/control-plane/run-schedules/${scheduleId}/tick`,
      request,
    );
    return response.data;
  },

  advanceRun: async (
    runId: string | number,
    request: AdvanceAutonomousRunRequest = {},
  ): Promise<AutonomousRun> => {
    const response = await api.post(
      `/control-plane/runs/${runId}/advance`,
      request,
    );
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
