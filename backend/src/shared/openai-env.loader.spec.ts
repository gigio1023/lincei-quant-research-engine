import { assertOpenAiEnvAllowed, loadOpenAiEnv } from './openai-env.loader';

describe('openai-env.loader', () => {
  it('rejects_openrouter_provider', () => {
    expect(() =>
      assertOpenAiEnvAllowed({
        LLM_PROVIDER: 'openrouter',
      } as NodeJS.ProcessEnv),
    ).toThrow('openrouter');
  });

  it('rejects_openrouter_base_url', () => {
    expect(() =>
      assertOpenAiEnvAllowed({
        OPENAI_BASE_URL: 'https://openrouter.ai/api/v1',
      } as NodeJS.ProcessEnv),
    ).toThrow('OpenRouter');
  });

  it('loads_without_openrouter_keys', () => {
    const snapshot = loadOpenAiEnv('/dev/null');
    expect(snapshot.sourcePath).toContain('/dev/null');
  });
});
