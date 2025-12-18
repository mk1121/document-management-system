import { render, screen, fireEvent } from '@testing-library/react';
import { FormField } from './FormField';
import { vi, describe, it, expect } from 'vitest';
import userEvent from '@testing-library/user-event';

describe('FormField', () => {
  it('renders label and text input by default', () => {
    render(<FormField label="Test Label" value="" onChange={vi.fn()} />);
    expect(screen.getByText('Test Label')).toBeInTheDocument();
  });

  describe('Date Input', () => {
    it('sets inputMode to numeric', () => {
      render(<FormField label="Date" value="" onChange={vi.fn()} type="date" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('inputMode', 'numeric');
    });

    it('formats ISO value to DD/MM/YYYY', () => {
      render(<FormField label="Date" value="2023-10-25" onChange={vi.fn()} type="date" />);
      const textInput = screen.getByRole('textbox');
      expect(textInput).toHaveValue('25/10/2023');
    });

    it('auto-inserts slash after 2 digits', async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();
      render(<FormField label="Date" value="" onChange={handleChange} type="date" />);

      const textInput = screen.getByRole('textbox');

      // Type '1'
      await user.type(textInput, '1');
      expect(textInput).toHaveValue('1');

      // Type '2' -> should become '12/'
      await user.type(textInput, '2');
      expect(textInput).toHaveValue('12/');
    });

    it('rejects non-numeric characters', async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();
      render(<FormField label="Date" value="" onChange={handleChange} type="date" />);

      const textInput = screen.getByRole('textbox');
      await user.type(textInput, 'a');
      expect(textInput).toHaveValue('');
    });

    it('parses DD/MM/YYYY typing to ISO value', async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();
      render(<FormField label="Date" value="" onChange={handleChange} type="date" />);

      const textInput = screen.getByRole('textbox');

      // Typing 10102023 (slashes auto inserted)
      // Note: userEvent.type might trigger individual events so mask logic runs.
      // But verify full sequence behavior might be tricky with async typing in test, checking final value.
      await user.type(textInput, '10102023');

      expect(textInput).toHaveValue('10/10/2023');

      // Should have called onChange with the ISO string
      expect(handleChange).toHaveBeenCalledWith(
        expect.objectContaining({
          target: expect.objectContaining({ value: '2023-10-10' })
        })
      );
    });

    it('syncs external value change back to display format', () => {
      const handleChange = vi.fn();
      const { rerender } = render(<FormField label="Date" value="2023-01-01" onChange={handleChange} type="date" />);
      expect(screen.getByRole('textbox')).toHaveValue('01/01/2023');

      rerender(<FormField label="Date" value="2023-02-02" onChange={handleChange} type="date" />);
      expect(screen.getByRole('textbox')).toHaveValue('02/02/2023');
    });
  });
});
