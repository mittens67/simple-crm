import './dialogs.scss';

interface AlertDialogProps {
  title: string;
  message: string;
  onClose: () => void;
}

export const AlertDialog = ({ title, message, onClose }: AlertDialogProps) => {
  return (
    <div className="dialog-overlay" onClick={onClose} role="presentation">
      <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>{title}</h2>
          <button className="dialog-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="dialog-body">
          <p>{message}</p>
        </div>
        <div className="dialog-footer">
          <button className="btn-primary" onClick={onClose}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
};
