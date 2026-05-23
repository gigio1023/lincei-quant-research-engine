import { writeFileSync } from 'fs';
import { join } from 'path';

export type LeanCliFailureDiagnosticsInput = {
  outputDirectory: string;
  runId: string;
  projectName: string;
  args: string[];
  diagnostic: string;
  stdout: string;
  stderr: string;
  latestLog?: { path: string; text: string };
  matchedBacktestDirectory?: string;
  dataMonitorReportPath?: string;
};

export function summarizeLeanCliFailure(input: {
  stdout?: string;
  stderr?: string;
  logText?: string;
}): string {
  const text = [input.stderr, input.stdout, input.logText]
    .filter((value): value is string => Boolean(value?.trim()))
    .join('\n');
  const signalLines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) =>
      /ERROR::|Runtime Error|Exception|Must be|Unable to|couldn.t|not found|not subscribed|Error:/i.test(
        line,
      ),
    )
    .filter(
      (line) =>
        !/pkg_resources is deprecated|Skipping FileLoadException/i.test(line),
    );
  const uniqueTail = Array.from(new Set(signalLines)).slice(-8);
  const summary =
    uniqueTail.length > 0
      ? uniqueTail.join(' | ')
      : 'no diagnostic output captured from LEAN';

  return summary.length > 1800 ? `${summary.slice(0, 1800)}...` : summary;
}

export function writeLeanCliFailureDiagnostics(
  input: LeanCliFailureDiagnosticsInput,
): void {
  writeFileSync(
    join(input.outputDirectory, 'lean-cli-failure.json'),
    `${JSON.stringify(
      {
        runId: input.runId,
        projectName: input.projectName,
        args: input.args,
        diagnostic: input.diagnostic,
        matchedBacktestDirectory: input.matchedBacktestDirectory,
        latestLogPath: input.latestLog?.path,
        dataMonitorReportPath: input.dataMonitorReportPath,
        stdoutTail: tailText(input.stdout),
        stderrTail: tailText(input.stderr),
        latestLogTail: tailText(input.latestLog?.text ?? ''),
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
}

function tailText(text: string, maxChars = 6000): string {
  return text.length > maxChars ? text.slice(-maxChars) : text;
}
