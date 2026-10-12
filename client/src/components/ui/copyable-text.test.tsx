import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CopyableText from './copyable-text';

/**
 * The copy path is worth covering because it has a failure mode that is easy
 * to ship: the Clipboard API needs a secure context and can be refused, and an
 * unhandled rejection there would break the cell rather than the copy.
 */
describe('CopyableText', () => {
  /**
   * `navigator.clipboard` is getter-only under jsdom, and userEvent installs a
   * clipboard stub of its own during setup — so the mock has to be defined,
   * not assigned, and it has to go in after userEvent has had its turn.
   */
  const setup = (write_text: ReturnType<typeof vi.fn>) => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: write_text },
      configurable: true,
    });
    return user;
  };

  it('copies the value and confirms it', async () => {
    const write_text = vi.fn().mockResolvedValue(undefined);
    const user = setup(write_text);
    render(<CopyableText value="ada@example.com" label="email address" />);

    await user.click(screen.getByRole('button', { name: 'Copy email address' }));

    expect(write_text).toHaveBeenCalledWith('ada@example.com');
    expect(await screen.findByRole('button', { name: 'email address copied' })).toBeInTheDocument();
  });

  it('survives the clipboard being refused', async () => {
    const write_text = vi.fn().mockRejectedValue(new Error('not allowed'));
    const user = setup(write_text);
    render(<CopyableText value="ada@example.com" label="email address" />);

    await user.click(screen.getByRole('button', { name: 'Copy email address' }));

    // No confirmation, because nothing was copied — and the value is still
    // readable, which is the point of failing quietly.
    expect(screen.getByRole('button', { name: 'Copy email address' })).toBeInTheDocument();
    expect(screen.getByText('ada@example.com')).toBeInTheDocument();
  });

  it('exposes the full value on hover only when it can be clipped', () => {
    const { rerender } = render(
      <CopyableText value="a.very.long.address@example.com" label="email address" truncate />
    );
    expect(screen.getByText('a.very.long.address@example.com')).toHaveAttribute(
      'title',
      'a.very.long.address@example.com'
    );

    // A phone number is never clipped, so a tooltip repeating what is already
    // on screen would be noise.
    rerender(<CopyableText value="+44 20 7946 0958" label="phone number" />);
    expect(screen.getByText('+44 20 7946 0958')).not.toHaveAttribute('title');
  });

  it('renders a placeholder and no copy button when there is nothing to copy', () => {
    render(<CopyableText value={null} label="phone number" />);

    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
