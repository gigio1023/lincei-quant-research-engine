import { MockBrokerAdapter } from './mock-broker.adapter';
import { ExecutionIntentContract } from '../contracts/v1-pilot.contracts';

describe('MockBrokerAdapter', () => {
  const adapter = new MockBrokerAdapter();

  const intent = (notionalUsd: number): ExecutionIntentContract => ({
    id: 'intent-1',
    mode: 'live',
    source: 'lean-target',
    symbol: 'SPY',
    side: 'buy',
    orderType: 'limit',
    notionalUsd,
    limitPrice: 100,
    timeInForce: 'day',
    maxSlippageBps: 20,
    idempotencyKey: `live-${notionalUsd}`,
    approvalRef: 'approval',
    intentHash: 'sha256:intent',
  });

  it('blocks_preview_above_10_usd_cap', async () => {
    const preview = await adapter.previewOrder(intent(12));
    expect(preview.allowed).toBe(false);
  });

  it('replays_submit_by_idempotency_key', async () => {
    const first = await adapter.submitOrder(intent(5));
    const second = await adapter.submitOrder(intent(5));
    expect(second.orderRefHash).toBe(first.orderRefHash);
  });
});
