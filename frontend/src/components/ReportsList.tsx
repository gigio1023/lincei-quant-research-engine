import React, { useState, useEffect, useCallback } from "react";
import { reportsApi } from "../services/api";
import { Report } from "../types";
import LoadingSpinner from "./LoadingSpinner";
import { GlareCard } from "./ui/glare-card";
import { FaqSection } from "./ui/faq";
import ReportDetail from "./ReportDetail";

const DEMO_FAQS = [
  {
    question: "What makes your platform unique?",
    answer:
      "Our platform stands out through its intuitive design, powerful automation capabilities, and seamless integration options. We've focused on creating a user experience that combines simplicity with advanced features.",
  },
  {
    question: "How does the pricing structure work?",
    answer:
      "We offer flexible, transparent pricing tiers designed to scale with your needs. Each tier includes a core set of features, with additional capabilities as you move up. All plans start with a 14-day free trial.",
  },
  {
    question: "What kind of support do you offer?",
    answer:
      "We provide comprehensive support through multiple channels. This includes 24/7 live chat, detailed documentation, video tutorials, and dedicated account managers for enterprise clients.",
  },
];

const ReportsList: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page] = useState(1);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  const limit = 9;

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await reportsApi.getReports(page, limit);
      setReports(response.reports);
    } catch {
      setError("Failed to fetch reports.");
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleCardClick = (report: Report) => {
    setSelectedReport(report);
  };

  const handleCloseDetail = () => {
    setSelectedReport(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-400">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        {reports.map((report) => (
          <div key={report.id} onClick={() => handleCardClick(report)}>
            <GlareCard className="flex flex-col items-start justify-end py-8 px-6">
              <img
                className="h-full w-full absolute inset-0 object-cover"
                src={`https://picsum.photos/seed/${report.id}/400/600`}
                alt="Report background"
              />
              <div className="relative z-10">
                <p className="font-bold text-white text-lg">{report.title}</p>
                <p className="font-normal text-base text-neutral-200 mt-4">
                  {report.summary}
                </p>
              </div>
            </GlareCard>
          </div>
        ))}
      </div>

      {selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <ReportDetail
            reportId={selectedReport.id}
            onClose={handleCloseDetail}
          />
        </div>
      )}

      <div className="mt-20">
        <FaqSection
          title="Frequently Asked Questions"
          description="Everything you need to know about our platform"
          items={DEMO_FAQS}
          contactInfo={{
            title: "Still have questions?",
            description: "We're here to help you",
            buttonText: "Contact Support",
            onContact: () => console.log("Contact support clicked"),
          }}
        />
      </div>
    </div>
  );
};

export default ReportsList;
