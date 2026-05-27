import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { existsSync, readFileSync } from 'fs';
import { Repository } from 'typeorm';
import { RawEvidenceRecord } from '../../../entities/raw-evidence-record.entity';
import { hashString } from '../../../shared/hash.util';

const HF_FOMC_DATASET = 'vtasca/fomc-statements-minutes';
const HF_FOMC_FILE = 'communications.csv';
const HF_FOMC_URL = `https://huggingface.co/datasets/${HF_FOMC_DATASET}/resolve/main/${HF_FOMC_FILE}`;
const PARSER_VERSION = 'hf-fomc-statements-minutes-v1';

export type HuggingFaceSemanticEvidenceSource = 'hf-fomc-statements-minutes';

export type HuggingFaceSemanticEvidenceIngestRequest = {
  source?: HuggingFaceSemanticEvidenceSource;
  limit?: number;
  sourcePath?: string;
};

export type HuggingFaceSemanticEvidenceIngestResult = {
  source: HuggingFaceSemanticEvidenceSource;
  status: 'completed' | 'blocked';
  recordsSeen: number;
  recordsCreated: number;
  recordsExisting: number;
  latestAvailableAt?: string;
  blockers: string[];
};

type FomcCommunicationRow = {
  date: string;
  releaseDate: string;
  type: string;
  text: string;
};

type RawEvidenceCreatePayload = Omit<
  RawEvidenceRecord,
  'createdAt' | 'updatedAt'
>;

@Injectable()
export class HuggingFaceSemanticEvidenceIngestService {
  constructor(
    @InjectRepository(RawEvidenceRecord)
    private readonly evidenceRepository: Repository<RawEvidenceRecord>,
  ) {}

  async ingest(
    request: HuggingFaceSemanticEvidenceIngestRequest = {},
  ): Promise<HuggingFaceSemanticEvidenceIngestResult> {
    const source = request.source ?? 'hf-fomc-statements-minutes';
    if (source !== 'hf-fomc-statements-minutes') {
      return {
        source,
        status: 'blocked',
        recordsSeen: 0,
        recordsCreated: 0,
        recordsExisting: 0,
        blockers: [`Unsupported Hugging Face text evidence source: ${source}.`],
      };
    }

    const csv = await this.loadFomcCsv(request.sourcePath);
    return this.ingestFomcCsv(csv, request.limit ?? 80);
  }

  async ingestFomcCsv(
    csv: string,
    limit = 80,
  ): Promise<HuggingFaceSemanticEvidenceIngestResult> {
    const rows = this.parseFomcRows(csv)
      .sort(
        (left, right) =>
          new Date(right.releaseDate).getTime() -
          new Date(left.releaseDate).getTime(),
      )
      .slice(0, Math.max(1, limit));
    if (rows.length === 0) {
      return {
        source: 'hf-fomc-statements-minutes',
        status: 'blocked',
        recordsSeen: 0,
        recordsCreated: 0,
        recordsExisting: 0,
        blockers: ['Hugging Face FOMC CSV contained no parseable rows.'],
      };
    }

    let recordsCreated = 0;
    let recordsExisting = 0;
    let latestAvailableAt: string | undefined;
    for (const row of rows) {
      const record = this.fomcRowToEvidence(row);
      latestAvailableAt =
        latestAvailableAt &&
        new Date(latestAvailableAt).getTime() >
          new Date(record.availableAt).getTime()
          ? latestAvailableAt
          : record.availableAt;
      const existing = await this.evidenceRepository.findOne({
        where: { id: record.id },
      });
      if (existing) {
        recordsExisting += 1;
        continue;
      }
      await this.evidenceRepository.save(
        this.evidenceRepository.create(record),
      );
      recordsCreated += 1;
    }

    return {
      source: 'hf-fomc-statements-minutes',
      status: 'completed',
      recordsSeen: rows.length,
      recordsCreated,
      recordsExisting,
      latestAvailableAt,
      blockers: [],
    };
  }

  private async loadFomcCsv(sourcePath?: string): Promise<string> {
    if (sourcePath) {
      if (!existsSync(sourcePath)) {
        throw new Error(
          `Hugging Face text evidence file not found: ${sourcePath}`,
        );
      }
      return readFileSync(sourcePath, 'utf8');
    }
    const response = await fetch(HF_FOMC_URL);
    if (!response.ok) {
      throw new Error(
        `Hugging Face FOMC dataset download failed: ${response.status}.`,
      );
    }
    return response.text();
  }

  private parseFomcRows(csv: string): FomcCommunicationRow[] {
    const [headerRow, ...dataRows] = parseCsv(csv);
    const headers = headerRow.map((header) => normalizeHeader(header));
    return dataRows
      .map((row) => rowToObject(headers, row))
      .map((row) => ({
        date: row.date ?? '',
        releaseDate: row.releaseDate ?? row.releaseDateUtc ?? row.date ?? '',
        type: row.type ?? 'FOMC communication',
        text: row.text ?? '',
      }))
      .filter((row) => row.date && row.releaseDate && row.text);
  }

  private fomcRowToEvidence(
    row: FomcCommunicationRow,
  ): RawEvidenceCreatePayload {
    const contentHash = hashString(
      `${HF_FOMC_DATASET}:${row.releaseDate}:${row.type}:${row.text}`,
    );
    const eventTime = toIsoTimestamp(row.date);
    const publishedAt = toIsoTimestamp(row.releaseDate);
    return {
      id: `raw-hf-fomc-${row.releaseDate}-${slug(row.type)}-${contentHash.slice(-12)}`,
      sourceType: 'macro',
      sourceUrl: `https://huggingface.co/datasets/${HF_FOMC_DATASET}`,
      title: `FOMC ${row.type} ${row.date}`,
      content: row.text,
      eventTime,
      publishedAt,
      retrievedAt: new Date().toISOString(),
      availableAt: publishedAt,
      parserVersion: PARSER_VERSION,
      contentHash,
      metadata: {
        provider: 'huggingface',
        dataset: HF_FOMC_DATASET,
        file: HF_FOMC_FILE,
        communicationType: row.type,
        symbolScope: 'macro',
      },
      status: 'parsed',
      blockerReasons: [],
    };
  }
}

function parseCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
      continue;
    }
    if (char === ',') {
      row.push(field);
      field = '';
      continue;
    }
    if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      continue;
    }
    if (char !== '\r') {
      field += char;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((entry) => entry.some((value) => value.trim()));
}

function rowToObject(
  headers: string[],
  row: string[],
): Record<string, string | undefined> {
  return headers.reduce<Record<string, string | undefined>>(
    (result, header, index) => ({ ...result, [header]: row[index]?.trim() }),
    {},
  );
}

function normalizeHeader(header: string): string {
  return header
    .trim()
    .replace(/[^A-Za-z0-9]+([A-Za-z0-9])/g, (_, char: string) =>
      char.toUpperCase(),
    )
    .replace(/^[A-Z]/, (char) => char.toLowerCase());
}

function toIsoTimestamp(value: string): string {
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime())
    ? parsed.toISOString()
    : new Date(0).toISOString();
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
