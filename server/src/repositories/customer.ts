import Customer, { ICustomer } from '../models/customer';
import { BaseRepository } from '../core/base-repository';

export class CustomerRepository extends BaseRepository<ICustomer> {
  constructor() {
    super(Customer, ['name', 'email', 'phone']);
  }
}

export const customer_repository = new CustomerRepository();
