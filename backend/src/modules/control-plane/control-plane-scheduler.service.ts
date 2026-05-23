import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AutonomousRunSchedule } from '../../entities/autonomous-run-schedule.entity';
import { ControlPlaneService } from './control-plane.service';
import {
  RunScheduleWorkerStatus,
  RunScheduleWorkerTickItem,
  RunScheduleWorkerTickResult,
} from './control-plane.types';

@Injectable()
export class ControlPlaneSchedulerService {
  private readonly logger = new Logger(ControlPlaneSchedulerService.name);
  private readonly enabled =
    process.env.AUTONOMOUS_RUN_SCHEDULER_ENABLED === 'true';
  private readonly workerId =
    process.env.AUTONOMOUS_RUN_SCHEDULER_WORKER_ID ??
    `control-plane-worker-${process.pid}`;
  private readonly maxSchedulesPerTick = this.parsePositiveInteger(
    process.env.AUTONOMOUS_RUN_SCHEDULER_MAX_PER_TICK,
    5,
  );
  private readonly leaseTtlSeconds = this.parsePositiveInteger(
    process.env.AUTONOMOUS_RUN_SCHEDULER_LEASE_TTL_SECONDS,
    120,
  );
  private lastTickAt?: string;
  private lastResult?: RunScheduleWorkerTickResult;
  private running = false;

  constructor(private readonly controlPlaneService: ControlPlaneService) {}

  @Cron(CronExpression.EVERY_MINUTE, {
    name: 'autonomous-run-schedule-worker',
  })
  async tickDueSchedulesCron(): Promise<void> {
    try {
      await this.tickDueSchedules('cron');
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Autonomous schedule worker cron failed';
      this.logger.error(`Schedule worker cron failed: ${message}`);
    }
  }

  async tickDueSchedules(
    trigger = 'manual',
  ): Promise<RunScheduleWorkerTickResult> {
    const startedAt = new Date();
    this.lastTickAt = startedAt.toISOString();

    if (!this.enabled) {
      return this.storeResult({
        trigger,
        workerId: this.workerId,
        enabled: false,
        startedAt: startedAt.toISOString(),
        completedAt: new Date().toISOString(),
        scanned: 0,
        ticked: 0,
        failed: 0,
        skipped: 0,
        items: [],
      });
    }

    if (this.running) {
      return this.storeResult({
        trigger,
        workerId: this.workerId,
        enabled: true,
        startedAt: startedAt.toISOString(),
        completedAt: new Date().toISOString(),
        scanned: 0,
        ticked: 0,
        failed: 0,
        skipped: 0,
        message: 'Previous autonomous schedule worker tick is still running',
        items: [],
      });
    }

    this.running = true;

    try {
      const dueSchedules = await this.controlPlaneService.listDueRunSchedules(
        this.maxSchedulesPerTick,
        startedAt,
      );
      const items: RunScheduleWorkerTickItem[] = [];

      for (const schedule of dueSchedules) {
        items.push(await this.tickOneSchedule(schedule));
      }

      return this.storeResult({
        trigger,
        workerId: this.workerId,
        enabled: true,
        startedAt: startedAt.toISOString(),
        completedAt: new Date().toISOString(),
        scanned: dueSchedules.length,
        ticked: items.filter((item) => item.status === 'ticked').length,
        failed: items.filter((item) => item.status === 'failed').length,
        skipped: items.filter((item) => item.status === 'skipped').length,
        items,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Autonomous schedule worker scan failed';
      this.logger.error(`Schedule worker scan failed: ${message}`);
      return this.storeResult({
        trigger,
        workerId: this.workerId,
        enabled: true,
        startedAt: startedAt.toISOString(),
        completedAt: new Date().toISOString(),
        scanned: 0,
        ticked: 0,
        failed: 1,
        skipped: 0,
        message,
        items: [],
      });
    } finally {
      this.running = false;
    }
  }

  getWorkerStatus(): RunScheduleWorkerStatus {
    return {
      enabled: this.enabled,
      cron: CronExpression.EVERY_MINUTE,
      workerId: this.workerId,
      maxSchedulesPerTick: this.maxSchedulesPerTick,
      leaseTtlSeconds: this.leaseTtlSeconds,
      lastTickAt: this.lastTickAt,
      lastResult: this.lastResult,
      currentTime: new Date().toISOString(),
    };
  }

  private async tickOneSchedule(
    schedule: AutonomousRunSchedule,
  ): Promise<RunScheduleWorkerTickItem> {
    try {
      const run = await this.controlPlaneService.tickRunSchedule(schedule.id, {
        actor: 'scheduler',
        leaseOwner: this.workerId,
        leaseTtlSeconds: this.leaseTtlSeconds,
        attemptPaperExecution:
          schedule.mode === 'paper' && schedule.attemptPaperExecution,
      });

      if (run.status === 'failed') {
        return {
          scheduleId: schedule.id,
          status: 'failed',
          runId: run.id,
          message: run.error ?? run.currentStage,
        };
      }

      return {
        scheduleId: schedule.id,
        status: 'ticked',
        runId: run.id,
        message: run.currentStage,
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Autonomous schedule worker tick failed';

      if (
        message.includes('already leased') ||
        message.includes('schedule tick was not consumed')
      ) {
        return {
          scheduleId: schedule.id,
          status: 'skipped',
          message,
        };
      }

      this.logger.warn(`Schedule ${schedule.id} tick failed: ${message}`);
      return {
        scheduleId: schedule.id,
        status: 'failed',
        message,
      };
    }
  }

  private storeResult(
    result: RunScheduleWorkerTickResult,
  ): RunScheduleWorkerTickResult {
    this.lastResult = result;
    return result;
  }

  private parsePositiveInteger(value: string | undefined, fallback: number) {
    if (!value) {
      return fallback;
    }

    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  }
}
