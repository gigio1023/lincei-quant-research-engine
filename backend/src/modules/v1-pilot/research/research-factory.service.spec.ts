import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { join } from 'path';
import { Repository } from 'typeorm';
import { ResearchHypothesis } from '../../../entities/research-hypothesis.entity';
import {
  ResearchJobRecord,
  ResearchJobType,
} from '../../../entities/research-job-record.entity';
import { hashObject } from '../../../shared/hash.util';
import { ResearchFactoryService } from './research-factory.service';

describe('ResearchFactoryService', () => {
  let moduleRef: TestingModule;
  let service: ResearchFactoryService;
  let jobRepository: Repository<ResearchJobRecord>;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          entities: [ResearchHypothesis, ResearchJobRecord],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([ResearchHypothesis, ResearchJobRecord]),
      ],
      providers: [ResearchFactoryService],
    }).compile();

    service = moduleRef.get(ResearchFactoryService);
    jobRepository = moduleRef.get(getRepositoryToken(ResearchJobRecord));
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('ingests_alphaarchitect_register_into_idempotent_hypotheses_and_jobs', async () => {
    const repoRoot = join(process.cwd(), '..');
    const paths = {
      indexPath: join(repoRoot, 'references/alphaarchitect/index.json'),
      strategyRegisterPath: join(
        repoRoot,
        'references/alphaarchitect/strategy-register.md',
      ),
    };

    const first = await service.ingestAlphaArchitectCorpus(paths);
    const second = await service.ingestAlphaArchitectCorpus(paths);

    expect(first).toMatchObject({
      status: 'completed',
      hypothesesSeen: 40,
      hypothesesCreated: 40,
      hypothesesUpdated: 0,
      jobRecordsCreated: 41,
      priorityCounts: expect.objectContaining({ P1: 15 }),
    });
    expect(second).toMatchObject({
      status: 'completed',
      hypothesesSeen: 40,
      hypothesesCreated: 0,
      hypothesesUpdated: 40,
      jobRecordsCreated: 0,
    });
  });

  it('blocks_multiple_testing_bias_check_when_no_variant_artifacts_exist', async () => {
    const result = await service.checkSelectedRunBias({
      targetRef: 'strategy:missing-run',
    });

    expect(result.status).toBe('blocked');
    expect(result.attemptedVariantCount).toBe(0);
    expect(result.blockers).toContain(
      'No passed ablation, backtest, or Cloud-import variant is recorded.',
    );
    expect(result.blockers).toContain(
      'No retained backtest variant is recorded; ablation records alone are not promotion evidence.',
    );
    expect(result.blockers).toContain(
      'No retained Cloud-import variant is recorded; promotion needs imported Cloud artifacts by variant.',
    );
    expect(await jobRepository.countBy({ jobType: 'promotion-check' })).toBe(1);
  });

  it('passes_multiple_testing_bias_check_when_passed_and_rejected_variants_are_retained', async () => {
    await jobRepository.save([
      makeVariantJob('job-backtest-1', 'backtest', 'passed'),
      makeVariantJob('job-backtest-2', 'backtest', 'blocked'),
      makeVariantJob('job-cloud-1', 'cloud-import', 'blocked'),
      makeVariantJob('job-ablation-1', 'ablation', 'failed'),
    ]);

    const result = await service.checkSelectedRunBias({
      targetRef: 'strategy:test',
      minVariantCount: 3,
    });

    expect(result).toMatchObject({
      status: 'passed',
      attemptedVariantCount: 4,
      passedVariantCount: 1,
      failedOrBlockedVariantCount: 3,
      retainedBacktestVariantCount: 2,
      retainedCloudImportVariantCount: 1,
    });
  });
});

function makeVariantJob(
  jobId: string,
  jobType: ResearchJobType,
  status: ResearchJobRecord['status'],
): ResearchJobRecord {
  const payload = { jobId, jobType, status };
  return {
    jobId,
    runId: 'run-test',
    jobType,
    partitionKey: 'hypothesis:test',
    inputRefs: ['fixture:input'],
    inputHash: hashObject(payload),
    outputRefs: ['fixture:output'],
    outputHash: hashObject({ ...payload, output: true }),
    startedAt: '2026-05-27T00:00:00.000Z',
    completedAt: '2026-05-27T00:01:00.000Z',
    status,
    blockerReasons: status === 'passed' ? [] : ['fixture rejected variant'],
  } as ResearchJobRecord;
}
