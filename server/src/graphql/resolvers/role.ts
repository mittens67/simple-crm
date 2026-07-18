import { GraphQLError } from 'graphql';
import Role from '../../models/role';
import User from '../../models/user';
import { require_permission } from '../../auth/authorize';
import { PERMISSION_CATALOG } from '../../auth/permissions';
import { ApolloContext } from '../context';

const to_perms_map = (permissions: any[]): Record<string, boolean> => {
  const perms_map: Record<string, boolean> = {};
  permissions?.forEach(({ key, value }: any) => {
    perms_map[key] = value;
  });
  return perms_map;
};

export default {
  Query: {
    roles: async (_: any, __: any, context: ApolloContext) => {
      require_permission(context, 'roles.read');
      return await Role.find();
    },
    role: async (_: any, { id }: any, context: ApolloContext) => {
      require_permission(context, 'roles.read');
      return await Role.findById(id);
    },
    permissionCatalog: () => PERMISSION_CATALOG,
  },
  Mutation: {
    createRole: async (_: any, { input }: any, context: ApolloContext) => {
      require_permission(context, 'roles.create');

      const { name, permissions } = input;

      const existing = await Role.findOne({ name });
      if (existing) {
        throw new GraphQLError('Role name already exists', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      const role = new Role({ name, permissions: to_perms_map(permissions) });
      await role.save();
      return role;
    },

    updateRole: async (_: any, { id, input }: any, context: ApolloContext) => {
      require_permission(context, 'roles.update');

      const update_data: any = {};
      if (input.name) update_data.name = input.name;
      if (input.permissions) update_data.permissions = to_perms_map(input.permissions);

      const updated = await Role.findByIdAndUpdate(id, update_data, { new: true });
      if (!updated) throw new GraphQLError('Role not found');
      return updated;
    },

    deleteRole: async (_: any, { id }: any, context: ApolloContext) => {
      require_permission(context, 'roles.delete');

      const assigned_users = await User.countDocuments({ role_ids: id });
      if (assigned_users > 0) {
        throw new GraphQLError(
          `Cannot delete role: ${assigned_users} user(s) still assigned to it`,
          { extensions: { code: 'BAD_USER_INPUT' } }
        );
      }

      const result = await Role.findByIdAndDelete(id);
      if (!result) throw new GraphQLError('Role not found');
      return true;
    },
  },
};
