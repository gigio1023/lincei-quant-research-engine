export interface Report {
  id: number;
  title: string;
  content: string;
  summary: string;
  marketData?: Record<string, unknown>;
  newsAnalysis?: { processedCount?: number };
  investmentRecommendations?: Record<string, unknown>;
  reportType: 'morning' | 'evening';
  createdAt: string;
  updatedAt: string;
}

export interface ReportsResponse {
  reports: Report[];
  total: number;
  page: number;
  limit: number;
}
