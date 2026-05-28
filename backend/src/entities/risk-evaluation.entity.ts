import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';
import type {
  RiskGateDecision,
  RiskGateRequest,
  RiskGateResponse,
} from '../modules/risk-gate/risk-gate.types';

@Entity('risk_evaluations')
export class RiskEvaluation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  proposalId?: number;

  @Column()
  decision: RiskGateDecision;

  @Column('json')
  reasons: string[];

  @Column('json')
  requestSnapshot: RiskGateRequest;

  @Column('json')
  responseSnapshot: RiskGateResponse;

  @Column({ default: false })
  brokerExecutionEnabled: boolean;

  @Column({ default: true })
  requiresHumanApproval: boolean;

  @Column('datetime')
  evaluatedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
