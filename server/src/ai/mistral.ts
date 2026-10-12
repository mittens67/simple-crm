import { env } from '../config/env';
import { AiProvider, AiProviderError, GenerateOptions } from './provider';

const ENDPOINT = 'https://api.mistral.ai/v1/chat/completions';

interface MistralResponse {
  choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
  message?: string;
}

/**
 * Mistral via its OpenAI-compatible chat completions endpoint.
 *
 * Exists alongside Gemini to keep the abstraction honest: with two real
 * backends plus the mock, the interface cannot quietly become a wrapper around
 * one vendor's response shape.
 */
export class MistralProvider implements AiProvider {
  readonly name = 'mistral';

  get is_configured(): boolean {
    return Boolean(env.MISTRAL_API_KEY);
  }

  async generate_text(options: GenerateOptions): Promise<string> {
    if (!this.is_configured) {
      throw new AiProviderError('MISTRAL_API_KEY is not set', this.name);
    }

    const messages = [
      ...(options.system ? [{ role: 'system', content: options.system }] : []),
      { role: 'user', content: options.prompt },
    ];

    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.MISTRAL_API_KEY}`,
      },
      signal: options.signal,
      body: JSON.stringify({
        model: env.MISTRAL_MODEL,
        messages,
        temperature: options.temperature ?? 0,
        max_tokens: options.max_tokens ?? 1024,
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new AiProviderError(
        `Mistral request failed (${response.status}): ${detail.slice(0, 200)}`,
        this.name,
        response.status
      );
    }

    const body = (await response.json()) as MistralResponse;
    const text = body.choices?.[0]?.message?.content;
    if (!text) {
      throw new AiProviderError(
        `Mistral returned no text (${body.choices?.[0]?.finish_reason ?? body.message ?? 'empty response'})`,
        this.name
      );
    }

    return text;
  }
}
