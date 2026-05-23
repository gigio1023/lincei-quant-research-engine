/**
 * V1 autonomous live-pilot module: alpha generation, LEAN ingest, paper bridge, broker adapters, live gates.
 * Kept separate from ControlPlaneModule to preserve the LEAN/LLM/broker credential boundaries in the spec.
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlphaDecision } from '../../entities/alpha-decision.entity';
import { ExecutionIntent } from '../../entities/execution-intent.entity';
import { FeatureSnapshot } from '../../entities/feature-snapshot.entity';
import { LeanRun } from '../../entities/lean-run.entity';
import { LivePilotStatusRecord } from '../../entities/live-pilot-status.entity';
import { MarketDataBar } from '../../entities/market-data-bar.entity';
import { PortfolioTargetSnapshot } from '../../entities/portfolio-target-snapshot.entity';
import { PaperOrderPlan } from '../../entities/paper-order-plan.entity';
import { BrokerSnapshot } from '../../entities/broker-snapshot.entity';
import { ExecutionControlState } from '../../entities/execution-control-state.entity';
import { ControlPlaneModule } from '../control-plane/control-plane.module';
import { FeatureSnapshotService } from './alpha/feature-snapshot.service';
import { NumericAlphaService } from './alpha/numeric-alpha.service';
import { LlmAlphaService } from './alpha/llm-alpha.service';
import { MetaAlphaService } from './alpha/meta-alpha.service';
import { LeanLocalSimulatorService } from './lean/lean-local-simulator.service';
import { LeanRunImportService } from './lean/lean-run-import.service';
import { LeanPaperBridgeService } from './paper/lean-paper-bridge.service';
import { LivePreflightService } from './live/live-preflight.service';
import { LivePilot10UsdService } from './live/live-pilot-10usd.service';
import { MockBrokerAdapter } from './broker/mock-broker.adapter';
import { TossWriteBrokerAdapter } from './broker/toss-write-broker.adapter';
import { V1PilotOrchestratorService } from './v1-pilot-orchestrator.service';
import { V1PilotController } from './v1-pilot.controller';
import { MlModelRegistryService } from './ml/ml-model-registry.service';
import { MlPythonRunner } from './ml/ml-python.runner';
import { MlBaselineInferenceService } from './ml/ml-baseline-inference.service';

@Module({
  imports: [
    ControlPlaneModule,
    TypeOrmModule.forFeature([
      AlphaDecision,
      ExecutionIntent,
      FeatureSnapshot,
      LeanRun,
      LivePilotStatusRecord,
      MarketDataBar,
      PortfolioTargetSnapshot,
      PaperOrderPlan,
      BrokerSnapshot,
      ExecutionControlState,
    ]),
  ],
  controllers: [V1PilotController],
  providers: [
    FeatureSnapshotService,
    NumericAlphaService,
    MlModelRegistryService,
    MlPythonRunner,
    MlBaselineInferenceService,
    LlmAlphaService,
    MetaAlphaService,
    LeanLocalSimulatorService,
    LeanRunImportService,
    LeanPaperBridgeService,
    LivePreflightService,
    LivePilot10UsdService,
    MockBrokerAdapter,
    TossWriteBrokerAdapter,
    V1PilotOrchestratorService,
  ],
  exports: [V1PilotOrchestratorService, LeanRunImportService, LivePreflightService],
})
export class V1PilotModule {}
