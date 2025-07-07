import User from '../../models/User';
import Role from '../../models/Role';
import ActivityLog from '../../models/ActivityLog';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ApolloContext } from '../context';

const SECRET_KEY = process.env.JWT_SECRET || 'yoursecret';

export default {
  Query: {
    users: async (_: any, __: any, context: ApolloContext) => {
      if (!context.user || !context.role || context.role.name !== 'Admin') {
        throw new Error('Unauthorized: Only admins can view all users');
      }
      return await User.find();
    },
    user: async (_: any, { id }: { id: string }, context: ApolloContext) => {
      if (!context.user || !context.role || context.role.name !== 'Admin') {
        throw new Error('Unauthorized: Only admins can view all users');
      }
      return await User.findById(id);
    },
    me: async (_: any, __: any, context: any) => {
      if (!context.user) throw new Error('Not authenticated');
      return await User.findById(context.user.id);
    },
  },
  Mutation: {
    // Create user (similar to signup but typically used by admin)
    createUser: async (_: any, { input }: any, context: ApolloContext) => {
      if (!context.user || !context.role || context.role.name !== 'Admin') {
        throw new Error('Unauthorized: Only admins can create users');
      }

      const { name, email, password, role_id } = input;

      // Check if user exists
      const existing = await User.findOne({ email });
      if (existing) {
        throw new Error('Email already in use');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = new User({
        name,
        email,
        password: hashedPassword,
        role_id,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      });

      await user.save();
      return user;
    },
    updateUser: async (_: any, { id, input }: any, context: ApolloContext) => {
      if (!context.user || !context.role || context.role.name !== 'Admin') {
        throw new Error('Unauthorized: Only admins can create users');
      }

      const updateData: any = { ...input };

      if (input.password) {
        updateData.password = await bcrypt.hash(input.password, 10);
      }

      updateData.updated_at = new Date();

      const updatedUser = await User.findByIdAndUpdate(id, updateData, {
        new: true,
      });

      if (!updatedUser) throw new Error('User not found');
      return updatedUser;
    },

    deleteUser: async (_: any, { id }: { id: string }, context: ApolloContext) => {
      if (!context.user || !context.role || context.role.name !== 'Admin') {
        throw new Error('Unauthorized: Only admins can create users');
      }

      const user = await User.findById(id);

      if (!user) throw new Error('User not found');

      // Soft delete the user (mark as inactive)
      user.is_active = false;
      user.updated_at = new Date();

      await user.save();

      // Log the activity of user soft delete
      const activity = new ActivityLog({
        user_id: user._id,
        action: 'User soft deleted',
        metadata: { userId: user._id },
        created_at: new Date(),
      });
      await activity.save();

      return true;
    },

    // Signup: Create user and return a JWT token
    signup: async (_: any, { input }: any) => {
      const { name, email, password, role_id } = input;

      // Check if user already exists
      const existing = await User.findOne({ email });
      if (existing) {
        throw new Error('Email already in use');
      }

      // Hash the password before saving it
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create the new user
      const user = new User({
        name,
        email,
        password: hashedPassword,
        role_id,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      });

      await user.save();

      // Generate JWT token
      const token = jwt.sign({ id: user._id }, SECRET_KEY, {
        expiresIn: '7d',
      });

      // Return the user and the token
      return { token, user };
    },

    login: async (_: any, { input }: any) => {
      const { email, password, role } = input;
      const user = await User.findOne({ email });
      if (!user || !user.is_active) {
        throw new Error('Invalid credentials');
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) throw new Error('Invalid credentials');

      const userRole = await Role.findById(user.role_id);
      if(!userRole || userRole?.name !== role) {
        throw new Error(`User's role is not ${role}`)
      }

      const token = jwt.sign({ id: user._id }, SECRET_KEY, {
        expiresIn: '7d',
      });

      return { token, user };
    },

    logout: async (_: any, __: any, context: any) => {
      // If you use cookie-based auth, you'd clear the cookie here
      // For JWT, you could track revoked tokens in DB or cache
      return true;
    },

    resetPassword: async (_: any, { input }: any) => {
      const { email, newPassword } = input;
      const user = await User.findOne({ email });

      if (!user) throw new Error('User not found');

      user.password = await bcrypt.hash(newPassword, 10);
      user.updated_at = new Date();
      await user.save();

      return true;
    },
  },
  User: {
    role: async (parent: any) => {
      return await Role.findById(parent.role_id);
    },
  }
};
