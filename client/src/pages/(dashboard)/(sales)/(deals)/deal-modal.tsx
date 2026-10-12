import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@apollo/client';
import type { Deal, DealInput, Pipeline } from '../../../../types/deal';
import { LOST_REASONS, LOST_REASON_LABELS } from '../../../../types/deal';
import { DEAL_STATUSES } from '../../../../types/common';
import { PIPELINES_QUERY } from '../../../../lib/graphql-queries';
import { Button, Input, Modal, Select } from '../../../../components/ui';

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
  saving?: boolean;
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

/** Dates arrive as ISO strings; <input type="date"> needs yyyy-mm-dd. */
const to_date_input = (iso?: string | null) =>
  iso ? new Date(iso).toISOString().slice(0, 10) : '';

const validate = (form: typeof empty_form) => {
  const errors: Partial<Record<keyof typeof empty_form, string>> = {};

  if (!form.title.trim()) errors.title = 'Title is required';
  if (!form.customer_id) errors.customer_id = 'Choose a customer';
  if (!form.owner_id) errors.owner_id = 'Choose an owner';

  const value = Number(form.value);
  if (form.value === '') errors.value = 'Value is required';
  else if (!Number.isFinite(value) || value < 0) errors.value = 'Value cannot be negative';

  // The server rejects a lost deal with no reason, so ask for it here.
  if (form.status === 'Lost' && !form.lost_reason) {
    errors.lost_reason = 'A reason is required when marking a deal lost';
  }

  return errors;
};

const DealModal = ({ deal, customers, users, saving, on_save, on_close }: DealModalProps) => {
  const [form_data, set_form_data] = useState(empty_form);
  const [errors, set_errors] = useState<ReturnType<typeof validate>>({});
  const [submitted, set_submitted] = useState(false);

  const { data } = useQuery(PIPELINES_QUERY);
  const pipelines = useMemo(() => (data?.pipelines ?? []) as Pipeline[], [data]);

  useEffect(() => {
    if (!deal) {
      const fallback = pipelines.find((pipeline) => pipeline.is_default) ?? pipelines[0];
      set_form_data({ ...empty_form, pipeline_id: fallback?.id ?? '' });
      set_errors({});
      set_submitted(false);
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

  const selected_pipeline = pipelines.find((pipeline) => pipeline.id === form_data.pipeline_id);
  const stages = selected_pipeline?.stages ?? [];

  const update = (field: keyof typeof empty_form) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const next = {
      ...form_data,
      [field]: event.target.value,
      // Changing pipeline invalidates the chosen stage.
      ...(field === 'pipeline_id' ? { stage_id: '' } : {}),
    };
    set_form_data(next);
    if (submitted) set_errors(validate(next));
  };

  const handle_submit = (event: React.FormEvent) => {
    event.preventDefault();
    set_submitted(true);

    const found = validate(form_data);
    set_errors(found);
    if (Object.keys(found).length > 0) return;

    const input: DealInput = {
      title: form_data.title,
      customer_id: form_data.customer_id,
      owner_id: form_data.owner_id || null,
      value: parseFloat(form_data.value),
      status: form_data.status as Deal['status'],
      expected_close_date: form_data.expected_close_date || null,
    };

    // Pipeline and stage are set only on create. Moving stage afterwards goes
    // through moveDealToStage, so stage_entered_at is stamped correctly.
    if (!deal) {
      input.pipeline_id = form_data.pipeline_id || null;
      input.stage_id = form_data.stage_id || null;
    }

    if (form_data.status === 'Lost') {
      input.lost_reason = form_data.lost_reason as Deal['lost_reason'];
    }

    on_save(input);
  };

  return (
    <Modal
      title={deal ? 'Edit Deal' : 'New Deal'}
      on_close={on_close}
      footer={
        <>
          <Button onClick={on_close} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="deal-form" loading={saving}>
            {deal ? 'Update' : 'Create'}
          </Button>
        </>
      }
    >
      <form id="deal-form" onSubmit={handle_submit} noValidate>
        <Input
          label="Title"
          required
          value={form_data.title}
          onChange={update('title')}
          error={errors.title}
        />
        <Select
          label="Customer"
          required
          value={form_data.customer_id}
          onChange={update('customer_id')}
          placeholder="Select a customer"
          error={errors.customer_id}
          options={customers.map((customer) => ({ value: customer.id, label: customer.name }))}
        />
        <Input
          label="Value"
          type="number"
          required
          min="0"
          step="0.01"
          value={form_data.value}
          onChange={update('value')}
          error={errors.value}
        />
        <Select
          label="Owner"
          required
          value={form_data.owner_id}
          onChange={update('owner_id')}
          placeholder="Select an owner"
          error={errors.owner_id}
          options={users.map((user) => ({ value: user.id, label: user.name }))}
        />

        {!deal && (
          <>
            <Select
              label="Pipeline"
              value={form_data.pipeline_id}
              onChange={update('pipeline_id')}
              options={pipelines.map((pipeline) => ({
                value: pipeline.id,
                label: pipeline.is_default ? `${pipeline.name} (default)` : pipeline.name,
              }))}
            />
            <Select
              label="Stage"
              value={form_data.stage_id}
              onChange={update('stage_id')}
              placeholder="First stage"
              hint="Leave blank to start at the beginning of the pipeline."
              options={stages.map((stage) => ({
                value: stage.id,
                label: `${stage.name} (${stage.probability}%)`,
              }))}
            />
          </>
        )}

        <Input
          label="Expected Close Date"
          type="date"
          value={form_data.expected_close_date}
          onChange={update('expected_close_date')}
        />

        <Select
          label="Status"
          value={form_data.status}
          onChange={update('status')}
          options={DEAL_STATUSES.map((status) => ({ value: status, label: status }))}
        />

        {form_data.status === 'Lost' && (
          <Select
            label="Lost Reason"
            required
            value={form_data.lost_reason}
            onChange={update('lost_reason')}
            placeholder="Select a reason"
            error={errors.lost_reason}
            options={LOST_REASONS.map((reason) => ({
              value: reason,
              label: LOST_REASON_LABELS[reason],
            }))}
          />
        )}
      </form>
    </Modal>
  );
};

export default DealModal;
