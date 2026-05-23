# Environment And Secrets

## OpenAI Environment Source

Use this file for OpenAI SDK configuration:

```text
/Users/naem1023/git/iyuno-ai-engineer-task/.env
```

The user originally wrote `iyuno-ai-engienering-task`, but the local directory found on 2026-05-23 is:

```text
/Users/naem1023/git/iyuno-ai-engineer-task
```

Do not copy this `.env` into this repository. Do not commit secrets.

## Allowed LLM Variables

The implementation may read these variables:

```text
OPENAI_API_KEY
OPENAI_BASE_URL
OPENAI_MODEL
OPENAI_SERVICE_ACCOUNT
REQUEST_TIMEOUT_S
COST_BUDGET_USD
MAX_PARALLEL
```

Use the official OpenAI SDK. If `OPENAI_BASE_URL` is present, validate that it points to the official OpenAI API or an explicitly approved OpenAI-compatible internal endpoint. Reject OpenRouter endpoints.

## Forbidden Variables

These variables may exist in the external `.env`, but V1 must not use them:

```text
OPENROUTER_API_KEY
OPENROUTER_BASE_URL
OPENROUTER_MODEL
OPENROUTER_REASONING_EFFORT
```

Implementation requirement:

- fail startup if `LLM_PROVIDER=openrouter`;
- fail startup if a selected base URL contains `openrouter`;
- do not fall back from missing OpenAI config to OpenRouter;
- do not print env values in logs;
- do not include API keys in artifacts, prompts, or traces.

## Suggested Loader Behavior

For local development, support:

```bash
LINCEI_OPENAI_ENV_FILE=/Users/naem1023/git/iyuno-ai-engineer-task/.env
```

If `LINCEI_OPENAI_ENV_FILE` is unset, default to the same absolute path for local dev. In CI, require explicit env injection.

## Broker Environment

Broker variables must be separate from LLM variables. Suggested names:

```text
BROKER_PROVIDER
BROKER_WRITE_ENABLED
LIVE_TRADING_ENABLED
MAX_LIVE_PILOT_NOTIONAL_USD
BROKER_CREDENTIAL_SECRET_REF
TOSS_CLIENT_ID
TOSS_CLIENT_SECRET
TOSS_ACCOUNT_REF
TOSS_OPEN_API_SCHEMA_VERIFIED
TOSS_ORDER_SCHEMA_VERIFIED
TOSS_SANDBOX_VERIFIED
```

Real broker write access requires:

- `BROKER_WRITE_ENABLED=true`;
- `LIVE_TRADING_ENABLED=true`;
- `MAX_LIVE_PILOT_NOTIONAL_USD=10`;
- schema verified;
- open-order polling implemented;
- fill polling implemented;
- cancel or flatten implemented;
- kill switch not tripped.

## Logging Rules

Never log:

- API keys;
- raw account ids;
- raw broker order ids;
- access tokens;
- refresh tokens;
- full request bodies to broker endpoints.

Allowed logs:

- hashed account refs;
- hashed order refs;
- status enum;
- amount caps;
- blocker reasons;
- artifact hashes.
