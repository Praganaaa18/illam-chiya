import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the Illam Chiya storefront', () => {
  render(<App />);
  expect(screen.getByText('Products')).toBeInTheDocument();
});
