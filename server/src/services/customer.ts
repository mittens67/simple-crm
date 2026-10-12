import { Types } from 'mongoose';
import User from '../models/user';
import { ICustomer } from '../models/customer';
import { customer_repository } from '../repositories/customer';
import { ApolloContext } from '../graphql/context';
import { require_permission } from '../auth/authorize';
import { create_customer_schema, update_customer_schema } from '../schemas/customer';
import { Page } from '../core/base-repository';
import { scope_filter_for } from '../core/scoping';
import { assert_exists, assert_found, audit, parse_or_throw, pick_fields } from '../core/service-helpers';

const UPDATABLE_FIELDS = ['name', 'email', 'phone', 'assigned_rep_id'] as const;

export class CustomerService {
  private scope(context: ApolloContext, action: 'read' | 'update' | 'delete' = 'read') {
    return scope_filter_for(context, 'customers', 'assigned_rep_id', action);
  }

  async list(
    context: ApolloContext,
    args: { search?: string; limit?: number; offset?: number }
  ): Promise<Page<ICustomer>> {
    require_permission(context, 'customers.read');
    return customer_repository.find_page({ ...args, filter: this.scope(context) });
  }

  async get(context: ApolloContext, id: string): Promise<ICustomer> {
    require_permission(context, 'customers.read');
    return assert_found(await customer_repository.find_by_id(id, this.scope(context)), 'Customer');
  }

  async create(context: ApolloContext, input: unknown): Promise<ICustomer> {
    const actor = require_permission(context, 'customers.create');
    const data = parse_or_throw(create_customer_schema, input);

    await assert_exists(User, data.assigned_rep_id, 'Assigned representative');

    const { assigned_rep_id, ...rest } = data;
    const customer = await customer_repository.create({
      ...rest,
      ...(assigned_rep_id && { assigned_rep_id: new Types.ObjectId(assigned_rep_id) }),
    });

    await audit(actor, 'Customer created', { customer_id: String(customer._id) });
    return customer;
  }

  async update(context: ApolloContext, id: string, input: unknown): Promise<ICustomer> {
    const actor = require_permission(context, 'customers.update');
    const data = parse_or_throw(update_customer_schema, input);

    assert_found(
      await customer_repository.find_by_id(id, this.scope(context, 'update')),
      'Customer'
    );
    await assert_exists(User, data.assigned_rep_id, 'Assigned representative');

    const updated = assert_found(
      await customer_repository.update(id, pick_fields(data, UPDATABLE_FIELDS)),
      'Customer'
    );

    await audit(actor, 'Customer updated', { customer_id: String(updated._id) });
    return updated;
  }

  async remove(context: ApolloContext, id: string): Promise<boolean> {
    const actor = require_permission(context, 'customers.delete');

    assert_found(
      await customer_repository.find_by_id(id, this.scope(context, 'delete')),
      'Customer'
    );
    const deleted = await customer_repository.delete(id);

    await audit(actor, 'Customer deleted', { customer_id: id });
    return deleted;
  }
}

export const customer_service = new CustomerService();
