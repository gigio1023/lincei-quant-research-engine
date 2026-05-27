import {
  ResearchHypothesisPriority,
  ResearchHypothesisStatus,
} from '../../../entities/research-hypothesis.entity';
import {
  ResearchJobStatus,
  ResearchJobType,
} from '../../../entities/research-job-record.entity';

export interface ParsedResearchHypothesis {
  id: string;
  sourceCorpus: 'alphaarchitect';
  sourceRef: string;
  sourceUrl: string;
  sourceTitle: string;
  sourceAuthor?: string;
  sourcePublished?: string;
  localPath?: string;
  priority: ResearchHypothesisPriority;
  status: ResearchHypothesisStatus;
  strategyFamily: string;
  hypothesis: string;
  requiredData: string[];
  currentProjectGap: string;
  evidenceRefs: string[];
  blockerReasons: string[];
  extractionVersion: string;
  contentHash: string;
  inputHash: string;
  hypothesisHash: string;
}

export interface ResearchFactoryIngestResult {
  status: 'completed' | 'blocked';
  runId: string;
  hypothesesSeen: number;
  hypothesesCreated: number;
  hypothesesUpdated: number;
  jobRecordsCreated: number;
  priorityCounts: Record<ResearchHypothesisPriority, number>;
  blockers: string[];
}

export interface SelectedRunBiasCheckResult {
  status: 'passed' | 'blocked';
  checkedAt: string;
  targetRef: string;
  hypothesisId?: string;
  attemptedVariantCount: number;
  passedVariantCount: number;
  failedOrBlockedVariantCount: number;
  minVariantCount: number;
  jobRefs: string[];
  blockers: string[];
}

export interface ResearchFactoryStatus {
  hypothesisCount: number;
  p1CandidateCount: number;
  outOfScopeCount: number;
  latestJobId?: string;
  latestJobStatus?: ResearchJobStatus;
  latestJobType?: ResearchJobType;
  variantJobCount: number;
  passedVariantJobCount: number;
  failedOrBlockedVariantJobCount: number;
  latestVariantJobId?: string;
  latestVariantJobStatus?: ResearchJobStatus;
  latestVariantJobType?: ResearchJobType;
}
