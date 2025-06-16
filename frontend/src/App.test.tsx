import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders app with header', () => {
  render(<App />);
  const headerElement = screen.getByText('투자분석AI');
  expect(headerElement).toBeInTheDocument();
});
