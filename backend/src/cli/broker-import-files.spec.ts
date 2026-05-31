import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  parseFillCsv,
  parseSnapshotCsv,
  readBrokerFillImportFile,
  readBrokerSnapshotImportFile,
} from './broker-import-files';

describe('broker import file parsing', () => {
  it('parses a manual read-only broker snapshot CSV', () => {
    const result = parseSnapshotCsv(
      [
        'asOf,currency,cash,equity,symbol,assetClass,quantity,marketValue,weightPct,averagePrice',
        '2026-06-01T00:00:00.000Z,KRW,1000000,2500000,SMH,foreign_etf,3,1500000,0.6,500000',
      ].join('\n'),
      'snapshot.csv',
    );

    expect(result).toEqual(
      expect.objectContaining({
        provider: undefined,
        sourceRef: 'snapshot.csv',
        asOf: '2026-06-01T00:00:00.000Z',
        cash: 1000000,
        equity: 2500000,
        positions: [
          expect.objectContaining({
            symbol: 'SMH',
            assetClass: 'foreign_etf',
            quantity: 3,
            marketValue: 1500000,
            weightPct: 0.6,
          }),
        ],
      }),
    );
  });

  it('parses manual read-only broker fills CSV', () => {
    const result = parseFillCsv(
      [
        'brokerFillRef,filledAt,symbol,side,quantity,fillPrice,fee,currency',
        'fill-1,2026-06-01T00:00:00.000Z,SMH,BUY,3,500000,100,KRW',
      ].join('\n'),
      'fills.csv',
    );

    expect(result).toEqual([
      expect.objectContaining({
        sourceRef: 'fills.csv',
        brokerFillRef: 'fill-1',
        symbol: 'SMH',
        side: 'BUY',
        quantity: 3,
        fillPrice: 500000,
        fee: 100,
      }),
    ]);
  });

  it('rejects manual files that claim Toss provider authority', () => {
    expect(() =>
      parseFillCsv(
        [
          'provider,brokerFillRef,filledAt,symbol,side,quantity,fillPrice',
          'toss,fill-1,2026-06-01T00:00:00.000Z,SMH,BUY,3,500000',
        ].join('\n'),
        'fills.csv',
      ),
    ).toThrow('provider manual or simulated');
  });

  it('validates JSON broker snapshot fields before import', () => {
    const path = writeTempJson('snapshot.json', {
      asOf: '2026-06-01T00:00:00.000Z',
      currency: 'KRW',
      cash: 1000000,
      equity: 2500000,
      positions: [
        {
          symbol: 'SMH',
          assetClass: 'foreign_etf',
          quantity: 3,
          marketValue: 1500000,
        },
      ],
    });

    expect(readBrokerSnapshotImportFile(path)).toEqual(
      expect.objectContaining({
        cash: 1000000,
        positions: [
          expect.objectContaining({
            symbol: 'SMH',
            assetClass: 'foreign_etf',
            marketValue: 1500000,
          }),
        ],
      }),
    );
  });

  it('rejects malformed JSON broker snapshot positions', () => {
    const path = writeTempJson('snapshot.json', {
      asOf: '2026-06-01T00:00:00.000Z',
      cash: 1000000,
      equity: 2500000,
      positions: [
        {
          symbol: 'SMH',
          assetClass: 'foreign_etf',
          marketValue: 'not-a-number',
        },
      ],
    });

    expect(() => readBrokerSnapshotImportFile(path)).toThrow(
      'Invalid numeric broker import value',
    );
  });

  it('rejects malformed JSON broker fill sides', () => {
    const path = writeTempJson('fills.json', [
      {
        brokerFillRef: 'fill-1',
        filledAt: '2026-06-01T00:00:00.000Z',
        symbol: 'SMH',
        side: 'HOLD',
        quantity: 3,
        fillPrice: 500000,
      },
    ]);

    expect(() => readBrokerFillImportFile(path)).toThrow(
      'Unsupported broker fill side',
    );
  });
});

function writeTempJson(name: string, value: unknown): string {
  const directory = mkdtempSync(join(tmpdir(), 'lincei-broker-import-'));
  const path = join(directory, name);
  writeFileSync(path, JSON.stringify(value));
  return path;
}
