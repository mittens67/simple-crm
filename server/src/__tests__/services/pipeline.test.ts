import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { pipeline_service } from '../../services/pipeline';
import Pipeline from '../../models/pipeline';
import Deal from '../../models/deal';
import Customer from '../../models/customer';
import User from '../../models/user';
import Role from '../../models/role';
import type { IUser } from '../../models/user';
import type { IRole } from '../../models/role';
import type { ICustomer } from '../../models/customer';
import { ValidationError, NotFoundError, ConflictError, ForbiddenError } from '../../utils/errors';
import { mock_context, mock_context_with } from '../helpers/context';
import { DEFAULT_PIPELINE_STAGES } from '../../scripts/demo-data';

let admin: IUser;
let admin_role: IRole;
let customer: ICustomer;

beforeAll(async () => {
  admin_role = await Role.create({ name: 'PipelineAdmin', permissions: { 'deals.*': true } });
  admin = await User.create({
    name: 'Pipeline Admin',
    email: 'pipelineadmin@example.com',
    password: 'password123',
    role_ids: [admin_role._id],
  });
  customer = await Customer.create({
    name: 'Pipeline Customer',
    email: 'pipelinecustomer@example.com',
    phone: '555-1111',
  });
});

beforeEach(async () => {
  await Pipeline.deleteMany({});
  await Deal.deleteMany({});
});

const as_admin = () => mock_context(admin, admin_role);

const valid_input = (overrides: Record<string, unknown> = {}) => ({
  name: 'Sales Pipeline',
  is_default: true,
  stages: DEFAULT_PIPELINE_STAGES,
  ...overrides,
});

describe('PipelineService.create', () => {
  it('creates a pipeline with its stages', async () => {
    const pipeline = await pipeline_service.create(as_admin(), valid_input());

    expect(pipeline.name).toBe('Sales Pipeline');
    expect(pipeline.stages).toHaveLength(DEFAULT_PIPELINE_STAGES.length);
    expect(pipeline.is_default).toBe(true);
  });

  it('rejects a pipeline with no stages', async () => {
    await expect(pipeline_service.create(as_admin(), valid_input({ stages: [] }))).rejects.toThrow(
      ValidationError
    );
  });

  it('rejects a pipeline without exactly one won and one lost stage', async () => {
    // Without terminal stages, "is this deal closed?" has no answer and win
    // rate is undefined.
    const no_terminal = [{ name: 'Only', display_order: 0, probability: 50, outcome: 'open' }];

    await expect(
      pipeline_service.create(as_admin(), valid_input({ stages: no_terminal }))
    ).rejects.toThrow(ValidationError);
  });

  it('rejects two won stages', async () => {
    const two_won = [
      { name: 'Won A', display_order: 0, probability: 100, outcome: 'won' },
      { name: 'Won B', display_order: 1, probability: 100, outcome: 'won' },
      { name: 'Lost', display_order: 2, probability: 0, outcome: 'lost' },
    ];

    await expect(
      pipeline_service.create(as_admin(), valid_input({ stages: two_won }))
    ).rejects.toThrow(ValidationError);
  });

  it('rejects a probability outside 0-100', async () => {
    const bad = [
      { name: 'Open', display_order: 0, probability: 150, outcome: 'open' },
      { name: 'Won', display_order: 1, probability: 100, outcome: 'won' },
      { name: 'Lost', display_order: 2, probability: 0, outcome: 'lost' },
    ];

    await expect(pipeline_service.create(as_admin(), valid_input({ stages: bad }))).rejects.toThrow(
      ValidationError
    );
  });

  it('rejects a duplicate pipeline name', async () => {
    await pipeline_service.create(as_admin(), valid_input());

    await expect(pipeline_service.create(as_admin(), valid_input())).rejects.toThrow(ConflictError);
  });

  it('leaves exactly one default pipeline', async () => {
    await pipeline_service.create(as_admin(), valid_input({ name: 'First' }));
    await pipeline_service.create(as_admin(), valid_input({ name: 'Second' }));

    expect(await Pipeline.countDocuments({ is_default: true })).toBe(1);
    expect((await Pipeline.findOne({ is_default: true }))!.name).toBe('Second');
  });

  it('requires deals.create', async () => {
    const no_perm = mock_context_with(admin, { 'deals.read': true });
    await expect(pipeline_service.create(no_perm, valid_input())).rejects.toThrow(ForbiddenError);
  });
});

describe('PipelineService.resolve_stage', () => {
  it('returns the first stage by display order when none is given', async () => {
    const pipeline = await pipeline_service.create(as_admin(), valid_input());

    expect(pipeline_service.resolve_stage(pipeline).name).toBe('Prospecting');
  });

  it('throws for a stage id from another pipeline', async () => {
    const pipeline = await pipeline_service.create(as_admin(), valid_input());

    expect(() => pipeline_service.resolve_stage(pipeline, new Types.ObjectId().toString())).toThrow(
      NotFoundError
    );
  });
});

describe('PipelineService.update', () => {
  it('renames a pipeline', async () => {
    const pipeline = await pipeline_service.create(as_admin(), valid_input());

    const updated = await pipeline_service.update(as_admin(), String(pipeline._id), {
      name: 'Renamed Pipeline',
    });

    expect(updated.name).toBe('Renamed Pipeline');
  });

  it('refuses to replace the stages of a pipeline that has deals', async () => {
    const pipeline = await pipeline_service.create(as_admin(), valid_input());
    await Deal.create({
      title: 'In flight',
      customer_id: customer._id,
      owner_id: admin._id,
      value: 100,
      pipeline_id: pipeline._id,
      stage_id: pipeline.stages[0]._id,
    });

    // Replacing them would orphan the deal on a stage that no longer exists.
    await expect(
      pipeline_service.update(as_admin(), String(pipeline._id), {
        stages: DEFAULT_PIPELINE_STAGES,
      })
    ).rejects.toThrow(ConflictError);
  });
});

describe('PipelineService.remove', () => {
  it('refuses to delete a pipeline still in use', async () => {
    const pipeline = await pipeline_service.create(as_admin(), valid_input({ is_default: false }));
    await Deal.create({
      title: 'In flight',
      customer_id: customer._id,
      owner_id: admin._id,
      value: 100,
      pipeline_id: pipeline._id,
      stage_id: pipeline.stages[0]._id,
    });

    await expect(pipeline_service.remove(as_admin(), String(pipeline._id))).rejects.toThrow(
      ConflictError
    );
  });

  it('refuses to delete the default pipeline', async () => {
    const pipeline = await pipeline_service.create(as_admin(), valid_input());

    await expect(pipeline_service.remove(as_admin(), String(pipeline._id))).rejects.toThrow(
      ConflictError
    );
  });

  it('deletes an unused, non-default pipeline', async () => {
    const pipeline = await pipeline_service.create(as_admin(), valid_input({ is_default: false }));

    expect(await pipeline_service.remove(as_admin(), String(pipeline._id))).toBe(true);
  });
});

describe('PipelineService.require_default', () => {
  it('throws when no default pipeline is configured', async () => {
    await expect(pipeline_service.require_default()).rejects.toThrow(NotFoundError);
  });
});
