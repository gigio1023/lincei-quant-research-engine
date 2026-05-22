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
import { Report } from './entities/report.entity';
import { NewsSource } from './entities/news-source.entity';
import { BudgetEnvelope } from './entities/budget-envelope.entity';
import { InvestmentProposal } from './entities/investment-proposal.entity';
import { RiskEvaluation } from './entities/risk-evaluation.entity';
import { AutonomousRun } from './entities/autonomous-run.entity';
import { ResearchRun } from './entities/research-run.entity';

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
          BudgetEnvelope,
          InvestmentProposal,
          RiskEvaluation,
          AutonomousRun,
          ResearchRun,
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
