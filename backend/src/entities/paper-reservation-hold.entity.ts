import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  PaperReservationHold,
  PaperReservationHoldStatus,
} from './paper-order-plan.entity';

@Entity('paper_reservation_holds')
@Index(['paperAccountId', 'status'])
@Index(['paperAccountId', 'proposalId', 'idempotencyKey'], { unique: true })
@Index(['holdId'], { unique: true })
export class PaperReservationHoldRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  holdId: string;

  @Column()
  paperAccountId: number;

  @Column()
  proposalId: number;

  @Column({ nullable: true })
  paperOrderPlanId?: number;

  @Column()
  status: PaperReservationHoldStatus;

  @Column()
  idempotencyKey: string;

  @Column('datetime')
  reservedAt: Date;

  @Column('datetime', { nullable: true })
  consumedAt?: Date;

  @Column('datetime', { nullable: true })
  releasedAt?: Date;

  @Column('float')
  cashAmount: number;

  @Column('json')
  sellNotionalBySymbol: Record<string, number>;

  @Column('float')
  availableCashAtHold: number;

  @Column('json')
  availableSellNotionalBySymbolAtHold: Record<string, number>;

  @Column({ nullable: true })
  paperAccountEventHashAtHold?: string;

  @Column({ nullable: true })
  paperAccountEventSequenceAtHold?: number;

  @Column({ nullable: true })
  accountLockVersionAtHold?: number;

  @Column()
  holdHash: string;

  @Column('json')
  holdSnapshot: PaperReservationHold;

  @Column('json')
  notes: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
