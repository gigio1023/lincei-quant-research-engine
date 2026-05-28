import { Injectable } from '@nestjs/common';
import type {
  AssetClass,
  RiskGateRequest,
  RiskGateResponse,
  RiskPolicy,
} from './risk-gate.types';

const DEFAULT_POLICY: RiskPolicy = {
  maxGrossExposurePct: 100,
  maxSinglePositionPct: 20,
  maxOrderNotional: 1_000_000,
  maxDailyLossPct: 3,
  maxDrawdownPct: 10,
  maxDataAgeMinutes: 60,
  allowedAssetClasses: [
    'cash',
    'domestic_stock',
    'foreign_stock',
    'domestic_etf',
    'foreign_etf',
  ],
  allowLiveTrading: false,
  allowPaperAutoApproval: false,
  requireHumanApproval: true,
};

@Injectable()
export class RiskGateService {
  getPolicy(): RiskPolicy {
    return { ...DEFAULT_POLICY };
  }

  getStatus(): {
    brokerExecutionEnabled: false;
    liveTradingEnabled: false;
    defaultPolicy: RiskPolicy;
  } {
    return {
      brokerExecutionEnabled: false,
      liveTradingEnabled: false,
      defaultPolicy: this.getPolicy(),
    };
  }

  evaluate(request: RiskGateRequest): RiskGateResponse {
    const policy = this.mergePolicy(request.policy);
    const denyReasons: string[] = [];
    const reviewReasons: string[] = [];
    const evaluatedAt = new Date();

    this.evaluateMode(request, policy, denyReasons, reviewReasons);
    this.evaluateSensitiveFields(request, denyReasons);
    this.evaluateProvenance(request, denyReasons, reviewReasons);
    this.evaluateTimestamps(request, policy, evaluatedAt, denyReasons);
    this.evaluatePortfolio(request, policy, denyReasons);
    this.evaluateOrders(request, policy, denyReasons);

    const requiresHumanApproval =
      request.mode !== 'dry_run' &&
      policy.requireHumanApproval &&
      !request.humanApprovalId;

    if (requiresHumanApproval) {
      reviewReasons.push('Human approval is required outside dry-run mode');
    }

    const decision =
      denyReasons.length > 0
        ? 'DENY'
        : reviewReasons.length > 0
          ? 'REVIEW'
          : 'ALLOW';

    return {
      decision,
      evaluatedAt: evaluatedAt.toISOString(),
      mode: request.mode,
      brokerExecutionEnabled: false,
      requiresHumanApproval,
      reasons: [...denyReasons, ...reviewReasons],
      policy,
      approvedOrderCount: decision === 'DENY' ? 0 : request.orders.length,
    };
  }

  private mergePolicy(policy?: Partial<RiskPolicy>): RiskPolicy {
    return {
      ...DEFAULT_POLICY,
      ...policy,
      allowedAssetClasses:
        policy?.allowedAssetClasses ?? DEFAULT_POLICY.allowedAssetClasses,
      allowLiveTrading: false,
      allowPaperAutoApproval: policy?.allowPaperAutoApproval === true,
    };
  }

  private evaluateMode(
    request: RiskGateRequest,
    policy: RiskPolicy,
    denyReasons: string[],
    reviewReasons: string[],
  ): void {
    if (request.mode === 'live') {
      denyReasons.push('Live trading is not implemented in this service');
      return;
    }

    if (request.mode === 'broker_read_only' && request.orders.length > 0) {
      denyReasons.push('Broker read-only mode cannot contain orders');
      return;
    }

    if (request.mode !== 'dry_run' && request.mode !== 'paper') {
      denyReasons.push('Only dry_run and paper evaluations are allowed');
      return;
    }

    if (
      request.mode === 'paper' &&
      policy.requireHumanApproval &&
      !request.humanApprovalId
    ) {
      reviewReasons.push('Paper execution requires human approval');
    }
  }

  private evaluateSensitiveFields(
    request: RiskGateRequest,
    denyReasons: string[],
  ): void {
    if (request.brokerCredentials !== undefined) {
      denyReasons.push('Broker credentials are not allowed in risk requests');
    }

    if (request.accountId) {
      denyReasons.push('Broker account ids are not allowed in risk requests');
    }

    if (
      request.executionIntent &&
      request.executionIntent !== 'evaluate_only'
    ) {
      denyReasons.push('Risk gate accepts evaluate_only intent only');
    }
  }

  private evaluateProvenance(
    request: RiskGateRequest,
    denyReasons: string[],
    reviewReasons: string[],
  ): void {
    if (request.actor === 'llm' && (!request.strategyId || !request.ruleId)) {
      denyReasons.push(
        'LLM proposals require strategyId and ruleId provenance',
      );
    }

    if (request.actor !== 'llm' && (!request.strategyId || !request.ruleId)) {
      reviewReasons.push('Strategy and rule provenance should be attached');
    }
  }

