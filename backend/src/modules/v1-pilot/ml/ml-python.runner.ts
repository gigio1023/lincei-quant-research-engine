import { Injectable, Logger } from '@nestjs/common';
import { execFileSync } from 'child_process';
import { existsSync } from 'fs';
import { join, resolve } from 'path';

@Injectable()
export class MlPythonRunner {
  private readonly logger = new Logger(MlPythonRunner.name);
  private readonly repoRoot = resolve(process.cwd(), '..');

  private resolvePythonBin(): string {
    if (process.env.ML_PYTHON_BIN) {
      return process.env.ML_PYTHON_BIN;
    }
    const venvPython = join(this.repoRoot, '.venv-ml/bin/python');
    if (existsSync(venvPython)) {
      return venvPython;
    }
    return 'python3';
  }

  runJsonScript<T>(relativeScript: string, payload: unknown): T {
    const python = this.resolvePythonBin();
    const scriptPath = join(this.repoRoot, relativeScript);
    if (!existsSync(scriptPath)) {
      throw new Error(`ML script not found: ${relativeScript}`);
    }
    const stdout = execFileSync(
      python,
      [scriptPath],
      {
        cwd: this.repoRoot,
        env: {
          ...process.env,
          PYTHONPATH: this.repoRoot,
        },
        input: JSON.stringify(payload),
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024,
      },
    );
    return JSON.parse(stdout) as T;
  }

  runExternalBaselineDownload(): Record<string, unknown> {
    const python = this.resolvePythonBin();
    const stdout = execFileSync(python, ['-m', 'ml.external.download_baselines'], {
      cwd: this.repoRoot,
      env: {
        ...process.env,
        PYTHONPATH: this.repoRoot,
      },
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    });
    this.logger.log('External tabular baseline download completed');
    return JSON.parse(stdout) as Record<string, unknown>;
  }

  runTraining(): Record<string, unknown> {
    const python = this.resolvePythonBin();
    const scriptPath = join(this.repoRoot, 'ml/training/train_lightgbm_baseline.py');
    const stdout = execFileSync(python, [scriptPath], {
      cwd: this.repoRoot,
      env: {
        ...process.env,
        PYTHONPATH: this.repoRoot,
        DATABASE_PATH:
          process.env.DATABASE_PATH ?? join(this.repoRoot, 'backend/data/investment.db'),
      },
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    });
    this.logger.log('LightGBM baseline training completed');
    return JSON.parse(stdout) as Record<string, unknown>;
  }
}
