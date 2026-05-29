import { existsSync, readFileSync } from 'fs';
import { Repository } from 'typeorm';
import { PortfolioTargetSnapshot } from '../../../entities/portfolio-target-snapshot.entity';
import { hashObject } from '../../../shared/hash.util';
import { LeanPortfolioTargetsPayload } from './lean-run.types';

export async function importPortfolioTargetSnapshot(
  targetRepository: Repository<PortfolioTargetSnapshot>,
  leanRunId: string,
  portfolioTargetsRef?: string,
): Promise<PortfolioTargetSnapshot | null> {
  if (!portfolioTargetsRef || !existsSync(portfolioTargetsRef)) {
    return null;
  }

  const payload = JSON.parse(
    readFileSync(portfolioTargetsRef, 'utf8'),
  ) as LeanPortfolioTargetsPayload;
  const record = targetRepository.create({
    id: payload.id,
    leanRunId: payload.leanRunId ?? leanRunId,
    asOf: payload.asOf,
    targets: payload.targets,
    grossExposurePct: payload.grossExposurePct,
    maxSingleNamePct: payload.maxSingleNamePct,
    targetHash: payload.targetHash ?? hashObject(payload),
  });
  await targetRepository.upsert(record, ['id']);
  return record;
}
