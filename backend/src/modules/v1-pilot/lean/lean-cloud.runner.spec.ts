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
});
