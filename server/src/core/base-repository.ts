import { FilterQuery, Model, Types, UpdateQuery } from 'mongoose';

export interface Page<T> {
  items: T[];
  total: number;
  has_more: boolean;
}

export interface FindPageOptions {
  search?: string;
  limit?: number;
  offset?: number;
  sort?: Record<string, 1 | -1>;
  /** Extra conditions, e.g. the ownership scope filter. */
  filter?: FilterQuery<unknown>;
}

/** Callers can ask for anything; the server decides what it is willing to serve. */
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const clamp_limit = (limit?: number): number => {
  if (!limit || limit < 1) return DEFAULT_PAGE_SIZE;
  return Math.min(Math.floor(limit), MAX_PAGE_SIZE);
};

const escape_regex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Shared Mongoose data access.
 *
 * Only the genuinely uniform parts live here — building a paginated,
 * searchable, scoped query, and the four id-based operations. Anything that
 * differs per entity stays in that entity's service, where it reads top to
 * bottom instead of being scattered across template-method hooks.
 */
export class BaseRepository<T> {
  constructor(
    protected readonly model: Model<T>,
    /** Fields a free-text search should match against. */
    protected readonly searchable_fields: string[] = []
  ) {}

  protected build_query(options: FindPageOptions): FilterQuery<T> {
    const conditions: FilterQuery<T>[] = [];

    if (options.filter && Object.keys(options.filter).length > 0) {
      conditions.push(options.filter as FilterQuery<T>);
    }

    const search = options.search?.trim();
    if (search && this.searchable_fields.length > 0) {
      // The input is escaped so a user-supplied '(' cannot throw, and so a
      // pathological pattern cannot be used to burn CPU.
      const pattern = new RegExp(escape_regex(search), 'i');
      conditions.push({
        $or: this.searchable_fields.map((field) => ({ [field]: pattern })),
      } as FilterQuery<T>);
    }

    if (conditions.length === 0) return {};
    return conditions.length === 1 ? conditions[0] : ({ $and: conditions } as FilterQuery<T>);
  }

  async find_page(options: FindPageOptions = {}): Promise<Page<T>> {
    const limit = clamp_limit(options.limit);
    const offset = Math.max(0, options.offset ?? 0);
    const query = this.build_query(options);

    const [items, total] = await Promise.all([
      this.model
        .find(query)
        .sort(options.sort ?? { created_at: -1 })
        .skip(offset)
        .limit(limit),
      this.model.countDocuments(query),
    ]);

    return { items, total, has_more: offset + items.length < total };
  }

  async find_all(filter: FilterQuery<T> = {}): Promise<T[]> {
    return this.model.find(filter).sort({ created_at: -1 });
  }

  async find_by_id(id: string, filter: FilterQuery<T> = {}): Promise<T | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.model.findOne({ _id: id, ...filter } as FilterQuery<T>);
  }

  async exists(id: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) return false;
    return (await this.model.exists({ _id: id } as FilterQuery<T>)) !== null;
  }

  async create(data: Partial<T>): Promise<T> {
    return this.model.create(data);
  }

  async update(id: string, data: UpdateQuery<T>): Promise<T | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.model.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  async delete(id: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) return false;
    const result = await this.model.findByIdAndDelete(id);
    return result !== null;
  }

  async count(filter: FilterQuery<T> = {}): Promise<number> {
    return this.model.countDocuments(filter);
  }
}
