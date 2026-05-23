/**
 * Loads OpenAI credentials from an external env file (never committed) and rejects OpenRouter routing.
 *
 * Invariant: V1 LLM alpha must not silently fall back to forbidden providers; misconfiguration fails fast
 * at load time rather than at runtime inside a trading cycle.
 */
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

export type OpenAiEnvSnapshot = {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  requestTimeoutS?: number;
  costBudgetUsd?: number;
  maxParallel?: number;
  sourcePath: string;
};

const DEFAULT_OPENAI_ENV_FILE =
  '/Users/naem1023/git/iyuno-ai-engineer-task/.env';

export function loadOpenAiEnv(
  envFile = process.env.LINCEI_OPENAI_ENV_FILE ?? DEFAULT_OPENAI_ENV_FILE,
): OpenAiEnvSnapshot {
  const sourcePath = resolve(envFile);
  const merged = { ...process.env };

  if (existsSync(sourcePath)) {
    const lines = readFileSync(sourcePath, 'utf8').split('\n');
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
      const value = trimmed.slice(separatorIndex + 1).trim();
      merged[key] = value.replace(/^['"]|['"]$/g, '');
    });
  }

  assertOpenAiEnvAllowed(merged);

  return {
    apiKey: merged.OPENAI_API_KEY,
    baseUrl: merged.OPENAI_BASE_URL,
    model: merged.OPENAI_MODEL,
    requestTimeoutS: merged.REQUEST_TIMEOUT_S
      ? Number(merged.REQUEST_TIMEOUT_S)
      : undefined,
    costBudgetUsd: merged.COST_BUDGET_USD
      ? Number(merged.COST_BUDGET_USD)
      : undefined,
    maxParallel: merged.MAX_PARALLEL ? Number(merged.MAX_PARALLEL) : undefined,
    sourcePath,
  };
}

export function assertOpenAiEnvAllowed(env: NodeJS.ProcessEnv): void {
  // Fail closed: OpenRouter is explicitly out of scope for V1 (see docs/v1-live-pilot-spec/05-environment-and-secrets.md).
  if ((env.LLM_PROVIDER ?? '').toLowerCase() === 'openrouter') {
    throw new Error('LLM_PROVIDER=openrouter is forbidden for V1 live pilot.');
  }

  const baseUrl = (env.OPENAI_BASE_URL ?? '').toLowerCase();
  if (baseUrl.includes('openrouter')) {
    throw new Error('OPENAI_BASE_URL must not point to OpenRouter.');
  }
}
