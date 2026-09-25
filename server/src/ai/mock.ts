import { createHash } from 'node:crypto';
import { AiProvider, GenerateOptions } from './provider';

/**
 * A deterministic stand-in for a real model.
 *
 * This is not a throwaway. It is the default provider, which means:
 *   - a fresh `git clone` runs every AI feature with no API key and no network
 *   - CI is hermetic and free
 *   - the feature logic is testable with exact assertions rather than
 *     "assert the model said something"
 *
 * It also forces the abstraction to be real: because the mock was written
 * first, nothing in the feature code can quietly depend on Gemini's response
 * shape.
 *
 * Output is derived from a hash of the prompt, so the same input always
 * produces the same answer across runs and machines.
 */

const hash_of = (text: string): number => {
  const digest = createHash('sha256').update(text).digest();
  return digest.readUInt32BE(0);
};

/** Stable pseudo-random in [0, 1) derived from the prompt. */
const ratio = (text: string, salt = ''): number => hash_of(salt + text) / 0xffffffff;

const pick = <T>(items: readonly T[], text: string, salt = ''): T =>
  items[Math.floor(ratio(text, salt) * items.length) % items.length];

const RATIONALES = [
  'Engaged quickly after the first touch and asked about implementation timelines, which usually signals real intent.',
  'Contact details are complete and the enquiry names a specific problem, but there has been no response to the last follow-up.',
  'Interest looks exploratory: generic questions, no timeline mentioned, and no decision-maker identified yet.',
  'Strong fit on paper, though the account has gone quiet for longer than is typical at this stage.',
];

const NEXT_ACTIONS = [
  'Book a 20-minute discovery call this week to confirm budget and timeline.',
  'Send the pricing one-pager and ask who else needs to be involved in the decision.',
  'Follow up with a short, specific email referencing their original question.',
  'Share the most relevant case study and propose two concrete times to talk.',
];

const SUMMARY_OPENERS = [
  'Engagement has been steady, with most contact driven by the account team.',
  'Activity has been sporadic, concentrated around the initial enquiry.',
  'The relationship is active and recent conversations have moved toward commercials.',
];

/**
 * Produces plausible structured output for the prompts this app actually
 * sends. The prompt is tagged by the caller (see ai/prompts.ts) so the mock can
 * answer in the right shape without parsing natural language.
 */
const respond = (options: GenerateOptions): string => {
  const text = `${options.system ?? ''}\n${options.prompt}`;

  if (text.includes('[[TASK:LEAD_SCORE]]')) {
    // Spread scores across the range so a scored list is not uniform.
    const score = Math.round(ratio(text, 'score') * 100);
    return JSON.stringify({
      score,
      rationale: pick(RATIONALES, text, 'rationale'),
      next_action: pick(NEXT_ACTIONS, text, 'action'),
      confidence: Number((0.55 + ratio(text, 'conf') * 0.4).toFixed(2)),
    });
  }

  if (text.includes('[[TASK:NL_SEARCH]]')) {
    // Derive a filter from words actually present in the query, so the mock
    // exercises the same validation path a real model's output would.
    const query = options.prompt.toLowerCase();
    const filters: Record<string, unknown> = {};
    let entity = 'leads';

    if (query.includes('deal')) entity = 'deals';
    else if (query.includes('ticket')) entity = 'support_tickets';
    else if (query.includes('customer')) entity = 'customers';

    if (entity === 'deals') {
      if (query.includes('won')) filters.status = 'Won';
      else if (query.includes('lost')) filters.status = 'Lost';
      else if (query.includes('open')) filters.status = 'Open';

      const amount = query.match(/(\d+)\s*k/);
      if (amount) filters.value_min = Number(amount[1]) * 1000;
    }

    if (entity === 'leads') {
      if (query.includes('converted')) filters.status = 'Converted';
      else if (query.includes('archived')) filters.status = 'Archived';
      else if (query.includes('open')) filters.status = 'Open';
    }

    if (entity === 'support_tickets') {
      if (query.includes('urgent')) filters.priority = 'Urgent';
      if (query.includes('breach')) filters.sla_breached = true;
      if (query.includes('open')) filters.status = 'Open';
    }

    const text_match = options.prompt.match(/"([^"]+)"/);
    if (text_match) filters.search = text_match[1];

    return JSON.stringify({
      entity,
      filters,
      explanation: `Interpreted as a search over ${entity.replace('_', ' ')}.`,
    });
  }

  if (text.includes('[[TASK:SUMMARY]]')) {
    return [
      pick(SUMMARY_OPENERS, text, 'open'),
      'The most recent exchanges focused on scope and pricing, and no blocking objection has been raised.',
      'Next step is to confirm the decision process and agree a date.',
    ].join(' ');
  }

  if (text.includes('[[TASK:DRAFT_EMAIL]]')) {
    return [
      'Subject: Following up on our conversation',
      '',
      'Hi there,',
      '',
      'Thanks for the time earlier — it was useful to hear how your team is approaching this.',
      '',
      'I have pulled together the details we discussed. If it would help, I can walk through',
      'the specifics on a short call later this week.',
      '',
      'Would either of the next two afternoons suit?',
      '',
      'Best regards',
    ].join('\n');
  }

  // Unrecognised prompt: echo a stable, obviously-synthetic answer rather
  // than pretending to be a model.
  return `[mock] No canned response for this prompt (hash ${hash_of(text).toString(16)}).`;
};

export class MockProvider implements AiProvider {
  readonly name = 'mock';
  /** Always ready: that is the point of it. */
  readonly is_configured = true;

  async generate_text(options: GenerateOptions): Promise<string> {
    // Nothing async happens, but the signature stays honest about the
    // interface and lets tests assert on abort handling.
    if (options.signal?.aborted) {
      throw new Error('Aborted');
    }
    return respond(options);
  }
}
