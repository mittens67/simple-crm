import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AlertDialog } from './AlertDialog';

describe('AlertDialog', () => {
  it('renders title and message', () => {
    const mockOnClose = vi.fn();
    render(
      <AlertDialog
        title="Test Title"
        message="Test message content"
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test message content')).toBeInTheDocument();
  });

  it('calls onClose when OK button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnClose = vi.fn();
    render(
      <AlertDialog
        title="Test"
        message="Test message"
        onClose={mockOnClose}
      />
    );

    const okButton = screen.getByRole('button', { name: /ok/i });
    await user.click(okButton);

    expect(mockOnClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnClose = vi.fn();
    render(
      <AlertDialog
        title="Test"
        message="Test message"
        onClose={mockOnClose}
      />
    );

    const closeButton = screen.getByLabelText('Close');
    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledOnce();
  });

  it('renders dialog overlay', () => {
    const mockOnClose = vi.fn();
    const { container } = render(
      <AlertDialog
        title="Test"
        message="Test message"
        onClose={mockOnClose}
      />
    );

    const overlay = container.querySelector('.dialog-overlay');
    expect(overlay).toBeInTheDocument();
  });
});
