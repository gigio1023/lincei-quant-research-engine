import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

export type ResearchHypothesisPriority = 'P1' | 'P2' | 'P3' | 'Out';

export type ResearchHypothesisStatus =
  | 'candidate'
  | 'deferred'
  | 'out_of_scope'
  | 'promoted'
  | 'rejected'
  | 'blocked';

@Entity('research_hypotheses')
@Index(['priority', 'status'])
@Index(['sourceCorpus', 'sourceRef'])
export class ResearchHypothesis {
  @PrimaryColumn()
  id: string;

  @Column()
  sourceCorpus: 'alphaarchitect' | 'manual' | 'paper';

  @Column()
  sourceRef: string;

  @Column()
  sourceUrl: string;

  @Column()
  sourceTitle: string;

  @Column({ nullable: true })
  sourceAuthor?: string;

  @Column({ nullable: true })
  sourcePublished?: string;

  @Column({ nullable: true })
  localPath?: string;

  @Column()
  priority: ResearchHypothesisPriority;

  @Column()
  status: ResearchHypothesisStatus;

  @Column()
  strategyFamily: string;

  @Column('text')
  hypothesis: string;

  @Column('json')
  requiredData: string[];

  @Column('text')
  currentProjectGap: string;

  @Column('json')
  evidenceRefs: string[];

  @Column('json')
  blockerReasons: string[];

  @Column()
  extractionVersion: string;

  @Column()
  contentHash: string;

  @Column()
  inputHash: string;

  @Column()
  hypothesisHash: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
