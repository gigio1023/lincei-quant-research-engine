import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import type {
  PortfolioSnapshot,
  ProposedOrder,
  RiskGateActor,
} from '../modules/risk-gate/risk-gate.types';

export type InvestmentProposalStatus =
  | 'generated'
  | 'evaluated'
  | 'rejected'
  | 'needs_review'
  | 'paper_ready'
  | 'archived';

@Entity('investment_proposals')
export class InvestmentProposal {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  budgetEnvelopeId?: number;

  @Column({ nullable: true })
  researchRunId?: number;

  @Column()
  strategyId: string;

  @Column()
  ruleId: string;

  @Column({ default: 'strategy' })
  actor: RiskGateActor;

  @Column({ default: 'generated' })
  status: InvestmentProposalStatus;

  @Column('datetime')
  generatedAt: Date;

  @Column('datetime')
  marketDataTimestamp: Date;

  @Column('json')
  portfolioSnapshot: PortfolioSnapshot;

  @Column('json')
  orders: ProposedOrder[];

  @Column('text', { nullable: true })
  thesis?: string;

  @Column('json', { nullable: true })
  evidenceRefs?: string[];

  @Column({ default: false })
  brokerExecutionEnabled: boolean;

  @Column({ default: true })
  requiresHumanApproval: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
