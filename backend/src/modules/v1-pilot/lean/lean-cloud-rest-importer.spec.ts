import { mkdirSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';
import { QuantConnectCloudRestImporter } from './lean-cloud-rest-importer';

describe('QuantConnectCloudRestImporter', () => {
  const tempRoot = join(process.cwd(), 'tmp-test-cloud-rest-importer');
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    rmSync(tempRoot, { recursive: true, force: true });
    mkdirSync(tempRoot, { recursive: true });
    process.env.QC_USER_ID = '123';
    process.env.QC_API_TOKEN = 'test-token';
    process.env.QC_REST_PAGE_SIZE = '100';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = { ...originalEnv };
    rmSync(tempRoot, { recursive: true, force: true });
  });

  it('imports_paginated_insights_and_orders_from_manual_cloud_backtest', async () => {
    const calls: Array<{ path: string; body: Record<string, unknown> }> = [];
    global.fetch = jest.fn(async (url: string | URL, init?: RequestInit) => {
      const path = new URL(String(url)).pathname.replace('/api/v2', '');
      const body = JSON.parse(String(init?.body ?? '{}')) as Record<
        string,
        unknown
      >;
      calls.push({ path, body });

      if (path === '/backtests/read') {
        return jsonResponse({
          success: true,
          backtest: {
            completed: true,
            status: 'Completed.',
            backtestStart: '2024-01-01T00:00:00Z',
            backtestEnd: '2024-12-31T00:00:00Z',
            statistics: {
              'Total Orders': 101,
              'End Equity': 123456,
            },
          },
        });
      }

      if (path === '/backtests/read/insights') {
        const start = Number(body.start);
        return jsonResponse({
          success: true,
          insights: thisPage(start, 102).map((index) => ({
            id: `insight-${index}`,
            symbol: { value: 'NVDA' },
            direction: 0,
            confidence: 0.7,
            generatedTimeUtc: '2024-01-02T00:00:00Z',
          })),
        });
      }

      if (path === '/backtests/orders/read') {
        const start = Number(body.start);
        return jsonResponse({
          success: true,
          orders: thisPage(start, 101).map((index) => ({
            id: `order-${index}`,
            symbol: { value: 'NVDA' },
            direction: 0,
            quantity: 1,
            price: 100 + index,
            status: 3,
            time: '2024-01-03T00:00:00Z',
          })),
        });
      }

      return jsonResponse({ success: false, errors: [`unexpected ${path}`] });
    }) as typeof fetch;

    const importer = new QuantConnectCloudRestImporter();
    const result = await importer.importArtifacts({
      resultDirectory: tempRoot,
      runId: 'qc-import-test',
      projectId: 32077023,
      cloudBacktestId: 'ecd033aae81ec9f98e1c24b4c5a58d4c',
      completedAt: new Date('2026-05-25T00:00:00Z'),
    });

    expect(result.blockers).toEqual([]);
    const insights = JSON.parse(
      readFileSync(join(tempRoot, 'insights.json'), 'utf8'),
    ) as { insights: unknown[] };
    const orders = JSON.parse(
      readFileSync(join(tempRoot, 'order_events.json'), 'utf8'),
    ) as { events: unknown[] };
    const statistics = JSON.parse(
      readFileSync(join(tempRoot, 'statistics.json'), 'utf8'),
    ) as Record<string, unknown>;

    expect(insights.insights).toHaveLength(102);
    expect(orders.events).toHaveLength(101);
    expect(statistics.cloudProjectId).toBe(32077023);
    expect(statistics.cloudImportedInsightCount).toBe(102);
    expect(statistics.cloudImportedOrderCount).toBe(101);
    expect(calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: '/backtests/read/insights',
          body: expect.objectContaining({ start: 100, end: 200 }),
        }),
        expect.objectContaining({
          path: '/backtests/orders/read',
          body: expect.objectContaining({ start: 100, end: 200 }),
        }),
      ]),
    );
  });

  it('lists_cloud_projects_and_recent_backtests', async () => {
    global.fetch = jest.fn(async (url: string | URL, init?: RequestInit) => {
      const path = new URL(String(url)).pathname.replace('/api/v2', '');
      const body = JSON.parse(String(init?.body ?? '{}')) as Record<
        string,
        unknown
      >;

      if (path === '/projects/read') {
        expect(body.start).toBe(0);
        expect([100, 200]).toContain(body.end);
        return jsonResponse({
          success: true,
          projects: [
            {
              projectId: 32077023,
              name: 'aggressive_llm_momentum',
              modified: '2026-05-26T00:00:00Z',
              language: 'Py',
            },
          ],
        });
      }

      if (path === '/backtests/list') {
        expect(body).toEqual({
          projectId: 32077023,
          includeStatistics: true,
        });
        return jsonResponse({
          success: true,
          backtests: [
            {
              backtestId: 'ecd033aae81ec9f98e1c24b4c5a58d4c',
              name: 'Calculating Yellow Green Gaur',
              completed: true,
              status: 'Completed.',
              statistics: {
                'Net Profit': '23.517%',
                'Total Orders': 1062,
              },
            },
          ],
        });
      }

      return jsonResponse({ success: false, errors: [`unexpected ${path}`] });
    }) as typeof fetch;

    const importer = new QuantConnectCloudRestImporter();

    await expect(importer.listProjects()).resolves.toEqual({
      status: 'completed',
      projects: [
        {
          projectId: 32077023,
          name: 'aggressive_llm_momentum',
          modified: '2026-05-26T00:00:00Z',
          language: 'Py',
        },
      ],
      blockers: [],
    });
    await expect(
      importer.listBacktests({ projectName: 'aggressive_llm_momentum' }),
    ).resolves.toEqual({
      status: 'completed',
      projectId: 32077023,
      projectName: 'aggressive_llm_momentum',
      backtests: [
        {
          backtestId: 'ecd033aae81ec9f98e1c24b4c5a58d4c',
          name: 'Calculating Yellow Green Gaur',
          completed: true,
          status: 'Completed.',
          statistics: {
            'Net Profit': '23.517%',
            'Total Orders': 1062,
          },
        },
      ],
      blockers: [],
    });
  });
});

function thisPage(start: number, total: number): number[] {
  const end = Math.min(start + 100, total);
  return Array.from(
    { length: Math.max(0, end - start) },
    (_, offset) => start + offset,
  );
}

function jsonResponse(payload: unknown): Response {
  return {
    ok: true,
    json: async () => payload,
  } as Response;
}
