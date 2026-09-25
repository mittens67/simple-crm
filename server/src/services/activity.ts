import { Types } from 'mongoose';
import Lead from '../models/lead';
import Customer from '../models/customer';
import Deal from '../models/deal';
import SupportTicket from '../models/support-ticket';
import Activity, { IActivity, ActivityTarget } from '../models/activity';
import { activity_repository } from '../repositories/pipeline';
import { ApolloContext } from '../graphql/context';
import { require_permission, can } from '../auth/authorize';
import { create_activity_schema, update_activity_schema } from '../schemas/pipeline';
import { Page } from '../core/base-repository';
import { assert_exists, assert_found, audit, parse_or_throw, pick_fields } from '../core/service-helpers';
import { ForbiddenError } from '../utils/errors';

/** Maps a target type onto the model that owns it, for existence checks. */
const TARGET_MODELS = {
  Lead,
  Customer,
  Deal,
  SupportTicket,
} as const;

const UPDATABLE_FIELDS = ['type', 'subject', 'body', 'due_at'] as const;

/**
 * Activities inherit the permissions of whatever they are attached to: if you
 * can read the lead, you can read its timeline. That avoids inventing a
 * parallel permission surface that could disagree with the record's own.
 */
const PERMISSION_BY_TARGET: Record<ActivityTarget, 'leads' | 'customers' | 'deals' | 'support_tickets'> =
  {
    Lead: 'leads',
    Customer: 'customers',
    Deal: 'deals',
    SupportTicket: 'support_tickets',
  };

export class ActivityService {
  private require_target_access(
    context: ApolloContext,
    target_type: ActivityTarget,
    action: 'read' | 'create' | 'update' | 'delete'
  ) {
    const resource = PERMISSION_BY_TARGET[target_type];
    return require_permission(context, `${resource}.${action}`);
  }

  async list_for_target(
    context: ApolloContext,
    args: { target_type: ActivityTarget; target_id: string; limit?: number; offset?: number }
  ): Promise<Page<IActivity>> {
    this.require_target_access(context, args.target_type, 'read');

    return activity_repository.find_page({
      limit: args.limit,
      offset: args.offset,
      filter: {
        target_type: args.target_type,
        target_id: new Types.ObjectId(args.target_id),
      },
    });
  }

  async list_tasks(
    context: ApolloContext,
    args: { owner_id?: string; include_completed?: boolean; limit?: number; offset?: number }
  ): Promise<Page<IActivity>> {
    const actor = require_permission(context, 'leads.read');

    // Viewing someone else's task list requires the wider read scope.
    const requested_owner = args.owner_id ?? String(actor._id);
    if (requested_owner !== String(actor._id) && !can(context, 'leads.read.all')) {
      throw new ForbiddenError("Missing permission to view another user's tasks");
    }

    return activity_repository.find_page({
      limit: args.limit,
      offset: args.offset,
      // Tasks are activities with a due date; everything else is history.
      sort: { due_at: 1 },
      filter: {
        type: 'Task',
        owner_id: new Types.ObjectId(requested_owner),
        ...(args.include_completed ? {} : { completed_at: null }),
      },
    });
  }

  async get(context: ApolloContext, id: string): Promise<IActivity> {
    const activity = assert_found(await activity_repository.find_by_id(id), 'Activity');
    this.require_target_access(context, activity.target_type, 'read');
    return activity;
  }

  async create(context: ApolloContext, input: unknown): Promise<IActivity> {
    const data = parse_or_throw(create_activity_schema, input);
    const actor = this.require_target_access(context, data.target_type, 'update');

    // The record being logged against must exist, or the timeline points at
    // nothing.
    await assert_exists(TARGET_MODELS[data.target_type], data.target_id, data.target_type);

    const activity = await activity_repository.create({
      type: data.type,
      subject: data.subject,
      body: data.body,
      target_type: data.target_type,
      target_id: new Types.ObjectId(data.target_id),
      // Always the acting user — never client-supplied.
      owner_id: actor._id as Types.ObjectId,
      ...(data.due_at && { due_at: new Date(data.due_at) }),
    });

    await audit(actor, `${data.type} logged`, {
      activity_id: String(activity._id),
      target_type: data.target_type,
      target_id: data.target_id,
    });
    return activity;
  }

  async update(context: ApolloContext, id: string, input: unknown): Promise<IActivity> {
    const data = parse_or_throw(update_activity_schema, input);
    const activity = assert_found(await activity_repository.find_by_id(id), 'Activity');
    const actor = this.require_target_access(context, activity.target_type, 'update');

    this.assert_can_modify(context, activity, actor._id as Types.ObjectId);

    const changes = pick_fields(data, UPDATABLE_FIELDS) as Record<string, unknown>;
    if ('due_at' in data) {
      changes.due_at = data.due_at ? new Date(data.due_at) : null;
    }

    const updated = assert_found(await activity_repository.update(id, changes), 'Activity');
    return updated;
  }

  async set_completed(context: ApolloContext, id: string, completed: boolean): Promise<IActivity> {
    const activity = assert_found(await activity_repository.find_by_id(id), 'Activity');
    const actor = this.require_target_access(context, activity.target_type, 'update');
    this.assert_can_modify(context, activity, actor._id as Types.ObjectId);

    return assert_found(
      await activity_repository.update(id, { completed_at: completed ? new Date() : null }),
      'Activity'
    );
  }

  async remove(context: ApolloContext, id: string): Promise<boolean> {
    const activity = assert_found(await activity_repository.find_by_id(id), 'Activity');
    const actor = this.require_target_access(context, activity.target_type, 'delete');
    this.assert_can_modify(context, activity, actor._id as Types.ObjectId);

    const deleted = await activity_repository.delete(id);
    await audit(actor, 'Activity deleted', { activity_id: id });
    return deleted;
  }

  /**
   * An activity is an attributable record of what someone did, so only its
   * author may rewrite it unless the caller holds the wider scope.
   */
  private assert_can_modify(
    context: ApolloContext,
    activity: IActivity,
    actor_id: Types.ObjectId
  ) {
    if (String(activity.owner_id) === String(actor_id)) return;
    const resource = PERMISSION_BY_TARGET[activity.target_type];
    if (!can(context, `${resource}.update.all`)) {
      throw new ForbiddenError("Missing permission to modify another user's activity");
    }
  }
}

export const activity_service = new ActivityService();

/** Exposed for the Activity.is_overdue field resolver. */
export const is_overdue = (activity: IActivity, now = new Date()): boolean =>
  Boolean(activity.due_at && !activity.completed_at && activity.due_at < now);

export { Activity };
