import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ReportsModule } from './modules/reports/reports.module';
import { NewsModule } from './modules/news/news.module';
import { LlmModule } from './modules/llm/llm.module';
import { RiskGateModule } from './modules/risk-gate/risk-gate.module';
import { ControlPlaneModule } from './modules/control-plane/control-plane.module';
import { BrokerFill } from './entities/broker-fill.entity';
import { Report } from './entities/report.entity';
import { NewsSource } from './entities/news-source.entity';
import { OrderPlanApproval } from './entities/order-plan-approval.entity';
import { PaperAccountEvent } from './entities/paper-account-event.entity';
import { BudgetEnvelope } from './entities/budget-envelope.entity';
import { BrokerSnapshot } from './entities/broker-snapshot.entity';
import { ExecutionControlState } from './entities/execution-control-state.entity';
import { InvestmentProposal } from './entities/investment-proposal.entity';
import { MarketDataBar } from './entities/market-data-bar.entity';
import { RiskEvaluation } from './entities/risk-evaluation.entity';
import { AutonomousRun } from './entities/autonomous-run.entity';
import { AutonomousRunSchedule } from './entities/autonomous-run-schedule.entity';
import { ResearchRun } from './entities/research-run.entity';
import { PaperAccount } from './entities/paper-account.entity';
import { PaperOrderPlan } from './entities/paper-order-plan.entity';
import { PaperReservationHoldRecord } from './entities/paper-reservation-hold.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'better-sqlite3',
        database: configService.get('DATABASE_PATH', 'data/investment.db'),
        entities: [
          Report,
          NewsSource,
          BrokerFill,
          OrderPlanApproval,
          PaperAccountEvent,
          BudgetEnvelope,
          BrokerSnapshot,
          ExecutionControlState,
          InvestmentProposal,
          MarketDataBar,
          RiskEvaluation,
          AutonomousRun,
          AutonomousRunSchedule,
          ResearchRun,
          PaperAccount,
          PaperOrderPlan,
          PaperReservationHoldRecord,
        ],
        synchronize: true,
        autoLoadEntities: true,
      }),
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    ReportsModule,
    NewsModule,
    LlmModule,
    RiskGateModule,
    ControlPlaneModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
