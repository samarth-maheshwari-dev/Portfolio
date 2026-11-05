// ============================================================
// Samarth AI — LLM providers
// Workers AI (binding, no key) + any OpenAI-compatible API
// (Groq, Gemini). Each instance = one provider + one model.
// ============================================================

import { CONFIG } from '../config';
import type { ChatMessage, Env, GenerateOptions, LLMProvider, WorkersAI } from '../types';

export class ProviderError extends Error {
    constructor(message: string, readonly status?: number) {
        super(message);
    }
}

/** Remove <think>…</think> blocks some reasoning models emit inline. */
export function cleanOutput(text: string): string {
    return text.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/^\s*<think>[\s\S]*$/i, '').trim();
}

const isReasoningModel = (model: string) => /gpt-oss|qwen3|deepseek-r1|reason/i.test(model);

export class WorkersAIProvider implements LLMProvider {
    readonly name: string;
    constructor(private ai: WorkersAI, private model: string) {
        this.name = `workers-ai:${model}`;
    }

    async generate(messages: ChatMessage[], opts: GenerateOptions): Promise<string> {
        const run = this.ai.run(this.model, {
            messages,
            max_tokens: isReasoningModel(this.model) ? CONFIG.MAX_OUTPUT_TOKENS_REASONING : opts.maxTokens,
            temperature: opts.temperature,
        });
        // The binding does not accept an AbortSignal, so race it against the abort.
        const result = await Promise.race([
            run,
            new Promise<never>((_, reject) => {
                if (opts.signal.aborted) reject(new ProviderError('timeout'));
                opts.signal.addEventListener('abort', () => reject(new ProviderError('timeout')), { once: true });
            }),
        ]);
        return extractText(result);
    }
}

export class OpenAICompatibleProvider implements LLMProvider {
    readonly name: string;
    constructor(
        private label: string,
        private baseUrl: string,
        private apiKey: string,
        private model: string
    ) {
        this.name = `${label}:${model}`;
    }

    async generate(messages: ChatMessage[], opts: GenerateOptions): Promise<string> {
        const reasoning = isReasoningModel(this.model);
        const body: Record<string, unknown> = {
            model: this.model,
            messages,
            max_tokens: reasoning ? CONFIG.MAX_OUTPUT_TOKENS_REASONING : opts.maxTokens,
            temperature: opts.temperature,
        };
        // Keep hidden "thinking" short on gpt-oss so tokens go to the answer
        if (/gpt-oss/i.test(this.model)) body.reasoning_effort = 'low';

        const res = await fetch(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify(body),
            signal: opts.signal,
        });
        if (!res.ok) {
            const detail = (await res.text().catch(() => '')).slice(0, 300);
            throw new ProviderError(`${this.name} HTTP ${res.status}: ${detail}`, res.status);
        }
        return extractText(await res.json());
    }
}

/** Accept both Workers AI ({response}) and OpenAI ({choices[0].message.content}) shapes. */
export function extractText(result: unknown): string {
    const r = result as any;
    const raw =
        (typeof r?.response === 'string' && r.response) ||
        r?.choices?.[0]?.message?.content ||
        r?.result?.response ||
        '';
    const text = cleanOutput(String(raw));
    if (!text) throw new ProviderError('empty response');
    return text;
}

const list = (v: string | undefined, fallback: string) =>
    (v ?? fallback).split(',').map((s) => s.trim()).filter(Boolean);

/**
 * Build the ordered provider list from env. Providers without a binding/key are skipped,
 * so the worker works with zero secrets (Workers AI only) and gets sturdier as keys are added.
 */
export function buildProviders(env: Env): LLMProvider[] {
    const out: LLMProvider[] = [];
    for (const p of list(env.AI_PROVIDERS, CONFIG.DEFAULT_PROVIDERS)) {
        if (p === 'workers-ai' && env.AI) {
            for (const m of list(env.WORKERS_AI_MODEL, CONFIG.DEFAULT_WORKERS_AI_MODEL)) {
                out.push(new WorkersAIProvider(env.AI, m));
            }
        } else if (p === 'groq' && env.GROQ_API_KEY) {
            for (const m of list(env.GROQ_MODELS, CONFIG.DEFAULT_GROQ_MODELS)) {
                out.push(new OpenAICompatibleProvider('groq', CONFIG.GROQ_BASE_URL, env.GROQ_API_KEY, m));
            }
        } else if (p === 'gemini' && env.GEMINI_API_KEY) {
            for (const m of list(env.GEMINI_MODEL, CONFIG.DEFAULT_GEMINI_MODEL)) {
                out.push(new OpenAICompatibleProvider('gemini', CONFIG.GEMINI_BASE_URL, env.GEMINI_API_KEY, m));
            }
        }
    }
    return out;
}
