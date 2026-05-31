import { runLinceiCli } from './lincei';

describe('lincei CLI', () => {
  const originalLog = console.log;

  afterEach(() => {
    console.log = originalLog;
  });

  it('prints help without creating the runtime', async () => {
    const lines: string[] = [];
    console.log = jest.fn((line: string) => lines.push(line));

    const exitCode = await runLinceiCli(['--help']);

    expect(exitCode).toBe(0);
    expect(lines.join('\n')).toContain('capital run');
    expect(lines.join('\n')).toContain('capital triage');
    expect(lines.join('\n')).toContain('broker status');
    expect(lines.join('\n')).toContain('broker import-snapshot');
    expect(lines.join('\n')).toContain('Hugging Face FOMC text evidence');
  });
});
