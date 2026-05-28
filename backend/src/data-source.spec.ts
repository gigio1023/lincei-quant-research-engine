import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

describe('data-source env loading', () => {
  const originalEnv = { ...process.env };
  let tempDir: string;

  beforeEach(() => {
    jest.resetModules();
    tempDir = mkdtempSync(join(tmpdir(), 'lincei-data-source-env-'));
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('loads repo env aliases before CLI runtime services inspect credentials', async () => {
    const envPath = join(tempDir, '.env');
    writeFileSync(
      envPath,
      [
        'QUANTCONNECT_USER_ID=test-user',
        'QUANTCONNECT_API_TOKEN=test-token',
        'OPENAI_API_KEY=test-openai-key',
      ].join('\n'),
    );
    process.env.LINCEI_ENV_FILE = envPath;

    await import('./data-source');

    expect(process.env.QUANTCONNECT_USER_ID).toBe('test-user');
    expect(process.env.QUANTCONNECT_API_TOKEN).toBe('test-token');
    expect(process.env.OPENAI_API_KEY).toBe('test-openai-key');
  });
});
