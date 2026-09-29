import { gql } from 'graphql-tag';

export default gql`
  type StageFunnelEntry {
    stage_id: ID!
    stage_name: String!
    display_order: Int!
    probability: Int!
    deal_count: Int!
    total_value: Float!
    "total_value weighted by the stage probability."
    weighted_value: Float!
    "Mean days deals have sat in this stage."
    avg_days_in_stage: Float!
  }

  type TimeSeriesPoint {
    "ISO date at month granularity, e.g. 2026-09-01."
    period: String!
    count: Int!
    value: Float!
  }

  type RepPerformance {
    user_id: ID!
    name: String!
    open_deals: Int!
    won_deals: Int!
    lost_deals: Int!
    won_value: Float!
    "Won / (won + lost), as a percentage. Null when nothing has closed."
    win_rate: Float
  }

  type LeadFunnel {
    status: String!
    count: Int!
  }

  type SlaSummary {
    total: Int!
    breached: Int!
    "Percentage of tickets answered within their SLA."
    compliance_rate: Float!
    avg_first_response_hours: Float
  }

  """
  Headline figures. Every field is nullable and null means "not permitted to
  see this", not zero — the summary spans leads, customers, deals and tickets,
  and a role rarely holds all four. The UI renders a tile only when its value
  came back.
  """
  type DashboardSummary {
    total_leads: Int
    total_customers: Int
    open_deals: Int
    open_deal_value: Float
    weighted_pipeline_value: Float
    won_value_this_month: Float
    open_tickets: Int
    "The caller's own overdue tasks. Needs no resource permission."
    overdue_tasks: Int!
  }

  type Query {
    "Headline figures, computed server-side over the whole dataset."
    dashboardSummary: DashboardSummary!
    pipelineFunnel(pipeline_id: ID): [StageFunnelEntry!]!
    revenueOverTime(months: Int): [TimeSeriesPoint!]!
    leadFunnel: [LeadFunnel!]!
    repPerformance: [RepPerformance!]!
    slaSummary: SlaSummary!
  }
`;
