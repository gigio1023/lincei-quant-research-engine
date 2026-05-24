import { createHash } from 'crypto';
import { QuantConnectCloudArtifactMapper } from './lean-cloud-artifact-mapper';

type QuantConnectBacktestResponse = {
  success?: boolean;
  errors?: string[];
  backtest?: {
    completed?: boolean;
    status?: string;
    error?: string;
    backtestStart?: string;
    backtestEnd?: string;
    statistics?: Record<string, string | number>;
    runtimeStatistics?: Record<string, string | number>;
  };
};

type QuantConnectInsightsResponse = {
  success?: boolean;
  errors?: string[];
  insights?: Record<string, unknown>[];
};

type QuantConnectOrdersResponse = {
  success?: boolean;
  errors?: string[];
  orders?: Record<string, unknown>[];
};

export type QuantConnectCloudRestImportRequest = {
  resultDirectory: string;
  runId: string;
  cloudUrl?: string;
  cloudBacktestId?: string;
  completedAt: Date;
};

export type QuantConnectCloudRestImportResult = {
  blockers: string[];
};

export class QuantConnectCloudRestImporter {
  private readonly artifactMapper = new QuantConnectCloudArtifactMapper();

  async importArtifacts(
    input: QuantConnectCloudRestImportRequest,
  ): Promise<QuantConnectCloudRestImportResult> {
    const auth = this.quantConnectAuthHeaders();
    const projectId = this.resolveQuantConnectProjectId(input.cloudUrl);
    if (!input.cloudBacktestId) {
      return {
        blockers: [
          'QuantConnect Cloud backtest id was not found in CLI output.',
        ],
      };
    }
    if (!projectId) {
      return {
        blockers: [
          'QuantConnect project id is missing; set QC_PROJECT_ID or QUANTCONNECT_PROJECT_ID for REST result import.',
        ],
      };
    }
    if (!auth) {
      return {
        blockers: [
          'QuantConnect REST credentials are missing; set QC_USER_ID and QC_API_TOKEN for cloud result import.',
        ],
      };
    }

    const response = await this.readCloudBacktest(auth, projectId, input);
    if ('blockers' in response) {
      return response;
    }

    this.artifactMapper.writeImportedArtifacts(input, {
      backtest: response.backtest.backtest!,
      insights: response.insights.insights ?? [],
      orders: response.orders.orders ?? [],
    });
    return { blockers: [] };
  }

  private async readCloudBacktest(
    auth: Record<string, string>,
    projectId: number,
    input: QuantConnectCloudRestImportRequest,
  ): Promise<
    | {
        backtest: QuantConnectBacktestResponse;
        insights: QuantConnectInsightsResponse;
        orders: QuantConnectOrdersResponse;
      }
    | QuantConnectCloudRestImportResult
  > {
    try {
      const backtest =
        await this.postQuantConnect<QuantConnectBacktestResponse>(
          '/backtests/read',
          auth,
          { projectId, backtestId: input.cloudBacktestId! },
        );
      const insights =
        await this.postQuantConnect<QuantConnectInsightsResponse>(
          '/backtests/read/insights',
          auth,
          { projectId, backtestId: input.cloudBacktestId!, start: 0, end: 100 },
        );
      const orders = await this.postQuantConnect<QuantConnectOrdersResponse>(
        '/backtests/orders/read',
        auth,
        { projectId, backtestId: input.cloudBacktestId!, start: 0, end: 100 },
      );

      if (!backtest.success || !backtest.backtest?.completed) {
        return {
          blockers: [
            `QuantConnect Cloud backtest is not completed: ${backtest.backtest?.status ?? backtest.errors?.join('; ') ?? 'unknown'}.`,
          ],
        };
      }
      if (backtest.backtest.error) {
        return {
          blockers: [
            `QuantConnect Cloud backtest error: ${backtest.backtest.error}`,
          ],
        };
      }
      return { backtest, insights, orders };
    } catch (error) {
      return {
        blockers: [
          error instanceof Error
            ? error.message
            : 'QuantConnect REST result import failed.',
        ],
      };
    }
  }

  private quantConnectAuthHeaders(): Record<string, string> | null {
    const userId = process.env.QC_USER_ID ?? process.env.QUANTCONNECT_USER_ID;
    const apiToken =
      process.env.QC_API_TOKEN ?? process.env.QUANTCONNECT_API_TOKEN;
    if (!userId || !apiToken) {
      return null;
    }
    const timestamp = String(Math.floor(Date.now() / 1000));
    const hashedToken = createHash('sha256')
      .update(`${apiToken}:${timestamp}`)
      .digest('hex');
    const authentication = Buffer.from(`${userId}:${hashedToken}`).toString(
      'base64',
    );
    return {
      Authorization: `Basic ${authentication}`,
      Timestamp: timestamp,
      'Content-Type': 'application/json',
    };
  }

  private async postQuantConnect<T>(
    path: string,
    headers: Record<string, string>,
    body: Record<string, string | number | boolean>,
  ): Promise<T> {
    const baseUrl =
      process.env.QUANTCONNECT_API_BASE_URL ??
      'https://www.quantconnect.com/api/v2';
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`QuantConnect REST ${path} failed: ${response.status}`);
    }
    return (await response.json()) as T;
  }

  private resolveQuantConnectProjectId(cloudUrl?: string): number | null {
    const configured =
      process.env.QC_PROJECT_ID ?? process.env.QUANTCONNECT_PROJECT_ID;
    const parsed = configured ? Number(configured) : NaN;
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
    const fromUrl = cloudUrl?.match(/projects\/(\d+)/)?.[1];
    const parsedFromUrl = fromUrl ? Number(fromUrl) : NaN;
    return Number.isInteger(parsedFromUrl) && parsedFromUrl > 0
      ? parsedFromUrl
      : null;
  }
}
