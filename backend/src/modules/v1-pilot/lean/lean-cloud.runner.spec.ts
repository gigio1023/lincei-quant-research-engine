import { LeanCloudRunner } from './lean-cloud.runner';

describe('LeanCloudRunner', () => {
  it('classifies_missing_cloud_project_as_blocked', () => {
    const runner = new LeanCloudRunner({} as any, {} as any);

    const blockers = (runner as any).classifyBlockers(
      'No project with the given name or id found. Please use --push.',
    );

    expect(blockers).toContain(
      'QuantConnect Cloud project is missing; rerun with --push or create/pull the project.',
    );
  });

  it('classifies_paid_account_cli_api_requirement_as_blocked', () => {
    const runner = new LeanCloudRunner({} as any, {} as any);

    const blockers = (runner as any).classifyBlockers(
      'Error: Please upgrade to paid account to use the API and other local features.',
    );

    expect(blockers).toContain(
      'QuantConnect paid organization tier is required.',
    );
  });

  it('does not treat organization ids as backtest ids', () => {
    const runner = new LeanCloudRunner({} as any, {} as any);

    const backtestId = (runner as any).extractBacktestId(
      "Successfully created cloud project 'aggressive_llm_momentum' in organization 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'",
    );

    expect(backtestId).toBeUndefined();
  });

  it('classifies_cloud_push_character_rejections_as_blocked', () => {
    const runner = new LeanCloudRunner({} as any, {} as any);

    const blockers = (runner as any).classifyBlockers(
      "Cannot push 'aggressive_llm_momentum': Invalid character '+' found in input string at position 62.",
    );

    expect(blockers).toContain(
      'QuantConnect Cloud project push rejected an unsupported project file or metadata character.',
    );
  });

  it('does not classify compiler API naming warnings as dataset access blockers', () => {
    const runner = new LeanCloudRunner({} as any, {} as any);

    const blockers = (runner as any).classifyBlockers(
      'Warning main.py Line: 59 Column: 45 - "DataNormalizationMode" has no attribute "Adjusted".',
    );

    expect(blockers).not.toContain(
      'QuantConnect dataset access may be blocked.',
    );
  });
});
