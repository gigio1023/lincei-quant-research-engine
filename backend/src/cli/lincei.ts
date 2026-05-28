#!/usr/bin/env bun
/**
 * First-class operator CLI for the capital evidence loop.
 * Uses the framework-neutral runtime so trading evidence logic is not split between Nest and scripts.
 */
import {
  createLinceiRuntime,
  LinceiRuntime,
} from '../runtime/create-lincei-runtime';
import {
  DEFAULT_CAPITAL_HYPOTHESIS_ID,
  CapitalEvidenceRunOptions,
} from '../modules/v1-pilot/research/capital-evidence-slice.service';

type CommandHandlerResult = {
  result?: unknown;
  exitCode?: number;
};

const LEGACY_COMMANDS = new Set([
  'build-hypothesis-registry',
  'run-selected-run-bias-check',
  'ingest-semantic-evidence',
  'prepare-lean-local-data',
  'run-alpha-cycle',
  'train-ml-baseline',
  'download-external-baselines',
  'lean-backtest',
  'run-full-backtest',
  'import-lean-run',
  'qc-cloud-backtest',
  'import-cloud-backtest',
  'list-cloud-projects',
  'list-cloud-backtests',
  'qc-object-store-set',
  'run-paper-cycle',
  'run-paper-replay',
  'run-live-shadow',
  'run-learning-loop',
  'live-preflight',
  'live-pilot-10usd',
  'live-flatten',
]);

export async function runLinceiCli(
  rawArgs = process.argv.slice(2),
): Promise<number> {
  const json = rawArgs.includes('--json');
  const help = rawArgs.includes('--help') || rawArgs.includes('-h');
  const args = rawArgs.filter(
    (arg) => arg !== '--json' && arg !== '--help' && arg !== '-h',
  );

  if (help || args.length === 0 || args[0] === 'help') {
    console.log(helpText());
    return 0;
  }

  const runtime = await createLinceiRuntime();
  try {
    const handled = await dispatchCommand(runtime, args);
    if (handled.result !== undefined) {
      printResult(handled.result, json);
    }
    return handled.exitCode ?? exitCodeFromResult(handled.result);
  } finally {
    await runtime.close();
  }
}