  private evaluateTimestamps(
    request: RiskGateRequest,
    policy: RiskPolicy,
    evaluatedAt: Date,
    denyReasons: string[],
  ): void {
    const generatedAt = this.parseDate(request.generatedAt);
    const marketDataTimestamp = request.marketDataTimestamp
      ? this.parseDate(request.marketDataTimestamp)
      : null;

    if (!generatedAt) {
      denyReasons.push('generatedAt is required and must be a valid timestamp');
      return;
    }

    if (generatedAt.getTime() > evaluatedAt.getTime() + 60_000) {
      denyReasons.push('generatedAt cannot be in the future');
    }

    if (!marketDataTimestamp) {
      denyReasons.push('marketDataTimestamp is required and must be valid');
      return;
    }

    if (marketDataTimestamp.getTime() > generatedAt.getTime() + 60_000) {
      denyReasons.push('Market data timestamp cannot be after proposal time');
    }

    const ageMinutes =
      (evaluatedAt.getTime() - marketDataTimestamp.getTime()) / 60_000;

    if (ageMinutes > policy.maxDataAgeMinutes) {
      denyReasons.push('Market data is stale for the active policy');
    }
  }

  private evaluatePortfolio(
    request: RiskGateRequest,
    policy: RiskPolicy,
    denyReasons: string[],
  ): void {
    const { portfolio } = request;

    if (!Number.isFinite(portfolio.equity) || portfolio.equity <= 0) {
      denyReasons.push('Portfolio equity must be positive');
    }

    if (portfolio.grossExposurePct > policy.maxGrossExposurePct) {
      denyReasons.push('Portfolio gross exposure exceeds policy');
    }

    if (
      portfolio.dailyPnlPct !== undefined &&
      portfolio.dailyPnlPct <= -policy.maxDailyLossPct
    ) {
      denyReasons.push('Daily loss limit has been breached');
    }

    if (
      portfolio.drawdownPct !== undefined &&
      portfolio.drawdownPct >= policy.maxDrawdownPct
    ) {
      denyReasons.push('Drawdown limit has been breached');
    }

    for (const position of portfolio.positions ?? []) {
      if (
        position.weightPct > policy.maxSinglePositionPct &&
        !this.hasReducingSellOrder(request, position.symbol)
      ) {
        denyReasons.push(
          `Existing position ${position.symbol} exceeds single-position limit`,
        );
      }
    }
  }

  private evaluateOrders(
    request: RiskGateRequest,
    policy: RiskPolicy,
    denyReasons: string[],
  ): void {
    const targetGross = request.orders.reduce(
      (sum, order) => sum + Math.max(order.targetPositionPct ?? 0, 0),
      0,
    );

    if (targetGross > policy.maxGrossExposurePct) {
      denyReasons.push('Target gross exposure exceeds policy');
    }

    for (const order of request.orders) {
      if (!policy.allowedAssetClasses.includes(order.assetClass)) {
        denyReasons.push(
          `Asset class ${order.assetClass} is not allowed by policy`,
        );
      }

      if (this.isProhibitedAssetClass(order.assetClass)) {
        denyReasons.push(`Asset class ${order.assetClass} is prohibited`);
      }

      if (order.side === 'SHORT') {
        denyReasons.push('Short orders are prohibited');
      }

      if (!Number.isFinite(order.notional) || order.notional <= 0) {
        denyReasons.push(`Order ${order.symbol} has invalid notional`);
      }

      if (order.notional > policy.maxOrderNotional) {
        denyReasons.push(`Order ${order.symbol} exceeds max order notional`);
      }

      if (
        order.targetPositionPct !== undefined &&
        order.targetPositionPct > policy.maxSinglePositionPct &&
        !this.isReducingSellOrder(request, order)
      ) {
        denyReasons.push(`Order ${order.symbol} exceeds single-position limit`);
      }

      if (order.leverage !== undefined && order.leverage > 1) {
        denyReasons.push(`Order ${order.symbol} uses leverage`);
      }
    }
  }

  private isProhibitedAssetClass(assetClass: AssetClass): boolean {
    return [
      'crypto',
      'crypto_derivative',
      'option',
      'future',
      'unknown',
    ].includes(assetClass);
  }

  private hasReducingSellOrder(
    request: RiskGateRequest,
    symbol: string,
  ): boolean {
    return request.orders.some((order) =>
      this.isReducingSellOrder(request, order, symbol),
    );
  }

  private isReducingSellOrder(
    request: RiskGateRequest,
    order: RiskGateRequest['orders'][number],
    symbol = order.symbol,
  ): boolean {
    if (order.side !== 'SELL' || order.symbol !== symbol) {
      return false;
    }

    const currentPosition = request.portfolio.positions?.find(
      (position) => position.symbol === order.symbol,
    );

    return Boolean(
      currentPosition &&
        currentPosition.marketValue > 0 &&
        order.notional > 0 &&
        order.notional <= currentPosition.marketValue,
    );
  }

  private parseDate(value: string): Date | null {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
}
