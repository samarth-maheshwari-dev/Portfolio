// ============================================================
// Samarth AI — OpenCode Zen Provider
// Implements AIProvider interface using OpenCode Zen API.
// OpenAI-compatible endpoint.
// ============================================================

import { CONFIG } from '../config';
import type { AIProvider } from '../types';

export class OpenCodeProvider implements AIProvider {
    private apiKey: string;
    private model: string;
    private baseUrl: string;

    constructor(apiKey: string, model: string) {
        this.apiKey = apiKey;
        this.model = model;
        this.baseUrl = CONFIG.OPENCODE_BASE_URL;
    }

    async generateResponse(
        systemPrompt: string,
        userMessage: string,
        context: string,
        maxTokens: number
    ): Promise<string> {
        const controller = new AbortController();
        const timeout = setTimeout(
            () => controller.abort(),
            CONFIG.REQUEST_TIMEOUT_MS
        );

        try {
            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        {
                            role: 'user',
                            content: context
                                ? `CONTEXT:\n${context}\n\nQUESTION:\n${userMessage}`
                                : userMessage,
                        },
                    ],
                    max_tokens: maxTokens,
                    temperature: 0.4,
                    top_p: 0.9,
                }),
                signal: controller.signal,
            });

            if (!response.ok) {
                const errorText = await response.text().catch(() => 'Unknown error');
                throw new Error(
                    `OpenCode API error ${response.status}: ${errorText}`
                );
            }

            const data = (await response.json()) as {
                choices: { message: { content: string } }[];
            };

            if (!data.choices?.[0]?.message?.content) {
                throw new Error('Empty response from OpenCode');
            }

            return data.choices[0].message.content;
        } finally {
            clearTimeout(timeout);
        }
    }

    async healthCheck(): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/models`, {
                headers: { Authorization: `Bearer ${this.apiKey}` },
            });
            return response.ok;
        } catch {
            return false;
        }
    }
}
