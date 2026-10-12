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
    ai_score
    ai_rationale
    ai_next_action
    ai_confidence
    ai_scored_at
    ai_provider
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
    pipeline {
      id
      name
    }
    stage {
      id
      name
      display_order
      probability
      outcome
    }
    stage_entered_at
    days_in_stage
    expected_close_date
    closed_at
    lost_reason
    weighted_value
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
    priority
    category
    sla_due_at
    first_response_at
    resolved_at
    is_sla_breached
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

// --- Pipelines -------------------------------------------------------------

export const STAGE_FIELDS = gql`
  fragment StageFields on Stage {
    id
    name
    display_order
    probability
    outcome
  }
`;

export const PIPELINES_QUERY = gql`
  query GetPipelines {
    pipelines {
      id
      name
      is_default
      stages {
        ...StageFields
      }
    }
  }
  ${STAGE_FIELDS}
`;

export const PIPELINE_BOARD_QUERY = gql`
  query GetPipelineBoard($pipeline_id: ID) {
    pipelineBoard(pipeline_id: $pipeline_id) {
      stage {
        ...StageFields
      }
      deal_count
      total_value
      deals {
        ...DealFields
      }
    }
  }
  ${STAGE_FIELDS}
  ${DEAL_FIELDS}
`;

export const MOVE_DEAL_TO_STAGE_MUTATION = gql`
  mutation MoveDealToStage($id: ID!, $stage_id: ID!) {
    moveDealToStage(id: $id, stage_id: $stage_id) {
      ...DealFields
    }
  }
  ${DEAL_FIELDS}
`;

// --- Activities ------------------------------------------------------------

export const ACTIVITY_FIELDS = gql`
  fragment ActivityFields on Activity {
    id
    type
    subject
    body
    target_type
    target_id
    due_at
    completed_at
    is_overdue
    created_at
    owner {
      ...PartyFields
    }
  }
  ${PARTY_FIELDS}
`;

export const ACTIVITIES_QUERY = gql`
  query GetActivities(
    $target_type: ActivityTargetType!
    $target_id: ID!
    $limit: Int
    $offset: Int
  ) {
    activities(
      target_type: $target_type
      target_id: $target_id
      limit: $limit
      offset: $offset
    ) {
      items {
        ...ActivityFields
      }
      total
      has_more
    }
  }
  ${ACTIVITY_FIELDS}
`;

export const TASKS_QUERY = gql`
  query GetTasks($include_completed: Boolean, $limit: Int, $offset: Int) {
    tasks(include_completed: $include_completed, limit: $limit, offset: $offset) {
      items {
        ...ActivityFields
      }
      total
      has_more
    }
  }
  ${ACTIVITY_FIELDS}
`;

export const CREATE_ACTIVITY_MUTATION = gql`
  mutation CreateActivity($input: CreateActivityInput!) {
    createActivity(input: $input) {
      ...ActivityFields
    }
  }
  ${ACTIVITY_FIELDS}
`;

export const COMPLETE_ACTIVITY_MUTATION = gql`
  mutation CompleteActivity($id: ID!) {
    completeActivity(id: $id) {
      ...ActivityFields
    }
  }
  ${ACTIVITY_FIELDS}
`;

export const REOPEN_ACTIVITY_MUTATION = gql`
  mutation ReopenActivity($id: ID!) {
    reopenActivity(id: $id) {
      ...ActivityFields
    }
  }
  ${ACTIVITY_FIELDS}
`;

export const DELETE_ACTIVITY_MUTATION = gql`
  mutation DeleteActivity($id: ID!) {
    deleteActivity(id: $id)
  }
`;

// --- Analytics -------------------------------------------------------------

/**
 * The dashboard spans four resources and no role holds all of them, so each
 * section is requested only when the caller's permissions allow it.
 *
 * Asking for everything and letting the unauthorized fields throw is what the
 * first version did: one `Missing permission` error failed the whole query, so
 * a support agent saw "Could not load reporting data" instead of their own
 * tickets, and a sales rep saw the same because of the SLA panel. `@include`
 * keeps this to one document and one round trip while never requesting a field
 * the server would refuse.
 *
 * `dashboardSummary` is always requested: its own fields come back null where
 * they are not permitted, and it carries the caller's overdue task count,
 * which needs no resource permission.
 */
export const DASHBOARD_QUERY = gql`
  query GetDashboard(
    $months: Int
    $can_leads: Boolean!
    $can_deals: Boolean!
    $can_tickets: Boolean!
  ) {
    dashboardSummary {
      total_leads
      total_customers
      open_deals
      open_deal_value
      weighted_pipeline_value
      won_value_this_month
      open_tickets
      overdue_tasks
    }
    pipelineFunnel @include(if: $can_deals) {
      stage_id
      stage_name
      display_order
      probability
      deal_count
      total_value
      weighted_value
      avg_days_in_stage
    }
    revenueOverTime(months: $months) @include(if: $can_deals) {
      period
      count
      value
    }
    leadFunnel @include(if: $can_leads) {
      status
      count
    }
    repPerformance @include(if: $can_deals) {
      user_id
      name
      open_deals
      won_deals
      lost_deals
      won_value
      win_rate
    }
    slaSummary @include(if: $can_tickets) {
      total
      breached
      compliance_rate
      avg_first_response_hours
    }
  }
`;

// --- AI --------------------------------------------------------------------

export const AI_STATUS_QUERY = gql`
  query GetAiStatus {
    aiStatus {
      provider
      is_live
      model
    }
  }
`;

export const AI_SEARCH_QUERY = gql`
  query AiSearch($question: String!, $limit: Int) {
    aiSearch(question: $question, limit: $limit) {
      plan {
        entity
        explanation
        filters
      }
      total
      has_more
      leads {
        id
        name
        email
        status
      }
      customers {
        id
        name
        email
      }
      deals {
        id
        title
        value
        status
        stage {
          id
          name
        }
      }
      supportTickets {
        id
        issue_summary
        status
        priority
        is_sla_breached
      }
    }
  }
`;

export const AI_SUMMARY_QUERY = gql`
  query AiSummary($target_type: AiTargetType!, $target_id: ID!) {
    aiSummary(target_type: $target_type, target_id: $target_id)
  }
`;

export const SCORE_LEAD_MUTATION = gql`
  mutation ScoreLead($id: ID!, $refresh: Boolean) {
    scoreLead(id: $id, refresh: $refresh) {
      ...LeadFields
    }
  }
  ${LEAD_FIELDS}
`;

export const SCORE_LEADS_BULK_MUTATION = gql`
  mutation ScoreLeadsBulk($limit: Int) {
    scoreLeadsBulk(limit: $limit) {
      ...LeadFields
    }
  }
  ${LEAD_FIELDS}
`;

export const DRAFT_EMAIL_MUTATION = gql`
  mutation DraftEmail($target_type: AiTargetType!, $target_id: ID!, $instruction: String) {
    draftEmail(target_type: $target_type, target_id: $target_id, instruction: $instruction)
  }
`;

// --- Single-record queries for the detail pages -----------------------------

export const LEAD_QUERY = gql`
  query GetLead($id: ID!) {
    lead(id: $id) {
      ...LeadFields
    }
  }
  ${LEAD_FIELDS}
`;

export const CUSTOMER_QUERY = gql`
  query GetCustomer($id: ID!) {
    customer(id: $id) {
      ...CustomerFields
    }
  }
  ${CUSTOMER_FIELDS}
`;

export const DEAL_QUERY = gql`
  query GetDeal($id: ID!) {
    deal(id: $id) {
      ...DealFields
    }
  }
  ${DEAL_FIELDS}
`;
