import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@apollo/client';
import type { Deal, DealInput, Pipeline } from '../../../../types/deal';
import { LOST_REASONS, LOST_REASON_LABELS } from '../../../../types/deal';
import { DEAL_STATUSES } from '../../../../types/common';
import { PIPELINES_QUERY } from '../../../../lib/graphql-queries';

interface Customer {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
}

interface DealModalProps {
  deal: Deal | null;
  customers: Customer[];
  users: User[];
  on_save: (input: DealInput) => void;
  on_close: () => void;
}

const empty_form = {
  title: '',
  customer_id: '',
  owner_id: '',
  value: '',
  status: 'Open',
  pipeline_id: '',
  stage_id: '',
  expected_close_date: '',
  lost_reason: '',
};

/** Dates come back as ISO strings; <input type="date"> wants yyyy-mm-dd. */
const to_date_input = (iso?: string | null) => (iso ? new Date(iso).toISOString().slice(0, 10) : '');

const DealModal = ({ deal, customers, users, on_save, on_close }: DealModalProps) => {
  const [form_data, set_form_data] = useState(empty_form);
  const { data } = useQuery(PIPELINES_QUERY);
  const pipelines = useMemo(() => (data?.pipelines ?? []) as Pipeline[], [data]);

  useEffect(() => {
    if (!deal) {
      // Default to the default pipeline so a new deal lands somewhere sensible.
      const fallback = pipelines.find((p) => p.is_default) ?? pipelines[0];
      set_form_data({
        ...empty_form,
        pipeline_id: fallback?.id ?? '',
        stage_id: '',
      });
      return;
    }
    set_form_data({
      title: deal.title,
      customer_id: deal.customer?.id || deal.customer_id,
      owner_id: deal.owner?.id || deal.owner_id || '',
      value: String(deal.value),
      status: deal.status || 'Open',
      pipeline_id: deal.pipeline?.id ?? '',
      stage_id: deal.stage?.id ?? '',
      expected_close_date: to_date_input(deal.expected_close_date),
      lost_reason: deal.lost_reason ?? '',
    });
  }, [deal, pipelines]);

  const selected_pipeline = pipelines.find((p) => p.id === form_data.pipeline_id);
  const stages = selected_pipeline?.stages ?? [];

  const handle_change = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    set_form_data((prev) => ({
      ...prev,
      [name]: value,
      // Changing pipeline invalidates the chosen stage.
      ...(name === 'pipeline_id' ? { stage_id: '' } : {}),
    }));
  };

  const handle_submit = (e: React.FormEvent) => {
    e.preventDefault();
    const input: DealInput = {
      title: form_data.title,
      customer_id: form_data.customer_id,
      owner_id: form_data.owner_id || null,
      value: parseFloat(form_data.value),
      status: form_data.status as Deal['status'],
      expected_close_date: form_data.expected_close_date || null,
    };

    // Pipeline and stage are only sent on create; moving stage afterwards is
    // its own mutation so that stage_entered_at is stamped correctly.
    if (!deal) {
      input.pipeline_id = form_data.pipeline_id || null;
      input.stage_id = form_data.stage_id || null;
    }

    if (form_data.status === 'Lost') {
      input.lost_reason = (form_data.lost_reason || 'Other') as Deal['lost_reason'];
    }

    on_save(input);
  };

  return (
    <div className="modal-overlay" onClick={on_close}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{deal ? 'Edit Deal' : 'New Deal'}</h2>
          <button className="modal-close" onClick={on_close}>
            ✕
          </button>
        </div>

        <form onSubmit={handle_submit} className="modal-form">
          <div className="form-group">
            <label>Title *</label>
            <input
              type="text"
              name="title"
              value={form_data.title}
              onChange={handle_change}
              required
            />
          </div>

          <div className="form-group">
            <label>Customer *</label>
            <select
              name="customer_id"
              value={form_data.customer_id}
              onChange={handle_change}
              required
            >
              <option value="">Select a customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Value *</label>
            <input
              type="number"
              name="value"
              value={form_data.value}
              onChange={handle_change}
              step="0.01"
              min="0"
              required
            />
          </div>

          <div className="form-group">
            <label>Owner *</label>
            <select name="owner_id" value={form_data.owner_id} onChange={handle_change} required>
              <option value="">Select an owner</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>

          {!deal && (
            <>
              <div className="form-group">
                <label>Pipeline</label>
                <select name="pipeline_id" value={form_data.pipeline_id} onChange={handle_change}>
                  {pipelines.map((pipeline) => (
                    <option key={pipeline.id} value={pipeline.id}>
                      {pipeline.name}
                      {pipeline.is_default ? ' (default)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Stage</label>
                <select name="stage_id" value={form_data.stage_id} onChange={handle_change}>
                  <option value="">First stage</option>
                  {stages.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.name} ({stage.probability}%)
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className="form-group">
            <label>Expected Close Date</label>
            <input
              type="date"
              name="expected_close_date"
              value={form_data.expected_close_date}
              onChange={handle_change}
            />
          </div>

          <div className="form-group">
            <label>Status</label>
            <select name="status" value={form_data.status} onChange={handle_change}>
              {DEAL_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          {form_data.status === 'Lost' && (
            <div className="form-group">
              <label>Lost Reason *</label>
              <select
                name="lost_reason"
                value={form_data.lost_reason}
                onChange={handle_change}
                required
              >
                <option value="">Select a reason</option>
                {LOST_REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {LOST_REASON_LABELS[reason]}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={on_close}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {deal ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DealModal;
