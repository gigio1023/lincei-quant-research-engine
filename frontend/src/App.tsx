import React from "react";
import { Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import ControlPlaneDashboard from "./components/ControlPlaneDashboard";
import BacktestCycleDashboard from "./components/BacktestCycleDashboard";

function App() {
  return (
    <div className="min-h-screen bg-[#0b0e11]">
      <div>
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<BacktestCycleDashboard />} />
            <Route
              path="/backtest-cycle"
              element={<BacktestCycleDashboard />}
            />
            <Route path="/control-plane" element={<ControlPlaneDashboard />} />
            <Route path="*" element={<BacktestCycleDashboard />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
