import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { In, Repository } from 'typeorm';
import { ResearchHypothesis } from '../../../entities/research-hypothesis.entity';
import {
  ResearchJobRecord,
  ResearchJobType,
} from '../../../entities/research-job-record.entity';
import { hashObject } from '../../../shared/hash.util';
import {
  emptyResearchFactoryResult,
  parseAlphaArchitectHypotheses,
} from './alphaarchitect-corpus.parser';
import {
  ResearchFactoryIngestResult,
  ResearchFactoryStatus,
  SelectedRunBiasCheckResult,
} from './research-factory.types';

const VARIANT_JOB_TYPES: ResearchJobType[] = [
  'ablation',
  'backtest',
  'cloud-import',
];

@Injectable()
export class ResearchFactoryService {
  constructor(
    @InjectRepository(ResearchHypothesis)
    private readonly hypothesisRepository: Repository<ResearchHypothesis>,
    @InjectRepository(ResearchJobRecord)
    private readonly jobRepository: Repository<ResearchJobRecord>,
  ) {}

  async ingestAlphaArchitectCorpus(options: {
    indexPath?: string;
    strategyRegisterPath?: string;
  }): Promise<ResearchFactoryIngestResult> {
    const repoRoot = this.resolveRepoRoot();
    const indexPath =
      options.indexPath ??
      join(repoRoot, 'references/alphaarchitect/index.json');
    const strategyRegisterPath =
      options.strategyRegisterPath ??
      join(repoRoot, 'references/alphaarchitect/strategy-register.md');
    const missingRunId = this.stableRunId('alphaarchitect-corpus', {
      indexPath,
      strategyRegisterPath,
    });

    if (!existsSync(indexPath) || !existsSync(strategyRegisterPath)) {
      return emptyResearchFactoryResult(missingRunId, [
        `Missing Alpha Architect corpus files: ${indexPath}, ${strategyRegisterPath}`,
      ]);
    }

    const indexContent = readFileSync(indexPath, 'utf8');
    const strategyRegisterContent = readFileSync(strategyRegisterPath, 'utf8');
    const runId = this.stableRunId('alphaarchitect-corpus', {
      indexHash: hashObject(indexContent),
      strategyRegisterHash: hashObject(strategyRegisterContent),
    });
    const hypotheses = parseAlphaArchitectHypotheses(
      indexContent,
      strategyRegisterContent,
    );
    const existingHypotheses = await this.hypothesisRepository.findBy({
      id: In(hypotheses.map((candidate) => candidate.id)),
    });
    const existingHypothesisIds = new Set(
      existingHypotheses.map((hypothesis) => hypothesis.id),
    );
    const now = new Date().toISOString();
    const corpusJob = this.jobRepository.create({
      jobId: this.stableJobId('corpus-ingest', {
        indexHash: hashObject(indexContent),
        strategyRegisterHash: hashObject(strategyRegisterContent),
      }),
      runId,
      jobType: 'corpus-ingest',
      partitionKey: 'alphaarchitect',
      inputRefs: [indexPath, strategyRegisterPath],
      inputHash: hashObject({ indexContent, strategyRegisterContent }),
      outputRefs: ['research-corpus:alphaarchitect'],
      outputHash: hashObject(hypotheses.map((hypothesis) => hypothesis.id)),
      startedAt: now,
      completedAt: now,
      status: hypotheses.length > 0 ? 'passed' : 'blocked',
      blockerReasons:
        hypotheses.length > 0
          ? []
          : ['Strategy register produced no research hypotheses.'],
    });
    const hypothesisJobs = hypotheses.map((hypothesis) =>
      this.jobRepository.create({
        jobId: this.stableJobId('hypothesis-extraction', {
          inputHash: hypothesis.inputHash,
          outputHash: hypothesis.hypothesisHash,
        }),
        runId,
        parentJobId: corpusJob.jobId,
        jobType: 'hypothesis-extraction',
        partitionKey: hypothesis.id,
        inputRefs: hypothesis.evidenceRefs,
        inputHash: hypothesis.inputHash,
        outputRefs: [`research-hypothesis:${hypothesis.id}`],
        outputHash: hypothesis.hypothesisHash,
        startedAt: now,
        completedAt: now,
        status: 'passed',
        blockerReasons: [],
      }),
    );
    const existingJobs = await this.jobRepository.findBy({
      jobId: In([corpusJob, ...hypothesisJobs].map((job) => job.jobId)),
    });
    const existingJobIds = new Set(existingJobs.map((job) => job.jobId));

    await this.hypothesisRepository.save(
      hypotheses.map((hypothesis) =>
        this.hypothesisRepository.create(hypothesis),
      ),
    );
    await this.jobRepository.save([corpusJob, ...hypothesisJobs]);

    return {
      status: corpusJob.status === 'passed' ? 'completed' : 'blocked',
      runId,
      hypothesesSeen: hypotheses.length,
      hypothesesCreated: hypotheses.filter(
        (hypothesis) => !existingHypothesisIds.has(hypothesis.id),
      ).length,
      hypothesesUpdated: hypotheses.filter((hypothesis) =>
        existingHypothesisIds.has(hypothesis.id),
      ).length,
      jobRecordsCreated: [corpusJob, ...hypothesisJobs].filter(
        (job) => !existingJobIds.has(job.jobId),
      ).length,
      priorityCounts: {
        P1: hypotheses.filter((hypothesis) => hypothesis.priority === 'P1')
          .length,
        P2: hypotheses.filter((hypothesis) => hypothesis.priority === 'P2')
          .length,
        P3: hypotheses.filter((hypothesis) => hypothesis.priority === 'P3')
          .length,
        Out: hypotheses.filter((hypothesis) => hypothesis.priority === 'Out')
          .length,
      },
      blockers: corpusJob.blockerReasons,
    };
  }

