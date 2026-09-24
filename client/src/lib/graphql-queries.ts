import { gql } from '@apollo/client';

// The authoritative user selection set lives in lib/auth.ts, which is where
// login and refresh consume it.
//
// Each entity's fields are declared once as a fragment and reused by its query
// and mutations. Previously the same selection set was written out three or
// four times per entity, so adding a field meant editing every copy.

const PARTY_FIELDS = gql`
  fragment PartyFields on User {
    id
    name
    email
  }
`;

// --- Leads -----------------------------------------------------------------

export const LEAD_FIELDS = gql`
  fragment LeadFields on Lead {
    id
    name
    email
    phone
    status
    assigned_rep {
      ...PartyFields
    }
    customer {
      id
      name
    }
    sales_notes
    archive_notes
    created_at
    updated_at
  }
  ${PARTY_FIELDS}
`;

export const LEADS_QUERY = gql`
  query GetLeads($search: String, $limit: Int, $offset: Int) {
    leads(search: $search, limit: $limit, offset: $offset) {
      items {
        ...LeadFields
      }
      total
      has_more
    }
  }
  ${LEAD_FIELDS}
`;

export const CREATE_LEAD_MUTATION = gql`
  mutation CreateLead($input: CreateLead!) {
    createLead(input: $input) {
      ...LeadFields
    }
  }
  ${LEAD_FIELDS}
`;

export const UPDATE_LEAD_MUTATION = gql`
  mutation UpdateLead($id: ID!, $input: UpdateLead!) {
    updateLead(id: $id, input: $input) {
      ...LeadFields
    }
  }
  ${LEAD_FIELDS}
`;

export const DELETE_LEAD_MUTATION = gql`
  mutation DeleteLead($id: ID!) {
    deleteLead(id: $id) {
      ...LeadFields
    }
  }
  ${LEAD_FIELDS}
`;

// --- Customers -------------------------------------------------------------

export const CUSTOMER_FIELDS = gql`
  fragment CustomerFields on Customer {
    id
    name
    email
    phone
    assigned_rep {
      ...PartyFields
    }
    created_at
    updated_at
  }
  ${PARTY_FIELDS}
`;

export const CUSTOMERS_QUERY = gql`
  query GetCustomers($search: String, $limit: Int, $offset: Int) {
    customers(search: $search, limit: $limit, offset: $offset) {
      items {
        ...CustomerFields
      }
      total
      has_more
    }
  }
  ${CUSTOMER_FIELDS}
`;

export const CREATE_CUSTOMER_MUTATION = gql`
  mutation CreateCustomer($input: CreateCustomerInput!) {
    createCustomer(input: $input) {
      ...CustomerFields
    }
  }
  ${CUSTOMER_FIELDS}
`;

export const UPDATE_CUSTOMER_MUTATION = gql`
  mutation UpdateCustomer($id: ID!, $input: UpdateCustomerInput!) {
    updateCustomer(id: $id, input: $input) {
      ...CustomerFields
    }
  }
  ${CUSTOMER_FIELDS}
`;

export const DELETE_CUSTOMER_MUTATION = gql`
  mutation DeleteCustomer($id: ID!) {
    deleteCustomer(id: $id)
  }
`;

// --- Deals -----------------------------------------------------------------

export const DEAL_FIELDS = gql`
  fragment DealFields on Deal {
    id
    title
    customer {
      id
      name
      email
    }
    owner {
      ...PartyFields
    }
    value
    status
    stage
    created_at
    updated_at
  }
  ${PARTY_FIELDS}
`;

export const DEALS_QUERY = gql`
  query GetDeals($search: String, $limit: Int, $offset: Int) {
    deals(search: $search, limit: $limit, offset: $offset) {
      items {
        ...DealFields
      }
      total
      has_more
    }
  }
  ${DEAL_FIELDS}
`;

export const CREATE_DEAL_MUTATION = gql`
  mutation CreateDeal($input: CreateDealInput!) {
    createDeal(input: $input) {
      ...DealFields
    }
  }
  ${DEAL_FIELDS}
`;

export const UPDATE_DEAL_MUTATION = gql`
  mutation UpdateDeal($id: ID!, $input: UpdateDealInput!) {
    updateDeal(id: $id, input: $input) {
      ...DealFields
    }
  }
  ${DEAL_FIELDS}
`;

export const DELETE_DEAL_MUTATION = gql`
  mutation DeleteDeal($id: ID!) {
    deleteDeal(id: $id)
  }
`;

// --- Support tickets -------------------------------------------------------

export const SUPPORT_TICKET_FIELDS = gql`
  fragment SupportTicketFields on SupportTicket {
    id
    customer {
      id
      name
      email
    }
    assigned_agent {
      ...PartyFields
    }
    status
    issue_summary
    internal_notes
    created_at
    updated_at
  }
  ${PARTY_FIELDS}
`;

export const SUPPORT_TICKETS_QUERY = gql`
  query GetSupportTickets($search: String, $limit: Int, $offset: Int) {
    supportTickets(search: $search, limit: $limit, offset: $offset) {
      items {
        ...SupportTicketFields
      }
      total
      has_more
    }
  }
  ${SUPPORT_TICKET_FIELDS}
`;

export const CREATE_SUPPORT_TICKET_MUTATION = gql`
  mutation CreateSupportTicket($input: CreateSupportTicketInput!) {
    createSupportTicket(input: $input) {
      ...SupportTicketFields
    }
  }
  ${SUPPORT_TICKET_FIELDS}
`;

export const UPDATE_SUPPORT_TICKET_MUTATION = gql`
  mutation UpdateSupportTicket($id: ID!, $input: UpdateSupportTicketInput!) {
    updateSupportTicket(id: $id, input: $input) {
      ...SupportTicketFields
    }
  }
  ${SUPPORT_TICKET_FIELDS}
`;

export const DELETE_SUPPORT_TICKET_MUTATION = gql`
  mutation DeleteSupportTicket($id: ID!) {
    deleteSupportTicket(id: $id)
  }
`;

// --- Users -----------------------------------------------------------------

export const USERS_QUERY = gql`
  query GetUsers {
    users {
      ...PartyFields
    }
  }
  ${PARTY_FIELDS}
`;

// --- Theme -----------------------------------------------------------------

export const UPDATE_THEME_MUTATION = gql`
  mutation UpdateTheme($theme: String!) {
    updateTheme(theme: $theme) {
      id
      name
      email
      theme_preference
    }
  }
`;
