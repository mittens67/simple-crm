import { Model, Types } from 'mongoose';
import { ZodType } from 'zod';
import AuditLog from '../models/audit-log';
import { IUser } from '../models/user';
import { BadUserInputError, NotFoundError, ValidationError } from '../utils/errors';

/**
 * Small composable helpers rather than a BaseService class.
 *
 * Each entity's business logic is genuinely different — leads auto-assign a
 * status when a rep is attached and spawn a Customer on conversion; deals do
 * neither. Forcing that into inherited before/after hooks makes the reading
 * order stop matching the execution order. These helpers remove the
 * duplication that is actually duplicated, and services compose them
 * explicitly, top to bottom.
 */

/** Parses input through a zod schema, or throws a ValidationError. */
export const parse_or_throw = <T>(schema: ZodType<T>, input: unknown): T => {
  const result = schema.safeParse(input);
  if (!result.success) {
    const message = result.error.issues.map((issue) => issue.message).join(', ');
    throw new ValidationError(message, {
      issues: result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }
  return result.data;
};

/**
 * Asserts a referenced document exists. Replaces the eight copy-pasted
 * "find the referenced entity, throw BAD_USER_INPUT if missing" blocks.
 */
export const assert_exists = async (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- accepts any model
  model: Model<any>,
  id: string | Types.ObjectId | null | undefined,
  label: string
): Promise<void> => {
  if (!id) return;
  if (!Types.ObjectId.isValid(String(id))) {
    throw new BadUserInputError(`${label} is not a valid id`);
  }
  const found = await model.exists({ _id: id });
  if (!found) {
    throw new BadUserInputError(`${label} not found`);
  }
};

/** Throws NotFoundError when a lookup came back empty. Narrows the type. */
export const assert_found = <T>(value: T | null | undefined, label: string): T => {
  if (value === null || value === undefined) {
    throw new NotFoundError(`${label} not found`);
  }
  return value;
};

/**
 * Restricts an update to fields the caller is allowed to set.
 *
 * Replaces `Object.assign(deal, input)` and the `{ ...input }` spreads that
 * passed client input straight into the document, bounded only by whatever the
 * GraphQL input type happened to declare.
 */
export const pick_fields = <T extends object, K extends keyof T>(
  input: T,
  allowed: readonly K[]
): Partial<Pick<T, K>> => {
  const result: Partial<Pick<T, K>> = {};
  for (const key of allowed) {
    if (key in input && input[key] !== undefined) {
      result[key] = input[key];
    }
  }
  return result;
};

/**
 * Records an audit entry. Deliberately non-throwing: an audit write failing
 * should not roll back the business operation that succeeded.
 */
export const audit = async (
  actor: IUser,
  action: string,
  metadata: Record<string, unknown> = {}
): Promise<void> => {
  try {
    await AuditLog.create({ user_id: actor._id, action, metadata });
  } catch (error) {
    console.error('Failed to write audit log:', action, error);
  }
};
