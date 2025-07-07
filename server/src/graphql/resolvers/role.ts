import Role from '../../models/Role';

export default {
  Query: {
    roles: async () => {
      return await Role.find();
    },
    role: async (_: any, { id }: any) => {
      return await Role.findById(id);
    },
  },
  Mutation: {
    createRole: async (_: any, { input }: any) => {
      const { name, permissions } = input;

      // Convert array of key/value pairs to map
      const permsMap: Record<string, boolean> = {};
      permissions?.forEach(({ key, value }: any) => {
        permsMap[key] = value;
      });

      const existing = await Role.findOne({ name });
      if (existing) throw new Error('Role name already exists');

      const role = new Role({
        name,
        permissions: permsMap,
      });

      await role.save();
      return role;
    },
    updateRole: async (_: any, { id, input }: any) => {
      const updateData: any = {};

      if (input.name) updateData.name = input.name;

      if (input.permissions) {
        const permsMap: Record<string, boolean> = {};
        input.permissions.forEach(({ key, value }: any) => {
          permsMap[key] = value;
        });
        updateData.permissions = permsMap;
      }

      const updated = await Role.findByIdAndUpdate(id, updateData, {
        new: true,
      });

      if (!updated) throw new Error('Role not found');
      return updated;
    },

    deleteRole: async (_: any, { id }: any) => {
      const result = await Role.findByIdAndDelete(id);
      if (!result) throw new Error('Role not found or already deleted');
      return true;
    },
  },
};
