/**
 * Legacy live-money command kept as a blocked compatibility surface.
 *
 * Active SPEC.md explicitly removes broker-write scope. This service must never
 * create a live execution intent or call a broker adapter until a future
 * user-approved live-money spec replaces this blocked implementation.
 */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LivePilotStatusRecord } from '../../../entities/live-pilot-status.entity';
import { LivePreflightService } from './live-preflight.service';

export const LIVE_MONEY_OUT_OF_SCOPE_BLOCKER =
  'Live-money broker writes are out of scope under the active spec; a future user-approved live-money spec is required.';

@Injectable()
export class LivePilot10UsdService {
  constructor(
    @InjectRepository(LivePilotStatusRecord)
    private readonly statusRepository: Repository<LivePilotStatusRecord>,
    private readonly livePreflightService: LivePreflightService,
  ) {}

  async execute(options: {
    confirmRealMoney: boolean;
    idempotencyKey?: string;
  }): Promise<{ submitted: boolean; intentId: string; blockers: string[] }> {
    const preflight = await this.livePreflightService.runPreflight();
    const blockers = [
      LIVE_MONEY_OUT_OF_SCOPE_BLOCKER,
      ...preflight.blockers,
      ...(options.confirmRealMoney
        ? []
        : ['Legacy command was invoked without --confirm-real-money.']),
    ];

    await this.statusRepository.save(
      this.statusRepository.create({
        status: 'blocked',
        checkedAt: new Date(),
        preflight,
        realOrderSent: false,
        blockers,
        latestLeanRunId: preflight.latestLeanRunId,
        latestPaperPlanId: preflight.latestPaperPlanId,
      }),
    );

    return {
      submitted: false,
      intentId: options.idempotencyKey ?? 'blocked-live-money-out-of-scope',
      blockers,
    };
  }
}
