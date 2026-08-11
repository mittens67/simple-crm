import './dialogs.scss';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export const ConfirmDialog = ({
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmDialogProps) => {
  return (
    <div className="dialog-overlay" onClick={onCancel} role="presentation">
      <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>{title}</h2>
          <button className="dialog-close" onClick={onCancel} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="dialog-body">
          <p>{message}</p>
        </div>
        <div className="dialog-footer">
          <button className="btn-secondary" onClick={onCancel} disabled={loading}>
            {cancelText}
          </button>
          <button className="btn-danger" onClick={onConfirm} disabled={loading}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
