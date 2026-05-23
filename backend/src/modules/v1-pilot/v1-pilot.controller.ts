import { Controller, Get, Post } from '@nestjs/common';
import { V1PilotOrchestratorService } from './v1-pilot-orchestrator.service';
import { LeanRunImportService } from './lean/lean-run-import.service';
import { LivePreflightService } from './live/live-preflight.service';

@Controller('v1-pilot')
export class V1PilotController {
  constructor(
    private readonly orchestrator: V1PilotOrchestratorService,
    private readonly leanRunImportService: LeanRunImportService,
    private readonly livePreflightService: LivePreflightService,
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

  @Get('live-preflight')
  runLivePreflight() {
    return this.livePreflightService.runPreflight();
  }

  @Get('status')
  async getStatus() {
    const [leanRun, preflight] = await Promise.all([
      this.leanRunImportService.getLatestRun(),
      this.livePreflightService.runPreflight(),
    ]);
    return { leanRun, preflight };
  }
}
