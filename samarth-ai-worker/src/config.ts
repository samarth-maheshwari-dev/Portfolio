// ============================================================
// Samarth AI — Configuration
// All tunable constants in one place. Provider/model choices
// live in wrangler.toml [vars] so they can change without code.
// ============================================================

export const CONFIG = {
    // Rate limiting (per IP). The shared Cloudflare RATE_LIMITER binding is
    // the real guard; these in-memory limits are a per-isolate backstop.
    MAX_REQUESTS_PER_IP_PER_MINUTE: 8,
    MAX_REQUESTS_PER_IP_PER_HOUR: 50,
    MAX_GLOBAL_AI_REQUESTS_PER_DAY: 3000,

    // Input / output
    MAX_INPUT_CHARS: 500,
    MAX_OUTPUT_TOKENS: 350,
    // Reasoning models spend tokens "thinking" before answering
    MAX_OUTPUT_TOKENS_REASONING: 900,

    // Time budget for the whole provider chain, and per attempt
    CHAIN_BUDGET_MS: 11000,
    PER_PROVIDER_TIMEOUT_MS: 6000,

    // Knowledge retrieval: only the most relevant sections are sent to the LLM
    // (keeps prompts ~600-900 tokens, which matters for free-tier token caps)
    TOP_SECTIONS: 3,

    // Answer cache TTL
    CACHE_TTL_SECONDS: 6 * 3600,

    // Defaults (overridable in wrangler.toml [vars])
    DEFAULT_PROVIDERS: 'workers-ai,groq,gemini',
    DEFAULT_WORKERS_AI_MODEL: '@cf/meta/llama-3.1-8b-instruct-fp8-fast',
    DEFAULT_GROQ_MODELS: 'openai/gpt-oss-20b,qwen/qwen3.8-27b',
    DEFAULT_GEMINI_MODEL: 'gemini-2.5-flash-lite',

    GROQ_BASE_URL: 'https://api.groq.com/openai/v1',
    GEMINI_BASE_URL: 'https://generativelanguage.googleapis.com/v1beta/openai',
} as const;

// Allowed portfolio action types — NEVER allow arbitrary JS
export const ALLOWED_ACTIONS = [
    'SCROLL_TO_SECTION',
    'OPEN_PROJECT',
    'OPEN_GITHUB',
    'OPEN_CONTACT',
    'OPEN_RESUME',
    'OPEN_ABOUT',
    'OPEN_SKILLS',
] as const;

// Allowed scroll targets — must exist as element ids in index.html
export const ALLOWED_TARGETS = [
    'hero-section',
    'about-section',
    'services-section',
    'contact-section',
    'projects-section',
] as const;
