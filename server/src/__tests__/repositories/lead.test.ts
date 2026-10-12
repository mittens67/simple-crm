import { describe, it, expect, beforeEach } from 'vitest';
import { lead_repository } from '../../repositories/lead';
import { MAX_PAGE_SIZE, clamp_limit, DEFAULT_PAGE_SIZE } from '../../core/base-repository';
import Lead from '../../models/lead';

// MongoDB setup is handled by src/__tests__/setup.ts (wired in vitest.config.ts)

beforeEach(async () => {
  await Lead.deleteMany({});
});

const make_lead = (overrides: Record<string, unknown> = {}) =>
  lead_repository.create({
    name: 'John Doe',
    email: 'john@example.com',
    phone: '555-1234',
    ...overrides,
  });

describe('LeadRepository', () => {
  it('creates a lead defaulting to Open', async () => {
    const lead = await make_lead();

    expect(lead.name).toBe('John Doe');
    expect(lead.email).toBe('john@example.com');
    expect(lead.status).toBe('Open');
  });

  it('finds a lead by id', async () => {
    const created = await make_lead({ name: 'Jane Smith' });

    const found = await lead_repository.find_by_id(String(created._id));
    expect(found?.name).toBe('Jane Smith');
  });

  it('returns null for a malformed id rather than throwing', async () => {
    expect(await lead_repository.find_by_id('not-an-object-id')).toBeNull();
  });

  it('finds all leads', async () => {
    await make_lead({ name: 'Lead 1', email: 'lead1@example.com' });
    await make_lead({ name: 'Lead 2', email: 'lead2@example.com' });

    expect(await lead_repository.find_all()).toHaveLength(2);
  });

  it('searches by name', async () => {
    await make_lead({ name: 'Alice Johnson', email: 'alice@example.com' });
    await make_lead({ name: 'Bob Smith', email: 'bob@example.com' });

    const page = await lead_repository.find_page({ search: 'Alice' });
    expect(page.items).toHaveLength(1);
    expect(page.items[0].name).toBe('Alice Johnson');
    expect(page.total).toBe(1);
    expect(page.has_more).toBe(false);
  });

  it('searches by email', async () => {
    await make_lead({ email: 'test@domain.com' });

    const page = await lead_repository.find_page({ search: 'domain.com' });
    expect(page.items).toHaveLength(1);
    expect(page.total).toBe(1);
  });

  it('treats regex metacharacters in a search as literal text', async () => {
    await make_lead({ name: 'Foo (Bar)', email: 'foo@example.com' });

    // An unescaped '(' would make this throw rather than return no matches.
    const page = await lead_repository.find_page({ search: 'Foo (Bar)' });
    expect(page.items).toHaveLength(1);
  });

  it('paginates and reports has_more', async () => {
    for (let i = 1; i <= 30; i += 1) {
      await make_lead({ name: `Lead ${i}`, email: `lead${i}@example.com` });
    }

    const page1 = await lead_repository.find_page({ limit: 10, offset: 0 });
    const page2 = await lead_repository.find_page({ limit: 10, offset: 10 });
    const last = await lead_repository.find_page({ limit: 10, offset: 20 });

    expect(page1.items).toHaveLength(10);
    expect(page1.total).toBe(30);
    expect(page1.has_more).toBe(true);
    expect(page1.items[0].name).not.toBe(page2.items[0].name);
    expect(last.has_more).toBe(false);
  });

  it('caps the page size so a caller cannot request the whole collection', async () => {
    for (let i = 1; i <= 5; i += 1) {
      await make_lead({ name: `Lead ${i}`, email: `lead${i}@example.com` });
    }

    // The old implementation honoured limit: 100000 verbatim.
    expect(clamp_limit(100000)).toBe(MAX_PAGE_SIZE);
    expect(clamp_limit(undefined)).toBe(DEFAULT_PAGE_SIZE);
    expect(clamp_limit(0)).toBe(DEFAULT_PAGE_SIZE);
    expect(clamp_limit(-5)).toBe(DEFAULT_PAGE_SIZE);
    expect(clamp_limit(10)).toBe(10);
  });

  it('applies an extra filter alongside a search', async () => {
    await make_lead({ name: 'Archived Ann', email: 'ann@example.com', status: 'Archived' });
    await make_lead({ name: 'Open Ann', email: 'ann2@example.com', status: 'Open' });

    const page = await lead_repository.find_page({
      search: 'Ann',
      filter: { status: 'Open' },
    });

    expect(page.items).toHaveLength(1);
    expect(page.items[0].name).toBe('Open Ann');
  });

  it('updates a lead', async () => {
    const created = await make_lead({ name: 'Original Name', email: 'test@example.com' });

    const updated = await lead_repository.update(String(created._id), { name: 'Updated Name' });

    expect(updated?.name).toBe('Updated Name');
    expect(updated?.email).toBe('test@example.com');
  });
});
