import { gql } from '@apollo/client';

export const USER_FIELDS = `
  id
  name
  email
  role {
    id
    name
    permissions
  }
`;

// Leads
export const LEADS_QUERY = gql`
  query GetLeads {
    leads {
      id
      name
      email
      phone
      status
      assigned_rep {
        id
        name
        email
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
  }
`;

export const LEAD_QUERY = gql`
  query GetLead($id: ID!) {
    lead(id: $id) {
      id
      name
      email
      phone
      status
      assigned_rep {
        id
        name
        email
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
  }
`;

export const CREATE_LEAD_MUTATION = gql`
  mutation CreateLead($input: CreateLead!) {
    createLead(input: $input) {
      id
      name
      email
      phone
      status
      assigned_rep {
        id
        name
        email
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
  }
`;

export const UPDATE_LEAD_MUTATION = gql`
  mutation UpdateLead($id: ID!, $input: UpdateLead!) {
    updateLead(id: $id, input: $input) {
      id
      name
      email
      phone
      status
      assigned_rep {
        id
        name
        email
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
  }
`;

export const DELETE_LEAD_MUTATION = gql`
  mutation DeleteLead($id: ID!) {
    deleteLead(id: $id) {
      id
    }
  }
`;

// Customers
export const CUSTOMERS_QUERY = gql`
  query GetCustomers {
    customers {
      id
      name
      email
      phone
      assigned_rep {
        id
        name
        email
      }
      created_at
      updated_at
    }
  }
`;

export const CUSTOMER_QUERY = gql`
  query GetCustomer($id: ID!) {
    customer(id: $id) {
      id
      name
      email
      phone
      assigned_rep {
        id
        name
        email
      }
      created_at
      updated_at
    }
  }
`;

export const CREATE_CUSTOMER_MUTATION = gql`
  mutation CreateCustomer($input: CreateCustomerInput!) {
    createCustomer(input: $input) {
      id
      name
      email
      phone
      assigned_rep {
        id
        name
        email
      }
      created_at
      updated_at
    }
  }
`;

export const UPDATE_CUSTOMER_MUTATION = gql`
  mutation UpdateCustomer($id: ID!, $input: UpdateCustomerInput!) {
    updateCustomer(id: $id, input: $input) {
      id
      name
      email
      phone
      assigned_rep {
        id
        name
        email
      }
      created_at
      updated_at
    }
  }
`;

export const DELETE_CUSTOMER_MUTATION = gql`
  mutation DeleteCustomer($id: ID!) {
    deleteCustomer(id: $id)
  }
`;

// Deals
export const DEALS_QUERY = gql`
  query GetDeals {
    deals {
      id
      title
      customer {
        id
        name
        email
      }
      owner {
        id
        name
        email
      }
      value
      status
      stage
      created_at
      updated_at
    }
  }
`;

export const DEAL_QUERY = gql`
  query GetDeal($id: ID!) {
    deal(id: $id) {
      id
      title
      customer {
        id
        name
        email
      }
      owner {
        id
        name
        email
      }
      value
      status
      stage
      created_at
      updated_at
    }
  }
`;

export const CREATE_DEAL_MUTATION = gql`
  mutation CreateDeal($input: CreateDealInput!) {
    createDeal(input: $input) {
      id
      title
      customer {
        id
        name
        email
      }
      owner {
        id
        name
        email
      }
      value
      status
      stage
      created_at
      updated_at
    }
  }
`;

export const UPDATE_DEAL_MUTATION = gql`
  mutation UpdateDeal($id: ID!, $input: UpdateDealInput!) {
    updateDeal(id: $id, input: $input) {
      id
      title
      customer {
        id
        name
        email
      }
      owner {
        id
        name
        email
      }
      value
      status
      stage
      created_at
      updated_at
    }
  }
`;

export const DELETE_DEAL_MUTATION = gql`
  mutation DeleteDeal($id: ID!) {
    deleteDeal(id: $id)
  }
`;

// Support Tickets
export const SUPPORT_TICKETS_QUERY = gql`
  query GetSupportTickets {
    supportTickets {
      id
      customer {
        id
        name
        email
      }
      assigned_agent {
        id
        name
        email
      }
      status
      issue_summary
      internal_notes
      created_at
      updated_at
    }
  }
`;

export const SUPPORT_TICKET_QUERY = gql`
  query GetSupportTicket($id: ID!) {
    supportTicket(id: $id) {
      id
      customer {
        id
        name
        email
      }
      assigned_agent {
        id
        name
        email
      }
      status
      issue_summary
      internal_notes
      created_at
      updated_at
    }
  }
`;

export const CREATE_SUPPORT_TICKET_MUTATION = gql`
  mutation CreateSupportTicket($input: CreateSupportTicketInput!) {
    createSupportTicket(input: $input) {
      id
      customer {
        id
        name
        email
      }
      assigned_agent {
        id
        name
        email
      }
      status
      issue_summary
      internal_notes
      created_at
      updated_at
    }
  }
`;

export const UPDATE_SUPPORT_TICKET_MUTATION = gql`
  mutation UpdateSupportTicket($id: ID!, $input: UpdateSupportTicketInput!) {
    updateSupportTicket(id: $id, input: $input) {
      id
      customer {
        id
        name
        email
      }
      assigned_agent {
        id
        name
        email
      }
      status
      issue_summary
      internal_notes
      created_at
      updated_at
    }
  }
`;

export const DELETE_SUPPORT_TICKET_MUTATION = gql`
  mutation DeleteSupportTicket($id: ID!) {
    deleteSupportTicket(id: $id)
  }
`;

// Users - for dropdowns
export const USERS_QUERY = gql`
  query GetUsers {
    users {
      id
      name
      email
    }
  }
`;