async function dispatchCommand(
  runtime: LinceiRuntime,
  args: string[],
): Promise<CommandHandlerResult> {
  const [group, command, ...rest] = args;
  if (isLegacyCommand(group)) {
    return dispatchLegacyCommand(
      runtime,
      group,
      [command, ...rest].filter((arg): arg is string => Boolean(arg)),
    );
  }
  const key = command ? `${group} ${command}` : group;

  switch (key) {
    case 'capital run': {
      const options: CapitalEvidenceRunOptions = {
        hypothesisId: argValue(rest, '--hypothesis-id'),
        universe: csvArgValue(rest, '--universe'),
        maxBacktestWorkers:
          numericArgValue(rest, '--max-backtest-workers') ?? 1,
        semanticEvidenceLimit: numericArgValue(rest, '--semantic-limit'),
      };
      return {
        result: await runtime.capitalEvidenceSliceService.run(options),
      };
    }
    case 'capital status':
    case 'status':
      return { result: await runtime.statusService.getStatus() };
    case 'research corpus':
    case 'build-hypothesis-registry':
      return {
        result: await runtime.orchestrator.buildHypothesisRegistry({
          indexPath: argValue(rest, '--index-path'),
          strategyRegisterPath: argValue(rest, '--strategy-register-path'),
        }),
      };
    case 'research selected-run-bias':
    case 'run-selected-run-bias-check':
      return {
        result: await runtime.orchestrator.runSelectedRunBiasCheck({
          targetRef: argValue(rest, '--target-ref'),
          hypothesisId:
            argValue(rest, '--hypothesis-id') ??
            (key === 'research selected-run-bias'
              ? DEFAULT_CAPITAL_HYPOTHESIS_ID
              : undefined),
          minVariantCount: numericArgValue(rest, '--min-variant-count'),
        }),
      };
    case 'data semantic-evidence':
    case 'ingest-semantic-evidence':
      return {
        result: await runtime.orchestrator.ingestSemanticEvidence({
          source: 'hf-fomc-statements-minutes',
          limit: numericArgValue(rest, '--limit') ?? 80,
          sourcePath: argValue(rest, '--source-path'),
        }),
      };
    case 'data prepare-lean':
    case 'prepare-lean-local-data':
      return {
        result: await runtime.orchestrator.prepareLeanLocalData({
          ingestUniverseBars: !rest.includes('--skip-market-data-ingest'),
        }),
      };
    case 'alpha run':
    case 'run-alpha-cycle':
      return runBlockedAware(() => runtime.orchestrator.runAlphaCycle(), {
        isBlocked: isAlphaCycleBlocked,
        fallbackBlocker: 'Alpha cycle prerequisites are missing.',
      });
    case 'ml train-baseline':
    case 'train-ml-baseline':
      return { result: await runtime.orchestrator.trainMlBaseline() };
    case 'ml download-external-baselines':
    case 'download-external-baselines':
      return { result: await runtime.orchestrator.downloadExternalBaselines() };
    case 'lean backtest':
    case 'lean-backtest': {
      const project =
        firstPositional(rest) ?? command ?? 'aggressive_llm_momentum';
      return { result: await runtime.orchestrator.runLeanBacktest(project) };
    }
    case 'lean full-backtest':
    case 'run-full-backtest': {
      const fullBacktestArgs =
        key === 'run-full-backtest' ? [command, ...rest] : rest;
      return runBlockedAware(
        () =>
          runtime.orchestrator.runFullBacktest({
            skipAlphaCycle: fullBacktestArgs.includes('--skip-alpha-cycle'),
            downloadData:
              fullBacktestArgs.includes('--download-data') &&
              !fullBacktestArgs.includes('--no-download-data'),
            ingestUniverseBars: !fullBacktestArgs.includes(
              '--skip-market-data-ingest',
            ),
            noStaticMeta:
              fullBacktestArgs.includes('--no-static-meta') ||
              !fullBacktestArgs.includes('--with-static-meta'),
            noStaticMl:
              fullBacktestArgs.includes('--no-static-ml') ||
              !fullBacktestArgs.includes('--with-static-ml'),
          }),
        {
          isBlocked: isFullBacktestBlocked,
          fallbackBlocker: 'Full LEAN backtest prerequisites are missing.',
        },
      );
    }
    case 'lean import':
    case 'import-lean-run': {
      const importArgs = key === 'import-lean-run' ? [command, ...rest] : rest;
      const target = firstPositional(importArgs) ?? 'latest';
      return runBlockedAware(
        () =>
          runtime.orchestrator.importLeanRun(target, {
            acceptanceMode: importArgs.includes('--schema-only')
              ? 'schema-import'
              : 'strategy-backtest',
          }),
        {
          isBlocked: isLeanImportBlocked,
          fallbackBlocker: 'LEAN import prerequisites are missing.',
        },
      );
    }
    case 'qc cloud-backtest':
    case 'qc-cloud-backtest': {
      const qcArgs = key === 'qc-cloud-backtest' ? [command, ...rest] : rest;
      const project = firstPositional(qcArgs) ?? 'aggressive_llm_momentum';
      const result = await runtime.orchestrator.runQuantConnectCloudBacktest(
        project,
        {
          push: qcArgs.includes('--push'),
        },
      );
      return { result };
    }
    case 'qc import-backtest':
    case 'import-cloud-backtest': {
      const qcArgs =
        key === 'import-cloud-backtest' ? [command, ...rest] : rest;
      const backtestId =
        argValue(qcArgs, '--backtest-id') ?? firstPositional(qcArgs);
      if (!backtestId) {
        throw new Error('qc import-backtest requires --backtest-id <id>.');
      }
      return {
        result: await runtime.orchestrator.importQuantConnectCloudBacktest({
          projectName:
            argValue(qcArgs, '--project-name') ?? 'aggressive_llm_momentum',
          projectId: numericArgValue(qcArgs, '--project-id'),
          backtestId,
        }),
      };
    }
    case 'qc list-projects':
    case 'list-cloud-projects':
      return {
        result: await runtime.orchestrator.listQuantConnectCloudProjects({
          limit: numericArgValue(rest, '--limit') ?? 100,
        }),
      };
    case 'qc list-backtests':
    case 'list-cloud-backtests': {
      const qcArgs = key === 'list-cloud-backtests' ? [command, ...rest] : rest;
      return {
        result: await runtime.orchestrator.listQuantConnectCloudBacktests({
          projectId: numericArgValue(qcArgs, '--project-id'),
          projectName:
            argValue(qcArgs, '--project-name') ??
            firstPositional(qcArgs) ??
            'aggressive_llm_momentum',
          limit: numericArgValue(qcArgs, '--limit') ?? 20,
        }),
      };
    }
    case 'qc object-store-set':
    case 'qc-object-store-set': {
      const qcArgs = key === 'qc-object-store-set' ? [command, ...rest] : rest;
      const [objectKey, sourcePath] = positionals(qcArgs);
      if (!objectKey || !sourcePath) {
        throw new Error('qc object-store-set requires <key> <sourcePath>.');
      }
      return {
        result: await runtime.orchestrator.syncQuantConnectObjectStore(
          objectKey,
          sourcePath,
        ),
      };
    }
    case 'paper run':
    case 'run-paper-cycle':
      return runBlockedAware(() => runtime.orchestrator.runPaperCycle(), {
        fallbackBlocker: 'Paper cycle prerequisites are missing.',
      });
    case 'paper replay':
    case 'run-paper-replay':
      return runBlockedAware(() => runtime.orchestrator.runPaperReplay(), {
        fallbackBlocker: 'Paper replay prerequisites are missing.',
      });
    case 'shadow run':
    case 'run-live-shadow':
      return { result: await runtime.orchestrator.runLiveShadow() };
    case 'learning run':
    case 'run-learning-loop':
      return { result: await runtime.orchestrator.runLearningLoop() };
    case 'preflight run':
    case 'live-preflight':
      return { result: await runtime.orchestrator.runLivePreflight() };
    case 'live-pilot-10usd':
      return {
        result: await runtime.orchestrator.runLivePilot10Usd(
          rest.includes('--confirm-real-money'),
        ),
      };
    case 'live-flatten':
      return {
        result: {
          status: 'blocked',
          reason: 'Flatten path reserved for verified broker adapter.',
        },
        exitCode: 2,
      };
    default:
      throw new Error(
        `Unknown command: ${key}. Run "bun run lincei -- --help".`,
      );
  }
}

