// ============================================================
// Samarth AI — Type Definitions
// ============================================================

/** Minimal shape of the Workers AI binding we rely on. */
export interface WorkersAI {
    run(model: string, inputs: Record<string, unknown>, options?: Record<string, unknown>): Promise<unknown>;
}

/** Minimal KV shape (optional answer cache). */
export interface KVLike {
    get(key: string): Promise<string | null>;
    put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

export interface Env {
    // Bindings
    AI?: WorkersAI;              // Cloudflare Workers AI — no API key needed
    CHAT_CACHE?: KVLike;         // optional KV namespace for cross-isolate answer cache
    RATE_LIMITER?: { limit(opts: { key: string }): Promise<{ success: boolean }> };

    // Secrets (wrangler secret put …) — each provider is skipped if its key is missing
    GROQ_API_KEY?: string;
    GEMINI_API_KEY?: string;

    // Vars (wrangler.toml)
    AI_ENABLED?: string;
    AI_PROVIDERS?: string;       // order, e.g. "workers-ai,groq,gemini"
    WORKERS_AI_MODEL?: string;
    GROQ_MODELS?: string;        // comma-separated, tried in order
    GEMINI_MODEL?: string;
    ALLOWED_ORIGIN?: string;
}

export interface AskRequest {
    message: string;
    history?: HistoryTurn[];
}

export interface HistoryTurn {
    role: 'user' | 'assistant';
    content: string;
}

export interface AskResponse {
    message: string;
    sources: string[];
    actions: PortfolioAction[];
    fromCache?: boolean;
    /** Which layer answered: faq | cache | <provider>:<model> | knowledge */
    via?: string;
}

export interface PortfolioAction {
    type: string;
    target: string;
    label?: string;
}

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface GenerateOptions {
    maxTokens: number;
    temperature: number;
    signal: AbortSignal;
}

/** One concrete model behind one provider. */
export interface LLMProvider {
    readonly name: string;   // e.g. "groq:openai/gpt-oss-20b"
    generate(messages: ChatMessage[], opts: GenerateOptions): Promise<string>;
}
