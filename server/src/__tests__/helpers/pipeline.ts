import Pipeline, { IPipeline, IStage } from '../../models/pipeline';
import { DEFAULT_PIPELINE_STAGES } from '../../scripts/demo-data';

/**
 * Deals now require a pipeline and a stage, so tests that build deals directly
 * need one. Uses the same stage shape the seed installs, so tests exercise the
 * configuration the app actually ships with.
 */
export const create_test_pipeline = async (name = 'Test Pipeline'): Promise<IPipeline> =>
  Pipeline.create({ name, is_default: true, stages: DEFAULT_PIPELINE_STAGES });

export const stage_named = (pipeline: IPipeline, name: string): IStage => {
  const stage = pipeline.stages.find((s) => s.name === name);
  if (!stage) throw new Error(`No stage named "${name}" in ${pipeline.name}`);
  return stage;
};

export const first_open_stage = (pipeline: IPipeline): IStage =>
  [...pipeline.stages]
    .filter((s) => s.outcome === 'open')
    .sort((a, b) => a.display_order - b.display_order)[0];

export const won_stage = (pipeline: IPipeline): IStage =>
  pipeline.stages.find((s) => s.outcome === 'won')!;

export const lost_stage = (pipeline: IPipeline): IStage =>
  pipeline.stages.find((s) => s.outcome === 'lost')!;
