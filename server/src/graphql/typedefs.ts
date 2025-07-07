import { mergeTypeDefs } from '@graphql-tools/merge';
import user from './schemas/user';
import role from './schemas/role';
import lead from './schemas/lead';
import customer from './schemas/customer';
import deal from './schemas/deal';
import supportTicket from './schemas/support-ticket';
import supportNote from './schemas/support-note';

export const typeDefs = mergeTypeDefs([user, role, lead, customer, deal, supportTicket, supportNote]);
