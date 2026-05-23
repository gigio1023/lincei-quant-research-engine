import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { AutonomousRun } from './entities/autonomous-run.entity';
import { AutonomousRunSchedule } from './entities/autonomous-run-schedule.entity';
import { BrokerFill } from './entities/broker-fill.entity';
import { BrokerSnapshot } from './entities/broker-snapshot.entity';
import { BudgetEnvelope } from './entities/budget-envelope.entity';
import { ExecutionControlState } from './entities/execution-control-state.entity';
import { InvestmentProposal } from './entities/investment-proposal.entity';
import { MarketDataBar } from './entities/market-data-bar.entity';
import { MarketDataIngestionRun } from './entities/market-data-ingestion-run.entity';
import { NewsSource } from './entities/news-source.entity';
import { OrderPlanApproval } from './entities/order-plan-approval.entity';
import { PaperAccount } from './entities/paper-account.entity';
import { PaperAccountEvent } from './entities/paper-account-event.entity';
import { PaperOrderPlan } from './entities/paper-order-plan.entity';
import { PaperReservationHoldRecord } from './entities/paper-reservation-hold.entity';
import { Report } from './entities/report.entity';
import { ResearchRun } from './entities/research-run.entity';
import { RiskEvaluation } from './entities/risk-evaluation.entity';
import { AddPaperLockReservationIndexes1763760000000 } from './migrations/1763760000000-AddPaperLockReservationIndexes';

config();

export const databaseEntities = [
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
  MarketDataIngestionRun,
  RiskEvaluation,
  AutonomousRun,
  AutonomousRunSchedule,
  ResearchRun,
  PaperAccount,
  PaperOrderPlan,
  PaperReservationHoldRecord,
];

export const databaseMigrations = [AddPaperLockReservationIndexes1763760000000];

const AppDataSource = new DataSource({
  type: 'better-sqlite3',
  database: process.env.DATABASE_PATH ?? 'data/investment.db',
  entities: databaseEntities,
  migrations: databaseMigrations,
  migrationsTableName: 'schema_migrations',
  migrationsTransactionMode: 'all',
  synchronize: false,
});

export default AppDataSource;
