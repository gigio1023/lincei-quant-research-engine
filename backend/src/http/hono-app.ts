/**
 * Hono HTTP adapter over the same framework-neutral runtime used by the CLI.
 * Trading logic stays in services; routes only translate HTTP requests to runtime calls.
 */
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import {
  createLinceiRuntime,
  LinceiRuntime,
} from '../runtime/create-lincei-runtime';

declare const Bun:
  | {
      serve(input: {
        port: number;
        fetch: (request: Request) => Response | Promise<Response>;
      }): unknown;
    }
  | undefined;

export function createHonoApp(runtime: LinceiRuntime): Hono {
  const app = new Hono();

  app.get('/health', (context) =>
    context.json({
      status: 'ok',
      runtime: 'lincei',
    }),
  );

  app.get('/v1-pilot/status', async (context) =>
    context.json(await runtime.statusService.getStatus()),
  );

  app.post('/capital/run', async (context) => {
    const body = await context.req.json().catch(() => ({}));
    const options =
      body && typeof body === 'object'
        ? (body as {
            hypothesisId?: string;
            universe?: string[];
            maxBacktestWorkers?: number;
            semanticEvidenceLimit?: number;
          })
        : {};
    const result = await runtime.capitalEvidenceSliceService.run(options);
    return context.json(result, result.status === 'failed' ? 500 : 200);
  });

  return app;
}

export async function startHonoServer(): Promise<void> {
  const runtime = await createLinceiRuntime();
  const app = createHonoApp(runtime);
  const port = Number(process.env.PORT ?? 3000);
  if (typeof Bun === 'undefined') {
    serve({ fetch: app.fetch, port });
  } else {
    Bun.serve({
      port,
      fetch: app.fetch,
    });
  }
  console.log(`lincei Hono HTTP adapter listening on http://localhost:${port}`);

  const close = async (): Promise<void> => {
    await runtime.close();
    process.exit(0);
  };
  process.on('SIGINT', close);
  process.on('SIGTERM', close);
}

if (require.main === module) {
  startHonoServer().catch((error: Error) => {
    console.error(error.message);
    process.exit(1);
  });
}
