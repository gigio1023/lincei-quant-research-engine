import { resolveUniverseSelection } from './universe-manifest';

describe('quality-gated universe manifest', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('builds the default quality-core universe without hard exclusions', () => {
    delete process.env.V1_UNIVERSE_SYMBOLS;
    delete process.env.V1_UNIVERSE_PROFILE;
    delete process.env.V1_ALLOW_LEVERAGED_ETF;

    const report = resolveUniverseSelection();

    expect(report.profile).toBe('quality_core_backtest_safe');
    expect(report.activeSymbols).toContain('SMH');
    expect(report.activeSymbols).toContain('RKLB');
    expect(report.activeSymbols).not.toContain('INTC');
    expect(report.activeSymbols).not.toContain('SOXL');
    expect(report.symbolCaps.RKLB).toBe(0.05);
    expect(report.sleeveCaps.semiconductor_ai_compute).toBe(0.35);
  });

  it('rejects hard-excluded debug overrides', () => {
    process.env.V1_UNIVERSE_SYMBOLS = 'SMH,INTC';

    expect(() => resolveUniverseSelection()).toThrow(/hard excluded/);
  });

  it('keeps leveraged ETFs disabled unless explicitly allowed', () => {
    process.env.V1_UNIVERSE_PROFILE = 'tactical_leverage_disabled';
    delete process.env.V1_ALLOW_LEVERAGED_ETF;

    expect(() => resolveUniverseSelection()).toThrow(/V1_ALLOW_LEVERAGED_ETF/);
  });

  it('allows legacy benchmark symbols for local smoke overrides', () => {
    process.env.V1_UNIVERSE_SYMBOLS = 'SPY,QQQ,IWM';

    const report = resolveUniverseSelection();

    expect(report.activeSymbols).toEqual(['SPY', 'QQQ', 'IWM']);
    expect(report.overrideSymbols).toEqual(['SPY', 'QQQ', 'IWM']);
  });

  it('marks NASA as forward-only profile data', () => {
    process.env.V1_UNIVERSE_PROFILE = 'forward_nasa';

    const report = resolveUniverseSelection();

    expect(report.activeSymbols).toContain('NASA');
    expect(report.minimumStartDate).toBe('2026-03-31');
  });
});
