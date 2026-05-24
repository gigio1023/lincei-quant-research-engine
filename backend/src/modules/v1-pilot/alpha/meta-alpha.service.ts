/**
 * Combines numeric and LLM scores into meta decisions and writes meta_decisions.json for LEAN replay.
 * Conflict rules intentionally reduce live max position when numeric and LLM disagree.
 */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { writeFileSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';
import { AlphaDecision } from '../../../entities/alpha-decision.entity';
import {
  AlphaDecisionContract,
  FeatureSnapshotContract,
} from '../contracts/v1-pilot.contracts';
import { validateAlphaDecision } from '../contracts/v1-pilot.validators';
import { hashObject } from '../../../shared/hash.util';
import {
  combineMetaFromDecisions,
  directionFromMetaScore,
  MetaDecisionExportRecord,
} from './meta-alpha.combiner';

@Injectable()
export class MetaAlphaService {
  constructor(
    @InjectRepository(AlphaDecision)
    private readonly alphaRepository: Repository<AlphaDecision>,
  ) {}

  async combine(
    snapshots: FeatureSnapshotContract[],
    numeric: AlphaDecisionContract[],
    llm: AlphaDecisionContract[],
  ): Promise<AlphaDecisionContract[]> {
    const metaDecisions: AlphaDecisionContract[] = [];
    const exportRecords: MetaDecisionExportRecord[] = [];

    const savePromises: Promise<AlphaDecision>[] = [];

    snapshots.forEach((snapshot) => {
      const numericDecision = numeric.find(
        (item) => item.symbol === snapshot.symbol,
      );
      const llmEvent = llm.find(
        (item) =>
          item.symbol === snapshot.symbol &&
          item.sourceModels[0]?.includes('event'),
      );
      const llmMacro = llm.find(
        (item) =>
          item.symbol === snapshot.symbol &&
          item.sourceModels[0]?.includes('macro'),
      );
      const llmRisk = llm.find(
        (item) =>
          item.symbol === snapshot.symbol &&
          item.sourceModels[0]?.includes('risk'),
      );
      const components = combineMetaFromDecisions({
        numeric: numericDecision,
        llmEvent,
        llmMacro,
        llmRisk,
      });
      const {
        numericScore,
        eventScore,
        macroScore,
        riskAdjustment,
        finalScore,
      } = components;
      let direction = directionFromMetaScore(finalScore);
      let maxPositionPct = direction === 'up' ? 0.35 : 0;

      // Spec conflict rules: dampen size when committees disagree or risk reviewer is elevated.
      if (
        numericDecision?.direction === 'up' &&
        llmEvent?.direction === 'flat'
      ) {
        maxPositionPct = Math.min(maxPositionPct, 0.175);
      }
      if (llmRisk && llmRisk.confidence > 0.7) {
        maxPositionPct = Math.min(maxPositionPct, 0.02);
      }
      if (!llm.length && numericDecision?.direction === 'up') {
        direction = 'up';
      }

      const decision: AlphaDecisionContract = {
        id: `meta-${snapshot.symbol}-${snapshot.asOf.slice(0, 10)}`,
        source: 'meta',
        symbol: snapshot.symbol,
        asOf: snapshot.asOf,
        availableAt: snapshot.availableAt ?? snapshot.dataAvailabilityTime,
        horizonDays: 21,
        horizonHours: 21 * 24,
        direction,
        confidence: Number(Math.min(1, Math.max(0.2, finalScore)).toFixed(4)),
        conviction:
          finalScore > 0.75 ? 'high' : finalScore > 0.55 ? 'medium' : 'low',
        maxPositionPct,
        featureSnapshotHash: snapshot.inputHash,
        sourceModels: ['LinceiMetaAlphaModel'],
        evidenceRefs: [
          ...(numericDecision?.evidenceRefs ?? []),
          ...(llmEvent?.evidenceRefs ?? []),
        ],
        llmFeatureRefs: llm
          .filter((item) => item.symbol === snapshot.symbol)
          .flatMap((item) => item.llmFeatureRefs ?? []),
        numericFeatureRefs: numericDecision
          ? [
              numericDecision.outputHash,
              ...(numericDecision.numericFeatureRefs ?? []),
            ]
          : [],
        promptVersion: llmEvent?.promptVersion ?? llmMacro?.promptVersion,
        thesis:
          direction === 'up'
            ? `Meta score ${finalScore.toFixed(3)} combines numeric and LLM committee inputs.`
            : undefined,
        counterThesis:
          direction === 'up'
            ? 'LLM disagreement or elevated risk score may reduce live exposure.'
            : undefined,
        abstainReason:
          direction === 'flat'
            ? 'Meta score below promotion threshold.'
            : undefined,
        inputHash: hashObject({
          numeric: numericDecision?.outputHash,
          llm: llm.map((item) => item.outputHash),
        }),
        outputHash: hashObject({
          symbol: snapshot.symbol,
          finalScore,
          direction,
        }),
      };

      if (direction !== 'flat') {
        validateAlphaDecision(decision);
      }
      metaDecisions.push(decision);
      exportRecords.push({
        id: decision.id,
        symbol: decision.symbol,
        direction,
        confidence: decision.confidence,
        numericScore,
        eventScore,
        macroScore,
        riskAdjustment,
        finalScore,
        llmScores: {
          event: eventScore,
          macro: macroScore,
          riskAdjustment,
        },
        maxPositionPct,
      });
      savePromises.push(
        this.alphaRepository.save(this.alphaRepository.create(decision)),
      );
    });

    await Promise.all(savePromises);
    this.exportMetaDecisionsFile(exportRecords);
    return metaDecisions;
  }

  private exportMetaDecisionsFile(records: MetaDecisionExportRecord[]): void {
    const workspaceRoot = resolve(
      process.cwd(),
      '../engines/lean/aggressive_llm_momentum',
    );
    const inputDir = join(workspaceRoot, 'input');
    mkdirSync(inputDir, { recursive: true });
    const payload = {
      generatedAt: new Date().toISOString(),
      decisions: records,
    };
    writeFileSync(
      join(inputDir, 'meta_decisions.json'),
      `${JSON.stringify(payload, null, 2)}\n`,
      'utf8',
    );
  }
}
