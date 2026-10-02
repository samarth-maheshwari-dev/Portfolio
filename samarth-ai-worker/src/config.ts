// ============================================================
// Samarth AI — Configuration
// All tunable constants in one place.
// ============================================================

export const CONFIG = {
    // Rate Limiting — generous enough for visitors, strict enough to prevent abuse
    MAX_REQUESTS_PER_IP_PER_MINUTE: 8,
    MAX_REQUESTS_PER_IP_PER_HOUR: 50,
    MAX_GLOBAL_AI_REQUESTS_PER_DAY: 500,

    // Input / Output Limits
    MAX_INPUT_CHARS: 500,
    MAX_OUTPUT_TOKENS: 350,     // enough for a 3-4 sentence answer with bullets
    REQUEST_TIMEOUT_MS: 12000,  // 12s — fail fast if OpenCode is slow

    // RAG
    TOP_K: 3,
    CONFIDENCE_THRESHOLD: 0.05,

    // AI Provider (OpenCode Zen — OpenAI-compatible free endpoint)
    OPENCODE_BASE_URL: 'https://opencode.ai/zen/v1',
    AI_MODEL: 'x-preview-f-free',

    // Response Cache TTL (seconds) — cache good answers for 1 hour
    CACHE_TTL: 3600,
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

// Allowed scroll targets — whitelist only
export const ALLOWED_TARGETS = [
    'hero-section',
    'about-section',
    'services-section',
    'contact-section',
    'tech-section',
    'projects-section',
    'projects',
] as const;
