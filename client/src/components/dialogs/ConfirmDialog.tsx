import Modal from '../ui/modal';
import Button from '../ui/button';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

/**
 * Built on the shared Modal primitive.
 *
 * Previously this rendered its own `.dialog-overlay` markup against a second,
 * parallel modal stylesheet that shared no rules with the `.modal-overlay`
 * system used by the page modals. Both are now the same component, so focus
 * trapping, Escape handling, the portal and the scroll lock apply here too.
 */
export const ConfirmDialog = ({
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmDialogProps) => (
  <Modal
    title={title}
    on_close={onCancel}
    size="sm"
    footer={
      <>
        <Button onClick={onCancel} disabled={loading}>
          {cancelText}
        </Button>
        <Button variant="danger" onClick={onConfirm} loading={loading}>
          {confirmText}
        </Button>
      </>
    }
  >
    <p className="dialog-message">{message}</p>
  </Modal>
);
