import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { LeanCliRunner } from './lean-cli.runner';
import { summarizeLeanCliFailure } from './lean-cli-failure-diagnostics';

describe('LeanCliRunner environment', () => {
  const originalEnv = { ...process.env };
  let tempHome: string;
  let tempTmpDir: string;

  beforeEach(() => {
    tempHome = mkdtempSync(join(tmpdir(), 'lean-home-'));
    const repoTmpRoot = join(resolve(process.cwd(), '..'), '.tmp');
    mkdirSync(repoTmpRoot, { recursive: true });
    tempTmpDir = mkdtempSync(join(repoTmpRoot, 'lean-tmp-'));
    process.env = { ...originalEnv };
    delete process.env.DOCKER_HOST;
    process.env.HOME = tempHome;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    rmSync(tempHome, { recursive: true, force: true });
    rmSync(tempTmpDir, { recursive: true, force: true });
  });

  it('exposes Colima Docker and repo-local temp paths to LEAN', () => {
    const socketPath = join(tempHome, '.colima/default/docker.sock');
    mkdirSync(join(tempHome, '.colima/default'), { recursive: true });
    writeFileSync(socketPath, '');
    process.env.TMPDIR = '/var/folders/mock/';

    const env = new LeanCliRunner().buildLeanProcessEnv();
    const leanTmpDir = join(resolve(process.cwd(), '..'), '.tmp/lean-cli');

    expect(env.DOCKER_HOST).toBe(`unix://${socketPath}`);
    expect(env.TMPDIR).toBe(`${leanTmpDir}/`);
    expect(existsSync(leanTmpDir)).toBe(true);
  });

  it('preserves explicit Docker and temp configuration', () => {
    process.env.DOCKER_HOST = 'unix:///custom/docker.sock';
    process.env.TMPDIR = `${tempTmpDir}/`;

    const env = new LeanCliRunner().buildLeanProcessEnv();

    expect(env.DOCKER_HOST).toBe('unix:///custom/docker.sock');
    expect(env.TMPDIR).toBe(`${tempTmpDir}/`);
  });
});

describe('LeanCliRunner cost guards', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('blocks local QuantConnect data download before checking LEAN prerequisites', () => {
    process.env = { ...originalEnv };
    delete process.env.ALLOW_PAID_QC_LOCAL_DATA_DOWNLOAD;

    expect(() =>
      new LeanCliRunner().runBacktest({
        downloadData: true,
      }),
    ).toThrow('Paid local QC data download is disabled');
  });
});

describe('summarizeLeanCliFailure', () => {
  it('extracts actionable LEAN errors from buffered output', () => {
    const summary = summarizeLeanCliFailure({
      stdout: [
        'TRACE:: Engine.Main(): Started',
        'ERROR:: Engine.Run(): During initialization, ApiDataProvider(): Must be subscribed to map and factor files.',
        'TRACE:: Engine.Main(): Analysis Completed',
      ].join('\n'),
      stderr: 'pkg_resources is deprecated as an API',
    });

    expect(summary).toContain('Must be subscribed to map and factor files');
    expect(summary).toContain('QuantConnect data entitlement blocker');
    expect(summary).not.toContain('pkg_resources');
  });
});
