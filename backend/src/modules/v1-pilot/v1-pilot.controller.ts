/** Thin HTTP surface for dashboard observability; scripts use v1-pilot-cli instead. */
import { Controller, Get, Post } from '@nestjs/common';
import { V1PilotOrchestratorService } from './v1-pilot-orchestrator.service';
import { LeanRunImportService } from './lean/lean-run-import.service';
import { LivePreflightService } from './live/live-preflight.service';
import { V1PilotStatusService } from './v1-pilot-status.service';

@Controller('v1-pilot')
export class V1PilotController {
  constructor(
    private readonly orchestrator: V1PilotOrchestratorService,
    private readonly leanRunImportService: LeanRunImportService,
    private readonly livePreflightService: LivePreflightService,
    private readonly statusService: V1PilotStatusService,
  ) {}

  @Get('lean-runs')
  listLeanRuns() {
    return this.leanRunImportService.listRuns();
  }

  @Get('lean-runs/latest')
  async getLatestLeanRun() {
    return this.leanRunImportService.getLatestRun();
  }

  @Post('alpha-cycle')
  runAlphaCycle() {
    return this.orchestrator.runAlphaCycle();
  }

  @Post('paper-cycle')
  runPaperCycle() {
    return this.orchestrator.runPaperCycle();
  }

  @Post('paper-replay')
  runPaperReplay() {
    return this.orchestrator.runPaperReplay();
  }

  @Post('live-shadow')
  runLiveShadow() {
    return this.orchestrator.runLiveShadow();
  }

  @Post('learning-loop')
  runLearningLoop() {
    return this.orchestrator.runLearningLoop();
  }

  @Get('live-preflight')
  runLivePreflight() {
    return this.livePreflightService.runPreflight();
  }

  @Get('status')
  async getStatus() {
    return this.statusService.getStatus();
  }
}
