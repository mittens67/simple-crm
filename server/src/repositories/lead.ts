import Lead, { ILead } from '../models/lead';
import { BaseRepository } from '../core/base-repository';

/**
 * Leads are searched by name, email and phone. Everything else this class used
 * to do — manual $or construction, countDocuments, limit/skip, plus a dead
 * findAll() and a delete() that actually performed a read — is either shared
 * behaviour in BaseRepository or gone.
 */
export class LeadRepository extends BaseRepository<ILead> {
  constructor() {
    super(Lead, ['name', 'email', 'phone']);
  }
}

export const lead_repository = new LeadRepository();
