import SupportTicket, { ISupportTicket } from '../models/support-ticket';
import SupportNote, { ISupportNote } from '../models/support-note';
import { BaseRepository } from '../core/base-repository';

export class SupportTicketRepository extends BaseRepository<ISupportTicket> {
  constructor() {
    super(SupportTicket, ['issue_summary']);
  }
}

export class SupportNoteRepository extends BaseRepository<ISupportNote> {
  constructor() {
    super(SupportNote, ['content']);
  }
}

export const support_ticket_repository = new SupportTicketRepository();
export const support_note_repository = new SupportNoteRepository();
