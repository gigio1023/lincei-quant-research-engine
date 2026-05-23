import React from "react";
import { Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import ReportsList from "./components/ReportsList";
import ReportDetail from "./components/ReportDetail";
import TestingDashboard from "./components/TestingDashboard";
import ControlPlaneDashboard from "./components/ControlPlaneDashboard";

function App() {
  return (
    <div className="min-h-screen bg-[#0b0e11]">
      <div>
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<ReportsList />} />
            <Route path="/reports" element={<ReportsList />} />
            <Route path="/reports/:id" element={<ReportDetail />} />
            <Route path="/control-plane" element={<ControlPlaneDashboard />} />
            <Route path="/testing" element={<TestingDashboard />} />
            <Route
              path="/analytics"
              element={
                <div className="text-center text-xl text-gray-600 dark:text-gray-300">
                  분석 페이지 준비중...
                </div>
              }
            />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
