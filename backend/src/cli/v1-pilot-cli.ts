/**
 * Headless entrypoint for ./scripts/* — boots Nest without HTTP and runs one V1 command.
 * Exit code 2 from engine/preflight commands means blocked by policy or missing evidence, not a crash.
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { V1PilotOrchestratorService } from '../modules/v1-pilot/v1-pilot-orchestrator.service';
import { loadOpenAiEnv } from '../shared/openai-env.loader';
import { loadRepoEnv } from '../shared/repo-env.loader';

async function bootstrap(): Promise<void> {
  loadRepoEnv();
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
      case 'qc-cloud-backtest': {
        const project =
          args.find((arg) => !arg.startsWith('--')) ??
          'aggressive_llm_momentum';
        const result = await orchestrator.runQuantConnectCloudBacktest(
          project,
          {
            push: args.includes('--push'),
          },
        );
        console.log(
          JSON.stringify(
            {
              runId: result.runId,
              runtime: result.runtime,
              status: result.status,
              blockers: result.blockerReasons,
              cloudUrl: result.cloudUrl,
            },
            null,
            2,
          ),
        );
        process.exitCode =
          result.status === 'passed' ? 0 : result.status === 'blocked' ? 2 : 1;
        break;
      }
      case 'qc-object-store-set': {
        const [key, sourcePath] = args;
        if (!key || !sourcePath) {
          throw new Error('qc-object-store-set requires <key> <sourcePath>');
        }
        const result = await orchestrator.syncQuantConnectObjectStore(
          key,
          sourcePath,
        );
        console.log(JSON.stringify(result, null, 2));
        process.exitCode = result.status === 'blocked' ? 2 : 0;
        break;
      }
      case 'import-lean-run': {
        const target = args.find((arg) => !arg.startsWith('--')) ?? 'latest';
        const schemaOnly = args.includes('--schema-only');
        const imported = await orchestrator.importLeanRun(target, {
          acceptanceMode: schemaOnly ? 'schema-import' : 'strategy-backtest',
        });
        console.log(
          JSON.stringify(
            { runId: imported.runId, status: imported.status },
            null,
            2,
          ),
        );
        break;
      }
      case 'train-ml-baseline': {
        const result = await orchestrator.trainMlBaseline();
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      case 'download-external-baselines': {
        const result = await orchestrator.downloadExternalBaselines();
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      case 'run-full-backtest': {
        const skipAlphaCycle = args.includes('--skip-alpha-cycle');
        const noDownloadData = args.includes('--no-download-data');
        const skipIngest = args.includes('--skip-market-data-ingest');
        const noStaticMeta =
          args.includes('--no-static-meta') ||
          !args.includes('--with-static-meta');
        const noStaticMl =
          args.includes('--no-static-ml') || !args.includes('--with-static-ml');
        const result = await orchestrator.runFullBacktest({
          skipAlphaCycle,
          downloadData: !noDownloadData,
          ingestUniverseBars: !skipIngest,
          noStaticMeta,
          noStaticMl,
        });
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      case 'run-alpha-cycle': {
        const result = await orchestrator.runAlphaCycle();
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      case 'run-paper-cycle': {
        try {
          const plan = await orchestrator.runPaperCycle();
          console.log(
            JSON.stringify(
              { paperOrderPlanId: plan.id, status: plan.status },
              null,
              2,
            ),
          );
        } catch (error) {
          console.log(
            JSON.stringify(
              {
                status: 'blocked',
                blockers: [
                  error instanceof Error
                    ? error.message
                    : 'Paper cycle prerequisites are missing.',
                ],
              },
              null,
              2,
            ),
          );
          process.exitCode = 2;
        }
        break;
      }
      case 'run-live-shadow': {
        const record = await orchestrator.runLiveShadow();
        console.log(
          JSON.stringify(
            {
              liveShadowRecordId: record.id,
              status: record.status,
              blockers: record.blockerReasons,
            },
            null,
            2,
          ),
        );
        process.exitCode = record.status === 'blocked' ? 2 : 0;
        break;
      }
      case 'run-learning-loop': {
        const result = await orchestrator.runLearningLoop();
        console.log(JSON.stringify(result, null, 2));
        process.exitCode =
          result.promotionDecision.status === 'blocked' ? 2 : 0;
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
            {
              status: 'blocked',
              reason: 'Flatten path reserved for verified broker adapter.',
            },
            null,
            2,
          ),
        );
        process.exitCode = 2;
        break;
      }
      default:
        throw new Error(
          `Unknown command: ${command ?? '(missing)'}. Expected run-full-backtest, lean-backtest, qc-cloud-backtest, qc-object-store-set, import-lean-run, download-external-baselines, train-ml-baseline, run-alpha-cycle, run-paper-cycle, run-live-shadow, run-learning-loop, live-preflight, live-pilot-10usd.`,
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