async function runBlockedAware<T>(
  run: () => Promise<T>,
  options: {
    isBlocked?: (message: string) => boolean;
    fallbackBlocker: string;
  },
): Promise<CommandHandlerResult> {
  try {
    return { result: await run() };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : options.fallbackBlocker;
    if (!options.isBlocked || options.isBlocked(message)) {
      return {
        result: {
          status: 'blocked',
          blockers: [message],
        },
        exitCode: 2,
      };
    }
    throw error;
  }
}

function isLegacyCommand(command: string | undefined): command is string {
  return Boolean(command && LEGACY_COMMANDS.has(command));
}

async function dispatchLegacyCommand(
  runtime: LinceiRuntime,
  command: string,
  args: string[],
): Promise<CommandHandlerResult> {
  switch (command) {
    case 'build-hypothesis-registry':
      return dispatchCommand(runtime, ['research', 'corpus', ...args]);
    case 'run-selected-run-bias-check':
      return dispatchCommand(runtime, [
        'research',
        'selected-run-bias',
        ...args,
      ]);
    case 'ingest-semantic-evidence':
      return dispatchCommand(runtime, ['data', 'semantic-evidence', ...args]);
    case 'prepare-lean-local-data':
      return dispatchCommand(runtime, ['data', 'prepare-lean', ...args]);
    case 'run-alpha-cycle':
      return dispatchCommand(runtime, ['alpha', 'run', ...args]);
    case 'train-ml-baseline':
      return dispatchCommand(runtime, ['ml', 'train-baseline', ...args]);
    case 'download-external-baselines':
      return dispatchCommand(runtime, [
        'ml',
        'download-external-baselines',
        ...args,
      ]);
    case 'lean-backtest':
      return dispatchCommand(runtime, ['lean', 'backtest', ...args]);
    case 'run-full-backtest':
      return dispatchCommand(runtime, ['lean', 'full-backtest', ...args]);
    case 'import-lean-run':
      return dispatchCommand(runtime, ['lean', 'import', ...args]);
    case 'qc-cloud-backtest':
      return dispatchCommand(runtime, ['qc', 'cloud-backtest', ...args]);
    case 'import-cloud-backtest':
      return dispatchCommand(runtime, ['qc', 'import-backtest', ...args]);
    case 'list-cloud-projects':
      return dispatchCommand(runtime, ['qc', 'list-projects', ...args]);
    case 'list-cloud-backtests':
      return dispatchCommand(runtime, ['qc', 'list-backtests', ...args]);
    case 'qc-object-store-set':
      return dispatchCommand(runtime, ['qc', 'object-store-set', ...args]);
    case 'run-paper-cycle':
      return dispatchCommand(runtime, ['paper', 'run', ...args]);
    case 'run-paper-replay':
      return dispatchCommand(runtime, ['paper', 'replay', ...args]);
    case 'run-live-shadow':
      return dispatchCommand(runtime, ['shadow', 'run', ...args]);
    case 'run-learning-loop':
      return dispatchCommand(runtime, ['learning', 'run', ...args]);
    case 'live-preflight':
      return dispatchCommand(runtime, ['preflight', 'run', ...args]);
    case 'live-pilot-10usd':
      return {
        result: await runtime.orchestrator.runLivePilot10Usd(
          args.includes('--confirm-real-money'),
        ),
      };
    case 'live-flatten':
      return {
        result: {
          status: 'blocked',
          reason: 'Flatten path reserved for verified broker adapter.',
        },
        exitCode: 2,
      };
    default:
      throw new Error(
        `Unknown legacy command: ${command}. Run "bun run lincei -- --help".`,
      );
  }
}

