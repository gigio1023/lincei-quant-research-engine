import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import ReportsList from "./ReportsList";
import { Report } from "../types";
import { reportsApi } from "../services/api";

// Mock the API module
vi.mock("../services/api");

const mockReports: Report[] = [
  {
    id: 1,
    title: "Morning Report 1",
    summary: "Summary 1",
    content: "Content 1",
    reportType: "morning",
    createdAt: new Date().toISOString(),
    newsAnalysis: { processedCount: 10, successCount: 10, failureCount: 0 },
    investmentRecommendations: {},
    marketData: {},
  },
  {
    id: 2,
    title: "Evening Report 1",
    summary: "Summary 2",
    content: "Content 2",
    reportType: "evening",
    createdAt: new Date().toISOString(),
    newsAnalysis: { processedCount: 10, successCount: 10, failureCount: 0 },
    investmentRecommendations: {},
    marketData: {},
  },
];

describe("ReportsList", () => {
  it("should render loading state initially", () => {
    vi.mocked(reportsApi.getReports).mockImplementation(
      () => new Promise(() => {}),
    ); // Never resolves
    render(
      <MemoryRouter>
        <ReportsList />
      </MemoryRouter>,
    );
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("should render reports after a successful fetch", async () => {
    vi.mocked(reportsApi.getReports).mockResolvedValue({
      reports: mockReports,
      total: 2,
      page: 1,
      limit: 10,
    });
    render(
      <MemoryRouter>
        <ReportsList />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Morning Report 1")).toBeInTheDocument();
      expect(screen.getByText("Evening Report 1")).toBeInTheDocument();
    });
  });

  it("should render an error message if the fetch fails", async () => {
    vi.mocked(reportsApi.getReports).mockRejectedValue(
      new Error("Failed to fetch"),
    );
    render(
      <MemoryRouter>
        <ReportsList />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Failed to fetch reports.")).toBeInTheDocument();
    });
  });

  it("should render no reports if the fetch returns an empty array", async () => {
    vi.mocked(reportsApi.getReports).mockResolvedValue({
      reports: [],
      total: 0,
      page: 1,
      limit: 10,
    });
    render(
      <MemoryRouter>
        <ReportsList />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.queryByText(/Morning Report/)).not.toBeInTheDocument();
    });
    // Check that the FAQ section is still there, indicating it's not the loading screen
    expect(screen.getByText("Frequently Asked Questions")).toBeInTheDocument();
  });
});
