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

    snapshots.forEach((snapshot) => {
      const numericDecision = numeric.find((item) => item.symbol === snapshot.symbol);
      const llmEvent = llm.find(
        (item) => item.symbol === snapshot.symbol && item.sourceModels[0]?.includes('event'),
      );
      const llmMacro = llm.find(
        (item) => item.symbol === snapshot.symbol && item.sourceModels[0]?.includes('macro'),
      );
      const llmRisk = llm.find(
        (item) => item.symbol === snapshot.symbol && item.sourceModels[0]?.includes('risk'),
      );
      const numericScore = this.directionScore(numericDecision?.direction, numericDecision?.confidence);
      const eventScore = this.directionScore(llmEvent?.direction, llmEvent?.confidence);
      const macroScore = this.directionScore(llmMacro?.direction, llmMacro?.confidence);
      const riskScore = 1 - this.directionScore(llmRisk?.direction, llmRisk?.confidence);
      const finalScore =
        numericScore * 0.5 +
        eventScore * 0.25 +
        macroScore * 0.15 +
        riskScore * 0.1;
      let direction: 'up' | 'down' | 'flat' = finalScore >= 0.65 ? 'up' : 'flat';
      let maxPositionPct = direction === 'up' ? 0.35 : 0;

      // Spec conflict rules: dampen size when committees disagree or risk reviewer is elevated.
      if (numericDecision?.direction === 'up' && llmEvent?.direction === 'flat') {
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
        horizonDays: 21,
        direction,
        confidence: Number(Math.min(1, Math.max(0.2, finalScore)).toFixed(4)),
        conviction: finalScore > 0.75 ? 'high' : finalScore > 0.55 ? 'medium' : 'low',
        maxPositionPct,
        featureSnapshotHash: snapshot.inputHash,
        sourceModels: ['LinceiMetaAlphaModel'],
        evidenceRefs: [
          ...(numericDecision?.evidenceRefs ?? []),
          ...(llmEvent?.evidenceRefs ?? []),
        ],
        thesis:
          direction === 'up'
            ? `Meta score ${finalScore.toFixed(3)} combines numeric and LLM committee inputs.`
            : undefined,
        counterThesis:
          direction === 'up'
            ? 'LLM disagreement or elevated risk score may reduce live exposure.'
            : undefined,
        abstainReason: direction === 'flat' ? 'Meta score below promotion threshold.' : undefined,
        inputHash: hashObject({
          numeric: numericDecision?.outputHash,
          llm: llm.map((item) => item.outputHash),
        }),
        outputHash: hashObject({ symbol: snapshot.symbol, finalScore, direction }),
      };

      if (direction !== 'flat') {
        validateAlphaDecision(decision);
      }
      metaDecisions.push(decision);
      void this.alphaRepository.save(this.alphaRepository.create(decision));
    });

    this.exportMetaDecisionsFile(metaDecisions);
    return metaDecisions;
  }

  private exportMetaDecisionsFile(decisions: AlphaDecisionContract[]): void {
    const workspaceRoot = resolve(
      process.cwd(),
      '../engines/lean/aggressive_llm_momentum',
    );
    const inputDir = join(workspaceRoot, 'input');
    mkdirSync(inputDir, { recursive: true });
    const payload = {
      generatedAt: new Date().toISOString(),
      decisions: decisions.map((decision) => ({
        id: decision.id,
        symbol: decision.symbol,
        direction: decision.direction,
        confidence: decision.confidence,
        llmScores: {
          event: decision.confidence,
          macro: decision.confidence * 0.9,
          riskAdjustment: 1 - decision.confidence * 0.5,
        },
      })),
    };
    writeFileSync(
      join(inputDir, 'meta_decisions.json'),
      `${JSON.stringify(payload, null, 2)}\n`,
      'utf8',
    );
  }

  private directionScore(
    direction: AlphaDecisionContract['direction'] | undefined,
    confidence = 0.5,
  ): number {
    if (direction === 'up') {
      return confidence;
    }
    if (direction === 'down') {
      return 1 - confidence;
    }
    return 0.5;
  }
}
