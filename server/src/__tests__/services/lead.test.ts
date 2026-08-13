import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { lead_service } from '../../services/lead';
import { lead_repository } from '../../repositories/lead';
import Lead from '../../models/lead';
import Customer from '../../models/customer';
import User from '../../models/user';
import Role from '../../models/role';
import ActivityLog from '../../models/activity-log';
import { ValidationError, NotFoundError } from '../../utils/errors';
import { mock_context } from '../helpers/context';

// MongoDB setup is handled by src/__tests__/setup.ts (wired in vitest.config.ts)

let test_user: any;
let test_admin: any;
let sales_role: any;
let admin_role: any;

beforeAll(async () => {
  // Create roles with permissions (Record<string, boolean>)
  sales_role = await Role.create({
    name: 'Sales',
    permissions: {
      'leads.read': true,
      'leads.create': true,
      'leads.update': true,
      'leads.delete': true,
      'customers.read': true,
      'deals.read': true,
      'deals.create': true,
      'deals.update': true,
    },
  });

  admin_role = await Role.create({
    name: 'Admin',
    permissions: { '*': true },
  });

  // Create test users
  test_user = await User.create({
    name: 'Test User',
    email: 'user@example.com',
    password: 'password123',
    role_ids: [sales_role._id],
  });

  test_admin = await User.create({
    name: 'Admin User',
    email: 'admin@example.com',
    password: 'password123',
    role_ids: [admin_role._id],
  });
});

beforeEach(async () => {
  await Lead.deleteMany({});
  await Customer.deleteMany({});
  await ActivityLog.deleteMany({});
});

describe('LeadService', () => {
  describe('createLead', () => {
    it('should create a lead with valid input', async () => {
      const context = mock_context(test_user, sales_role);
      const input = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-1234',
      };

      const lead = await lead_service.createLead(input, context);
      expect(lead.name).toBe('John Doe');
      expect(lead.status).toBe('Open');
    });

    it('should reject invalid email', async () => {
      const context = mock_context(test_user, sales_role);
      const input = {
        name: 'John Doe',
        email: 'not-an-email',
        phone: '555-1234',
      };

      expect(async () => {
        await lead_service.createLead(input, context);
      }).rejects.toThrow(ValidationError);
    });

    it('should reject name longer than 40 chars', async () => {
      const context = mock_context(test_user, sales_role);
      const input = {
        name: 'A'.repeat(41),
        email: 'john@example.com',
        phone: '555-1234',
      };

      expect(async () => {
        await lead_service.createLead(input, context);
      }).rejects.toThrow(ValidationError);
    });

    it('should set status to Pending when assigned_rep_id is provided', async () => {
      const context = mock_context(test_user, sales_role);
      const input = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-1234',
        assigned_rep_id: test_admin.id,
      };

      const lead = await lead_service.createLead(input, context);
      expect(lead.status).toBe('Pending');
      expect(lead.assigned_rep_id).toEqual(test_admin._id);
    });

    it('should log activity on creation', async () => {
      const context = mock_context(test_user, sales_role);
      const input = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-1234',
      };

      await lead_service.createLead(input, context);
      const logs = await ActivityLog.find();
      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe('Lead created');
    });
  });

  describe('updateLead', () => {
    it('should update lead status', async () => {
      const created = await lead_repository.create({
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-1234',
      });

      const context = mock_context(test_user, sales_role);
      const updated = await lead_service.updateLead(created.id, { status: 'Archived' }, context);
      expect(updated.status).toBe('Archived');
    });

    it('should auto-create customer when converting lead', async () => {
      const created = await lead_repository.create({
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-1234',
      });

      const context = mock_context(test_user, sales_role);
      const updated = await lead_service.updateLead(created.id, { status: 'Converted' }, context);

      expect(updated.status).toBe('Converted');
      expect(updated.customer_id).toBeDefined();

      const customer = await Customer.findById(updated.customer_id);
      expect(customer).toBeDefined();
      expect(customer?.name).toBe('John Doe');
      expect(customer?.email).toBe('john@example.com');
    });

    it('should not create duplicate customers on re-convert', async () => {
      const created = await lead_repository.create({
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-1234',
      });

      const context = mock_context(test_user, sales_role);
      await lead_service.updateLead(created.id, { status: 'Converted' }, context);
      await lead_service.updateLead(created.id, { status: 'Converted' }, context);

      const customers = await Customer.find();
      expect(customers).toHaveLength(1);
    });

    it('should set status to Open when removing assigned_rep', async () => {
      const created = await lead_repository.create({
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-1234',
        assigned_rep_id: test_admin.id,
        status: 'Pending',
      });

      const context = mock_context(test_user, sales_role);
      const updated = await lead_service.updateLead(created.id, { assigned_rep_id: null }, context);
      expect(updated.status).toBe('Open');
    });

    it('should throw NotFoundError if lead does not exist', async () => {
      const context = mock_context(test_user, sales_role);
      const fake_id = new Types.ObjectId().toString();
      expect(async () => {
        await lead_service.updateLead(fake_id, { status: 'Archived' }, context);
      }).rejects.toThrow(NotFoundError);
    });
  });

  describe('getLeads', () => {
    it('should return paginated leads', async () => {
      const context = mock_context(test_user, sales_role);

      for (let i = 1; i <= 25; i++) {
        await lead_repository.create({
          name: `Lead ${i}`,
          email: `lead${i}@example.com`,
          phone: `555-${String(i).padStart(4, '0')}`,
        });
      }

      const result = await lead_service.getLeads(context, undefined, 20, 0);
      expect(result.data).toHaveLength(20);
      expect(result.total).toBe(25);
    });

    it('should search leads', async () => {
      const context = mock_context(test_user, sales_role);

      await lead_repository.create({
        name: 'Alice Johnson',
        email: 'alice@example.com',
        phone: '555-1111',
      });
      await lead_repository.create({
        name: 'Bob Smith',
        email: 'bob@example.com',
        phone: '555-2222',
      });

      const result = await lead_service.getLeads(context, 'Alice', 20, 0);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('Alice Johnson');
    });
  });

  describe('deleteLead', () => {
    it('should soft-delete lead (archive)', async () => {
      const created = await lead_repository.create({
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-1234',
      });

      const context = mock_context(test_user, sales_role);
      const deleted = await lead_service.deleteLead(created.id, context);

      expect(deleted.status).toBe('Archived');
    });

    it('should throw NotFoundError if lead does not exist', async () => {
      const context = mock_context(test_user, sales_role);
      const fake_id = new Types.ObjectId().toString();
      expect(async () => {
        await lead_service.deleteLead(fake_id, context);
      }).rejects.toThrow(NotFoundError);
    });
  });
});
