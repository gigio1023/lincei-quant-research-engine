import { ArchitectureFlow } from "./backtest-cycle-dashboard/ArchitectureFlow";
import { CycleHero } from "./backtest-cycle-dashboard/CycleHero";
import { CycleRunbook } from "./backtest-cycle-dashboard/CycleRunbook";
import { CycleStageGrid } from "./backtest-cycle-dashboard/CycleStageGrid";
import { EvidenceSummary } from "./backtest-cycle-dashboard/EvidenceSummary";
import { useBacktestCycleDashboard } from "./backtest-cycle-dashboard/useBacktestCycleDashboard";

const BacktestCycleDashboard = () => {
  const model = useBacktestCycleDashboard();

  return (
    <div className="min-h-screen bg-[#0b0e11] px-4 py-4 text-[#eaecef] sm:px-5 lg:px-6">
      <div className="mx-auto max-w-[1440px] space-y-4">
        <CycleHero model={model} />
        <ArchitectureFlow stages={model.stages} />
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <CycleStageGrid stages={model.stages} />
          <div className="space-y-4">
            <EvidenceSummary model={model} />
            <CycleRunbook />
          </div>
        </section>
      </div>
    </div>
  );
};

export default BacktestCycleDashboard;