function printResult(result: unknown, _json: boolean): void {
  console.log(JSON.stringify(result, null, 2));
}

function exitCodeFromResult(result: unknown): number {
  if (!result || typeof result !== 'object') {
    return 0;
  }
  const candidate = result as Record<string, unknown>;
  if (candidate.submitted === false) {
    return 2;
  }
  if (
    candidate.promotionDecision &&
    typeof candidate.promotionDecision === 'object' &&
    (candidate.promotionDecision as Record<string, unknown>).status ===
      'blocked'
  ) {
    return 2;
  }
  if (candidate.status === 'blocked') {
    return 2;
  }
  if (candidate.status === 'failed' || candidate.status === 'rejected') {
    return 1;
  }
  if (candidate.status === 'ready' || candidate.status === 'passed') {
    return 0;
  }
  if (candidate.blockers && Array.isArray(candidate.blockers)) {
    return candidate.blockers.length ? 2 : 0;
  }
  return 0;
}

function argValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index < 0) {
    return undefined;
  }
  const value = args[index + 1];
  return value && !value.startsWith('--') ? value : undefined;
}

function numericArgValue(args: string[], name: string): number | undefined {
  const value = argValue(args, name);
  if (!value) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function csvArgValue(args: string[], name: string): string[] | undefined {
  const value = argValue(args, name);
  return value
    ?.split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function positionals(args: string[]): string[] {
  return args.filter((arg, index) => {
    if (arg.startsWith('--')) {
      return false;
    }
    return index === 0 || !args[index - 1].startsWith('--');
  });
}

function firstPositional(args: string[]): string | undefined {
  return positionals(args)[0];
}

function isLeanImportBlocked(message: string): boolean {
  return (
    message.includes('LEAN strategy-backtest rejected') ||
    message.includes('LEAN schema-import rejected') ||
    message.includes('Latest LEAN run marker not found') ||
    message.includes('No .latest-strategy LEAN run marker found') ||
    message.includes('No .latest LEAN run marker found') ||
    message.includes('Missing statistics.json')
  );
}

function isFullBacktestBlocked(message: string): boolean {
  return (
    message.includes('Must be subscribed to map and factor files') ||
    message.includes('QuantConnect data entitlement blocker') ||
    message.includes('Local LEAN daily data is blocked') ||
    message.includes('Paid local QC data download is disabled') ||
    message.includes('Stooq CSV download requires STOOQ_API_KEY') ||
    message.includes('Docker is unavailable to the current process') ||
    message.includes('Missing lean.json')
  );
}

function isAlphaCycleBlocked(message: string): boolean {
  return (
    message.includes('Insufficient market data') ||
    message.includes('ALLOW_SYNTHETIC_FEATURES=true')
  );
}

function helpText(): string {
  return `lincei operator CLI

Usage:
  bun --cwd=backend run lincei -- capital run --max-backtest-workers 1 --json
  bun --cwd=backend run lincei -- capital status --json

Core commands:
  capital run                         Run the capital evidence vertical slice
  capital status                      Show V1 capital evidence status
  research corpus                     Ingest Alpha Architect research corpus
  research selected-run-bias          Check retained variant evidence
  data semantic-evidence              Ingest Hugging Face FOMC text evidence
  data prepare-lean                   Prepare point-in-time bars for LEAN
  alpha run                           Build numeric, LLM-derived, and combined alpha
  lean full-backtest                  Run local LEAN evidence path
  lean import <latest|run-id>          Import LEAN artifacts
  qc list-projects                    Check QuantConnect Cloud credentials/projects
  qc list-backtests                   List QuantConnect Cloud backtests
  qc import-backtest --backtest-id ID  Import Cloud backtest artifacts
  paper run                           Run current paper trading bridge
  shadow run                          Record shadow trading would-have-traded state
  learning run                        Label outcomes and record promotion decision
  preflight run                       Run broker-write pre-trade risk check

Legacy script command names remain accepted during migration.`;
}

if (require.main === module) {
  runLinceiCli().then((code) => {
    process.exitCode = code;
  });
}
