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
  insights?:
    | Record<string, unknown>[]
    | Record<string, Record<string, unknown>>;
};

type QuantConnectOrdersResponse = {
  success?: boolean;
  errors?: string[];
  orders?: Record<string, unknown>[] | Record<string, Record<string, unknown>>;
};

type QuantConnectProjectsResponse = {
  success?: boolean;
  errors?: string[];
  projects?: Record<string, unknown>[];
};

type QuantConnectBacktestsListResponse = {
  success?: boolean;
  errors?: string[];
  backtests?:
    | Record<string, unknown>[]
    | Record<string, Record<string, unknown>>;
};

export type QuantConnectProjectSummary = {
  projectId: number;
  name: string;
  modified?: string;
  created?: string;
  language?: string;
};

export type QuantConnectBacktestSummary = {
  backtestId: string;
  name: string;
  created?: string;
  completed?: boolean;
  status?: string;
  statistics: Record<string, string | number>;
};

export type QuantConnectCloudListProjectsResult = {
  status: 'completed' | 'blocked';
  projects: QuantConnectProjectSummary[];
  blockers: string[];
};

export type QuantConnectCloudListBacktestsResult = {
  status: 'completed' | 'blocked';
  projectId?: number;
  projectName?: string;
  backtests: QuantConnectBacktestSummary[];
  blockers: string[];
};

export type QuantConnectCloudRestImportRequest = {
  resultDirectory: string;
  runId: string;
  projectId?: number;
  cloudUrl?: string;
  cloudBacktestId?: string;
  completedAt: Date;
};

export type QuantConnectCloudRestImportResult = {
  blockers: string[];
};

export class QuantConnectCloudRestImporter {
  private readonly artifactMapper = new QuantConnectCloudArtifactMapper();

  async listProjects(
    input: {
      limit?: number;
    } = {},
  ): Promise<QuantConnectCloudListProjectsResult> {
    const auth = this.quantConnectAuthHeaders();
    if (!auth) {
      return {
        status: 'blocked',
        projects: [],
        blockers: [
          'QuantConnect REST credentials are missing; set QC_USER_ID and QC_API_TOKEN.',
        ],
      };
    }

    try {
      const limit = boundedLimit(input.limit, 100);
      const response =
        await this.postQuantConnect<QuantConnectProjectsResponse>(
          '/projects/read',
          auth,
          { start: 0, end: limit },
        );
      if (response.success === false) {
        return {
          status: 'blocked',
          projects: [],
          blockers: response.errors?.length
            ? response.errors
            : ['QuantConnect project list request failed.'],
        };
      }
      return {
        status: 'completed',
        projects: (response.projects ?? [])
          .map((project) => this.toProjectSummary(project))
          .filter((project): project is QuantConnectProjectSummary =>
            Boolean(project),
          ),
        blockers: [],
      };
    } catch (error) {
      return {
        status: 'blocked',
        projects: [],
        blockers: [
          error instanceof Error
            ? error.message
            : 'QuantConnect project list request failed.',
        ],
      };
    }
  }

  async listBacktests(input: {
    projectId?: number;
    projectName?: string;
    limit?: number;
  }): Promise<QuantConnectCloudListBacktestsResult> {
    const auth = this.quantConnectAuthHeaders();
    if (!auth) {
      return {
        status: 'blocked',
        projectId: input.projectId,
        projectName: input.projectName,
        backtests: [],
        blockers: [
          'QuantConnect REST credentials are missing; set QC_USER_ID and QC_API_TOKEN.',
        ],
      };
    }

    const projectResolution = await this.resolveProjectForBacktestList(input);
    if ('blockers' in projectResolution) {
      return {
        status: 'blocked',
        projectId: input.projectId,
        projectName: input.projectName,
        backtests: [],
        blockers: projectResolution.blockers,
      };
    }

    try {
      const response =
        await this.postQuantConnect<QuantConnectBacktestsListResponse>(
          '/backtests/list',
          auth,
          {
            projectId: projectResolution.project.projectId,
            includeStatistics: true,
          },
        );
      if (response.success === false) {
        return {
          status: 'blocked',
          projectId: projectResolution.project.projectId,
          projectName: projectResolution.project.name,
          backtests: [],
          blockers: response.errors?.length
            ? response.errors
            : ['QuantConnect backtest list request failed.'],
        };
      }
      const limit = boundedLimit(input.limit, 20);
      return {
        status: 'completed',
        projectId: projectResolution.project.projectId,
        projectName: projectResolution.project.name,
        backtests: this.collectionValues(response.backtests)
          .map((backtest) => this.toBacktestSummary(backtest))
          .filter((backtest): backtest is QuantConnectBacktestSummary =>
            Boolean(backtest),
          )
          .slice(0, limit),
        blockers: [],
      };
    } catch (error) {
      return {
        status: 'blocked',
        projectId: projectResolution.project.projectId,
        projectName: projectResolution.project.name,
        backtests: [],
        blockers: [
          error instanceof Error
            ? error.message
            : 'QuantConnect backtest list request failed.',
        ],
      };
    }
  }

