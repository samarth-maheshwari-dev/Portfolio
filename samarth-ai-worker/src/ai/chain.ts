// ============================================================
// Samarth AI — Provider chain
// Try each provider in order inside one overall time budget.
// First good answer wins; every failure is recorded, never thrown.
// ============================================================

import { CONFIG } from '../config';
import type { ChatMessage, LLMProvider } from '../types';

export interface ChainResult {
    text: string | null;
    provider: string | null;
    attempts: { provider: string; ok: boolean; ms: number; error?: string }[];
}

export async function runChain(
    providers: LLMProvider[],
    messages: ChatMessage[],
    opts: { maxTokens?: number; budgetMs?: number; perProviderMs?: number; temperature?: number } = {}
): Promise<ChainResult> {
    const budget = opts.budgetMs ?? CONFIG.CHAIN_BUDGET_MS;
    const perProvider = opts.perProviderMs ?? CONFIG.PER_PROVIDER_TIMEOUT_MS;
    const started = Date.now();
    const attempts: ChainResult['attempts'] = [];

    for (const provider of providers) {
        const remaining = budget - (Date.now() - started);
        if (remaining < 800) break; // not enough time left for a useful attempt

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), Math.min(perProvider, remaining));
        const t0 = Date.now();
        try {
            const text = await provider.generate(messages, {
                maxTokens: opts.maxTokens ?? CONFIG.MAX_OUTPUT_TOKENS,
                temperature: opts.temperature ?? 0.3,
                signal: controller.signal,
            });
            if (text.trim().length < 2) throw new Error('too short');
            attempts.push({ provider: provider.name, ok: true, ms: Date.now() - t0 });
            return { text, provider: provider.name, attempts };
        } catch (err: any) {
            const error = controller.signal.aborted ? 'timeout' : String(err?.message ?? err).slice(0, 200);
            attempts.push({ provider: provider.name, ok: false, ms: Date.now() - t0, error });
        } finally {
            clearTimeout(timer);
        }
    }
    return { text: null, provider: null, attempts };
}
