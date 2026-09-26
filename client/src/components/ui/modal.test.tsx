import { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Modal from './modal';
import Button from './button';

/**
 * These cover the behaviours the six hand-rolled modals did not have, which
 * are the difference between a div that looks like a dialog and one that
 * behaves like one for keyboard and screen-reader users.
 */
describe('Modal', () => {
  const setup = (on_close = vi.fn()) => {
    const utils = render(
      <Modal title="Edit lead" on_close={on_close} footer={<Button>Save</Button>}>
        <input aria-label="Name" />
        <input aria-label="Email" />
      </Modal>
    );
    return { ...utils, on_close };
  };

  it('exposes itself as a labelled modal dialog', () => {
    setup();

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleName('Edit lead');
  });

  it('moves focus to the first control on open', () => {
    setup();
    expect(screen.getByLabelText('Name')).toHaveFocus();
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    const { on_close } = setup();

    await user.keyboard('{Escape}');
    expect(on_close).toHaveBeenCalledOnce();
  });

  it('closes when the backdrop is pressed', async () => {
    const user = userEvent.setup();
    const on_close = vi.fn();
    const { container } = render(
      <Modal title="Edit lead" on_close={on_close}>
        <p>Body</p>
      </Modal>
    );

    // The overlay lives in a portal, not in `container`.
    expect(container.querySelector('.ui-modal-overlay')).toBeNull();
    await user.click(document.querySelector('.ui-modal-overlay')!);

    expect(on_close).toHaveBeenCalledOnce();
  });

  it('does not close when the dialog body is clicked', async () => {
    const user = userEvent.setup();
    const { on_close } = setup();

    await user.click(screen.getByLabelText('Email'));
    expect(on_close).not.toHaveBeenCalled();
  });

  it('keeps Tab inside the dialog', async () => {
    const user = userEvent.setup();
    setup();

    const name = screen.getByLabelText('Name');
    const email = screen.getByLabelText('Email');
    const save = screen.getByRole('button', { name: 'Save' });
    const close = screen.getByLabelText('Close dialog');

    expect(name).toHaveFocus();
    await user.tab();
    expect(email).toHaveFocus();

    // From the last focusable element, Tab wraps to the first rather than
    // escaping into the page behind the dialog.
    save.focus();
    await user.tab();
    expect(close).toHaveFocus();
  });

  it('wraps backwards from the first element', async () => {
    const user = userEvent.setup();
    setup();

    screen.getByLabelText('Close dialog').focus();
    await user.tab({ shift: true });

    expect(screen.getByRole('button', { name: 'Save' })).toHaveFocus();
  });

  it('locks background scroll while open and restores it after', () => {
    const { unmount } = setup();
    expect(document.body.style.overflow).toBe('hidden');

    unmount();
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('restores focus to the element that opened it', async () => {
    const user = userEvent.setup();

    const Harness = () => {
      const [open, set_open] = useState(false);
      return (
        <>
          <button type="button" onClick={() => set_open(true)}>
            Open
          </button>
          {open && (
            <Modal title="Edit lead" on_close={() => set_open(false)}>
              <p>Body</p>
            </Modal>
          )}
        </>
      );
    };

    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'Open' });

    await user.click(trigger);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    // Without this, a keyboard user is dumped back at the top of the document.
    expect(trigger).toHaveFocus();
  });
});
