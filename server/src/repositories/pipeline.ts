import Pipeline, { IPipeline } from '../models/pipeline';
import Activity, { IActivity } from '../models/activity';
import { BaseRepository } from '../core/base-repository';

export class PipelineRepository extends BaseRepository<IPipeline> {
  constructor() {
    super(Pipeline, ['name']);
  }

  find_default() {
    return this.model.findOne({ is_default: true });
  }

  /** Clears the default flag everywhere else, so exactly one pipeline holds it. */
  async clear_default_except(id: string) {
    await this.model.updateMany({ _id: { $ne: id } }, { $set: { is_default: false } });
  }
}

export class ActivityRepository extends BaseRepository<IActivity> {
  constructor() {
    super(Activity, ['subject', 'body']);
  }
}

export const pipeline_repository = new PipelineRepository();
export const activity_repository = new ActivityRepository();
