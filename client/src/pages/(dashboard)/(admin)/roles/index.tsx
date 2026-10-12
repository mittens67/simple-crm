import { useState } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import { Plus, ShieldCheck } from 'lucide-react';
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
import './roles.scss';

const ROLES_QUERY = gql`
  query GetRolesWithPermissions {
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

/** Turns "support_tickets" into "Support tickets" for the group headings. */
const humanise = (resource: string) =>
  resource.replace(/_/g, ' ').replace(/^./, (char) => char.toUpperCase());

const Roles = () => {
  const { can } = useAuth();
  const toast = useToast();
  const { showConfirm } = useDialog();
  const { data, loading } = useQuery(ROLES_QUERY);

  const [show_modal, set_show_modal] = useState(false);
  const [edit_role, set_edit_role] = useState<Role | null>(null);
  const [role_name, set_role_name] = useState('');
  const [permissions, set_permissions] = useState<Record<string, boolean>>({});
  const [name_error, set_name_error] = useState<string | null>(null);
  const [saving, set_saving] = useState(false);
  const [search, set_search] = useState('');

  const [create_role] = useMutation(CREATE_ROLE);
  const [update_role] = useMutation(UPDATE_ROLE);
  const [delete_role] = useMutation(DELETE_ROLE);

  const roles: Role[] = data?.roles ?? [];
  const catalog: string[] = data?.permissionCatalog ?? [];

  // Grouped by resource so the matrix is navigable; the catalog is 8 resources
  // times 7 actions, which is unreadable as a flat list.
  const grouped = catalog.reduce<Record<string, string[]>>((accumulator, permission) => {
    const [resource] = permission.split('.');
    accumulator[resource] = [...(accumulator[resource] ?? []), permission];
    return accumulator;
  }, {});

  const handle_save = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!role_name.trim()) {
      set_name_error('Role name is required');
      return;
    }
    set_name_error(null);
    set_saving(true);

    const permission_input = Object.entries(permissions)
      .filter(([, enabled]) => enabled)
      .map(([key]) => ({ key, value: true }));

    try {
      if (edit_role) {
        await update_role({
          variables: { id: edit_role.id, input: { name: role_name, permissions: permission_input } },
          refetchQueries: [{ query: ROLES_QUERY }],
        });
      } else {
        await create_role({
          variables: { input: { name: role_name, permissions: permission_input } },
          refetchQueries: [{ query: ROLES_QUERY }],
        });
      }
      set_show_modal(false);
      set_edit_role(null);
      toast.success(edit_role ? 'Role updated' : 'Role created');
    } catch (err) {
      // This previously only reached console.error.
      toast.error(err instanceof Error ? err.message : 'Failed to save role');
    } finally {
      set_saving(false);
    }
  };

  const handle_delete = async (role: Role) => {
    // Replaces a native confirm(), which the DialogProvider exists to avoid.
    const confirmed = await showConfirm({
      title: 'Delete role',
      message: `Delete "${role.name}"? Users assigned to it will lose those permissions.`,
      confirmText: 'Delete',
    });
    if (!confirmed) return;

    try {
      await delete_role({ variables: { id: role.id }, refetchQueries: [{ query: ROLES_QUERY }] });
      toast.success('Role deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete role');
    }
  };

  const open_create = () => {
    set_role_name('');
    set_permissions({});
    set_edit_role(null);
    set_name_error(null);
    set_show_modal(true);
  };

  const open_edit = (role: Role) => {
    set_edit_role(role);
    set_role_name(role.name);
    set_permissions(role.permissions ?? {});
    set_name_error(null);
    set_show_modal(true);
  };

  const toggle = (permission: string) =>
    set_permissions((prev) => ({ ...prev, [permission]: !prev[permission] }));

  const set_group = (group: string[], enabled: boolean) =>
    set_permissions((prev) => ({
      ...prev,
      ...Object.fromEntries(group.map((permission) => [permission, enabled])),
    }));

  const filtered = roles.filter((role) => role.name.toLowerCase().includes(search.toLowerCase()));

  const columns: Column<Role>[] = [
    {
      key: 'name',
      header: 'Role',
      sort_value: (role) => role.name,
      render: (role) => <span className="list-cell-primary">{role.name}</span>,
    },
    {
      key: 'permissions',
      header: 'Permissions',
      render: (role) => {
        const granted = Object.entries(role.permissions ?? {}).filter(([, on]) => on);
        if (granted.some(([key]) => key === '*')) {
          return <Badge tone="brand">Full access</Badge>;
        }
        return (
          <div className="roles-permission-list">
            {/* A raw .join(', ') of 30+ keys was previously dumped into the cell. */}
            {granted.slice(0, 6).map(([key]) => (
              <Badge key={key}>{key}</Badge>
            ))}
            {granted.length > 6 && <span className="muted">+{granted.length - 6} more</span>}
            {granted.length === 0 && <span className="muted">None</span>}
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (role) => (
        <div className="list-row-actions">
          {can('roles.update') && (
            <Button size="sm" onClick={() => open_edit(role)}>
              Edit
            </Button>
          )}
          {can('roles.delete') && (
            <Button size="sm" variant="danger" onClick={() => handle_delete(role)}>
              Delete
            </Button>
          )}
        </div>
      ),
    },
  ];

  if (!can('roles.update')) {
    return (
      <ListPage title="Roles">
        <EmptyState title="Access denied" description="Managing roles requires the roles.update permission." />
      </ListPage>
    );
  }

  return (
    <ListPage
      title="Roles"
      description="Permission sets. A user's access is the union of every role they hold."
      search={{
        value: search,
        on_change: set_search,
        placeholder: 'Search roles',
        result_count: filtered.length,
      }}
      actions={
        can('roles.create') && (
          <Button variant="primary" icon={<Plus />} onClick={open_create}>
            New Role
          </Button>
        )
      }
    >
      <DataTable
        caption="Roles"
        columns={columns}
        rows={filtered}
        row_key={(role) => role.id}
        loading={loading}
        empty={
          <EmptyState
            icon={<ShieldCheck />}
            title={search ? 'No roles match that search' : 'No roles yet'}
          />
        }
      />

      {show_modal && (
        <Modal
          title={edit_role ? 'Edit Role' : 'New Role'}
          size="lg"
          on_close={() => set_show_modal(false)}
          footer={
            <>
              <Button onClick={() => set_show_modal(false)} disabled={saving}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" form="role-form" loading={saving}>
                {edit_role ? 'Update' : 'Create'}
              </Button>
            </>
          }
        >
          <form id="role-form" onSubmit={handle_save} noValidate>
            <Input
              label="Role name"
              required
              value={role_name}
              onChange={(event) => set_role_name(event.target.value)}
              error={name_error}
            />

            <p className="roles-matrix-note">
              A <code>.all</code> permission grants visibility beyond your own records — without
              one, a read is scoped to the records assigned to you.
            </p>

            <div className="roles-matrix">
              {Object.entries(grouped).map(([resource, group]) => {
                const all_on = group.every((permission) => permissions[permission]);
                return (
                  <fieldset key={resource} className="roles-group">
                    <legend>{humanise(resource)}</legend>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => set_group(group, !all_on)}
                      className="roles-group-toggle"
                    >
                      {all_on ? 'Clear all' : 'Select all'}
                    </Button>
                    {group.map((permission) => (
                      <Checkbox
                        key={permission}
                        label={permission.split('.').slice(1).join('.')}
                        checked={Boolean(permissions[permission])}
                        onChange={() => toggle(permission)}
                      />
                    ))}
                  </fieldset>
                );
              })}
            </div>
          </form>
        </Modal>
      )}
    </ListPage>
  );
};

export default Roles;
