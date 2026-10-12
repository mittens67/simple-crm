import { gql } from 'graphql-tag';

export default gql`
    enum LeadStatus {
        Open
        Pending
        Archived
        Converted
    }

    type Lead {
        id: ID!
        name: String!
        email: String!
        phone: String!
        status: LeadStatus!
        assigned_rep: User
        customer: Customer
        sales_notes: String
        archive_notes: String
        created_at: String
        updated_at: String
    }

    """
    Every paginated list in the schema uses this shape: items/total/has_more.
    """
    type LeadPage {
        items: [Lead!]!
        total: Int!
        has_more: Boolean!
    }

    input CreateLead {
        name: String!
        email: String!
        phone: String!
        status: LeadStatus
        assigned_rep_id: ID
        sales_notes: String
    }

    input UpdateLead {
        name: String
        email: String
        phone: String
        status: LeadStatus
        assigned_rep_id: ID
        sales_notes: String
        archive_notes: String
    }

    type Mutation {
        createLead(input: CreateLead!): Lead!
        updateLead(id: ID!, input: UpdateLead!): Lead!
        deleteLead(id: ID!): Lead!
    }

    type Query {
        leads(search: String, limit: Int, offset: Int): LeadPage!
        lead(id: ID!): Lead
    }
`;
