import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AutonomousRun } from '../../entities/autonomous-run.entity';
import { BudgetEnvelope } from '../../entities/budget-envelope.entity';
import { InvestmentProposal } from '../../entities/investment-proposal.entity';
import { RiskEvaluation } from '../../entities/risk-evaluation.entity';
import { RiskGateModule } from '../risk-gate/risk-gate.module';
import { ControlPlaneController } from './control-plane.controller';
import { ControlPlaneService } from './control-plane.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AutonomousRun,
      BudgetEnvelope,
      InvestmentProposal,
      RiskEvaluation,
    ]),
    RiskGateModule,
  ],
  controllers: [ControlPlaneController],
  providers: [ControlPlaneService],
  exports: [ControlPlaneService],
})
export class ControlPlaneModule {}
