import { useState, useEffect } from 'react';
import type { Customer, CustomerInput } from '../../../../types/customer';
import { Button, Input, Modal, Select } from '../../../../components/ui';

interface User {
  id: string;
  name: string;
}

interface CustomerModalProps {
  customer: Customer | null;
  users: User[];
  saving?: boolean;
  on_save: (input: CustomerInput) => void;
  on_close: () => void;
}

const empty_form = { name: '', email: '', phone: '', assigned_rep_id: '' };

/** Mirrors the server's zod rules so feedback is immediate. */
const validate = (form: typeof empty_form) => {
  const errors: Partial<Record<keyof typeof empty_form, string>> = {};

  if (!form.name.trim()) errors.name = 'Name is required';
  else if (form.name.length > 40) errors.name = 'Name must be 40 characters or less';

  if (!form.email.trim()) errors.email = 'Email is required';
  else if (!/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(form.email)) {
    errors.email = 'Enter a valid email address';
  }

  if (!form.phone.trim()) errors.phone = 'Phone is required';

  return errors;
};

const CustomerModal = ({ customer, users, saving, on_save, on_close }: CustomerModalProps) => {
  const [form_data, set_form_data] = useState(empty_form);
  const [errors, set_errors] = useState<ReturnType<typeof validate>>({});
  const [submitted, set_submitted] = useState(false);

  useEffect(() => {
    if (!customer) {
      set_form_data(empty_form);
      set_errors({});
      set_submitted(false);
      return;
    }
    set_form_data({
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      assigned_rep_id: customer.assigned_rep?.id || '',
    });
  }, [customer]);

  const update = (field: keyof typeof empty_form) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
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
      name: form_data.name,
      email: form_data.email,
      phone: form_data.phone,
      assigned_rep_id: form_data.assigned_rep_id || null,
    });
  };

  return (
    <Modal
      title={customer ? 'Edit Customer' : 'New Customer'}
      on_close={on_close}
      footer={
        <>
          <Button onClick={on_close} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="customer-form" loading={saving}>
            {customer ? 'Update' : 'Create'}
          </Button>
        </>
      }
    >
      <form id="customer-form" onSubmit={handle_submit} noValidate>
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
          options={users.map((user) => ({ value: user.id, label: user.name }))}
        />
      </form>
    </Modal>
  );
};

export default CustomerModal;
