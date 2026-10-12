import { ApolloContext } from '../context';
import { analytics_service } from '../../services/analytics';

export default {
  Query: {
    dashboardSummary: (_: unknown, __: unknown, context: ApolloContext) =>
      analytics_service.dashboard_summary(context),

    pipelineFunnel: (
      _: unknown,
      { pipeline_id }: { pipeline_id?: string },
      context: ApolloContext
    ) => analytics_service.pipeline_funnel(context, pipeline_id),

    revenueOverTime: (_: unknown, { months }: { months?: number }, context: ApolloContext) =>
      analytics_service.revenue_over_time(context, months ?? 12),

    leadFunnel: (_: unknown, __: unknown, context: ApolloContext) =>
      analytics_service.lead_funnel(context),

    repPerformance: (_: unknown, __: unknown, context: ApolloContext) =>
      analytics_service.rep_performance(context),

    slaSummary: (_: unknown, __: unknown, context: ApolloContext) =>
      analytics_service.sla_summary(context),
  },
};
