import { gql } from 'graphql-tag';

export default gql`
    enum LeadStatus {
        New
        Contacted
        Qualified
        Unqualified
        Converted
        Deleted
    }

    type Lead {
        id: ID!
        name: String!
        email: String!
        phone: String!
        status: LeadStatus!
        assigned_rep: User!
        created_at: String
        updated_at: String
    }

    input CreateLead {
        name: String!
        email: String!
        phone: String!
        status: LeadStatus
        assigned_rep_id: ID!
    }

    input UpdateLead {
        name: String
        email: String
        phone: String
        status: LeadStatus
        assigned_rep_id: ID
    }

    type Mutation {
        createLead(input: CreateLead!): Lead!
        updateLead(id: ID!, input: UpdateLead!): Lead!
        deleteLead(id: ID!): Lead!
    }

    type Query {
        leads: [Lead!]!
        lead(id: ID!): Lead
    }
`;
