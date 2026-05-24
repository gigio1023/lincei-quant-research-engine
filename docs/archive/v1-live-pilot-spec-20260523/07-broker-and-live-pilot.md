# Broker And Live Pilot

Status: archived and superseded. This file is historical context only; it does not authorize live-money or broker-write work. See [../../../SPEC.md](../../../SPEC.md).

## Broker Strategy

Toss Securities is a plausible target broker, but Toss is not a native QuantConnect/LEAN brokerage in the official supported brokerage list. Therefore V1 uses this structure:

```text
LEAN generates insights and targets
-> backend imports targets
-> backend runs risk/live preflight
-> backend broker adapter submits at most 10 USD
-> backend polls status/fills
-> backend reconciles positions
```

Do not try to force Toss into LEAN live deploy for V1.

## Broker Adapter Interface

```ts
interface BrokerAdapter {
  getAccountSnapshot(): Promise<BrokerSnapshot>;
  getOpenOrders(): Promise<BrokerOrderStatus[]>;
  getFills(since: Date): Promise<BrokerFill[]>;
  previewOrder(intent: ExecutionIntent): Promise<OrderPreview>;
  submitOrder(intent: ExecutionIntent): Promise<BrokerOrderStatus>;
  cancelOrder(orderRefHash: string): Promise<BrokerOrderStatus>;
  flatten(symbol: string): Promise<BrokerOrderStatus>;
}
```

Implementation must include:

- mock adapter for tests;
- read-only adapter behavior;
- write adapter only after provider schema verification;
- idempotency key support;
- hashed refs in persistence.

## Toss Requirements

Before Toss write mode is allowed:

- Toss Open API credentials exist;
- official schema is fetched and reviewed;
- order create schema verified;
- order cancel/modify schema verified;
- account/holdings schema verified;
- fills/executions schema verified;
- rate limits known;
- sandbox or tiny-live behavior explicitly accepted;
- account supports the pilot instrument and minimum order size.

If any item is unknown, live preflight must be `blocked`.

## 10 USD Pilot Policy

Hard policy:

```text
max total live notional: 10 USD
max single order notional: 5 USD unless policy override says 10 USD
leverage: disabled
margin: disabled
short: disabled
options/futures: disabled
market orders: disabled by default
preferred order type: limit
max holding time: 1 trading day unless flattened earlier
daily loss stop: 1 USD or 10%, whichever triggers first
```

The first live pilot is a plumbing verification, not a profit target.

## Live Preflight Gates

All gates must pass:

- latest LEAN backtest passed;
- latest alpha decisions are schema-valid;
- latest paper cycle succeeded;
- paper and broker read-only snapshots are reconciled or explicitly compatible;
- no unknown open orders;
- kill switch is not tripped;
- live flags enabled;
- broker write adapter ready;
- cancel or flatten path ready;
- order notional <= 10 USD;
- idempotency key unused or replay-safe;
- credentials are isolated from LLM/frontend.

Unknown means blocked.

## Live Commands

```bash
./scripts/live-preflight
./scripts/live-pilot-10usd --confirm-real-money
./scripts/live-flatten --confirm-real-money
```

`live-pilot-10usd` must refuse to run without the exact confirmation flag.

## Reconciliation

After submit:

1. store broker order status;
2. poll open orders;
3. poll fills;
4. reconcile fills to execution intent;
5. reconcile final broker snapshot;
6. store live pilot report.

Any mismatch should trip a blocker for further live exposure.
