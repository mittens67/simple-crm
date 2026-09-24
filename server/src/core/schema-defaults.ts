import { Schema } from 'mongoose';

/**
 * The timestamp configuration was copy-pasted verbatim into all nine schemas.
 * It lives here once now.
 *
 * Deliberately untyped: Mongoose's SchemaOptions is generic over the document
 * type, so annotating these as SchemaOptions would pin them to one document
 * and make them unusable everywhere else.
 */
export const BASE_SCHEMA_OPTIONS = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
} as const;

/** For append-only collections (audit entries, notes) that have no updated_at. */
export const APPEND_ONLY_SCHEMA_OPTIONS = {
  timestamps: { createdAt: 'created_at', updatedAt: false },
} as const;

/**
 * Adds the indexes every list query in this app depends on.
 *
 * Before this, RefreshToken was the only collection with a deliberate index —
 * so every lead search ran a three-field case-insensitive regex as a full
 * collection scan, and every ownership-scoped query scanned on an unindexed
 * foreign key.
 */
export const add_indexes = (
  schema: Schema,
  { owner_fields = [], searchable = [], unique = [] }: {
    owner_fields?: string[];
    searchable?: string[];
    unique?: string[];
  }
) => {
  // Lists are sorted newest-first, and scoped by owner.
  schema.index({ created_at: -1 });
  for (const field of owner_fields) {
    schema.index({ [field]: 1, created_at: -1 });
  }
  for (const field of searchable) {
    schema.index({ [field]: 1 });
  }
  for (const field of unique) {
    schema.index({ [field]: 1 }, { unique: true });
  }
};
