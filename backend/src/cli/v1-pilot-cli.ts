/**
 * Headless entrypoint for ./scripts/* — boots Nest without HTTP and runs one V1 command.
 * Exit code 2 from live-preflight / live-pilot means blocked by policy (not a crash).
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { V1PilotOrchestratorService } from '../modules/v1-pilot/v1-pilot-orchestrator.service';
import { loadOpenAiEnv } from '../shared/openai-env.loader';

async function bootstrap(): Promise<void> {
  loadOpenAiEnv();
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  const orchestrator = app.get(V1PilotOrchestratorService);
  const [command, ...args] = process.argv.slice(2);

  try {
    switch (command) {
      case 'lean-backtest': {
        const project = args[0] ?? 'aggressive_llm_momentum';
        const result = await orchestrator.runLeanBacktest(project);
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      case 'import-lean-run': {
        const target = args[0] ?? 'latest';
        const imported = await orchestrator.importLeanRun(target);
        console.log(JSON.stringify({ runId: imported.runId, status: imported.status }, null, 2));
        break;
      }
      case 'run-alpha-cycle': {
        const result = await orchestrator.runAlphaCycle();
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      case 'run-paper-cycle': {
        const plan = await orchestrator.runPaperCycle();
        console.log(JSON.stringify({ paperOrderPlanId: plan.id, status: plan.status }, null, 2));
        break;
      }
      case 'live-preflight': {
        const preflight = await orchestrator.runLivePreflight();
        console.log(JSON.stringify(preflight, null, 2));
        process.exitCode = preflight.status === 'ready' ? 0 : 2;
        break;
      }
      case 'live-pilot-10usd': {
        const confirm = args.includes('--confirm-real-money');
        const result = await orchestrator.runLivePilot10Usd(confirm);
        console.log(JSON.stringify(result, null, 2));
        process.exitCode = result.submitted ? 0 : 2;
        break;
      }
      case 'live-flatten': {
        if (!args.includes('--confirm-real-money')) {
          throw new Error('live-flatten requires --confirm-real-money');
        }
        console.log(
          JSON.stringify(
            { status: 'blocked', reason: 'Flatten path reserved for verified broker adapter.' },
            null,
            2,
          ),
        );
        process.exitCode = 2;
        break;
      }
      default:
        throw new Error(
          `Unknown command: ${command ?? '(missing)'}. Expected lean-backtest, import-lean-run, run-alpha-cycle, run-paper-cycle, live-preflight, live-pilot-10usd.`,
        );
    }
  } finally {
    await app.close();
  }
}

bootstrap().catch((error: Error) => {
  console.error(error.message);
  process.exit(1);
});
