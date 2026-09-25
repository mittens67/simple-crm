import { Types } from 'mongoose';
import Deal from '../models/deal';
import Pipeline, { IPipeline, IStage } from '../models/pipeline';
import { pipeline_repository } from '../repositories/pipeline';
import { ApolloContext } from '../graphql/context';
import { require_permission } from '../auth/authorize';
import { create_pipeline_schema, update_pipeline_schema } from '../schemas/pipeline';
import { assert_found, audit, parse_or_throw } from '../core/service-helpers';
import { ConflictError, NotFoundError } from '../utils/errors';

/**
 * Pipelines are configuration rather than transactional data, so they are
 * governed by the `deals` permissions — anyone who can administer deals can
 * shape the pipeline they move through.
 */
export class PipelineService {
  async list(context: ApolloContext): Promise<IPipeline[]> {
    require_permission(context, 'deals.read');
    return pipeline_repository.find_all();
  }

  async get(context: ApolloContext, id: string): Promise<IPipeline> {
    require_permission(context, 'deals.read');
    return assert_found(await pipeline_repository.find_by_id(id), 'Pipeline');
  }

  async get_default(context: ApolloContext): Promise<IPipeline | null> {
    require_permission(context, 'deals.read');
    return pipeline_repository.find_default();
  }

  /** Used when creating a deal without an explicit pipeline. */
  async require_default(): Promise<IPipeline> {
    const pipeline = await pipeline_repository.find_default();
    if (!pipeline) {
      throw new NotFoundError('No default pipeline is configured');
    }
    return pipeline;
  }

  /** Resolves a stage within a pipeline, or the first stage when unspecified. */
  resolve_stage(pipeline: IPipeline, stage_id?: string | null): IStage {
    const ordered = [...pipeline.stages].sort((a, b) => a.display_order - b.display_order);
    if (!stage_id) {
      const first = ordered[0];
      if (!first) throw new NotFoundError('Pipeline has no stages');
      return first;
    }
    const found = pipeline.stages.id(stage_id);
    if (!found) {
      throw new NotFoundError('Stage not found in this pipeline');
    }
    return found;
  }

  async create(context: ApolloContext, input: unknown): Promise<IPipeline> {
    const actor = require_permission(context, 'deals.create');
    const data = parse_or_throw(create_pipeline_schema, input);

    const existing = await Pipeline.findOne({ name: data.name });
    if (existing) {
      throw new ConflictError(`A pipeline named "${data.name}" already exists`);
    }

    const pipeline = await pipeline_repository.create(data as Partial<IPipeline>);

    if (data.is_default) {
      await pipeline_repository.clear_default_except(String(pipeline._id));
    }

    await audit(actor, 'Pipeline created', { pipeline_id: String(pipeline._id) });
    return pipeline;
  }

  async update(context: ApolloContext, id: string, input: unknown): Promise<IPipeline> {
    const actor = require_permission(context, 'deals.update');
    const data = parse_or_throw(update_pipeline_schema, input);

    const pipeline = assert_found(await pipeline_repository.find_by_id(id), 'Pipeline');

    // Replacing the stage list would orphan every deal pointing at a stage
    // that no longer exists, so only additive edits are allowed while deals
    // reference the pipeline.
    if (data.stages) {
      const deals_using = await Deal.countDocuments({ pipeline_id: pipeline._id });
      if (deals_using > 0) {
        throw new ConflictError(
          `Cannot replace the stages of a pipeline with ${deals_using} deal(s) in it`
        );
      }
    }

    const updated = assert_found(await pipeline_repository.update(id, data), 'Pipeline');

    if (data.is_default) {
      await pipeline_repository.clear_default_except(String(updated._id));
    }

    await audit(actor, 'Pipeline updated', { pipeline_id: String(updated._id) });
    return updated;
  }

  async remove(context: ApolloContext, id: string): Promise<boolean> {
    const actor = require_permission(context, 'deals.delete');

    const pipeline = assert_found(await pipeline_repository.find_by_id(id), 'Pipeline');

    const deals_using = await Deal.countDocuments({ pipeline_id: new Types.ObjectId(id) });
    if (deals_using > 0) {
      throw new ConflictError(`Cannot delete a pipeline still used by ${deals_using} deal(s)`);
    }
    if (pipeline.is_default) {
      throw new ConflictError('Cannot delete the default pipeline');
    }

    const deleted = await pipeline_repository.delete(id);
    await audit(actor, 'Pipeline deleted', { pipeline_id: id });
    return deleted;
  }
}

export const pipeline_service = new PipelineService();
