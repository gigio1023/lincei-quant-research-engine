/**
 * OpenAI LLM committee for event/macro/risk text — no local NLP models (e.g. FinBERT).
 * Runs outside LEAN so backtests stay reproducible and broker credentials never enter prompts.
 */
import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlphaDecision } from '../../../entities/alpha-decision.entity';
import {
  AlphaDecisionContract,
  FeatureSnapshotContract,
} from '../contracts/v1-pilot.contracts';
import { validateAlphaDecision } from '../contracts/v1-pilot.validators';
import { loadOpenAiEnv } from '../../../shared/openai-env.loader';
import { hashObject } from '../../../shared/hash.util';

type LlmCommitteeResponse = {
  decisions: Array<{
    symbol: string;
    direction: 'up' | 'down' | 'flat';
    confidence: number;
    conviction: 'low' | 'medium' | 'high';
    thesis?: string;
    counterThesis?: string;
    evidenceRefs?: string[];
    abstainReason?: string;
    role: 'event' | 'macro' | 'risk';
  }>;
};

@Injectable()
export class LlmAlphaService {
  private readonly logger = new Logger(LlmAlphaService.name);

  constructor(
    @InjectRepository(AlphaDecision)
    private readonly alphaRepository: Repository<AlphaDecision>,
  ) {}

  async buildDecisions(
    snapshots: FeatureSnapshotContract[],
    numeric: AlphaDecisionContract[],
  ): Promise<AlphaDecisionContract[]> {
    const env = loadOpenAiEnv();
    if (
      !env.apiKey ||
      env.apiKey.includes('your_openai') ||
      env.apiKey.startsWith('test-')
    ) {
      this.logger.warn('OPENAI_API_KEY missing; skipping LLM alpha committee.');
      return [];
    }

    let parsed: LlmCommitteeResponse;
    try {
      const client = new OpenAI({
        apiKey: env.apiKey,
        baseURL: env.baseUrl,
        timeout: (env.requestTimeoutS ?? 30) * 1000,
      });
      const model = env.model ?? 'gpt-4.1-nano';
      const prompt = this.buildPrompt(snapshots, numeric);
      const reasoningModel = /^gpt-5/i.test(model) || /^o\d/i.test(model);
      const response = await client.chat.completions.create({
        model,
        ...(reasoningModel ? {} : { temperature: 0.2 }),
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'Return strict JSON with key decisions. Each decision must include symbol, direction, confidence, conviction, thesis, counterThesis, evidenceRefs, and role.',
          },
          { role: 'user', content: prompt },
        ],
      });
      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('LLM alpha committee returned empty content.');
      }
      parsed = JSON.parse(content) as LlmCommitteeResponse;
    } catch (error) {
      this.logger.warn(
        `LLM alpha committee unavailable: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      return [];
    }
    const decisions: AlphaDecisionContract[] = [];

    parsed.decisions.forEach((entry) => {
      const snapshot = snapshots.find((item) => item.symbol === entry.symbol);
      if (!snapshot) {
        return;
      }
      const decision: AlphaDecisionContract = {
        id: `llm-${entry.role}-${entry.symbol}-${snapshot.asOf.slice(0, 10)}`,
        source: 'llm',
        symbol: entry.symbol,
        asOf: snapshot.asOf,
        horizonDays: 21,
        direction: entry.direction,
        confidence: entry.confidence,
        conviction: entry.conviction,
        maxPositionPct: entry.direction === 'up' ? 0.2 : 0,
        featureSnapshotHash: snapshot.inputHash,
        sourceModels: [`llm-committee-${entry.role}`],
        evidenceRefs: entry.evidenceRefs ?? snapshot.sourceRefs,
        thesis: entry.thesis,
        counterThesis: entry.counterThesis,
        abstainReason: entry.abstainReason,
        inputHash: hashObject({
          snapshot: snapshot.inputHash,
          role: entry.role,
        }),
        outputHash: hashObject(entry),
      };
      if (decision.direction !== 'flat') {
        validateAlphaDecision(decision);
      }
      decisions.push(decision);
    });

    if (decisions.length > 0) {
      await this.alphaRepository.save(
        decisions.map((decision) => this.alphaRepository.create(decision)),
      );
    }

    return decisions;
  }

  private buildPrompt(
    snapshots: FeatureSnapshotContract[],
    numeric: AlphaDecisionContract[],
  ): string {
    return JSON.stringify({
      task: 'Produce event, macro, and risk committee decisions for each symbol.',
      snapshots: snapshots.map((snapshot) => ({
        symbol: snapshot.symbol,
        features: snapshot.features,
        inputHash: snapshot.inputHash,
      })),
      numeric,
    });
  }
}
