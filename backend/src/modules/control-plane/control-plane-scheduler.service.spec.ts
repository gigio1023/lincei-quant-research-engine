import { AutonomousRunSchedule } from '../../entities/autonomous-run-schedule.entity';
import { ControlPlaneSchedulerService } from './control-plane-scheduler.service';
import { ControlPlaneService } from './control-plane.service';

describe('ControlPlaneSchedulerService', () => {
  const originalEnv = process.env;

  const buildService = (controlPlaneService: Partial<ControlPlaneService>) =>
    new ControlPlaneSchedulerService(
      controlPlaneService as ControlPlaneService,
    );

  const buildSchedule = (
    value: Partial<AutonomousRunSchedule>,
  ): AutonomousRunSchedule =>
    ({
      id: 1,
      budgetEnvelopeId: 1,
      objective: 'Scheduled autonomous allocation',
      mode: 'dry_run',
      cadenceMinutes: 30,
      nextRunAt: new Date('2026-05-23T00:00:00.000Z'),
      enabled: true,
      attemptPaperExecution: false,
      brokerExecutionEnabled: false,
      liveTradingEnabled: false,
      createdAt: new Date('2026-05-23T00:00:00.000Z'),
      updatedAt: new Date('2026-05-23T00:00:00.000Z'),
      ...value,
    }) as AutonomousRunSchedule;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-23T00:05:00.000Z'));
    process.env = { ...originalEnv };
    delete process.env.AUTONOMOUS_RUN_SCHEDULER_ENABLED;
    delete process.env.AUTONOMOUS_RUN_SCHEDULER_WORKER_ID;
    delete process.env.AUTONOMOUS_RUN_SCHEDULER_MAX_PER_TICK;
    delete process.env.AUTONOMOUS_RUN_SCHEDULER_LEASE_TTL_SECONDS;
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.useRealTimers();
  });

  it('reports disabled status and skips due schedule scanning by default', async () => {
    const listDueRunSchedules = jest.fn();
    const service = buildService({ listDueRunSchedules });

    const result = await service.tickDueSchedules('unit-test');

    expect(result.enabled).toBe(false);
    expect(result.scanned).toBe(0);
    expect(listDueRunSchedules).not.toHaveBeenCalled();
    expect(service.getWorkerStatus()).toEqual(
      expect.objectContaining({
        enabled: false,
        cron: '*/1 * * * *',
        maxSchedulesPerTick: 5,
        leaseTtlSeconds: 120,
        lastResult: result,
      }),
    );
  });

  it('ticks due schedules with worker lease settings when enabled', async () => {
    process.env.AUTONOMOUS_RUN_SCHEDULER_ENABLED = 'true';
    process.env.AUTONOMOUS_RUN_SCHEDULER_WORKER_ID = 'unit-worker';
    process.env.AUTONOMOUS_RUN_SCHEDULER_MAX_PER_TICK = '2';
    process.env.AUTONOMOUS_RUN_SCHEDULER_LEASE_TTL_SECONDS = '45';

    const dryRunSchedule = buildSchedule({ id: 1 });
    const paperSchedule = buildSchedule({
      id: 2,
      mode: 'paper',
      attemptPaperExecution: true,
    });
    const listDueRunSchedules = jest
      .fn()
      .mockResolvedValue([dryRunSchedule, paperSchedule]);
    const tickRunSchedule = jest
      .fn()
      .mockResolvedValueOnce({ id: 101, currentStage: 'risk_evaluated' })
      .mockRejectedValueOnce(
        new Error('Autonomous schedule is already leased'),
      );
    const service = buildService({
      listDueRunSchedules,
      tickRunSchedule,
    });

    const result = await service.tickDueSchedules('unit-test');

    expect(listDueRunSchedules).toHaveBeenCalledWith(
      2,
      new Date('2026-05-23T00:05:00.000Z'),
    );
    expect(tickRunSchedule).toHaveBeenNthCalledWith(1, 1, {
      actor: 'scheduler',
      leaseOwner: 'unit-worker',
      leaseTtlSeconds: 45,
      attemptPaperExecution: false,
    });
    expect(tickRunSchedule).toHaveBeenNthCalledWith(2, 2, {
      actor: 'scheduler',
      leaseOwner: 'unit-worker',
      leaseTtlSeconds: 45,
      attemptPaperExecution: true,
    });
    expect(result).toEqual(
      expect.objectContaining({
        enabled: true,
        scanned: 2,
        ticked: 1,
        skipped: 1,
        failed: 0,
      }),
    );
    expect(result.items).toEqual([
      {
        scheduleId: 1,
        status: 'ticked',
        runId: 101,
        message: 'risk_evaluated',
      },
      {
        scheduleId: 2,
        status: 'skipped',
        message: 'Autonomous schedule is already leased',
      },
    ]);
  });

  it('records scan-level failures without throwing from the worker', async () => {
    process.env.AUTONOMOUS_RUN_SCHEDULER_ENABLED = 'true';
    const service = buildService({
      listDueRunSchedules: jest
        .fn()
        .mockRejectedValue(new Error('database unavailable')),
    });

    const result = await service.tickDueSchedules('unit-test');

    expect(result).toEqual(
      expect.objectContaining({
        enabled: true,
        scanned: 0,
        ticked: 0,
        failed: 1,
        skipped: 0,
        message: 'database unavailable',
      }),
    );
  });

  it('skips overlapping worker ticks in process', async () => {
    process.env.AUTONOMOUS_RUN_SCHEDULER_ENABLED = 'true';
    let resolveScan!: (value: AutonomousRunSchedule[]) => void;
    const scanPromise = new Promise<AutonomousRunSchedule[]>((resolve) => {
      resolveScan = resolve;
    });
    const service = buildService({
      listDueRunSchedules: jest.fn().mockReturnValue(scanPromise),
      tickRunSchedule: jest.fn(),
    });

    const firstTick = service.tickDueSchedules('first');
    const secondTick = await service.tickDueSchedules('second');
    resolveScan([]);
    await firstTick;

    expect(secondTick).toEqual(
      expect.objectContaining({
        enabled: true,
        scanned: 0,
        ticked: 0,
        failed: 0,
        skipped: 0,
        message: 'Previous autonomous schedule worker tick is still running',
      }),
    );
  });
});
