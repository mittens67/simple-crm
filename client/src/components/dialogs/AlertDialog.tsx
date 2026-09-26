import Modal from '../ui/modal';
import Button from '../ui/button';

interface AlertDialogProps {
  title: string;
  message: string;
  onClose: () => void;
}

/**
 * Built on the shared Modal primitive, like ConfirmDialog.
 *
 * Note that most *outcome* messages now go through the toast system instead —
 * a modal the user must dismiss is the wrong shape for "saved successfully".
 * This remains for the cases where the message genuinely must be acknowledged.
 */
export const AlertDialog = ({ title, message, onClose }: AlertDialogProps) => (
  <Modal
    title={title}
    on_close={onClose}
    size="sm"
    footer={
      <Button variant="primary" onClick={onClose}>
        OK
      </Button>
    }
  >
    <p className="dialog-message">{message}</p>
  </Modal>
);
