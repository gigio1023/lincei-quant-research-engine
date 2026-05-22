import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { AutonomousRun } from '../../entities/autonomous-run.entity';
import { BudgetEnvelope } from '../../entities/budget-envelope.entity';
import { ExecutionControlState } from '../../entities/execution-control-state.entity';
import { InvestmentProposal } from '../../entities/investment-proposal.entity';
import { PaperOrderPlan } from '../../entities/paper-order-plan.entity';
import { ResearchRun } from '../../entities/research-run.entity';
import { RiskEvaluation } from '../../entities/risk-evaluation.entity';
import { ControlPlaneService } from './control-plane.service';
import {
  ControlPlaneStatus,
  CreateBudgetEnvelopeRequest,
  CreateInvestmentProposalRequest,
  CreateResearchRunRequest,
  PaperExecuteProposalRequest,
  ReconcilePaperOrderPlanRequest,
  RunBaselineResearchRequest,
  UpdateExecutionControlRequest,
} from './control-plane.types';

@Controller('control-plane')
export class ControlPlaneController {
  constructor(private readonly controlPlaneService: ControlPlaneService) {}

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

  @Get('execution-control')
  getExecutionControlState(): Promise<ExecutionControlState> {
    return this.controlPlaneService.getExecutionControlState();
  }

  @Post('execution-control')
  updateExecutionControlState(
    @Body() request: UpdateExecutionControlRequest,
  ): Promise<ExecutionControlState> {
    return this.controlPlaneService.updateExecutionControlState(request);
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

  @Post('research-runs/run-baseline')
  runBaselineResearch(
    @Body() request: RunBaselineResearchRequest,
  ): Promise<ResearchRun> {
    return this.controlPlaneService.runBaselineResearch(request);
  }

  @Post('runs')
  createRun(@Body('objective') objective: string): Promise<AutonomousRun> {
    return this.controlPlaneService.createRun(objective);
  }

  @Get('runs')
  listRuns(): Promise<AutonomousRun[]> {
    return this.controlPlaneService.listRuns();
  }
}
