import DataLoader from 'dataloader';
import { Model, Types } from 'mongoose';
import User, { IUser } from '../models/user';
import Customer, { ICustomer } from '../models/customer';
import Role, { IRole } from '../models/role';

/**
 * Per-request batching for relation fields.
 *
 * Previously a list query called `.populate()` *and* then re-fetched the same
 * document in a field resolver, so `deals` cost 1 + 2N queries. The populate
 * calls are gone; relations resolve here instead, batching every id referenced
 * during a single request into one `$in` query and caching the result.
 *
 * Loaders are built fresh per request (see graphql/context.ts). Sharing them
 * across requests would leak one user's data into another's response.
 */
const by_id = <T>(model: Model<T>) =>
  new DataLoader<string, T | null>(async (ids) => {
    const docs = await model.find({ _id: { $in: ids.map((id) => new Types.ObjectId(id)) } });
    const by_key = new Map(docs.map((doc) => [String(doc._id), doc]));
    // DataLoader requires results in the same order as the requested keys.
    return ids.map((id) => by_key.get(String(id)) ?? null);
  });

export interface Loaders {
  user: DataLoader<string, IUser | null>;
  customer: DataLoader<string, ICustomer | null>;
  role: DataLoader<string, IRole | null>;
}

export const create_loaders = (): Loaders => ({
  user: by_id<IUser>(User),
  customer: by_id<ICustomer>(Customer),
  role: by_id<IRole>(Role),
});

/**
 * Relation fields receive whatever is on the parent document: an ObjectId, or
 * an already-populated document if something upstream populated it. This
 * normalises both to a string key, and returns null for unset relations.
 */
export const load_by_ref = <T>(
  loader: DataLoader<string, T | null>,
  ref: unknown
): Promise<T | null> | null => {
  if (!ref) return null;
  const id =
    typeof ref === 'object' && ref !== null && '_id' in ref
      ? String((ref as { _id: unknown })._id)
      : String(ref);
  return loader.load(id);
};
