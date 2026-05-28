import { Repository } from 'typeorm';
import { AlphaDecision } from '../../../entities/alpha-decision.entity';
import { ResearchJobRecord } from '../../../entities/research-job-record.entity';
import { V1PilotOrchestratorService } from '../v1-pilot-orchestrator.service';
import { CapitalEvidenceSliceService } from './capital-evidence-slice.service';
import { ResearchFactoryService } from './research-factory.service';

describe('CapitalEvidenceSliceService', () => {
  it('records retained blocked variants and promotion status when prerequisites are missing', async () => {
    const savedJobs: ResearchJobRecord[] = [];
    const service = new CapitalEvidenceSliceService(
      mockOrchestrator(),
      mockResearchFactory(),
      {
        create: (record: ResearchJobRecord) => record,
        save: async (record: ResearchJobRecord) => {
          savedJobs.push(record);
          return record;
        },
      } as unknown as Repository<ResearchJobRecord>,
      {
        find: async () => [],
      } as unknown as Repository<AlphaDecision>,
    );

    const result = await service.run({ maxBacktestWorkers: 1 });

    expect(result.status).toBe('blocked');
    expect(result.variantSummary).toEqual({
      passed: 0,
      failed: 0,
      blocked: 3,
      flatNoOrder: 0,
    });
    expect(savedJobs).toHaveLength(3);
    expect(savedJobs.every((job) => job.jobType === 'ablation')).toBe(true);
    expect(result.brokerWriteCandidateStatus.status).toBe('blocked');
    expect(JSON.stringify(result.promotionDecision)).toContain('blocked');
  });
});

function mockOrchestrator(): V1PilotOrchestratorService {
  return {
    buildHypothesisRegistry: jest.fn(async () => ({
      status: 'completed',
      runId: 'corpus-run',
      blockers: [],
    })),
    ingestSemanticEvidence: jest.fn(async () => ({
      status: 'completed',
      blockers: [],
    })),
    prepareLeanLocalData: jest.fn(async () => ({
      status: 'blocked',
      blockers: ['Market data is missing.'],
    })),
    runAlphaCycle: jest.fn(async () => {
      throw new Error('Insufficient market data for SPY.');
    }),
    listQuantConnectCloudProjects: jest.fn(async () => ({
      status: 'blocked',
      blockers: ['QuantConnect REST credentials are missing.'],
    })),
    runSelectedRunBiasCheck: jest.fn(async () => ({
      status: 'blocked',
      attemptedVariantCount: 3,
      passedVariantCount: 0,
      failedOrBlockedVariantCount: 3,
      blockers: [
        'No passed ablation, backtest, or Cloud-import variant is recorded.',
      ],
    })),
    runPaperCycle: jest.fn(async () => {
      throw new Error('No accepted LEAN strategy run imported.');
    }),
    runLiveShadow: jest.fn(async () => ({
      status: 'blocked',
      blockerReasons: ['No portfolio target snapshot is available.'],
    })),
    runLearningLoop: jest.fn(async () => ({
      labelsCreated: 0,
      promotionDecision: {
        status: 'blocked',
        blockerReasons: ['Latest LEAN run is not QuantConnect Cloud evidence.'],
      },
    })),
    runLivePreflight: jest.fn(async () => ({
      status: 'blocked',
      blockers: ['Broker read-only snapshot is missing.'],
    })),
  } as unknown as V1PilotOrchestratorService;
}

function mockResearchFactory(): ResearchFactoryService {
  return {
    getStatus: jest.fn(async () => ({
      hypothesisCount: 1,
      p1CandidateCount: 1,
      outOfScopeCount: 0,
      variantJobCount: 3,
      passedVariantJobCount: 0,
      failedOrBlockedVariantJobCount: 3,
    })),
  } as unknown as ResearchFactoryService;
}
