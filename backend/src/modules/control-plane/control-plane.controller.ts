import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { AutonomousRun } from '../../entities/autonomous-run.entity';
import { AutonomousRunSchedule } from '../../entities/autonomous-run-schedule.entity';
import { BrokerFill } from '../../entities/broker-fill.entity';
import { BrokerSnapshot } from '../../entities/broker-snapshot.entity';
import { BudgetEnvelope } from '../../entities/budget-envelope.entity';
import { ExecutionControlState } from '../../entities/execution-control-state.entity';
import { InvestmentProposal } from '../../entities/investment-proposal.entity';
import { MarketDataBar } from '../../entities/market-data-bar.entity';
import { MarketDataIngestionRun } from '../../entities/market-data-ingestion-run.entity';
import { OrderPlanApproval } from '../../entities/order-plan-approval.entity';
import { PaperAccountEvent } from '../../entities/paper-account-event.entity';
import { PaperAccount } from '../../entities/paper-account.entity';
import { PaperOrderPlan } from '../../entities/paper-order-plan.entity';
import { ResearchRun } from '../../entities/research-run.entity';
import { RiskEvaluation } from '../../entities/risk-evaluation.entity';
import { BrokerAdapterReadinessService } from './broker-adapter-readiness.service';
import { ControlPlaneSchedulerService } from './control-plane-scheduler.service';
import { ControlPlaneService } from './control-plane.service';
import { MarketDataIngestionSchedulerService } from './market-data-ingestion-scheduler.service';
import { MarketDataIngestionService } from './market-data-ingestion.service';
import { TossReadOnlyBrokerService } from './toss-read-only-broker.service';
import {
  AdvanceAutonomousRunRequest,
  BrokerAdapterStatus,
  BrokerReadOnlyPollResponse,
  ControlPlaneStatus,
  CreateAutonomousRunScheduleRequest,
  CreateAutonomousRunRequest,
  CreateBudgetEnvelopeRequest,
  CreateInvestmentProposalRequest,
  CreateOrderPlanApprovalRequest,
  CreateResearchRunRequest,
  ImportBrokerFillRequest,
  ImportBrokerSnapshotRequest,
  ImportMarketDataBarsRequest,
  KillSwitchStatus,
  MarketDataIngestionPollRequest,
  MarketDataIngestionPollResponse,
  MarketDataIngestionStatus,
  MarketDataBarsImportResponse,
  PaperExecuteProposalRequest,
  PromotePaperAccountRequest,
  ReconcileBrokerFillRequest,
  ReconcileBrokerSnapshotRequest,
  ReconcilePaperOrderPlanRequest,
  RunRecoveryProposalRequest,
  RunRecoveryProposalResponse,
  RunBaselineResearchRequest,
  RunScheduleWorkerStatus,
  SeedPaperAccountRequest,
  TickAutonomousRunScheduleRequest,
  TripKillSwitchRequest,
  UpdateExecutionControlRequest,
} from './control-plane.types';

@Controller('control-plane')
export class ControlPlaneController {
  constructor(
    private readonly controlPlaneService: ControlPlaneService,
    private readonly controlPlaneSchedulerService: ControlPlaneSchedulerService,
    private readonly brokerAdapterReadinessService: BrokerAdapterReadinessService,
    private readonly tossReadOnlyBrokerService: TossReadOnlyBrokerService,
    private readonly marketDataIngestionService: MarketDataIngestionService,
    private readonly marketDataIngestionSchedulerService: MarketDataIngestionSchedulerService,
  ) {}

  @Get('status')
  getStatus(): Promise<ControlPlaneStatus> {
    return this.controlPlaneService.getStatus();
  }

  @Post('budgets')
  createBudget(
    @Body() request: CreateBudgetEnvelopeRequest,
  ): Promise<BudgetEnvelope> {
    return this.controlPlaneService.createBudgetEnvelope(request);
  }

  @Get('budgets')
  listBudgets(): Promise<BudgetEnvelope[]> {
    return this.controlPlaneService.listBudgetEnvelopes();
  }

  @Post('proposals')
  createProposal(
    @Body() request: CreateInvestmentProposalRequest,
  ): Promise<InvestmentProposal> {
    return this.controlPlaneService.createProposal(request);
  }

  @Get('proposals')
  listProposals(): Promise<InvestmentProposal[]> {
    return this.controlPlaneService.listProposals();
  }

