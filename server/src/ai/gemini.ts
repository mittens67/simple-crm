import { env } from '../config/env';
import { AiProvider, AiProviderError, GenerateOptions } from './provider';

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  error?: { message?: string };
}

/**
 * Google Gemini via the REST API.
 *
 * Uses plain fetch rather than the SDK: one HTTP call does not justify a
 * dependency, and it keeps the provider readable as a worked example of what
 * the interface actually requires.
 */
export class GeminiProvider implements AiProvider {
  readonly name = 'gemini';

  get is_configured(): boolean {
    return Boolean(env.GEMINI_API_KEY);
  }

  async generate_text(options: GenerateOptions): Promise<string> {
    if (!this.is_configured) {
      throw new AiProviderError('GEMINI_API_KEY is not set', this.name);
    }

    const url = `${ENDPOINT}/${env.GEMINI_MODEL}:generateContent`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Header rather than a query string, so the key cannot leak into logs.
        'x-goog-api-key': env.GEMINI_API_KEY,
      },
      signal: options.signal,
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: options.prompt }] }],
        ...(options.system && {
          systemInstruction: { parts: [{ text: options.system }] },
        }),
        generationConfig: {
          temperature: options.temperature ?? 0,
          maxOutputTokens: options.max_tokens ?? 1024,
        },
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new AiProviderError(
        `Gemini request failed (${response.status}): ${detail.slice(0, 200)}`,
        this.name,
        response.status
      );
    }

    const body = (await response.json()) as GeminiResponse;
    if (body.error) {
      throw new AiProviderError(body.error.message ?? 'Unknown Gemini error', this.name);
    }

    const text = body.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('');
    if (!text) {
      // A truncated or safety-blocked response has no usable text; say which.
      const reason = body.candidates?.[0]?.finishReason ?? 'no candidates';
      throw new AiProviderError(`Gemini returned no text (${reason})`, this.name);
    }

    return text;
  }
}
