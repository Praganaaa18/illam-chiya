import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import RegisterSeller from './RegisterSeller';

test('seller certificate upload enforces its size range and can be cleared', () => {
  render(
    <MemoryRouter>
      <RegisterSeller />
    </MemoryRouter>
  );

  const certificateInput = screen.getByLabelText('Upload PAN / Registration Certificate');
  fireEvent.change(certificateInput, {
    target: { files: [new File(['small'], 'small.pdf', { type: 'application/pdf' })] },
  });
  expect(screen.getByRole('alert')).toHaveTextContent('File size must be between 100 KB and 500 KB.');
  expect(screen.getByRole('button', { name: 'No certificate selected to remove' })).toBeDisabled();

  const validCertificate = new File(
    [new Uint8Array(100 * 1024)],
    'certificate.pdf',
    { type: 'application/pdf' }
  );
  fireEvent.change(certificateInput, { target: { files: [validCertificate] } });

  const removeButton = screen.getByRole('button', { name: 'Remove selected certificate' });
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  fireEvent.click(removeButton);
  expect(screen.getByRole('button', { name: 'No certificate selected to remove' })).toBeDisabled();
  expect(certificateInput.value).toBe('');
});
