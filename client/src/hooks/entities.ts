import {
  LEADS_QUERY,
  CREATE_LEAD_MUTATION,
  UPDATE_LEAD_MUTATION,
  DELETE_LEAD_MUTATION,
  CUSTOMERS_QUERY,
  CREATE_CUSTOMER_MUTATION,
  UPDATE_CUSTOMER_MUTATION,
  DELETE_CUSTOMER_MUTATION,
  DEALS_QUERY,
  CREATE_DEAL_MUTATION,
  UPDATE_DEAL_MUTATION,
  DELETE_DEAL_MUTATION,
  SUPPORT_TICKETS_QUERY,
  CREATE_SUPPORT_TICKET_MUTATION,
  UPDATE_SUPPORT_TICKET_MUTATION,
  DELETE_SUPPORT_TICKET_MUTATION,
  USERS_QUERY,
} from '../lib/graphql-queries';
import { useEntityCrud } from './use-entity-crud';
import type { Lead, LeadInput } from '../types/lead';
import type { Customer, CustomerInput } from '../types/customer';
import type { Deal, DealInput } from '../types/deal';
import type { SupportTicket, SupportTicketInput } from '../types/support-ticket';
import type { User } from '../types/common';

// Each entity is now a few lines of configuration over the shared CRUD hook.

export const useLeads = () =>
  useEntityCrud<Lead, LeadInput>({
    list_field: 'leads',
    create_field: 'createLead',
    update_field: 'updateLead',
    remove_field: 'deleteLead',
    documents: {
      list: LEADS_QUERY,
      create: CREATE_LEAD_MUTATION,
      update: UPDATE_LEAD_MUTATION,
      remove: DELETE_LEAD_MUTATION,
    },
  });

export const useCustomers = () =>
  useEntityCrud<Customer, CustomerInput>({
    list_field: 'customers',
    create_field: 'createCustomer',
    update_field: 'updateCustomer',
    remove_field: 'deleteCustomer',
    documents: {
      list: CUSTOMERS_QUERY,
      create: CREATE_CUSTOMER_MUTATION,
      update: UPDATE_CUSTOMER_MUTATION,
      remove: DELETE_CUSTOMER_MUTATION,
    },
  });

export const useDeals = () =>
  useEntityCrud<Deal, DealInput>({
    list_field: 'deals',
    create_field: 'createDeal',
    update_field: 'updateDeal',
    remove_field: 'deleteDeal',
    documents: {
      list: DEALS_QUERY,
      create: CREATE_DEAL_MUTATION,
      update: UPDATE_DEAL_MUTATION,
      remove: DELETE_DEAL_MUTATION,
    },
  });

export const useSupportTickets = () =>
  useEntityCrud<SupportTicket, SupportTicketInput>({
    list_field: 'supportTickets',
    create_field: 'createSupportTicket',
    update_field: 'updateSupportTicket',
    remove_field: 'deleteSupportTicket',
    documents: {
      list: SUPPORT_TICKETS_QUERY,
      create: CREATE_SUPPORT_TICKET_MUTATION,
      update: UPDATE_SUPPORT_TICKET_MUTATION,
      remove: DELETE_SUPPORT_TICKET_MUTATION,
    },
  });

/** Read-only: users populate assignment dropdowns. */
export const useUsers = () =>
  useEntityCrud<User, never>({
    list_field: 'users',
    documents: { list: USERS_QUERY },
  });
