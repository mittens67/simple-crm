import mongoose, { ClientSession } from 'mongoose';

/**
 * Runs `work` inside a MongoDB transaction when the deployment supports one.
 *
 * Transactions require a replica set or mongos. A plain local `mongod` is
 * standalone and rejects them, so wrapping every write unconditionally would
 * break ordinary development. Support is probed once and cached; when it is
 * unavailable the work still runs, just without atomicity.
 *
 * Used only where a partial write is actually harmful — currently the
 * lead-to-customer conversion, which creates a Customer and updates the Lead
 * and previously could leave an orphaned Customer behind if it failed between
 * the two.
 */
let transaction_support: boolean | null = null;

export const supports_transactions = async (): Promise<boolean> => {
  if (transaction_support !== null) return transaction_support;
  try {
    const admin = mongoose.connection.db?.admin();
    const info = await admin?.command({ hello: 1 });
    // `setName` indicates a replica set; `msg: 'isdbgrid'` indicates mongos.
    transaction_support = Boolean(info?.setName || info?.msg === 'isdbgrid');
  } catch {
    transaction_support = false;
  }
  if (!transaction_support) {
    console.warn(
      'MongoDB deployment does not support transactions (standalone). ' +
        'Multi-document writes will not be atomic.'
    );
  }
  return transaction_support;
};

/** Exposed for tests that need to re-probe after switching deployments. */
export const reset_transaction_support = () => {
  transaction_support = null;
};

export const with_transaction = async <T>(
  work: (session: ClientSession | undefined) => Promise<T>
): Promise<T> => {
  if (!(await supports_transactions())) {
    return work(undefined);
  }

  const session = await mongoose.startSession();
  try {
    let result: T;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result!;
  } finally {
    await session.endSession();
  }
};
