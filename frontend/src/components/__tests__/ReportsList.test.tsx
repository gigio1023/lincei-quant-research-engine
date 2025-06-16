import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import ReportsList from '../ReportsList';
import { reportsApi } from '../../services/api';

// Mock the API
jest.mock('../../services/api');
const mockedReportsApi = reportsApi as jest.Mocked<typeof reportsApi>;

const renderWithRouter = (component: React.ReactElement) => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { BrowserRouter } = require('react-router-dom');
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

const mockResponse = {
  reports: [],
  total: 0,
  page: 1,
  limit: 10,
};

describe('ReportsList Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedReportsApi.getReports.mockResolvedValue(mockResponse);
  });

  it('renders component without crashing', async () => {
    renderWithRouter(<ReportsList />);

    await waitFor(() => {
      expect(screen.getByText('투자 리포트 분석')).toBeInTheDocument();
    });
  });

  it('renders page title and description', async () => {
    renderWithRouter(<ReportsList />);

    await waitFor(() => {
      expect(screen.getByText('투자 리포트 분석')).toBeInTheDocument();
    });

    expect(
      screen.getByText(
        '매일 오전 8시와 오후 6시에 자동 생성되는 AI 투자 리포트를 확인하세요',
      ),
    ).toBeInTheDocument();
  });

  it('handles API error gracefully', async () => {
    const errorMessage = 'API Error';
    mockedReportsApi.getReports.mockRejectedValue(new Error(errorMessage));

    renderWithRouter(<ReportsList />);

    await waitFor(() => {
      expect(screen.getByText('오류 발생')).toBeInTheDocument();
    });

    expect(
      screen.getByText('리포트를 불러오는데 실패했습니다.'),
    ).toBeInTheDocument();
  });
});
