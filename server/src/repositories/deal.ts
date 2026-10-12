import Deal, { IDeal } from '../models/deal';
import { BaseRepository } from '../core/base-repository';

export class DealRepository extends BaseRepository<IDeal> {
  constructor() {
    super(Deal, ['title', 'stage']);
  }
}

export const deal_repository = new DealRepository();