  async checkSelectedRunBias(options: {
    targetRef?: string;
    hypothesisId?: string;
    minVariantCount?: number;
  }): Promise<SelectedRunBiasCheckResult> {
    const targetRef = options.targetRef ?? 'strategy:all-research';
    const minVariantCount = options.minVariantCount ?? 3;
    const jobs = await this.findVariantJobs(options.hypothesisId);
    const passedVariantCount = jobs.filter(
      (job) => job.status === 'passed',
    ).length;
    const failedOrBlockedVariantCount = jobs.filter(
      (job) => job.status === 'failed' || job.status === 'blocked',
    ).length;
    const blockers = [
      jobs.length < minVariantCount
        ? `Only ${jobs.length} variant jobs are recorded; at least ${minVariantCount} are required.`
        : '',
      passedVariantCount === 0
        ? 'No passed ablation, backtest, or Cloud-import variant is recorded.'
        : '',
      failedOrBlockedVariantCount === 0
        ? 'No failed or blocked variant is recorded; selected-run-bias protection needs rejected evidence too.'
        : '',
    ].filter(Boolean);
    const checkedAt = new Date().toISOString();
    const variantJobRefs = jobs.map((job) => `research-job:${job.jobId}`);
    const checkJobId = this.stableJobId('promotion-check', {
      targetRef,
      hypothesisId: options.hypothesisId ?? null,
      minVariantCount,
      inputHash: hashObject(jobs.map((job) => job.jobId).sort()),
    });
    const result: SelectedRunBiasCheckResult = {
      status: blockers.length ? 'blocked' : 'passed',
      checkedAt,
      targetRef,
      hypothesisId: options.hypothesisId,
      attemptedVariantCount: jobs.length,
      passedVariantCount,
      failedOrBlockedVariantCount,
      minVariantCount,
      jobRefs: [...variantJobRefs, `research-job:${checkJobId}`],
      blockers,
    };
    await this.jobRepository.save(
      this.jobRepository.create({
        jobId: checkJobId,
        runId: this.stableRunId('selected-run-bias-check', {
          targetRef,
          hypothesisId: options.hypothesisId ?? null,
        }),
        jobType: 'promotion-check',
        partitionKey: options.hypothesisId ?? targetRef,
        inputRefs: variantJobRefs,
        inputHash: hashObject({ targetRef, minVariantCount, jobs }),
        outputRefs: [`selected-run-bias:${targetRef}`],
        outputHash: hashObject(result),
        startedAt: checkedAt,
        completedAt: checkedAt,
        status: result.status,
        blockerReasons: blockers,
      }),
    );
    return result;
  }

  async getStatus(): Promise<ResearchFactoryStatus> {
    const [hypothesisCount, p1CandidateCount, outOfScopeCount, latestJobs] =
      await Promise.all([
        this.hypothesisRepository.count(),
        this.hypothesisRepository.count({
          where: { priority: 'P1', status: 'candidate' },
        }),
        this.hypothesisRepository.count({ where: { status: 'out_of_scope' } }),
        this.jobRepository.find({ order: { updatedAt: 'DESC' }, take: 1 }),
      ]);
    const latestJob = latestJobs[0];
    return {
      hypothesisCount,
      p1CandidateCount,
      outOfScopeCount,
      latestJobId: latestJob?.jobId,
      latestJobStatus: latestJob?.status,
      latestJobType: latestJob?.jobType,
    };
  }

  private findVariantJobs(
    hypothesisId: string | undefined,
  ): Promise<ResearchJobRecord[]> {
    return this.jobRepository.find({
      where: hypothesisId
        ? { jobType: In(VARIANT_JOB_TYPES), partitionKey: hypothesisId }
        : { jobType: In(VARIANT_JOB_TYPES) },
      order: { completedAt: 'DESC' },
    });
  }

  private resolveRepoRoot(): string {
    return process.cwd().endsWith('/backend')
      ? resolve(process.cwd(), '..')
      : process.cwd();
  }

  private stableRunId(scope: string, payload: unknown): string {
    return `${scope}-${this.shortHash(payload)}`;
  }

  private stableJobId(jobType: ResearchJobType, payload: unknown): string {
    return `${jobType}-${this.shortHash(payload)}`;
  }

  private shortHash(payload: unknown): string {
    return hashObject(payload).replace('sha256:', '').slice(0, 16);
  }
}
