import { mapTossReadOnlySnapshot } from './toss-read-only.mapper';

describe('mapTossReadOnlySnapshot', () => {
  it('maps a defensive Toss holdings shape into a read-only broker snapshot request', () => {
    const mapped = mapTossReadOnlySnapshot({
      accountRef: '12345678',
      asOf: '2026-05-23T09:00:00.000Z',
      holdings: {
        cashBalance: '6,500,000',
        totalEvaluationAmount: '10,000,000',
        items: [
          {
            stockCode: '005930',
            stockName: 'Samsung Electronics',
            marketValue: '3,500,000',
            market: 'KOREA',
          },
          {
            stockCode: 'ZERO',
            marketValue: 0,
          },
        ],
      },
    });

    expect(mapped).toEqual({
      provider: 'toss',
      sourceRef: 'toss-read-only-poll',
      accountRef: '12345678',
      asOf: '2026-05-23T09:00:00.000Z',
      currency: 'KRW',
      cash: 6_500_000,
      equity: 10_000_000,
      positions: [
        {
          symbol: '005930',
          assetClass: 'domestic_stock',
          marketValue: 3_500_000,
          weightPct: 35,
        },
      ],
    });
  });

  it('throws when the holdings shape is missing cash evidence', () => {
    expect(() =>
      mapTossReadOnlySnapshot({
        accountRef: '12345678',
        asOf: '2026-05-23T09:00:00.000Z',
        holdings: {
          items: [],
        },
      }),
    ).toThrow('Toss read-only holdings response is missing cash');
  });
});
