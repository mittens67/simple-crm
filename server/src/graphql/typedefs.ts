import { mergeTypeDefs } from '@graphql-tools/merge';
import user from './schemas/user';
import role from './schemas/role';
import lead from './schemas/lead';
import customer from './schemas/customer';
import deal from './schemas/deal';
import supportTicket from './schemas/support-ticket';
import supportNote from './schemas/support-note';
import auditLog from './schemas/audit-log';
import pipeline from './schemas/pipeline';
import activity from './schemas/activity';
import analytics from './schemas/analytics';
import ai from './schemas/ai';

export const typeDefs = mergeTypeDefs([
  user,
  role,
  lead,
  customer,
  deal,
  supportTicket,
  supportNote,
  auditLog,
  pipeline,
  activity,
  analytics,
  ai,
]);
