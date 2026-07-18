import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { gql } from '@apollo/client';
import { useAuth } from '../../../../auth/auth-context';
import '../../(sales)/(leads)/leads.scss';

const USERS_QUERY = gql`
  query GetUsers {
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
  query GetRoles {
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

const Users = () => {
  const { can } = useAuth();
  const { data: users_data } = useQuery(USERS_QUERY);
  const { data: roles_data } = useQuery(ROLES_QUERY);
  const [show_modal, set_show_modal] = useState(false);
  const [edit_user, set_edit_user] = useState<User | null>(null);
  const [form, set_form] = useState({ name: '', email: '', password: '', role_ids: [] as string[] });
  const [search, set_search] = useState('');

  const [create_user] = useMutation(CREATE_USER);
  const [update_user] = useMutation(UPDATE_USER);

  const users = users_data?.users || [];
  const roles = roles_data?.roles || [];

  const handle_save = async () => {
    if (!form.name.trim() || !form.email.trim()) return;
    if (!edit_user && !form.password.trim()) return;

    try {
      if (edit_user) {
        if (form.role_ids.length === 0) {
          alert('User must have at least one role');
          return;
        }
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
              role_ids: form.role_ids.length > 0 ? form.role_ids : [roles[0]?.id],
            },
          },
          refetchQueries: [{ query: USERS_QUERY }],
        });
      }
      set_show_modal(false);
      reset_form();
    } catch (err) {
      console.error('Error saving user:', err);
    }
  };

  const handle_edit = (user: User) => {
    set_edit_user(user);
    set_form({
      name: user.name,
      email: user.email,
      password: '',
      role_ids: user.roles.map((r) => r.id),
    });
    set_show_modal(true);
  };

  const reset_form = () => {
    set_form({ name: '', email: '', password: '', role_ids: [] });
    set_edit_user(null);
  };

  const toggle_role = (role_id: string) => {
    set_form((prev) => ({
      ...prev,
      role_ids: prev.role_ids.includes(role_id)
        ? prev.role_ids.filter((id) => id !== role_id)
        : [...prev.role_ids, role_id],
    }));
  };

  const filtered_users = users.filter((u: User) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  if (!can('users.read')) {
    return <div className="leads">Access denied</div>;
  }

  return (
    <div className="leads">
      <div className="leads-header">
        <h1>Users</h1>
        {can('users.create') && (
          <button
            className="btn-primary"
            onClick={() => {
              reset_form();
              set_show_modal(true);
            }}
          >
            + Create User
          </button>
        )}
      </div>

      <div className="leads-search">
        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={(e) => set_search(e.target.value)}
        />
      </div>

      <table className="leads-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Roles</th>
            <th>Status</th>
            {can('users.update') ? <th>Actions</th> : null}
          </tr>
        </thead>
        <tbody>
          {filtered_users.map((user: User) => (
            <tr key={user.id}>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {user.roles.map((role) => (
                    <span
                      key={role.id}
                      className="status status-qualified"
                      style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem' }}
                    >
                      {role.name}
                    </span>
                  ))}
                </div>
              </td>
              <td>{user.is_active ? 'Active' : 'Inactive'}</td>
              {can('users.update') && (
                <td className="actions">
                  <button className="btn-small" onClick={() => handle_edit(user)}>
                    Edit
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {show_modal && (
        <div className="modal-overlay" onClick={() => set_show_modal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{edit_user ? 'Edit User' : 'Create User'}</h2>
              <button className="modal-close" onClick={() => set_show_modal(false)}>
                ✕
              </button>
            </div>
            <div className="modal-form">
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => set_form({ ...form, name: e.target.value })}
                  placeholder="Full name"
                />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => set_form({ ...form, email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>

              {!edit_user && (
                <div className="form-group">
                  <label>Password</label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => set_form({ ...form, password: e.target.value })}
                    placeholder="Set password"
                  />
                </div>
              )}

              <div className="form-group">
                <label>Roles</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {roles.map((role: Role) => (
                    <label
                      key={role.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={form.role_ids.includes(role.id)}
                        onChange={() => toggle_role(role.id)}
                        style={{ cursor: 'pointer' }}
                      />
                      <span>{role.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => set_show_modal(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handle_save}>
                {edit_user ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
