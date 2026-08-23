// ============================================================
// Samarth AI — Configuration
// All tunable constants in one place.
// ============================================================

export const CONFIG = {
    // Rate Limiting
    MAX_REQUESTS_PER_IP_PER_MINUTE: 5,
    MAX_REQUESTS_PER_IP_PER_HOUR: 30,
    MAX_GLOBAL_AI_REQUESTS_PER_DAY: 300,

    // Input / Output Limits
    MAX_INPUT_CHARS: 500,
    MAX_OUTPUT_TOKENS: 250,
    REQUEST_TIMEOUT_MS: 15000,

    // RAG
    TOP_K: 3,
    CONFIDENCE_THRESHOLD: 0.05,

    // AI Provider
    OPENCODE_BASE_URL: 'https://opencode.ai/zen/v1',
    AI_MODEL: 'x-preview-f-free',

    // Response Cache TTL (seconds)
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
    'projects',
] as const;
