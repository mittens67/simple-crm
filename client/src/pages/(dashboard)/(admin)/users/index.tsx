import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { gql } from '@apollo/client';
import { Plus, Users as UsersIcon } from 'lucide-react';
import { useAuth } from '../../../../auth/auth-context';
import {
  Badge,
  Button,
  Checkbox,
  DataTable,
  EmptyState,
  Input,
  Modal,
  useToast,
  type Column,
} from '../../../../components/ui';
import ListPage from '../../../../components/layout/list-page';
import { useDialog } from '../../../../components/dialogs/DialogProvider';
import './users.scss';

const USERS_QUERY = gql`
  query GetUsersForAdmin {
    users {
      id
      name
      email
      is_active
      roles {
        id
        name
      }
    }
  }
`;

const ROLES_QUERY = gql`
  query GetRoleOptions {
    roles {
      id
      name
    }
  }
`;

const CREATE_USER = gql`
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      id
      name
      email
      is_active
      roles {
        id
        name
      }
    }
  }
`;

const UPDATE_USER = gql`
  mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
    updateUser(id: $id, input: $input) {
      id
      name
      email
      is_active
      roles {
        id
        name
      }
    }
  }
`;

interface User {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
  roles: Array<{ id: string; name: string }>;
}

interface Role {
  id: string;
  name: string;
}

const empty_form = { name: '', email: '', password: '', role_ids: [] as string[] };

