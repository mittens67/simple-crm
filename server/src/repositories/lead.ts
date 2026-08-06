import Lead, { ILead } from '../models/lead';
import { Types } from 'mongoose';

export class LeadRepository {
  async findAll() {
    return await Lead.find().populate('assigned_rep_id');
  }

  async findAllWithPagination(search?: string, limit: number = 20, offset: number = 0) {
    const query: any = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const [data, total] = await Promise.all([
      Lead.find(query).populate('assigned_rep_id').limit(limit).skip(offset).sort({ created_at: -1 }),
      Lead.countDocuments(query),
    ]);

    return { data, total };
  }

  async findById(id: string) {
    return await Lead.findById(id).populate('assigned_rep_id');
  }

  async create(data: {
    name: string;
    email: string;
    phone: string;
    status?: string;
    assigned_rep_id?: string;
  }): Promise<ILead> {
    const lead = new Lead({
      name: data.name,
      email: data.email,
      phone: data.phone,
      status: data.status || 'Open',
      ...(data.assigned_rep_id && { assigned_rep_id: new Types.ObjectId(data.assigned_rep_id) }),
    });
    return await lead.save();
  }

  async update(id: string, data: Partial<ILead>): Promise<ILead | null> {
    return await Lead.findByIdAndUpdate(id, data, { new: true }).populate('assigned_rep_id');
  }

  async delete(id: string): Promise<ILead | null> {
    return await Lead.findById(id);
  }
}

export const lead_repository = new LeadRepository();
