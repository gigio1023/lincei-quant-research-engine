import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ReportsList from './ReportsList';

// Mock API module
vi.mock('../services/api', () => ({
  reportsApi: {
    getReports: vi.fn(() => Promise.resolve({
      reports: [],
      total: 0,
      page: 1,
      limit: 10
    }))
  }
}));

describe('ReportsList', () => {
  it('should_render_loading_state', () => {
    render(
      <MemoryRouter>
        <ReportsList />
      </MemoryRouter>
    );
    expect(screen.getByText('AI가 분석 중입니다')).toBeInTheDocument();
  });

  it('should_render_empty_state_after_loading', async () => {
    render(
      <MemoryRouter>
        <ReportsList />
      </MemoryRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText('선택한 필터에 해당하는 리포트가 없습니다.')).toBeInTheDocument();
    });
  });
});