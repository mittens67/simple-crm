import { describe, it, expect, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { supports_transactions, with_transaction } from '../../core/transaction';
import Customer from '../../models/customer';

beforeEach(async () => {
  await Customer.deleteMany({});
});

describe('with_transaction', () => {
  /**
   * The suite runs against a single-node replica set precisely so this is
   * true. If it ever goes false, every transactional test below silently
   * degrades into a non-atomic one and stops proving anything.
   */
  it('runs against a deployment that supports transactions', async () => {
    expect(await supports_transactions()).toBe(true);
  });

  it('returns the value produced by the work', async () => {
    const result = await with_transaction(async () => 'done');
    expect(result).toBe('done');
  });

  it('commits writes made inside the transaction', async () => {
    await with_transaction(async (session) => {
      await Customer.create(
        [{ name: 'Committed', email: 'commit@example.com', phone: '1' }],
        session ? { session } : {}
      );
    });

    expect(await Customer.countDocuments()).toBe(1);
  });

  it('rolls back every write when the work throws', async () => {
    await expect(
      with_transaction(async (session) => {
        await Customer.create(
          [{ name: 'First', email: 'first@example.com', phone: '1' }],
          session ? { session } : {}
        );
        await Customer.create(
          [{ name: 'Second', email: 'second@example.com', phone: '2' }],
          session ? { session } : {}
        );
        throw new Error('failure after both writes');
      })
    ).rejects.toThrow('failure after both writes');

    // Without a transaction the first two documents would survive.
    expect(await Customer.countDocuments()).toBe(0);
  });

  it('surfaces a cast failure as a rollback rather than a partial write', async () => {
    await expect(
      with_transaction(async (session) => {
        await Customer.create(
          [{ name: 'Valid', email: 'valid@example.com', phone: '1' }],
          session ? { session } : {}
        );
        await Customer.create(
          [{ name: 'Invalid', email: 'invalid@example.com', phone: '2', assigned_rep_id: 'nope' }],
          session ? { session } : {}
        );
      })
    ).rejects.toThrow();

    expect(await Customer.countDocuments()).toBe(0);
  });
});

describe('lead conversion atomicity', () => {
  it('leaves no orphaned customer when the lead update fails', async () => {
    // Mirrors the shape of the conversion in LeadService: create a Customer,
    // then update the Lead. A failure between the two used to leave the
    // Customer behind permanently.
    await expect(
      with_transaction(async (session) => {
        await Customer.create(
          [{ name: 'Orphan', email: 'orphan@example.com', phone: '1' }],
          session ? { session } : {}
        );
        throw new Error('lead update failed');
      })
    ).rejects.toThrow();

    expect(await Customer.findOne({ email: 'orphan@example.com' })).toBeNull();
    expect(Types.ObjectId.isValid(new Types.ObjectId().toString())).toBe(true);
  });
});
