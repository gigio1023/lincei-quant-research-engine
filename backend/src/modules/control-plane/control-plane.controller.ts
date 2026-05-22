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
import { InvestmentProposal } from '../../entities/investment-proposal.entity';
import { ResearchRun } from '../../entities/research-run.entity';
import { RiskEvaluation } from '../../entities/risk-evaluation.entity';
import { ControlPlaneService } from './control-plane.service';
import {
  ControlPlaneStatus,
  CreateBudgetEnvelopeRequest,
  CreateInvestmentProposalRequest,
  CreateResearchRunRequest,
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

  @Post('runs')
  createRun(@Body('objective') objective: string): Promise<AutonomousRun> {
    return this.controlPlaneService.createRun(objective);
  }

  @Get('runs')
  listRuns(): Promise<AutonomousRun[]> {
    return this.controlPlaneService.listRuns();
  }
}
