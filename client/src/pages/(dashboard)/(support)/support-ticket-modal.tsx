import { useState, useEffect } from 'react';
import type { SupportTicket, SupportTicketInput } from '../../../types/support-ticket';
import {
  TICKET_PRIORITIES,
  TICKET_CATEGORIES,
  TICKET_CATEGORY_LABELS,
} from '../../../types/support-ticket';
import { TICKET_STATUSES, TICKET_STATUS_LABELS } from '../../../types/common';
import { Button, Modal, Select, Textarea } from '../../../components/ui';

interface Customer {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
}

interface SupportTicketModalProps {
  ticket: SupportTicket | null;
  customers: Customer[];
  users: User[];
  saving?: boolean;
  on_save: (input: SupportTicketInput) => void;
  on_close: () => void;
}

const empty_form = {
  customer_id: '',
  assigned_agent: '',
  issue_summary: '',
  status: 'Open',
  internal_notes: '',
  priority: 'Medium',
  category: 'Other',
};

/** Response deadlines, mirroring SLA_RESPONSE_HOURS on the server. */
const SLA_HINT: Record<string, string> = {
  Urgent: 'First response due within 1 hour',
  High: 'First response due within 4 hours',
  Medium: 'First response due within 24 hours',
  Low: 'First response due within 72 hours',
};

const validate = (form: typeof empty_form) => {
  const errors: Partial<Record<keyof typeof empty_form, string>> = {};
  if (!form.customer_id) errors.customer_id = 'Choose a customer';
  if (!form.assigned_agent) errors.assigned_agent = 'Choose an agent';
  if (!form.issue_summary.trim()) errors.issue_summary = 'Describe the issue';
  else if (form.issue_summary.length > 500) {
    errors.issue_summary = 'Must be 500 characters or less';
  }
  return errors;
};

const SupportTicketModal = ({
  ticket,
  customers,
  users,
  saving,
  on_save,
  on_close,
}: SupportTicketModalProps) => {
  const [form_data, set_form_data] = useState(empty_form);
  const [errors, set_errors] = useState<ReturnType<typeof validate>>({});
  const [submitted, set_submitted] = useState(false);

  useEffect(() => {
    if (!ticket) {
      set_form_data(empty_form);
      set_errors({});
      set_submitted(false);
      return;
    }
    set_form_data({
      customer_id: ticket.customer?.id || ticket.customer_id || '',
      assigned_agent: ticket.assigned_agent?.id || '',
      issue_summary: ticket.issue_summary,
      status: ticket.status,
      internal_notes: ticket.internal_notes || '',
      priority: ticket.priority,
      category: ticket.category,
    });
  }, [ticket]);

  const update = (field: keyof typeof empty_form) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const next = { ...form_data, [field]: event.target.value };
    set_form_data(next);
    if (submitted) set_errors(validate(next));
  };

  const handle_submit = (event: React.FormEvent) => {
    event.preventDefault();
    set_submitted(true);

    const found = validate(form_data);
    set_errors(found);
    if (Object.keys(found).length > 0) return;

    on_save({
      customer_id: form_data.customer_id,
      assigned_agent: form_data.assigned_agent || null,
      issue_summary: form_data.issue_summary,
      status: form_data.status as SupportTicket['status'],
      internal_notes: form_data.internal_notes || undefined,
      priority: form_data.priority as SupportTicket['priority'],
      category: form_data.category as SupportTicket['category'],
    });
  };

  return (
    <Modal
      title={ticket ? 'Edit Ticket' : 'New Ticket'}
      on_close={on_close}
      footer={
        <>
          <Button onClick={on_close} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="ticket-form" loading={saving}>
            {ticket ? 'Update' : 'Create'}
          </Button>
        </>
      }
    >
      <form id="ticket-form" onSubmit={handle_submit} noValidate>
        <Select
          label="Customer"
          required
          value={form_data.customer_id}
          onChange={update('customer_id')}
          placeholder="Select a customer"
          error={errors.customer_id}
          options={customers.map((customer) => ({ value: customer.id, label: customer.name }))}
        />
        <Textarea
          label="Issue Summary"
          required
          rows={3}
          value={form_data.issue_summary}
          onChange={update('issue_summary')}
          error={errors.issue_summary}
        />
        <Select
          label="Assigned Agent"
          required
          value={form_data.assigned_agent}
          onChange={update('assigned_agent')}
          placeholder="Select an agent"
          error={errors.assigned_agent}
          options={users.map((user) => ({ value: user.id, label: user.name }))}
        />
        <Select
          label="Priority"
          value={form_data.priority}
          onChange={update('priority')}
          // The deadline is derived from priority on the server.
          hint={ticket ? undefined : SLA_HINT[form_data.priority]}
          options={TICKET_PRIORITIES.map((priority) => ({ value: priority, label: priority }))}
        />
        <Select
          label="Category"
          value={form_data.category}
          onChange={update('category')}
          options={TICKET_CATEGORIES.map((category) => ({
            value: category,
            label: TICKET_CATEGORY_LABELS[category],
          }))}
        />
        <Select
          label="Status"
          value={form_data.status}
          onChange={update('status')}
          hint={
            ticket && !ticket.first_response_at
              ? 'Moving this off Open records the first response.'
              : undefined
          }
          options={TICKET_STATUSES.map((status) => ({
            value: status,
            label: TICKET_STATUS_LABELS[status],
          }))}
        />
        <Textarea
          label="Internal Notes"
          rows={3}
          value={form_data.internal_notes}
          onChange={update('internal_notes')}
        />
      </form>
    </Modal>
  );
};

export default SupportTicketModal;
