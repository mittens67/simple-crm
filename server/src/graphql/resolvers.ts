import { mergeResolvers } from "@graphql-tools/merge";
import { GraphQLJSON } from "graphql-type-json";
import userResolvers from "./resolvers/user";
import roleResolvers from "./resolvers/role";
import leadResolvers from "./resolvers/lead";
import customerResolvers from "./resolvers/customer";
import dealResolvers from "./resolvers/deal";
import supportTicketResolvers from "./resolvers/support-ticket";
import supportNoteResolvers from "./resolvers/support-note";
import auditLogResolvers from "./resolvers/audit-log";
import pipelineResolvers from "./resolvers/pipeline";
import activityResolvers from "./resolvers/activity";
import analyticsResolvers from "./resolvers/analytics";
import aiResolvers from "./resolvers/ai";

const customScalars = {
  JSON: GraphQLJSON,
};

export const resolvers = mergeResolvers([
  customScalars,
  userResolvers,
  roleResolvers,
  leadResolvers,
  customerResolvers,
  dealResolvers,
  supportTicketResolvers,
  supportNoteResolvers,
  auditLogResolvers,
  pipelineResolvers,
  activityResolvers,
  analyticsResolvers,
  aiResolvers,
]);
