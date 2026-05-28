import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RawEvidenceRecord } from '../../../entities/raw-evidence-record.entity';
import { HuggingFaceSemanticEvidenceIngestService } from './huggingface-semantic-evidence-ingest.service';

describe('HuggingFaceSemanticEvidenceIngestService', () => {
  let service: HuggingFaceSemanticEvidenceIngestService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          entities: [RawEvidenceRecord],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([RawEvidenceRecord]),
      ],
      providers: [HuggingFaceSemanticEvidenceIngestService],
    }).compile();

    service = moduleRef.get(HuggingFaceSemanticEvidenceIngestService);
  });

  it('archives_fomc_rows_as_point_in_time_macro_evidence', async () => {
    const csv = [
      'Date,Release Date,Type,Text',
      '2024-01-31,2024-01-31,Statement,"Rates remain elevated, but inflation progress is noted."',
      '2024-03-20,2024-03-20,Minutes,"Participants discussed labor market risks."',
    ].join('\n');

    const first = await service.ingestFomcCsv(csv, 10);
    const second = await service.ingestFomcCsv(csv, 10);

    expect(first).toMatchObject({
      status: 'completed',
      recordsSeen: 2,
      recordsCreated: 2,
      recordsExisting: 0,
      source: 'hf-fomc-statements-minutes',
    });
    expect(second).toMatchObject({
      status: 'completed',
      recordsSeen: 2,
      recordsCreated: 0,
      recordsExisting: 2,
    });
  });

  it('blocks_when_fomc_csv_has_no_parseable_rows', async () => {
    const result = await service.ingestFomcCsv('Date,Release Date,Type,Text\n');

    expect(result.status).toBe('blocked');
    expect(result.blockers).toContain(
      'Hugging Face FOMC CSV contained no parseable rows.',
    );
  });
});
