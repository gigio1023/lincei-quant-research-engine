import { createHash } from 'crypto';
import { BudgetEnvelope } from '../../entities/budget-envelope.entity';
import {
  CreateResearchRunRequest,
  RunBaselineResearchRequest,
} from './control-plane.types';

interface SampleBar {
  date: string;
  assetClose: number;
  benchmarkClose: number;
}

interface BacktestStep {
  date: string;
  signal: number;
  turnoverChange: number;
  assetReturn: number;
  benchmarkReturn: number;
  strategyReturn: number;
  equity: number;
  benchmarkEquity: number;
}

const SAMPLE_BARS: SampleBar[] = [
  { date: '2025-01-31', assetClose: 100, benchmarkClose: 100 },
  { date: '2025-02-28', assetClose: 103, benchmarkClose: 101 },
  { date: '2025-03-31', assetClose: 106, benchmarkClose: 103 },
  { date: '2025-04-30', assetClose: 109, benchmarkClose: 104 },
  { date: '2025-05-31', assetClose: 105, benchmarkClose: 102 },
  { date: '2025-06-30', assetClose: 111, benchmarkClose: 105 },
  { date: '2025-07-31', assetClose: 116, benchmarkClose: 108 },
  { date: '2025-08-31', assetClose: 120, benchmarkClose: 111 },
  { date: '2025-09-30', assetClose: 118, benchmarkClose: 110 },
  { date: '2025-10-31', assetClose: 123, benchmarkClose: 112 },
  { date: '2025-11-30', assetClose: 129, benchmarkClose: 116 },
  { date: '2025-12-31', assetClose: 135, benchmarkClose: 119 },
  { date: '2026-01-31', assetClose: 132, benchmarkClose: 117 },
  { date: '2026-02-28', assetClose: 138, benchmarkClose: 120 },
  { date: '2026-03-31', assetClose: 145, benchmarkClose: 124 },
  { date: '2026-04-30', assetClose: 151, benchmarkClose: 128 },
  { date: '2026-05-22', assetClose: 158, benchmarkClose: 130 },
];

export function buildBaselineResearchRunRequest(
  request: RunBaselineResearchRequest,
  budget?: BudgetEnvelope | null,
): CreateResearchRunRequest {
  const initialCapital =
    request.initialCapital ?? budget?.totalBudget ?? 10_000_000;
  const symbol = request.symbol ?? 'SAMPLE_MOMENTUM_BASKET';
  const benchmark = request.benchmark ?? 'SAMPLE_BENCHMARK';
  const strategyFamily = request.strategyFamily ?? 'momentum_baseline';
  const backtest = runMomentumBaseline(initialCapital);
  const runInput = {
    runnerVersion: 'deterministic-baseline-runner-v1',
    request,
    budgetId: budget?.id,
    symbol,
    benchmark,
    strategyFamily,
    initialCapital,
    strategy: {
      lookbackPeriods: 3,
      rebalanceEveryPeriods: 1,
      maxPositionPct: 100,
    },
    costs: {
      transactionCostBps: 10,
      slippageBps: 5,
    },
  };
  const dataManifest = {
    datasetId: 'built-in-sample-monthly-bars',
    provider: 'local-fixture',
    rowCount: SAMPLE_BARS.length,
    firstDate: SAMPLE_BARS[0].date,
    lastDate: SAMPLE_BARS[SAMPLE_BARS.length - 1].date,
    fields: ['date', 'assetClose', 'benchmarkClose'],
    availabilityTimestamp: '2026-05-22T23:50:00.000Z',
    marketDataTimestamp: '2026-05-22T23:50:00.000Z',
  };
  const artifactSeed = sha256(
    JSON.stringify({
      runInput,
      dataManifest,
      metrics: backtest.metrics,
    }),
  );
  const runKey = `${symbol.toLowerCase()}-${artifactSeed.slice(0, 12)}`;
  const artifacts = buildArtifacts(runKey, runInput, dataManifest, backtest);
  const artifactRefs = artifacts.map((artifact) => artifact.ref);
  const artifactHashes = Object.fromEntries(
    artifacts.map((artifact) => [artifact.ref, `sha256:${artifact.sha256}`]),
  );

  return {
    budgetEnvelopeId: request.budgetEnvelopeId,
    objective:
      request.objective ??
      'Run deterministic momentum baseline before proposal creation',
    strategyFamily,
    hypothesis:
      'A previous-period relative momentum signal can outperform the benchmark after fixed cost and slippage assumptions.',
    datasetRefs: [
      {
        id: 'built-in-sample-monthly-bars',
        provider: 'local-fixture',
        source: 'deterministic baseline sample',
        windowStart: SAMPLE_BARS[0].date,
        windowEnd: SAMPLE_BARS[SAMPLE_BARS.length - 1].date,
        availabilityTimestamp: '2026-05-22T23:50:00.000Z',
        marketDataTimestamp: '2026-05-22T23:50:00.000Z',
        calendar: 'sample-monthly',
        timezone: 'UTC',
        frequency: 'monthly',
        universe: [symbol],
        fields: ['assetClose', 'benchmarkClose'],
        adjustmentMode: 'sample-adjusted',
      },
    ],
    featureRefs: ['asset_3_period_return', 'benchmark_3_period_return'],
    timestampLagRules: [
      'Signal at period T uses closes through T-1 and applies to T return.',
      'No broker or live account data is read by this baseline runner.',
    ],
    noLookaheadChecked: true,
    benchmark,
    costModel: '10bps fixed transaction cost per position change',
    slippageModel: '5bps fixed slippage per position change',
    modelName: 'deterministic-relative-momentum-baseline',
    modelCategory: 'baseline',
    validationWindow: {
      start: SAMPLE_BARS[3].date,
      end: SAMPLE_BARS[SAMPLE_BARS.length - 1].date,
    },
    backtestMetrics: backtest.metrics,
    artifactRefs,
    artifactHashes,
    knownFailureModes: [
      'Built-in sample bars are not live market data.',
      'Momentum can reverse in high-volatility regimes.',
      'Monthly sample cadence does not model intraday execution or partial fills.',
    ],
  };
}