  @Post('proposals/:id/evaluate-risk')
  evaluateProposal(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<RiskEvaluation> {
    return this.controlPlaneService.evaluateProposal(id);
  }

  @Get('risk-evaluations')
  listRiskEvaluations(): Promise<RiskEvaluation[]> {
    return this.controlPlaneService.listRiskEvaluations();
  }

  @Post('proposals/:id/order-plan-approvals')
  createOrderPlanApproval(
    @Param('id', ParseIntPipe) id: number,
    @Body() request: CreateOrderPlanApprovalRequest,
  ): Promise<OrderPlanApproval> {
    return this.controlPlaneService.createOrderPlanApproval(id, request);
  }

  @Get('order-plan-approvals')
  listOrderPlanApprovals(): Promise<OrderPlanApproval[]> {
    return this.controlPlaneService.listOrderPlanApprovals();
  }

  @Get('execution-control')
  getExecutionControlState(): Promise<ExecutionControlState> {
    return this.controlPlaneService.getExecutionControlState();
  }

  @Get('paper-account')
  getPaperAccountState(): Promise<PaperAccount> {
    return this.controlPlaneService.getPaperAccountState();
  }

  @Post('paper-account/seed')
  seedPaperAccount(
    @Body() request: SeedPaperAccountRequest,
  ): Promise<PaperAccount> {
    return this.controlPlaneService.seedPaperAccount(request);
  }

  @Post('paper-account/:id/promote')
  promotePaperAccount(
    @Param('id', ParseIntPipe) id: number,
    @Body() request: PromotePaperAccountRequest,
  ): Promise<PaperAccount> {
    return this.controlPlaneService.promotePaperAccount(id, request);
  }

  @Get('paper-account/events')
  listPaperAccountEvents(): Promise<PaperAccountEvent[]> {
    return this.controlPlaneService.listPaperAccountEvents();
  }

  @Post('broker-snapshots/import-read-only')
  importBrokerSnapshot(
    @Body() request: ImportBrokerSnapshotRequest,
  ): Promise<BrokerSnapshot> {
    return this.controlPlaneService.importBrokerSnapshot(request);
  }

  @Post('broker-fills/import-read-only')
  importBrokerFill(
    @Body() request: ImportBrokerFillRequest,
  ): Promise<BrokerFill> {
    return this.controlPlaneService.importBrokerFill(request);
  }

  @Get('broker-fills')
  listBrokerFills(): Promise<BrokerFill[]> {
    return this.controlPlaneService.listBrokerFills();
  }

  @Post('broker-fills/:id/reconcile-paper')
  reconcileBrokerFill(
    @Param('id', ParseIntPipe) id: number,
    @Body() request: ReconcileBrokerFillRequest = {},
  ): Promise<BrokerFill> {
    return this.controlPlaneService.reconcileBrokerFill(id, request);
  }

  @Get('broker-snapshots')
  listBrokerSnapshots(): Promise<BrokerSnapshot[]> {
    return this.controlPlaneService.listBrokerSnapshots();
  }

  @Get('broker-snapshots/latest')
  getLatestBrokerSnapshot(): Promise<BrokerSnapshot> {
    return this.controlPlaneService.getLatestBrokerSnapshot();
  }

  @Get('broker-adapter/status')
  getBrokerAdapterStatus(): BrokerAdapterStatus {
    return this.tossReadOnlyBrokerService.getAdapterStatus(
      this.brokerAdapterReadinessService.getStatus(),
    );
  }

  @Post('broker-adapter/poll-read-only')
  pollBrokerReadOnlySnapshot(): Promise<BrokerReadOnlyPollResponse> {
    return this.tossReadOnlyBrokerService.pollReadOnlySnapshot();
  }

  @Post('broker-adapter/poll-read-only-fills')
  pollBrokerReadOnlyFills(): Promise<BrokerReadOnlyPollResponse> {
    return this.tossReadOnlyBrokerService.pollReadOnlyFills();
  }

  @Post('broker-snapshots/:id/reconcile-paper')
  reconcileBrokerSnapshot(
    @Param('id', ParseIntPipe) id: number,
    @Body() request: ReconcileBrokerSnapshotRequest = {},
  ): Promise<BrokerSnapshot> {
    return this.controlPlaneService.reconcileBrokerSnapshot(id, request);
  }

  @Post('execution-control')
  updateExecutionControlState(
    @Body() request: UpdateExecutionControlRequest,
  ): Promise<ExecutionControlState> {
    return this.controlPlaneService.updateExecutionControlState(request);
  }

  @Get('kill-switch/status')
  getKillSwitchStatus(): Promise<KillSwitchStatus> {
    return this.controlPlaneService.getKillSwitchStatus();
  }

  @Post('kill-switch/trip')
  tripKillSwitch(
    @Body() request: TripKillSwitchRequest,
  ): Promise<KillSwitchStatus> {
    return this.controlPlaneService.tripKillSwitch(request);
  }

  @Post('proposals/:id/paper-execute')
  paperExecuteProposal(
    @Param('id', ParseIntPipe) id: number,
    @Body() request: PaperExecuteProposalRequest = {},
  ): Promise<PaperOrderPlan> {
    return this.controlPlaneService.paperExecuteProposal(id, request);
  }

  @Get('paper-order-plans')
  listPaperOrderPlans(): Promise<PaperOrderPlan[]> {
    return this.controlPlaneService.listPaperOrderPlans();
  }

  @Get('paper-order-plans/:id')
  getPaperOrderPlan(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<PaperOrderPlan> {
    return this.controlPlaneService.getPaperOrderPlan(id);
  }

  @Post('paper-order-plans/:id/reconcile')
  reconcilePaperOrderPlan(
    @Param('id', ParseIntPipe) id: number,
    @Body() request: ReconcilePaperOrderPlanRequest = {},
  ): Promise<PaperOrderPlan> {
    return this.controlPlaneService.reconcilePaperOrderPlan(id, request);
  }

  @Post('research-runs')
  createResearchRun(
    @Body() request: CreateResearchRunRequest,
  ): Promise<ResearchRun> {
    return this.controlPlaneService.createResearchRun(request);
  }

  @Get('research-runs')
  listResearchRuns(): Promise<ResearchRun[]> {
    return this.controlPlaneService.listResearchRuns();
  }

  @Post('market-data/bars/import')
  importMarketDataBars(
    @Body() request: ImportMarketDataBarsRequest,
  ): Promise<MarketDataBarsImportResponse> {
    return this.controlPlaneService.importMarketDataBars(request);
  }

  @Get('market-data/bars')
  listMarketDataBars(
    @Query('datasetId') datasetId?: string,
    @Query('symbol') symbol?: string,
  ): Promise<MarketDataBar[]> {
    return this.controlPlaneService.listMarketDataBars(datasetId, symbol);
  }

  @Get('market-data/ingestion/status')
  getMarketDataIngestionStatus(): MarketDataIngestionStatus {
    return this.marketDataIngestionSchedulerService.getWorkerStatus();
  }

  @Post('market-data/ingestion/poll')
  pollMarketDataIngestion(
    @Body() request: MarketDataIngestionPollRequest = {},
  ): Promise<MarketDataIngestionPollResponse> {
    return this.marketDataIngestionService.poll(request, 'manual');
  }

  @Get('market-data/ingestion-runs')
  listMarketDataIngestionRuns(): Promise<MarketDataIngestionRun[]> {
    return this.marketDataIngestionService.listRuns();
  }

  @Post('research-runs/run-baseline')
  runBaselineResearch(
    @Body() request: RunBaselineResearchRequest,
  ): Promise<ResearchRun> {
    return this.controlPlaneService.runBaselineResearch(request);
  }

  @Post('recovery/run-baseline')
  runRecoveryProposal(
    @Body() request: RunRecoveryProposalRequest = {},
  ): Promise<RunRecoveryProposalResponse> {
    return this.controlPlaneService.runRecoveryProposal(request);
  }

  @Post('runs')
  createRun(
    @Body() request: CreateAutonomousRunRequest,
  ): Promise<AutonomousRun> {
    return this.controlPlaneService.createRun(request);
  }

  @Post('run-schedules')
  createRunSchedule(
    @Body() request: CreateAutonomousRunScheduleRequest,
  ): Promise<AutonomousRunSchedule> {
    return this.controlPlaneService.createRunSchedule(request);
  }

  @Get('run-schedules')
  listRunSchedules(): Promise<AutonomousRunSchedule[]> {
    return this.controlPlaneService.listRunSchedules();
  }

  @Get('run-schedules/worker-status')
  getRunScheduleWorkerStatus(): RunScheduleWorkerStatus {
    return this.controlPlaneSchedulerService.getWorkerStatus();
  }

  @Post('run-schedules/:id/tick')
  tickRunSchedule(
    @Param('id', ParseIntPipe) id: number,
    @Body() request: TickAutonomousRunScheduleRequest = {},
  ): Promise<AutonomousRun> {
    return this.controlPlaneService.tickRunSchedule(id, request);
  }

  @Get('runs')
  listRuns(): Promise<AutonomousRun[]> {
    return this.controlPlaneService.listRuns();
  }

  @Post('runs/:id/advance')
  advanceRun(
    @Param('id', ParseIntPipe) id: number,
    @Body() request: AdvanceAutonomousRunRequest = {},
  ): Promise<AutonomousRun> {
    return this.controlPlaneService.advanceRun(id, request);
  }
}
