import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { loadRepoEnv } from './repo-env.loader';

describe('loadRepoEnv', () => {
  const originalEnv = { ...process.env };
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'repo-env-'));
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('resolves root env backend database paths under the repository backend directory', () => {
    const envPath = join(tempDir, '.env');
    writeFileSync(envPath, 'DATABASE_PATH=backend/data/investment.db\n');
    process.env.LINCEI_ENV_FILE = envPath;

    loadRepoEnv();

    expect(process.env.DATABASE_PATH).toBe(
      resolve(process.cwd(), '..', 'backend/data/investment.db'),
    );
  });
});
