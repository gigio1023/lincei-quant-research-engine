# Toss Securities Open API Readiness

Date checked: 2026-05-23 KST.

## Official Sources Checked

- Toss Securities Open API landing page: https://corp.tossinvest.com/ko/open-api
- Toss Securities developer docs: https://developers.tossinvest.com/docs
- Toss Securities landing client bundle: https://corp.tossinvest.com/assets/_next/static/chunks/60657154-cbc517e74d7a6003.js
- Toss Securities developer docs client bundle: https://developers.tossinvest.com/assets/_next/static/chunks/0mslude0jkfn5.js
- Public docs app references:
  - https://openapi.tossinvest.com/openapi-docs/latest/openapi.json
  - https://openapi.tossinvest.com/openapi-docs/overview.md

## What The Official Pages Indicate

Toss Securities has an Open API surface and a developer guide site. The landing page client bundle shows examples for:

- client-credentials token request at `/oauth2/token`;
- account lookup at `/api/v1/accounts`;
- order placement at `/api/v1/orders`;
- holdings lookup using a bearer token and `X-Tossinvest-Account`;
- market data, symbol/market information, FX/reference information, balance/portfolio, holdings, and orderable amount lookup surfaces;
- order create, cancel, and modify examples;
- domestic and overseas stock trading;
- API key issuance after pre-application through Toss Securities PC.

An official order example references `clientOrderId`, but idempotency semantics are not verified because the raw OpenAPI schema is not accessible from this environment.

The landing page also states operational limits and responsibility boundaries:

- pre-application requires a Toss Securities account;
- API key issuance may happen later than the application;
- withdrawal and FX exchange are not available through the API;
- API trading is for the investor's own trading purpose;
- external distribution or commercial use requires terms review;
- API calls and features may be limited or changed without prior notice;
- responses may be delayed or temporarily unavailable;
- order acceptance, order fills, and cancellation/modification responses may be delayed or missed;
- market data may be delayed or inaccurate due to exchange, vendor, or network conditions;
- automated repeated trading, duplicate orders, order errors, and losses remain the investor's responsibility;
- external tools may receive account information and transaction history, so leakage and misuse risk remains with the investor;
- API keys must be kept private.

## What Is Not Yet Verified

The raw OpenAPI schema URLs are referenced by the official developer docs app, but direct shell requests from this environment returned `403` responses on both 2026-05-22 and 2026-05-23 KST. That means the exact endpoint schema, enum values, rate limits, sandbox behavior, and error models are not verified in this repo yet.

Before implementing a Toss adapter, verify:

- whether a sandbox or paper environment is available;
- exact auth flow and token lifetime;
- account id format and account permission model;
- order idempotency support;
- market data terms and delay status;
- rate limits;
- order preview or buying-power check support;
- cancel/replace support;
- partial fill and execution report format;
- webhook or polling expectations;
- allowed use of automated strategies under current terms.

I did not find an official Toss sandbox or paper-trading environment in the public sources checked. The `openapi-alpha` host references in the docs app are not sufficient evidence of a user-facing sandbox. Until verified otherwise, Toss write endpoints must be treated as real-money order capability.

## Integration Verdict

Toss is a plausible first broker-adapter candidate, but this repo is not ready to use Toss for real money.

Required before real-money use:

1. obtain Toss Open API access and API keys;
2. fetch and review the OpenAPI schema;
3. generate a typed client in an isolated broker adapter package;
4. implement read-only account and holdings snapshots first;
5. implement paper execution or a local simulator with the same order-plan interface;
6. add signed human approval and idempotency keys;
7. add reconciliation and kill-switch tests;
8. only then consider a tiny live pilot.

No LLM or research process should receive Toss credentials or directly call Toss order endpoints.
