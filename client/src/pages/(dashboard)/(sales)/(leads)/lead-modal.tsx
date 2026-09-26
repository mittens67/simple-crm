import { useState, useEffect } from 'react';
import type { Lead, LeadInput } from '../../../../types/lead';
import type { LeadStatus } from '../../../../types/common';
import { LEAD_STATUSES } from '../../../../types/common';
import { Button, Input, Modal, Select, Textarea } from '../../../../components/ui';

interface User {
  id: string;
  name: string;
  email: string;
}

interface LeadModalProps {
  lead: Lead | null;
  users: User[];
  saving?: boolean;
  on_save: (input: LeadInput) => void;
  on_close: () => void;
}

const empty_form = {
  name: '',
  email: '',
  phone: '',
  status: 'Open',
  assigned_rep_id: '',
  sales_notes: '',
  archive_notes: '',
};

/** Client-side checks mirroring the server's zod rules, for instant feedback. */
const validate = (form: typeof empty_form) => {
  const errors: Partial<Record<keyof typeof empty_form, string>> = {};

  if (!form.name.trim()) errors.name = 'Name is required';
  else if (form.name.length > 40) errors.name = 'Name must be 40 characters or less';
  else if (!/^[a-zA-Z0-9\s\-']+$/.test(form.name)) {
    errors.name = 'Only letters, numbers, spaces, hyphens and apostrophes';
  }

  if (!form.email.trim()) errors.email = 'Email is required';
  else if (!/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(form.email)) {
    errors.email = 'Enter a valid email address';
  }

  if (!form.phone.trim()) errors.phone = 'Phone is required';
  else if (form.phone.length > 20) errors.phone = 'Phone must be 20 characters or less';

  return errors;
};

const LeadModal = ({ lead, users, saving, on_save, on_close }: LeadModalProps) => {
  const [form_data, set_form_data] = useState(empty_form);
  const [errors, set_errors] = useState<ReturnType<typeof validate>>({});
  // Errors appear only after a submit attempt, rather than scolding the user
  // for a field they have not finished typing.
  const [submitted, set_submitted] = useState(false);

  useEffect(() => {
    if (!lead) {
      set_form_data(empty_form);
      set_errors({});
      set_submitted(false);
      return;
    }
    set_form_data({
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      status: lead.status,
      assigned_rep_id: lead.assigned_rep?.id || '',
      sales_notes: lead.sales_notes || '',
      archive_notes: lead.archive_notes || '',
    });
  }, [lead]);

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

    const { name, email, phone, status, assigned_rep_id, sales_notes, archive_notes } = form_data;
    on_save({
      name,
      email,
      phone,
      status: status as LeadStatus,
      assigned_rep_id: assigned_rep_id || null,
      ...(sales_notes && { sales_notes }),
      ...(archive_notes && { archive_notes }),
    });
  };

  return (
    <Modal
      title={lead ? 'Edit Lead' : 'New Lead'}
      on_close={on_close}
      footer={
        <>
          <Button onClick={on_close} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="lead-form" loading={saving}>
            {lead ? 'Update' : 'Create'}
          </Button>
        </>
      }
    >
      {/* The submit button lives in the modal footer, outside this element, so
          it is associated by form id rather than by nesting. */}
      <form id="lead-form" onSubmit={handle_submit} noValidate>
        <Input
          label="Name"
          required
          value={form_data.name}
          onChange={update('name')}
          error={errors.name}
        />
        <Input
          label="Email"
          type="email"
          required
          value={form_data.email}
          onChange={update('email')}
          error={errors.email}
        />
        <Input
          label="Phone"
          required
          value={form_data.phone}
          onChange={update('phone')}
          error={errors.phone}
        />

        <Select
          label="Assigned Rep"
          value={form_data.assigned_rep_id}
          onChange={update('assigned_rep_id')}
          placeholder="Unassigned"
          hint="Assigning a rep moves the lead to Pending."
          options={users.map((user) => ({ value: user.id, label: user.name }))}
        />

        {/* Status is fixed to Open on create; the server pins it too. */}
        {lead && (
          <Select
            label="Status"
            value={form_data.status}
            onChange={update('status')}
            hint="Setting this to Converted creates a linked customer."
            options={LEAD_STATUSES.map((status) => ({ value: status, label: status }))}
          />
        )}

        <Textarea
          label="Sales Notes"
          value={form_data.sales_notes}
          onChange={update('sales_notes')}
          rows={4}
        />

        {form_data.status === 'Archived' && (
          <Textarea
            label="Archive Notes"
            value={form_data.archive_notes}
            onChange={update('archive_notes')}
            rows={3}
          />
        )}
      </form>
    </Modal>
  );
};

export default LeadModal;
