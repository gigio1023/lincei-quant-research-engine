import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { createLinceiRuntime } from './create-lincei-runtime';

describe('createLinceiRuntime', () => {
  it('creates a framework-neutral runtime without booting Nest', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'lincei-runtime-'));
    const runtime = await createLinceiRuntime({
      databasePath: join(dir, 'runtime.sqlite'),
      synchronize: true,
      dropSchema: true,
      loadEnv: false,
    });

    try {
      expect(runtime.dataSource.isInitialized).toBe(true);
      expect(runtime.orchestrator).toBeDefined();
      expect(runtime.statusService).toBeDefined();
      expect(runtime.capitalEvidenceSliceService).toBeDefined();
    } finally {
      await runtime.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
