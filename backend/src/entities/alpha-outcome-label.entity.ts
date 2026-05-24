import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('alpha_outcome_labels')
@Index(['symbol', 'labelAt'])
export class AlphaOutcomeLabel {
  @PrimaryColumn()
  id: string;

  @Column()
  alphaDecisionId: string;

  @Column()
  symbol: string;

  @Column()
  asOf: string;

  @Column()
  availableAt: string;

  @Column('int')
  horizonHours: number;

  @Column()
  labelAt: string;

  @Column('float')
  forwardReturnBps: number;

  @Column('float')
  benchmarkReturnBps: number;

  @Column('float')
  relativeReturnBps: number;

  @Column('json')
  sourceRefs: string[];

  @Column()
  labelHash: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