function runMomentumBaseline(initialCapital: number): {
  steps: BacktestStep[];
  metrics: CreateResearchRunRequest['backtestMetrics'];
} {
  const costRatePerChange = 0.0015;
  let equity = initialCapital;
  let benchmarkEquity = initialCapital;
  let previousSignal = 0;
  let turnover = 0;
  let tradeCount = 0;
  let fees = 0;
  const steps: BacktestStep[] = [];
  const strategyReturns: number[] = [];
  const benchmarkReturns: number[] = [];
  const equityCurve = [initialCapital];

  for (let index = 3; index < SAMPLE_BARS.length; index += 1) {
    const previous = SAMPLE_BARS[index - 1];
    const current = SAMPLE_BARS[index];
    const lookbackStart = SAMPLE_BARS[index - 3];
    const assetMomentum = previous.assetClose / lookbackStart.assetClose - 1;
    const benchmarkMomentum =
      previous.benchmarkClose / lookbackStart.benchmarkClose - 1;
    const signal =
      assetMomentum > benchmarkMomentum && assetMomentum > 0 ? 1 : 0;
    const turnoverChange = Math.abs(signal - previousSignal);
    const assetReturn = current.assetClose / previous.assetClose - 1;
    const benchmarkReturn =
      current.benchmarkClose / previous.benchmarkClose - 1;
    const transactionCost = turnoverChange * costRatePerChange;
    const strategyReturn = signal * assetReturn - transactionCost;

    if (turnoverChange > 0) {
      tradeCount += 1;
      turnover += turnoverChange;
      fees += equity * transactionCost;
    }

    equity *= 1 + strategyReturn;
    benchmarkEquity *= 1 + benchmarkReturn;
    strategyReturns.push(strategyReturn);
    benchmarkReturns.push(benchmarkReturn);
    equityCurve.push(equity);
    steps.push({
      date: current.date,
      signal,
      turnoverChange,
      assetReturn,
      benchmarkReturn,
      strategyReturn,
      equity,
      benchmarkEquity,
    });
    previousSignal = signal;
  }

  const totalReturnPct = toPct(equity / initialCapital - 1);
  const benchmarkReturnPct = toPct(benchmarkEquity / initialCapital - 1);
  const periodCount = strategyReturns.length;
  const annualizationFactor = 12;
  const meanReturn = mean(strategyReturns);
  const volatility = standardDeviation(strategyReturns);
  const downsideVolatility = standardDeviation(
    strategyReturns.map((value) => Math.min(value, 0)),
  );
  const annualizedReturn =
    Math.pow(equity / initialCapital, 12 / periodCount) - 1;
  const maxDrawdown = calculateMaxDrawdown(equityCurve);
  const sharpeRatio =
    volatility === 0
      ? 0
      : (meanReturn / volatility) * Math.sqrt(annualizationFactor);
  const sortinoRatio =
    downsideVolatility === 0
      ? 0
      : (meanReturn / downsideVolatility) * Math.sqrt(annualizationFactor);
  const calmarRatio = maxDrawdown === 0 ? 0 : annualizedReturn / maxDrawdown;
  const excessReturns = strategyReturns.map(
    (value, index) => value - benchmarkReturns[index],
  );
  const trackingError = standardDeviation(excessReturns);
  const informationRatio =
    trackingError === 0
      ? 0
      : (mean(excessReturns) / trackingError) * Math.sqrt(annualizationFactor);
  const winningTrades = steps.filter((step) => step.strategyReturn > 0).length;

  return {
    steps,
    metrics: {
      startValue: round(initialCapital),
      endValue: round(equity),
      totalReturnPct: round(totalReturnPct),
      benchmarkReturnPct: round(benchmarkReturnPct),
      excessReturnPct: round(totalReturnPct - benchmarkReturnPct),
      annualizedReturnPct: round(toPct(annualizedReturn)),
      volatilityPct: round(toPct(volatility * Math.sqrt(annualizationFactor))),
      maxDrawdownPct: round(toPct(maxDrawdown)),
      sharpeRatio: round(sharpeRatio),
      sortinoRatio: round(sortinoRatio),
      calmarRatio: round(calmarRatio),
      informationRatio: round(informationRatio),
      turnoverPct: round(turnover * 100),
      grossExposurePct: 100,
      maxLeverage: 1,
      totalFees: round(fees),
      tradeCount,
      winRatePct: round((winningTrades / steps.length) * 100),
      profitFactor: calculateProfitFactor(strategyReturns),
    },
  };
}

