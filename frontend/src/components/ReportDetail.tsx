import React, { useState, useEffect, ReactNode } from "react";
import { reportsApi } from "../services/api";
import { Report } from "../types";
import LoadingSpinner from "./LoadingSpinner";
import { CardSpotlight } from "./ui/card-spotlight";

interface ReportDetailProps {
  reportId: number;
  onClose: () => void;
}

const ReportDetail: React.FC<ReportDetailProps> = ({ reportId, onClose }) => {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReport(reportId);
  }, [reportId]);

  const fetchReport = async (id: number) => {
    try {
      setLoading(true);
      setError(null);
      const data = await reportsApi.getReport(id);
      setReport(data);
    } catch {
      setError("Failed to fetch report details.");
    } finally {
      setLoading(false);
    }
  };

  const formatContent = (content: string): ReactNode[] => {
    return content.split("\n").map((line, index) => {
      if (line.startsWith("## ")) {
        return (
          <h2 key={index} className="text-xl font-bold mt-6 mb-3 text-white">
            {line.replace("## ", "")}
          </h2>
        );
      } else if (line.startsWith("# ")) {
        return (
          <h1 key={index} className="text-2xl font-bold mt-6 mb-4 text-white">
            {line.replace("# ", "")}
          </h1>
        );
      } else if (line.startsWith("- ")) {
        return (
          <li key={index} className="ml-4 mb-2 text-neutral-300">
            {line.replace("- ", "")}
          </li>
        );
      } else if (line.trim() === "") {
        return <br key={index} />;
      } else {
        return (
          <p key={index} className="mb-3 text-neutral-300 leading-relaxed">
            {line}
          </p>
        );
      }
    });
  };

  return (
    <CardSpotlight className="w-full max-w-4xl h-full max-h-[90vh] overflow-y-auto">
      <div className="absolute top-4 right-4">
        <button
          onClick={onClose}
          className="text-white bg-black bg-opacity-50 rounded-full p-2"
        >
          &times;
        </button>
      </div>
      {loading && <LoadingSpinner />}
      {error && <p className="text-red-400">{error}</p>}
      {report && (
        <div className="p-6 text-white">
          <h1 className="text-3xl font-bold mb-4">{report.title}</h1>
          <p className="text-lg text-neutral-300 mb-6">{report.summary}</p>
          <div className="prose prose-invert max-w-none">
            {formatContent(report.content)}
          </div>
        </div>
      )}
    </CardSpotlight>
  );
};

export default ReportDetail;
