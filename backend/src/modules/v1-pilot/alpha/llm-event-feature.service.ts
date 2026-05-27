import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { InjectRepository } from '@nestjs/typeorm';
import { mkdirSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { Repository } from 'typeorm';
import { LlmEventFeature } from '../../../entities/llm-event-feature.entity';
import { RawEvidenceRecord } from '../../../entities/raw-evidence-record.entity';
import { hashObject } from '../../../shared/hash.util';
import { loadOpenAiEnv } from '../../../shared/openai-env.loader';
import {
  AlphaDecisionContract,
  FeatureSnapshotContract,
} from '../contracts/v1-pilot.contracts';
import {
  LlmEventFeatureContract,
  SemanticEventType,
} from '../contracts/spec-contracts';
import { validateLlmEventFeature } from '../contracts/v1-pilot.validators';
import { RawEvidenceArchiveService } from './raw-evidence-archive.service';

type LlmFeatureResponse = {
  features: Array<Partial<LlmEventFeatureContract>>;
};

const PROMPT_VERSION = 'semantic-alpha-v1';
const EVENT_TYPES: SemanticEventType[] = ['event', 'macro', 'risk'];

@Injectable()
export class LlmEventFeatureService {
  private readonly logger = new Logger(LlmEventFeatureService.name);
  private readonly repoRoot = resolve(process.cwd(), '..');

  constructor(
    @InjectRepository(LlmEventFeature)
    private readonly featureRepository: Repository<LlmEventFeature>,
    private readonly rawEvidenceArchive: RawEvidenceArchiveService,
  ) {}

  async buildFeatures(
    snapshots: FeatureSnapshotContract[],
    numeric: AlphaDecisionContract[],
  ): Promise<LlmEventFeatureContract[]> {
    await this.rawEvidenceArchive.archiveRecentNews();
    const evidence = await this.rawEvidenceArchive.listRecentEvidence();
    const generated = await this.generateFeatures(snapshots, numeric, evidence);
    const saved = await this.saveFeatures(generated);
    this.exportLatestFeatures(saved);
    return saved;
  }

  private async generateFeatures(
    snapshots: FeatureSnapshotContract[],
    numeric: AlphaDecisionContract[],
    evidence: RawEvidenceRecord[],
  ): Promise<LlmEventFeatureContract[]> {
    const env = loadOpenAiEnv();
    if (
      !env.apiKey ||
      env.apiKey.includes('your_openai') ||
      env.apiKey.startsWith('test-')
    ) {
      return this.flatFeatures(
        snapshots,
        evidence,
        'OPENAI_API_KEY missing; LLM-derived feature abstained.',
        env.model ?? 'llm-unavailable',
      );
    }

    try {
      const client = new OpenAI({
        apiKey: env.apiKey,
        baseURL: env.baseUrl,
        timeout: (env.requestTimeoutS ?? 30) * 1000,
      });
      const model = env.model ?? 'gpt-4.1-nano';
      const response = await client.chat.completions.create({
        model,
        ...(/^gpt-5/i.test(model) || /^o\d/i.test(model)
          ? {}
          : { temperature: 0.1 }),
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'Return strict JSON with key features. Features must be replayable and never include broker instructions.',
          },
          {
            role: 'user',
            content: this.buildPrompt(snapshots, numeric, evidence),
          },
        ],
      });
      const parsed = JSON.parse(
        response.choices[0]?.message?.content ?? '{"features":[]}',
      ) as LlmFeatureResponse;
      const features = this.normalizeModelFeatures(
        snapshots,
        evidence,
        parsed,
        model,
      );
      return features.length > 0
        ? features
        : this.flatFeatures(
            snapshots,
            evidence,
            'LLM returned no LLM-derived features.',
            model,
          );
    } catch (error) {
      this.logger.warn(
        `LLM-derived feature generation unavailable: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      return this.flatFeatures(
        snapshots,
        evidence,
        'LLM-derived feature generation failed; feature abstained.',
        env.model ?? 'llm-unavailable',
      );
    }
  }

  private normalizeModelFeatures(
    snapshots: FeatureSnapshotContract[],
    evidence: RawEvidenceRecord[],
    parsed: LlmFeatureResponse,
    model: string,
  ): LlmEventFeatureContract[] {
    const symbols = new Set(snapshots.map((snapshot) => snapshot.symbol));
    return (parsed.features ?? [])
      .filter((item) => item.symbol && symbols.has(item.symbol))
      .map((item) => {
        const symbol = item.symbol!;
        const snapshot = snapshots.find((entry) => entry.symbol === symbol)!;
        const eventType = this.eventType(item.eventType);
        const eligibleEvidence = this.eligibleEvidenceForSnapshot(
          snapshot,
          evidence,
        );
        const evidenceRefs = this.evidenceRefs(
          item.evidenceRefs,
          eligibleEvidence,
        );
        const safeEvidenceRefs = evidenceRefs.length
          ? evidenceRefs
          : [`no-text-evidence:${symbol}`];
        const featureAvailableAt = this.featureAvailableAt(
          snapshot,
          safeEvidenceRefs,
          eligibleEvidence,
        );
        const base = {
          symbol,
          eventType,
          evidenceRefs: safeEvidenceRefs,
          model,
          promptVersion: PROMPT_VERSION,
          snapshotHash: snapshot.inputHash,
        };
        const eventId =
          item.eventId ??
          `${eventType}-${symbol}-${snapshot.asOf.slice(0, 10)}`;
        const feature: LlmEventFeatureContract = {
          id: `llm-feature-${eventId}`,
          symbol,
          eventId,
          eventTime: item.eventTime ?? snapshot.asOf,
          availableAt: featureAvailableAt,
          processedAt: new Date().toISOString(),
          horizonHours: item.horizonHours ?? 21 * 24,
          eventType,
          direction: safeEvidenceRefs.some((ref) =>
            ref.startsWith('raw-evidence:'),
          )
            ? this.direction(item.direction)
            : 'flat',
          sentimentScore: this.score(item.sentimentScore, 0.5),
          catalystStrength: this.score(item.catalystStrength, 0.5),
          noveltyScore: this.score(item.noveltyScore, 0.5),
          uncertainty: this.score(item.uncertainty, 0.5),
          downsideRisk: this.score(item.downsideRisk, 0.5),
          confidence: this.score(item.confidence, 0.2),
          thesis: item.thesis ?? 'LLM emitted a structured feature.',
          counterThesis:
            item.counterThesis ?? 'Evidence quality may be insufficient.',
          evidenceRefs: safeEvidenceRefs,
          model,
          promptVersion: PROMPT_VERSION,
          inputHash: hashObject(base),
          outputHash: hashObject(item),
          abstainReason:
            item.abstainReason ??
            (safeEvidenceRefs.some((ref) => ref.startsWith('raw-evidence:'))
              ? undefined
              : 'No point-in-time eligible text evidence refs.'),
        };
        validateLlmEventFeature(feature);
        return feature;
      });
  }

  private flatFeatures(
    snapshots: FeatureSnapshotContract[],
    evidence: RawEvidenceRecord[],
    reason: string,
    model: string,
  ): LlmEventFeatureContract[] {
    return snapshots.flatMap((snapshot) =>
      EVENT_TYPES.map((eventType) => {
        const eligibleEvidence = this.eligibleEvidenceForSnapshot(
          snapshot,
          evidence,
        );
        const refs = this.evidenceRefs(undefined, eligibleEvidence);
        const eventId = `${eventType}-${snapshot.symbol}-${snapshot.asOf.slice(0, 10)}`;
        const feature: LlmEventFeatureContract = {
          id: `llm-feature-${eventId}`,
          symbol: snapshot.symbol,
          eventId,
          eventTime: snapshot.asOf,
          availableAt: this.featureAvailableAt(
            snapshot,
            refs,
            eligibleEvidence,
          ),
          processedAt: new Date().toISOString(),
          horizonHours: 21 * 24,
          eventType,
          direction: 'flat',
          sentimentScore: 0.5,
          catalystStrength: 0,
          noveltyScore: 0,
          uncertainty: 1,
          downsideRisk: eventType === 'risk' ? 1 : 0.5,
          confidence: 0,
          thesis: 'Semantic alpha feature abstained.',
          counterThesis: reason,
          evidenceRefs: refs.length
            ? refs
            : [`no-text-evidence:${snapshot.symbol}`],
          model,
          promptVersion: PROMPT_VERSION,
          inputHash: hashObject({
            snapshot: snapshot.inputHash,
            eventType,
            refs,
          }),
          outputHash: hashObject({
            snapshot: snapshot.symbol,
            eventType,
            reason,
          }),
          abstainReason: reason,
        };
        validateLlmEventFeature(feature);
        return feature;
      }),
    );
  }

  private async saveFeatures(
    features: LlmEventFeatureContract[],
  ): Promise<LlmEventFeatureContract[]> {
    if (features.length === 0) {
      return [];
    }
    const saved = await this.featureRepository.save(
      features.map((feature) => this.featureRepository.create(feature)),
    );
    return saved.map((feature) => ({ ...feature }));
  }

  private exportLatestFeatures(features: LlmEventFeatureContract[]): void {
    const payload = {
      generatedAt: new Date().toISOString(),
      promptVersion: PROMPT_VERSION,
      features,
    };
    const artifactsDir = join(this.repoRoot, 'artifacts/llm-features');
    mkdirSync(artifactsDir, { recursive: true });
    writeFileSync(
      join(artifactsDir, 'latest.json'),
      `${JSON.stringify(payload, null, 2)}\n`,
      'utf8',
    );
    const leanInputDir = join(
      this.repoRoot,
      'engines/lean/aggressive_llm_momentum/input',
    );
    mkdirSync(leanInputDir, { recursive: true });
    writeFileSync(
      join(leanInputDir, 'llm_event_features.json'),
      `${JSON.stringify(payload, null, 2)}\n`,
      'utf8',
    );
  }

  private buildPrompt(
    snapshots: FeatureSnapshotContract[],
    numeric: AlphaDecisionContract[],
    evidence: RawEvidenceRecord[],
  ): string {
    const eligibleEvidence = this.eligibleEvidenceForSnapshots(
      snapshots,
      evidence,
    );
    return JSON.stringify({
      task: 'Create point-in-time LLM-derived features. Emit event, macro, and risk features when point-in-time text evidence supports them; otherwise emit flat abstentions.',
      promptVersion: PROMPT_VERSION,
      symbols: snapshots.map((snapshot) => ({
        symbol: snapshot.symbol,
        asOf: snapshot.asOf,
        availableAt: snapshot.availableAt ?? snapshot.dataAvailabilityTime,
        features: snapshot.features,
      })),
      numeric: numeric.map((decision) => ({
        symbol: decision.symbol,
        direction: decision.direction,
        confidence: decision.confidence,
        expectedReturnBps: decision.expectedReturnBps,
      })),
      evidence: eligibleEvidence.slice(0, 20).map((record) => ({
        ref: `raw-evidence:${record.id}`,
        sourceType: record.sourceType,
        symbol: record.symbol,
        title: record.title,
        availableAt: record.availableAt,
        content: record.content.slice(0, 800),
      })),
      evidenceCuts: snapshots.map((snapshot) => ({
        symbol: snapshot.symbol,
        asOf: snapshot.asOf,
        availableAt: snapshot.availableAt,
        eligibleEvidenceRefs: this.eligibleEvidenceForSnapshot(
          snapshot,
          evidence,
        )
          .slice(0, 20)
          .map((record) => `raw-evidence:${record.id}`),
      })),
      outputContract: {
        features:
          'Array of symbol,eventId,eventTime,availableAt,horizonHours,eventType,direction,scores,thesis,counterThesis,evidenceRefs,abstainReason',
        allowedEventTypes: EVENT_TYPES,
      },
    });
  }

  private eventType(value: unknown): SemanticEventType {
    return EVENT_TYPES.includes(value as SemanticEventType)
      ? (value as SemanticEventType)
      : 'event';
  }

  private direction(value: unknown): 'up' | 'down' | 'flat' {
    return value === 'up' || value === 'down' ? value : 'flat';
  }

  private score(value: unknown, fallback: number): number {
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed)
      ? Number(Math.min(1, Math.max(0, parsed)).toFixed(6))
      : fallback;
  }

  private evidenceRefs(
    refs: string[] | undefined,
    evidence: RawEvidenceRecord[],
  ): string[] {
    const allowed = new Set(
      evidence.map((record) => `raw-evidence:${record.id}`),
    );
    if (refs?.length) {
      return refs.filter((ref) => allowed.has(ref));
    }
    return evidence.slice(0, 5).map((record) => `raw-evidence:${record.id}`);
  }

  private eligibleEvidenceForSnapshot(
    snapshot: FeatureSnapshotContract,
    evidence: RawEvidenceRecord[],
  ): RawEvidenceRecord[] {
    const snapshotAvailableAt = new Date(snapshot.availableAt).getTime();
    return evidence.filter((record) => {
      const evidenceAvailableAt = new Date(record.availableAt).getTime();
      if (!Number.isFinite(evidenceAvailableAt)) {
        return false;
      }
      if (evidenceAvailableAt > snapshotAvailableAt) {
        return false;
      }
      return !record.symbol || record.symbol === snapshot.symbol;
    });
  }

  private eligibleEvidenceForSnapshots(
    snapshots: FeatureSnapshotContract[],
    evidence: RawEvidenceRecord[],
  ): RawEvidenceRecord[] {
    const byId = new Map<string, RawEvidenceRecord>();
    snapshots.forEach((snapshot) => {
      this.eligibleEvidenceForSnapshot(snapshot, evidence).forEach((record) => {
        byId.set(record.id, record);
      });
    });
    return [...byId.values()].sort(
      (left, right) =>
        new Date(right.availableAt).getTime() -
        new Date(left.availableAt).getTime(),
    );
  }

  private featureAvailableAt(
    snapshot: FeatureSnapshotContract,
    refs: string[],
    evidence: RawEvidenceRecord[],
  ): string {
    const evidenceByRef = new Map(
      evidence.map((record) => [`raw-evidence:${record.id}`, record]),
    );
    const latestInputAvailability = refs
      .map((ref) => evidenceByRef.get(ref)?.availableAt)
      .filter((value): value is string => Boolean(value))
      .reduce(
        (latest, value) => Math.max(latest, new Date(value).getTime()),
        new Date(snapshot.availableAt).getTime(),
      );
    return new Date(latestInputAvailability).toISOString();
  }
}
