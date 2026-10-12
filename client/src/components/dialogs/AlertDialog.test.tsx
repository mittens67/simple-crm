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

    const closeButton = screen.getByLabelText('Close dialog');
    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledOnce();
  });

  it('renders as an accessible modal dialog in a portal', () => {
    const mockOnClose = vi.fn();
    const { container } = render(
      <AlertDialog title="Test" message="Test message" onClose={mockOnClose} />
    );

    // Rendered through a portal to document.body, so it is deliberately NOT
    // inside the component's own container — that is what stops a parent's
    // overflow clipping it.
    expect(container.querySelector('[role="dialog"]')).toBeNull();

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    // The title labels the dialog, which the old markup never wired up.
    expect(dialog).toHaveAccessibleName('Test');
  });
});
