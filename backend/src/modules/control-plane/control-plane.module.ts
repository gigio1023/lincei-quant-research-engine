import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AutonomousRunSchedule } from '../../entities/autonomous-run-schedule.entity';
import { AutonomousRun } from '../../entities/autonomous-run.entity';
import { BrokerFill } from '../../entities/broker-fill.entity';
import { BrokerSnapshot } from '../../entities/broker-snapshot.entity';
import { BudgetEnvelope } from '../../entities/budget-envelope.entity';
import { ExecutionControlState } from '../../entities/execution-control-state.entity';
import { FundingReadinessRecord } from '../../entities/funding-readiness-record.entity';
import { InvestmentProposal } from '../../entities/investment-proposal.entity';
import { LivePilotReadinessRecord } from '../../entities/live-pilot-readiness-record.entity';
import { MarketDataBar } from '../../entities/market-data-bar.entity';
import { MarketDataIngestionRun } from '../../entities/market-data-ingestion-run.entity';
import { OrderPlanApproval } from '../../entities/order-plan-approval.entity';
import { PaperAccountEvent } from '../../entities/paper-account-event.entity';
import { RiskEvaluation } from '../../entities/risk-evaluation.entity';
import { ResearchRun } from '../../entities/research-run.entity';
import { PaperAccount } from '../../entities/paper-account.entity';
import { PaperOrderPlan } from '../../entities/paper-order-plan.entity';
import { PaperReservationHoldRecord } from '../../entities/paper-reservation-hold.entity';
import { RiskGateModule } from '../risk-gate/risk-gate.module';
import { BrokerAdapterReadinessService } from './broker-adapter-readiness.service';
import { ControlPlaneSchedulerService } from './control-plane-scheduler.service';
import { ControlPlaneController } from './control-plane.controller';
import { ControlPlaneService } from './control-plane.service';
import { MarketDataIngestionSchedulerService } from './market-data-ingestion-scheduler.service';
import { MarketDataIngestionService } from './market-data-ingestion.service';
import { MARKET_DATA_PROVIDER } from './market-data-provider.types';
import { StooqMarketDataService } from './stooq-market-data.service';
import { TossReadOnlyBrokerService } from './toss-read-only-broker.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AutonomousRun,
      AutonomousRunSchedule,
      BrokerFill,
      BrokerSnapshot,
      BudgetEnvelope,
      ExecutionControlState,
      FundingReadinessRecord,
      InvestmentProposal,
      LivePilotReadinessRecord,
      MarketDataBar,
      MarketDataIngestionRun,
      OrderPlanApproval,
      PaperAccountEvent,
      RiskEvaluation,
      ResearchRun,
      PaperAccount,
      PaperOrderPlan,
      PaperReservationHoldRecord,
    ]),
    RiskGateModule,
  ],
  controllers: [ControlPlaneController],
  providers: [
    BrokerAdapterReadinessService,
    ControlPlaneService,
    ControlPlaneSchedulerService,
    MarketDataIngestionSchedulerService,
    MarketDataIngestionService,
    StooqMarketDataService,
    {
      provide: MARKET_DATA_PROVIDER,
      useExisting: StooqMarketDataService,
    },
    TossReadOnlyBrokerService,
  ],
  exports: [
    BrokerAdapterReadinessService,
    ControlPlaneService,
    ControlPlaneSchedulerService,
    MarketDataIngestionSchedulerService,
    MarketDataIngestionService,
    TossReadOnlyBrokerService,
  ],
})
export class ControlPlaneModule {}
