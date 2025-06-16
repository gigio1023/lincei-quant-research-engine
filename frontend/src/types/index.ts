export interface Report {
  id: number;
  title: string;
  content: string;
  summary: string;
  marketData?: unknown;
  newsAnalysis?: { processedCount?: number };
  investmentRecommendations?: unknown;
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