function calculateMaxDrawdown(values: number[]): number {
  let peak = values[0];
  let maxDrawdown = 0;

  for (const value of values) {
    peak = Math.max(peak, value);
    maxDrawdown = Math.max(maxDrawdown, (peak - value) / peak);
  }

  return maxDrawdown;
}

function buildArtifacts(
  runKey: string,
  runInput: Record<string, unknown>,
  dataManifest: Record<string, unknown>,
  backtest: {
    steps: BacktestStep[];
    metrics: CreateResearchRunRequest['backtestMetrics'];
  },
): Array<{ ref: string; content: string; sha256: string }> {
  const basePath = `artifacts/research-runs/${runKey}`;
  const signals = backtest.steps.map((step) => ({
    date: step.date,
    sourceDataCutoff: 'previous sample period close',
    signal: step.signal,
    targetWeightPct: step.signal * 100,
  }));
  const simulatedOrders = backtest.steps
    .filter((step) => step.turnoverChange > 0)
    .map((step) => ({
      date: step.date,
      intent: step.signal > 0 ? 'enter_baseline_position' : 'exit_to_cash',
      turnoverPct: step.turnoverChange * 100,
      brokerExecutionEnabled: false,
    }));
  const equityCurve = [
    'date,totalValue,benchmarkValue,return,grossExposure',
    ...backtest.steps.map((step) =>
      [
        step.date,
        round(step.equity),
        round(step.benchmarkEquity),
        round(step.strategyReturn),
        step.signal,
      ].join(','),
    ),
  ].join('\n');
  const report = [
    '# Deterministic Baseline Research Run',
    '',
    'This artifact is generated from local sample bars only.',
    'Signals use prior-period data and never call broker or live account APIs.',
    '',
    `Total return: ${backtest.metrics.totalReturnPct}%`,
    `Benchmark return: ${backtest.metrics.benchmarkReturnPct}%`,
    `Max drawdown: ${backtest.metrics.maxDrawdownPct}%`,
  ].join('\n');
  const artifactContents: Record<string, string> = {
    'run-input.json': JSON.stringify(runInput),
    'data-manifest.json': JSON.stringify(dataManifest),
    'signals.jsonl': signals.map((row) => JSON.stringify(row)).join('\n'),
    'simulated-orders.jsonl': simulatedOrders
      .map((row) => JSON.stringify(row))
      .join('\n'),
    'equity-curve.csv': equityCurve,
    'metrics.json': JSON.stringify(backtest.metrics),
    'report.md': report,
  };

  return Object.entries(artifactContents).map(([name, content]) => ({
    ref: `${basePath}/${name}`,
    content,
    sha256: sha256(content),
  }));
}

function calculateProfitFactor(returns: number[]): number {
  const gains = returns
    .filter((value) => value > 0)
    .reduce((sum, value) => sum + value, 0);
  const losses = Math.abs(
    returns.filter((value) => value < 0).reduce((sum, value) => sum + value, 0),
  );

  return losses === 0 ? round(gains) : round(gains / losses);
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: number[]): number {
  const average = mean(values);
  const variance =
    values.reduce((sum, value) => sum + Math.pow(value - average, 2), 0) /
    values.length;

  return Math.sqrt(variance);
}

function toPct(value: number): number {
  return value * 100;
}

function round(value: number): number {
  return Number(value.toFixed(4));
}

function sha256(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}
