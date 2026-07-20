interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  assigned_rep?: {
    id: string;
    name: string;
  };
  customer?: {
    id: string;
    name: string;
  };
  sales_notes?: string;
  archive_notes?: string;
}

interface LeadViewProps {
  lead: Lead;
  on_close: () => void;
}

const LeadView = ({ lead, on_close }: LeadViewProps) => {
  return (
    <div className="modal-overlay" onClick={on_close}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>View Lead</h2>
          <button className="modal-close" onClick={on_close}>
            ✕
          </button>
        </div>

        <div className="modal-view">
          <div className="view-section">
            <h3>Basic Information</h3>
            <div className="view-group">
              <label>Name</label>
              <p>{lead.name}</p>
            </div>
            <div className="view-group">
              <label>Email</label>
              <p>{lead.email}</p>
            </div>
            <div className="view-group">
              <label>Phone</label>
              <p>{lead.phone}</p>
            </div>
          </div>

          <div className="view-section">
            <h3>Status & Assignment</h3>
            <div className="view-group">
              <label>Status</label>
              <p>
                <span className={`status status-${lead.status.toLowerCase()}`}>
                  {lead.status}
                </span>
              </p>
            </div>
            <div className="view-group">
              <label>Assigned Rep</label>
              <p>{lead.assigned_rep?.name || 'Unassigned'}</p>
            </div>
            {lead.customer && (
              <div className="view-group">
                <label>Converted To</label>
                <p>{lead.customer.name}</p>
              </div>
            )}
          </div>

          {lead.sales_notes && lead.status !== 'Archived' && (
            <div className="view-section">
              <h3>Sales Notes</h3>
              <div className="view-group">
                <p className="notes-text">{lead.sales_notes}</p>
              </div>
            </div>
          )}

          {lead.archive_notes && (
            <div className="view-section">
              <h3>Archive Notes</h3>
              <div className="view-group">
                <p className="notes-text">{lead.archive_notes}</p>
              </div>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={on_close}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadView;