const Users = () => {
  const { can } = useAuth();
  const toast = useToast();
  const { showConfirm } = useDialog();
  const { data: users_data, loading } = useQuery(USERS_QUERY);
  const { data: roles_data } = useQuery(ROLES_QUERY);

  const [show_modal, set_show_modal] = useState(false);
  const [edit_user, set_edit_user] = useState<User | null>(null);
  const [form, set_form] = useState(empty_form);
  const [errors, set_errors] = useState<Record<string, string>>({});
  const [saving, set_saving] = useState(false);
  const [search, set_search] = useState('');

  const [create_user] = useMutation(CREATE_USER);
  const [update_user] = useMutation(UPDATE_USER);

  const users: User[] = users_data?.users ?? [];
  const roles: Role[] = roles_data?.roles ?? [];

  const validate = () => {
    const found: Record<string, string> = {};
    if (!form.name.trim()) found.name = 'Name is required';
    if (!form.email.trim()) found.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) found.email = 'Enter a valid email';
    // A password is only required when creating; editing leaves it unchanged.
    if (!edit_user && !form.password.trim()) found.password = 'Password is required';
    if (form.role_ids.length === 0) found.roles = 'Select at least one role';
    return found;
  };

  const handle_save = async (event: React.FormEvent) => {
    event.preventDefault();

    const found = validate();
    set_errors(found);
    if (Object.keys(found).length > 0) return;

    set_saving(true);
    try {
      if (edit_user) {
        await update_user({
          variables: {
            id: edit_user.id,
            input: {
              name: form.name,
              email: form.email,
              role_ids: form.role_ids,
              ...(form.password ? { password: form.password } : {}),
            },
          },
          refetchQueries: [{ query: USERS_QUERY }],
        });
      } else {
        await create_user({
          variables: {
            input: {
              name: form.name,
              email: form.email,
              password: form.password,
              role_ids: form.role_ids,
            },
          },
          refetchQueries: [{ query: USERS_QUERY }],
        });
      }
      set_show_modal(false);
      set_edit_user(null);
      set_form(empty_form);
      toast.success(edit_user ? 'User updated' : 'User created');
    } catch (err) {
      // Previously this only reached console.error, so a failed save looked
      // like nothing had happened.
      toast.error(err instanceof Error ? err.message : 'Failed to save user');
    } finally {
      set_saving(false);
    }
  };

  const open_create = () => {
    set_form(empty_form);
    set_errors({});
    set_edit_user(null);
    set_show_modal(true);
  };

  const open_edit = (user: User) => {
    set_edit_user(user);
    set_form({
      name: user.name,
      email: user.email,
      password: '',
      role_ids: user.roles.map((role) => role.id),
    });
    set_errors({});
    set_show_modal(true);
  };

  const toggle_role = (role_id: string) => {
    set_form((prev) => ({
      ...prev,
      role_ids: prev.role_ids.includes(role_id)
        ? prev.role_ids.filter((id) => id !== role_id)
        : [...prev.role_ids, role_id],
    }));
  };

  const set_active = async (user: User, next_active: boolean) => {
    if (!next_active) {
      const confirmed = await showConfirm({
        title: 'Deactivate user',
        message: `Deactivate ${user.name}? They will be signed out of all sessions.`,
        confirmText: 'Deactivate',
      });
      if (!confirmed) return;
    }

    try {
      await update_user({
        variables: { id: user.id, input: { is_active: next_active } },
        refetchQueries: [{ query: USERS_QUERY }],
      });
      toast.success(next_active ? 'User reactivated' : 'User deactivated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update user');
    }
  };

  const query = search.toLowerCase();
  const filtered = users.filter(
    (user) =>
      user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query)
  );

  const columns: Column<User>[] = [
    {
      key: 'name',
      header: 'Name',
      sort_value: (user) => user.name,
      render: (user) => <span className="list-cell-primary">{user.name}</span>,
    },
    {
      key: 'email',
      header: 'Email',
      sort_value: (user) => user.email,
      render: (user) => user.email,
    },
    {
      key: 'roles',
      header: 'Roles',
      hide_on_mobile: true,
      render: (user) => (
        <div className="users-roles">
          {user.roles.map((role) => (
            <Badge key={role.id} tone="brand">
              {role.name}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: 'active',
      header: 'Status',
      sort_value: (user) => (user.is_active ? 0 : 1),
      render: (user) => (
        <Badge tone={user.is_active ? 'success' : 'neutral'}>
          {user.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (user) => (
        <div className="list-row-actions">
          {can('users.update') && (
            <Button size="sm" onClick={() => open_edit(user)}>
              Edit
            </Button>
          )}
          {can('users.update') && (
            <Button
              size="sm"
              variant={user.is_active ? 'danger' : 'secondary'}
              onClick={() => set_active(user, !user.is_active)}
            >
              {user.is_active ? 'Deactivate' : 'Reactivate'}
            </Button>
          )}
        </div>
      ),
    },
  ];

  // Route guards already gate this page; this is defence in depth.
  if (!can('users.update')) {
    return (
      <ListPage title="Users">
        <EmptyState title="Access denied" description="Managing users requires the users.update permission." />
      </ListPage>
    );
  }

  return (
    <ListPage
      title="Users"
      description="Team members and the roles that decide what they can see."
      search={{
        value: search,
        on_change: set_search,
        placeholder: 'Search users by name or email',
        result_count: filtered.length,
      }}
      actions={
        can('users.create') && (
          <Button variant="primary" icon={<Plus />} onClick={open_create}>
            New User
          </Button>
        )
      }
    >
      <DataTable
        caption="Users"
        columns={columns}
        rows={filtered}
        row_key={(user) => user.id}
        loading={loading}
        empty={
          <EmptyState
            icon={<UsersIcon />}
            title={search ? 'No users match that search' : 'No users yet'}
          />
        }
      />

      {show_modal && (
        <Modal
          title={edit_user ? 'Edit User' : 'New User'}
          on_close={() => set_show_modal(false)}
          footer={
            <>
              <Button onClick={() => set_show_modal(false)} disabled={saving}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" form="user-form" loading={saving}>
                {edit_user ? 'Update' : 'Create'}
              </Button>
            </>
          }
        >
          <form id="user-form" onSubmit={handle_save} noValidate>
            <Input
              label="Name"
              required
              value={form.name}
              onChange={(event) => set_form((prev) => ({ ...prev, name: event.target.value }))}
              error={errors.name}
            />
            <Input
              label="Email"
              type="email"
              required
              value={form.email}
              onChange={(event) => set_form((prev) => ({ ...prev, email: event.target.value }))}
              error={errors.email}
            />
            <Input
              label="Password"
              type="password"
              required={!edit_user}
              value={form.password}
              onChange={(event) => set_form((prev) => ({ ...prev, password: event.target.value }))}
              error={errors.password}
              hint={edit_user ? 'Leave blank to keep the current password.' : undefined}
              autoComplete="new-password"
            />

            <fieldset className="users-roles-field">
              <legend>Roles</legend>
              {roles.map((role) => (
                <Checkbox
                  key={role.id}
                  label={role.name}
                  checked={form.role_ids.includes(role.id)}
                  onChange={() => toggle_role(role.id)}
                />
              ))}
              {errors.roles && (
                <p className="ui-field-error" role="alert">
                  {errors.roles}
                </p>
              )}
              <p className="ui-field-hint">
                Permissions are the union of every role held, so adding a role only ever grants
                access.
              </p>
            </fieldset>
          </form>
        </Modal>
      )}
    </ListPage>
  );
};

export default Users;
