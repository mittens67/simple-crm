import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { gql } from '@apollo/client';
import { useAuth } from '../../../../auth/auth-context';
import '../../(sales)/(leads)/leads.scss';
import './roles.scss';

const ROLES_QUERY = gql`
  query GetRoles {
    roles {
      id
      name
      permissions
    }
    permissionCatalog
  }
`;

const CREATE_ROLE = gql`
  mutation CreateRole($input: CreateRoleInput!) {
    createRole(input: $input) {
      id
      name
      permissions
    }
  }
`;

const UPDATE_ROLE = gql`
  mutation UpdateRole($id: ID!, $input: UpdateRoleInput!) {
    updateRole(id: $id, input: $input) {
      id
      name
      permissions
    }
  }
`;

const DELETE_ROLE = gql`
  mutation DeleteRole($id: ID!) {
    deleteRole(id: $id)
  }
`;

interface Role {
  id: string;
  name: string;
  permissions: Record<string, boolean>;
}

const Roles = () => {
  const { can } = useAuth();
  const { data } = useQuery(ROLES_QUERY);
  const [show_modal, set_show_modal] = useState(false);
  const [edit_role, set_edit_role] = useState<Role | null>(null);
  const [role_name, set_role_name] = useState('');
  const [permissions, set_permissions] = useState<Record<string, boolean>>({});
  const [search, set_search] = useState('');

  const [create_role] = useMutation(CREATE_ROLE);
  const [update_role] = useMutation(UPDATE_ROLE);
  const [delete_role] = useMutation(DELETE_ROLE);

  const roles = data?.roles || [];
  const permission_catalog = data?.permissionCatalog || [];

  const group_permissions = (perms: string[]) => {
    const grouped: Record<string, string[]> = {};
    perms.forEach((p) => {
      const [resource] = p.split('.');
      if (!grouped[resource]) grouped[resource] = [];
      grouped[resource].push(p);
    });
    return grouped;
  };

  const handle_save = async () => {
    if (!role_name.trim()) return;

    const perm_input = Object.entries(permissions)
      .filter(([_, val]) => val)
      .map(([key]) => ({ key, value: true }));

    try {
      if (edit_role) {
        await update_role({
          variables: { id: edit_role.id, input: { name: role_name, permissions: perm_input } },
          refetchQueries: [{ query: ROLES_QUERY }],
        });
      } else {
        await create_role({
          variables: { input: { name: role_name, permissions: perm_input } },
          refetchQueries: [{ query: ROLES_QUERY }],
        });
      }
      set_show_modal(false);
      reset_form();
    } catch (err) {
      console.error('Error saving role:', err);
    }
  };

  const handle_delete = async (id: string) => {
    if (confirm('Delete this role?')) {
      try {
        await delete_role({ variables: { id }, refetchQueries: [{ query: ROLES_QUERY }] });
      } catch (err) {
        console.error('Error deleting role:', err);
      }
    }
  };

  const handle_edit = (role: Role) => {
    set_edit_role(role);
    set_role_name(role.name);
    set_permissions(role.permissions || {});
    set_show_modal(true);
  };

  const reset_form = () => {
    set_role_name('');
    set_permissions({});
    set_edit_role(null);
  };

  const toggle_permission = (perm: string) => {
    set_permissions((prev) => ({ ...prev, [perm]: !prev[perm] }));
  };

  const filtered_roles = roles.filter((r: Role) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  if (!can('roles.read')) {
    return <div className="leads">Access denied</div>;
  }

  return (
    <div className="leads">
      <div className="leads-header">
        <h1>Roles</h1>
        {can('roles.create') && (
          <button
            className="btn-primary"
            onClick={() => {
              reset_form();
              set_show_modal(true);
            }}
          >
            + Create Role
          </button>
        )}
      </div>

      <div className="leads-search">
        <input
          type="text"
          placeholder="Search roles..."
          value={search}
          onChange={(e) => set_search(e.target.value)}
        />
      </div>

      <table className="leads-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Permissions</th>
            {can('roles.update') || can('roles.delete') ? <th>Actions</th> : null}
          </tr>
        </thead>
        <tbody>
          {filtered_roles.map((role: Role) => (
            <tr key={role.id}>
              <td>{role.name}</td>
              <td>
                {Object.entries(role.permissions || {})
                  .filter(([_, v]) => v)
                  .map(([k]) => k)
                  .join(', ') || '—'}
              </td>
              <td className="actions">
                {can('roles.update') && (
                  <button className="btn-small" onClick={() => handle_edit(role)}>
                    Edit
                  </button>
                )}
                {can('roles.delete') && (
                  <button className="btn-danger" onClick={() => handle_delete(role.id)}>
                    Delete
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {show_modal && (
        <div className="modal-overlay" onClick={() => set_show_modal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{edit_role ? 'Edit Role' : 'Create Role'}</h2>
              <button className="modal-close" onClick={() => set_show_modal(false)}>
                ✕
              </button>
            </div>
            <div className="modal-form">
              <div className="form-group">
                <label>Role Name</label>
                <input
                  type="text"
                  value={role_name}
                  onChange={(e) => set_role_name(e.target.value)}
                  placeholder="e.g., Manager"
                />
              </div>

              <div className="form-group">
                <label>Permissions</label>
                <div className="permission-grid">
                  {Object.entries(group_permissions(permission_catalog)).map(([resource, perms]) => {
                    const all_selected = perms.every((p) => permissions[p] === true);
                    const toggle_all = () => {
                      const new_perms = { ...permissions };
                      perms.forEach((p) => {
                        new_perms[p] = !all_selected;
                      });
                      set_permissions(new_perms);
                    };

                    return (
                      <div key={resource} className="permission-card">
                        <div className="resource-header">
                          <p className="resource-name">{resource}</p>
                          <button
                            type="button"
                            className="select-all"
                            onClick={toggle_all}
                          >
                            {all_selected ? 'Deselect All' : 'Select All'}
                          </button>
                        </div>
                        <div className="permission-list">
                          {perms.map((perm) => (
                            <div key={perm} className="permission-item">
                              <input
                                type="checkbox"
                                id={perm}
                                checked={permissions[perm] === true}
                                onChange={() => toggle_permission(perm)}
                              />
                              <label htmlFor={perm}>
                                {perm.split('.')[1]}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => set_show_modal(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handle_save}>
                {edit_role ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Roles;
