import { describe, it, expect, beforeEach } from 'vitest';
import { lead_repository } from '../../repositories/lead';
import Lead from '../../models/lead';

// MongoDB setup is handled by src/__tests__/setup.ts (wired in vitest.config.ts)

beforeEach(async () => {
  await Lead.deleteMany({});
});

describe('LeadRepository', () => {
  it('should create a lead', async () => {
    const lead = await lead_repository.create({
      name: 'John Doe',
      email: 'john@example.com',
      phone: '555-1234',
    });

    expect(lead).toBeDefined();
    expect(lead.name).toBe('John Doe');
    expect(lead.email).toBe('john@example.com');
    expect(lead.status).toBe('Open');
  });

  it('should find a lead by id', async () => {
    const created = await lead_repository.create({
      name: 'Jane Smith',
      email: 'jane@example.com',
      phone: '555-5678',
    });

    const found = await lead_repository.findById(created.id);
    expect(found).toBeDefined();
    expect(found?.name).toBe('Jane Smith');
  });

  it('should find all leads', async () => {
    await lead_repository.create({
      name: 'Lead 1',
      email: 'lead1@example.com',
      phone: '555-0001',
    });
    await lead_repository.create({
      name: 'Lead 2',
      email: 'lead2@example.com',
      phone: '555-0002',
    });

    const leads = await lead_repository.findAll();
    expect(leads).toHaveLength(2);
  });

  it('should search leads by name', async () => {
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

    const result = await lead_repository.findAllWithPagination('Alice', 20, 0);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].name).toBe('Alice Johnson');
    expect(result.total).toBe(1);
  });

  it('should search leads by email', async () => {
    await lead_repository.create({
      name: 'Test User',
      email: 'test@domain.com',
      phone: '555-9999',
    });

    const result = await lead_repository.findAllWithPagination('domain.com', 20, 0);
    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it('should paginate results', async () => {
    for (let i = 1; i <= 30; i++) {
      await lead_repository.create({
        name: `Lead ${i}`,
        email: `lead${i}@example.com`,
        phone: `555-${String(i).padStart(4, '0')}`,
      });
    }

    const page1 = await lead_repository.findAllWithPagination(undefined, 10, 0);
    const page2 = await lead_repository.findAllWithPagination(undefined, 10, 10);

    expect(page1.data).toHaveLength(10);
    expect(page2.data).toHaveLength(10);
    expect(page1.total).toBe(30);
    expect(page1.data[0].name).not.toBe(page2.data[0].name);
  });

  it('should update a lead', async () => {
    const created = await lead_repository.create({
      name: 'Original Name',
      email: 'test@example.com',
      phone: '555-0000',
    });

    const updated = await lead_repository.update(created.id, {
      name: 'Updated Name',
    });

    expect(updated?.name).toBe('Updated Name');
    expect(updated?.email).toBe('test@example.com');
  });
});
