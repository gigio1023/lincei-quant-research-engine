import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'fs';
import { join } from 'path';

export function prepareRunLeanConfig(input: {
  leanWorkspace: string;
  runId: string;
  downloadData: boolean;
}): string {
  const sourcePath = join(input.leanWorkspace, 'lean.json');
  const config = JSON.parse(readFileSync(sourcePath, 'utf8')) as Record<
    string,
    unknown
  >;
  config['data-folder'] = join(input.leanWorkspace, 'data');

  if (!input.downloadData) {
    delete config['map-file-provider'];
    delete config['factor-file-provider'];
    delete config['data-provider-historical'];
  }

  const runConfigPath = join(
    input.leanWorkspace,
    `.lean-cli-config-${input.runId}.json`,
  );
  mkdirSync(input.leanWorkspace, { recursive: true });
  writeFileSync(runConfigPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');

  return runConfigPath;
}

export function copyArtifactsFromBacktestDirectory(input: {
  backtestDirectory?: string;
  outputDirectory: string;
  runId: string;
}): void {
  if (!input.backtestDirectory) {
    return;
  }
  const resultArtifactDir = join(
    input.backtestDirectory,
    'lincei-artifacts',
    input.runId,
  );
  if (existsSync(resultArtifactDir)) {
    cpSync(resultArtifactDir, input.outputDirectory, { recursive: true });
  }
}

export function copyDataMonitorReport(input: {
  backtestDirectory?: string;
  outputDirectory: string;
}): string | undefined {
  if (!input.backtestDirectory) {
    return undefined;
  }
  const reportName = readdirSync(input.backtestDirectory)
    .filter(
      (name) =>
        name.startsWith('data-monitor-report-') && name.endsWith('.json'),
    )
    .sort()
    .pop();
  if (!reportName) {
    return undefined;
  }
  const reportPath = join(input.backtestDirectory, reportName);
  cpSync(reportPath, join(input.outputDirectory, 'data-monitor-report.json'));
  return reportPath;
}

export function findBacktestDirectoryForRunId(input: {
  leanWorkspace: string;
  projectName: string;
  runId: string;
}): string | undefined {
  const backtestsRoot = join(
    input.leanWorkspace,
    input.projectName,
    'backtests',
  );
  if (!existsSync(backtestsRoot)) {
    return undefined;
  }
  return readdirSync(backtestsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== 'lincei-artifacts')
    .map((entry) => join(backtestsRoot, entry.name))
    .filter((directory) =>
      existsSync(join(directory, 'lincei-artifacts', input.runId)),
    )
    .sort((a, b) => statSync(a).mtimeMs - statSync(b).mtimeMs)
    .pop();
}

export function latestBacktestDirectory(input: {
  leanWorkspace: string;
  projectName: string;
}): string | undefined {
  const backtestsRoot = join(
    input.leanWorkspace,
    input.projectName,
    'backtests',
  );
  if (!existsSync(backtestsRoot)) {
    return undefined;
  }
  return readdirSync(backtestsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== 'lincei-artifacts')
    .map((entry) => join(backtestsRoot, entry.name))
    .sort()
    .pop();
}

export function readLeanLog(
  backtestDirectory: string | undefined,
): { path: string; text: string } | undefined {
  if (!backtestDirectory) {
    return undefined;
  }
  const logName = readdirSync(backtestDirectory).find(
    (name) => name === 'log.txt',
  );
  const fallbackLogName = readdirSync(backtestDirectory).find((name) =>
    name.endsWith('-log.txt'),
  );
  const selected = logName ?? fallbackLogName;
  if (!selected) {
    return undefined;
  }
  const path = join(backtestDirectory, selected);

  return { path, text: readFileSync(path, 'utf8') };
}
