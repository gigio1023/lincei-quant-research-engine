/**
 * Loads repo-root `.env` into process.env (never committed). Backend cwd is usually `backend/`.
 */
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

export function resolveRepoRoot(): string {
  return resolve(process.cwd(), '..');
}

export function resolveRepoEnvPath(): string {
  if (process.env.LINCEI_ENV_FILE) {
    return resolve(process.env.LINCEI_ENV_FILE);
  }
  const repoRoot = resolveRepoRoot();
  const rootEnv = resolve(repoRoot, '.env');
  if (existsSync(rootEnv)) {
    return rootEnv;
  }
  return resolve(process.cwd(), '.env');
}

export function loadRepoEnv(): string {
  const envPath = resolveRepoEnvPath();
  if (!existsSync(envPath)) {
    return envPath;
  }

  const lines = readFileSync(envPath, 'utf8').split('\n');
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      return;
    }
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) {
      return;
    }
    const key = trimmed.slice(0, separatorIndex).trim();
    if (process.env[key] !== undefined) {
      return;
    }
    const value = trimmed
      .slice(separatorIndex + 1)
      .trim()
      .replace(/^['"]|['"]$/g, '');
    process.env[key] = value;
  });

  const databasePath = process.env.DATABASE_PATH;
  if (databasePath && !databasePath.startsWith('/')) {
    const base = databasePath.startsWith('backend/')
      ? resolveRepoRoot()
      : process.cwd();
    process.env.DATABASE_PATH = resolve(base, databasePath);
  }

  return envPath;
}
