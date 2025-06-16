import React from 'react';
import { render, screen } from '@testing-library/react';
import Header from '../Header';

const renderWithRouter = (component: React.ReactElement) => {
  return render(component);
};

describe('Header Component', () => {
  it('renders header with correct title', () => {
    renderWithRouter(<Header />);

    expect(screen.getByText('투자분석AI')).toBeInTheDocument();
  });

  it('renders header with description', () => {
    renderWithRouter(<Header />);

    expect(screen.getByText('AI 기반 투자 리포트 분석')).toBeInTheDocument();
  });

  it('renders navigation links', () => {
    renderWithRouter(<Header />);

    expect(screen.getByText('홈')).toBeInTheDocument();
    expect(screen.getByText('리포트')).toBeInTheDocument();
    expect(screen.getByText('분석')).toBeInTheDocument();
  });

  it('has correct navigation structure', () => {
    renderWithRouter(<Header />);

    const nav = screen.getByRole('navigation');
    expect(nav).toBeInTheDocument();
  });

  it('title links to home page', () => {
    renderWithRouter(<Header />);

    const titleLink = screen.getByText('투자분석AI').closest('a');
    expect(titleLink).toHaveAttribute('href', '/');
  });
});