  async importArtifacts(
    input: QuantConnectCloudRestImportRequest,
  ): Promise<QuantConnectCloudRestImportResult> {
    const auth = this.quantConnectAuthHeaders();
    const projectId =
      input.projectId ?? this.resolveQuantConnectProjectId(input.cloudUrl);
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

    const effectiveInput = { ...input, projectId };
    const response = await this.readCloudBacktest(
      auth,
      projectId,
      effectiveInput,
    );
    if ('blockers' in response) {
      return response;
    }

    this.artifactMapper.writeImportedArtifacts(effectiveInput, {
      backtest: response.backtest.backtest!,
      insights: this.collectionValues(response.insights.insights),
      orders: this.collectionValues(response.orders.orders),
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
        await this.readPaginatedCloudItems<QuantConnectInsightsResponse>(
          '/backtests/read/insights',
          'insights',
          auth,
          projectId,
          input,
        );
      const orders =
        await this.readPaginatedCloudItems<QuantConnectOrdersResponse>(
          '/backtests/orders/read',
          'orders',
          auth,
          projectId,
          input,
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

  private async readPaginatedCloudItems<
    T extends { success?: boolean; errors?: string[] },
  >(
    path: string,
    fieldName: 'insights' | 'orders',
    auth: Record<string, string>,
    projectId: number,
    input: QuantConnectCloudRestImportRequest,
  ): Promise<T> {
    const pageSize = Number(process.env.QC_REST_PAGE_SIZE ?? 100);
    const maxItems = Number(process.env.QC_REST_MAX_ITEMS ?? 20_000);
    const allItems: Record<string, unknown>[] = [];
    let lastResponse: T | null = null;

    for (
      let start = 0;
      start < maxItems;
      start += Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 100
    ) {
      const end =
        start + (Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 100);
      const response = await this.readPaginatedCloudPage<T>(
        path,
        fieldName,
        auth,
        {
          projectId,
          backtestId: input.cloudBacktestId!,
          start,
          end,
        },
      );
      lastResponse = response;
      if (response.success === false) {
        break;
      }
      const pageItems = this.collectionValues(
        (response as Record<string, unknown>)[fieldName],
      );
      allItems.push(...pageItems);
      if (pageItems.length < end - start) {
        break;
      }
    }

    return {
      ...(lastResponse ?? ({ success: true } as T)),
      [fieldName]: allItems,
    } as T;
  }

  private async readPaginatedCloudPage<
    T extends { success?: boolean; errors?: string[] },
  >(
    path: string,
    fieldName: 'insights' | 'orders',
    auth: Record<string, string>,
    body: Record<string, string | number | boolean>,
  ): Promise<T> {
    const retries = Number(process.env.QC_REST_PAGE_RETRIES ?? 5);
    const delayMs = Number(process.env.QC_REST_PAGE_RETRY_DELAY_MS ?? 1_000);
    let lastResponse: T | null = null;

    for (
      let attempt = 0;
      attempt <= (Number.isFinite(retries) ? retries : 5);
      attempt += 1
    ) {
      const response = await this.postQuantConnect<T>(path, auth, body);
      lastResponse = response;
      const rawItems = (response as Record<string, unknown>)[fieldName];
      const items = this.collectionValues(rawItems);
      if (
        response.success === false ||
        rawItems !== undefined ||
        items.length
      ) {
        return response;
      }
      if (attempt < retries) {
        await sleep(Number.isFinite(delayMs) && delayMs >= 0 ? delayMs : 1_000);
      }
    }

    return lastResponse ?? ({ success: false } as T);
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

  private collectionValues(value: unknown): Record<string, unknown>[] {
    if (Array.isArray(value)) {
      return value.filter(this.isRecord);
    }
    if (this.isRecord(value)) {
      return Object.values(value).filter(this.isRecord);
    }
    return [];
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
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

  private async resolveProjectForBacktestList(input: {
    projectId?: number;
    projectName?: string;
  }): Promise<
    { project: QuantConnectProjectSummary } | { blockers: string[] }
  > {
    if (input.projectId) {
      return {
        project: {
          projectId: input.projectId,
          name: input.projectName ?? String(input.projectId),
        },
      };
    }

    const projects = await this.listProjects({ limit: 200 });
    if (projects.status === 'blocked') {
      return { blockers: projects.blockers };
    }
    const projectName = input.projectName ?? 'aggressive_llm_momentum';
    const matches = projects.projects.filter(
      (project) => project.name === projectName,
    );
    if (matches.length === 1) {
      return { project: matches[0] };
    }
    if (matches.length > 1) {
      return {
        blockers: [
          `Multiple QuantConnect projects named "${projectName}" were found; pass --project-id explicitly.`,
        ],
      };
    }
    return {
      blockers: [
        `QuantConnect project "${projectName}" was not found. Run ./scripts/list-cloud-projects and pass --project-id.`,
      ],
    };
  }

  private toProjectSummary(
    project: Record<string, unknown>,
  ): QuantConnectProjectSummary | null {
    const projectId = Number(project.projectId ?? project.id);
    if (!Number.isInteger(projectId) || projectId <= 0) {
      return null;
    }
    return {
      projectId,
      name: String(project.name ?? projectId),
      modified: optionalString(project.modified),
      created: optionalString(project.created),
      language: optionalString(project.language),
    };
  }

  private toBacktestSummary(
    backtest: Record<string, unknown>,
  ): QuantConnectBacktestSummary | null {
    const backtestId = optionalString(
      backtest.backtestId ?? backtest.id ?? backtest.backtestID,
    );
    if (!backtestId) {
      return null;
    }
    return {
      backtestId,
      name: String(backtest.name ?? backtestId),
      created: optionalString(backtest.created ?? backtest.date),
      completed:
        typeof backtest.completed === 'boolean'
          ? backtest.completed
          : undefined,
      status: optionalString(backtest.status),
      statistics: this.toStatistics(backtest.statistics),
    };
  }

  private toStatistics(value: unknown): Record<string, string | number> {
    if (!this.isRecord(value)) {
      return {};
    }
    return Object.fromEntries(
      Object.entries(value).filter(
        (entry): entry is [string, string | number] =>
          typeof entry[1] === 'string' || typeof entry[1] === 'number',
      ),
    );
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function boundedLimit(value: number | undefined, fallback: number): number {
  return Number.isInteger(value) && value > 0 ? Math.min(value, 500) : fallback;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}
