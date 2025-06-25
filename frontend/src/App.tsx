import ReportsList from "./components/ReportsList";
import { WavyBackground } from "./components/ui/wavy-background";

function App() {
  return (
    <div className="h-full bg-slate-950 text-white">
      <WavyBackground className="max-w-4xl mx-auto pb-40">
        <p className="text-2xl md:text-4xl lg:text-7xl text-white font-bold inter-var text-center">
          Auto Investment Helper
        </p>
        <p className="text-base md:text-lg mt-4 text-white font-normal inter-var text-center">
          AI-powered investment analysis and report generation for value
          investors.
        </p>
      </WavyBackground>
      <div className="-mt-20 px-10">
        <ReportsList />
      </div>
    </div>
  );
}

export default App;
