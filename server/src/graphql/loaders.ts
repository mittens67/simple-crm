import DataLoader from 'dataloader';
import { Model, Types } from 'mongoose';
import User, { IUser } from '../models/user';
import Customer, { ICustomer } from '../models/customer';
import Role, { IRole } from '../models/role';
import Lead, { ILead } from '../models/lead';
import Deal, { IDeal } from '../models/deal';
import SupportTicket, { ISupportTicket } from '../models/support-ticket';
import Pipeline, { IPipeline } from '../models/pipeline';

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
  lead: DataLoader<string, ILead | null>;
  deal: DataLoader<string, IDeal | null>;
  support_ticket: DataLoader<string, ISupportTicket | null>;
  pipeline: DataLoader<string, IPipeline | null>;
}

export const create_loaders = (): Loaders => ({
  user: by_id<IUser>(User),
  customer: by_id<ICustomer>(Customer),
  role: by_id<IRole>(Role),
  lead: by_id<ILead>(Lead),
  deal: by_id<IDeal>(Deal),
  support_ticket: by_id<ISupportTicket>(SupportTicket),
  pipeline: by_id<IPipeline>(Pipeline),
});

/**
 * Resolves an Activity's polymorphic target through the loader matching its
 * `target_type`, so a timeline mixing leads, deals and tickets still costs one
 * query per collection rather than one per row.
 */
export const load_activity_target = (
  loaders: Loaders,
  target_type: string,
  target_id: unknown
): Promise<unknown> | null => {
  // The union member differs per target_type, so the loaders are widened to a
  // common document type here; the GraphQL union's __resolveType decides which
  // member the result actually is.
  const by_type: Record<string, DataLoader<string, unknown>> = {
    Lead: loaders.lead as DataLoader<string, unknown>,
    Customer: loaders.customer as DataLoader<string, unknown>,
    Deal: loaders.deal as DataLoader<string, unknown>,
    SupportTicket: loaders.support_ticket as DataLoader<string, unknown>,
  };

  const loader = by_type[target_type];
  return loader ? load_by_ref(loader, target_id) : null;
};

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
