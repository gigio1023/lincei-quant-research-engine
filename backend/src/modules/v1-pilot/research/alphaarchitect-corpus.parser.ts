import { hashObject } from '../../../shared/hash.util';
import {
  ParsedResearchHypothesis,
  ResearchFactoryIngestResult,
} from './research-factory.types';

const EXTRACTION_VERSION = 'alphaarchitect-register-v1';

interface AlphaArchitectArticleIndex {
  title: string;
  source_url: string;
  slug: string;
  author?: string;
  published?: string;
  content_sha256: string;
  local_path: string;
  categories?: string[];
}

interface AlphaArchitectIndex {
  articles: AlphaArchitectArticleIndex[];
}

interface StrategyRegisterRow {
  rowNumber: string;
  sourceLabel: string;
  sourcePath?: string;
  priority: ParsedResearchHypothesis['priority'];
  hypothesis: string;
  requiredData: string;
  currentProjectGap: string;
}

export function parseAlphaArchitectHypotheses(
  indexContent: string,
  strategyRegisterContent: string,
): ParsedResearchHypothesis[] {
  const index = JSON.parse(indexContent) as AlphaArchitectIndex;
  const articlesByPath = new Map(
    index.articles.map((article) => [article.local_path, article]),
  );

  return parseStrategyRegisterRows(strategyRegisterContent).map((row) => {
    const localPath = row.sourcePath
      ? `references/alphaarchitect/${row.sourcePath}`
      : undefined;
    const article = localPath ? articlesByPath.get(localPath) : undefined;
    const sourceUrl = article?.source_url ?? localPath ?? row.sourceLabel;
    const sourceTitle = article?.title ?? row.sourceLabel;
    const contentHash = article?.content_sha256 ?? hashObject(row);
    const strategyFamily = inferStrategyFamily(
      `${row.hypothesis} ${row.requiredData} ${article?.categories?.join(' ') ?? ''}`,
    );
    const status = priorityToStatus(row.priority);
    const blockerReasons = priorityBlockers(row.priority);
    const inputPayload = {
      sourceUrl,
      contentHash,
      strategyRegisterRow: row.rowNumber,
      extractionVersion: EXTRACTION_VERSION,
    };
    const hypothesisPayload = {
      sourceUrl,
      priority: row.priority,
      strategyFamily,
      hypothesis: row.hypothesis,
      requiredData: splitRequiredData(row.requiredData),
      currentProjectGap: row.currentProjectGap,
      extractionVersion: EXTRACTION_VERSION,
    };

    return {
      id: `research-hypothesis-alphaarchitect-${row.rowNumber.padStart(2, '0')}-${article?.slug ?? slugify(row.sourceLabel)}`,
      sourceCorpus: 'alphaarchitect',
      sourceRef: `alphaarchitect:${row.rowNumber}`,
      sourceUrl,
      sourceTitle,
      sourceAuthor: article?.author,
      sourcePublished: article?.published,
      localPath,
      priority: row.priority,
      status,
      strategyFamily,
      hypothesis: row.hypothesis,
      requiredData: splitRequiredData(row.requiredData),
      currentProjectGap: row.currentProjectGap,
      evidenceRefs: [sourceUrl, localPath].filter((ref): ref is string =>
        Boolean(ref),
      ),
      blockerReasons,
      extractionVersion: EXTRACTION_VERSION,
      contentHash,
      inputHash: hashObject(inputPayload),
      hypothesisHash: hashObject(hypothesisPayload),
    };
  });
}

export function emptyResearchFactoryResult(
  runId: string,
  blockers: string[],
): ResearchFactoryIngestResult {
  return {
    status: 'blocked',
    runId,
    hypothesesSeen: 0,
    hypothesesCreated: 0,
    hypothesesUpdated: 0,
    jobRecordsCreated: 0,
    priorityCounts: { P1: 0, P2: 0, P3: 0, Out: 0 },
    blockers,
  };
}

function parseStrategyRegisterRows(content: string): StrategyRegisterRow[] {
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('|') && !line.includes('---'))
    .map(splitMarkdownTableRow)
    .filter((cells) => cells.length >= 6 && cells[0] !== '#')
    .map((cells) => {
      const source = parseMarkdownLink(cells[1]);
      return {
        rowNumber: cells[0],
        sourceLabel: source.label,
        sourcePath: source.href,
        priority: parsePriority(cells[2]),
        hypothesis: cells[3],
        requiredData: cells[4],
        currentProjectGap: cells[5],
      };
    });
}

function splitMarkdownTableRow(line: string): string[] {
  return line
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function parseMarkdownLink(value: string): { label: string; href?: string } {
  const match = value.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
  return match ? { label: match[1], href: match[2] } : { label: value };
}

function parsePriority(value: string): StrategyRegisterRow['priority'] {
  if (value === 'P1' || value === 'P2' || value === 'P3' || value === 'Out') {
    return value;
  }
  return 'P3';
}

function priorityToStatus(
  priority: StrategyRegisterRow['priority'],
): ParsedResearchHypothesis['status'] {
  if (priority === 'P1') {
    return 'candidate';
  }
  if (priority === 'Out') {
    return 'out_of_scope';
  }
  return 'deferred';
}

function priorityBlockers(priority: StrategyRegisterRow['priority']): string[] {
  if (priority === 'P1') {
    return [];
  }
  if (priority === 'Out') {
    return ['Outside current approved asset, broker, leverage, or data scope.'];
  }
  return ['Deferred until P1 baselines and required point-in-time data exist.'];
}

function splitRequiredData(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function inferStrategyFamily(value: string): string {
  const lower = value.toLowerCase();
  if (lower.includes('trend') || lower.includes('moving average')) {
    return 'trend-following';
  }
  if (lower.includes('momentum') || lower.includes('daily return')) {
    return 'momentum';
  }
  if (
    lower.includes('factor') ||
    lower.includes('anomaly') ||
    lower.includes('value') ||
    lower.includes('cape')
  ) {
    return 'factor';
  }
  if (
    lower.includes('ai') ||
    lower.includes('language') ||
    lower.includes('filing') ||
    lower.includes('news') ||
    lower.includes('geopolitical')
  ) {
    return 'semantic-text';
  }
  if (lower.includes('defensive') || lower.includes('risk')) {
    return 'defensive';
  }
  if (lower.includes('option') || lower.includes('future')) {
    return 'out-of-scope-instrument';
  }
  return 'research-context';
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
