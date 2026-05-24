import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NewsSource } from '../../../entities/news-source.entity';
import { RawEvidenceRecord } from '../../../entities/raw-evidence-record.entity';
import { hashObject, hashString } from '../../../shared/hash.util';

const PARSER_VERSION = 'raw-evidence-news-rss-v1';

@Injectable()
export class RawEvidenceArchiveService {
  constructor(
    @InjectRepository(NewsSource)
    private readonly newsRepository: Repository<NewsSource>,
    @InjectRepository(RawEvidenceRecord)
    private readonly evidenceRepository: Repository<RawEvidenceRecord>,
  ) {}

  async archiveRecentNews(limit = 40): Promise<RawEvidenceRecord[]> {
    const news = await this.newsRepository.find({
      order: { publishedAt: 'DESC' },
      take: limit,
    });
    const archived: RawEvidenceRecord[] = [];

    for (const item of news) {
      const contentHash = hashString(`${item.title}\n${item.content}`);
      const id = `raw-news-${item.id}-${contentHash.slice(-12)}`;
      const existing = await this.evidenceRepository.findOne({ where: { id } });
      if (existing) {
        archived.push(existing);
        continue;
      }
      const publishedAt = item.publishedAt.toISOString();
      const retrievedAt = item.createdAt?.toISOString() ?? publishedAt;
      const record = this.evidenceRepository.create({
        id,
        sourceType: 'news',
        sourceUrl: item.url,
        title: item.title,
        content: item.content,
        eventTime: publishedAt,
        publishedAt,
        retrievedAt,
        availableAt: retrievedAt,
        parserVersion: PARSER_VERSION,
        contentHash,
        metadata: {
          newsSourceId: item.id,
          source: item.source,
          category: item.category ?? null,
          tagsHash: hashObject(item.tags ?? []),
        },
        status: 'parsed',
        blockerReasons: [],
      });
      archived.push(await this.evidenceRepository.save(record));
    }

    return archived;
  }

  async listRecentEvidence(limit = 80): Promise<RawEvidenceRecord[]> {
    return this.evidenceRepository.find({
      order: { availableAt: 'DESC' },
      take: limit,
    });
  }
}
