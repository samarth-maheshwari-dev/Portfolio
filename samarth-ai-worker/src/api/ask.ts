// ============================================================
// Samarth AI — Main API Logic
// Answers ONLY about Samarth Maheshwari.
// The RAG (knowledge-base) answer is ALWAYS the primary response.
// LLM is optional polish — its failure never breaks the reply.
// The worker NEVER returns a 500 or shows "offline".
// ============================================================

import { CONFIG } from '../config';
import type { Env, AskRequest, AskResponse, PortfolioAction, HistoryTurn } from '../types';
import { OpenCodeProvider } from '../ai/opencode';
import { retrieve, isConfident, buildContext } from '../rag/retrieve';
import { validateRequest } from '../security/validation';
import { checkRateLimit } from '../security/rate-limit';
import { checkFaqCache, getCachedResponse, cacheResponse } from '../cache/responses';

// ── Off-topic Detection ──────────────────────────────────────
//
// Block questions that are clearly NOT about Samarth.
// We do this BEFORE the LLM call so we never waste tokens or
// risk the LLM going rogue and answering off-topic questions.

/** Specific people that are not Samarth */
const NON_SAMARTH_NAMES: string[] = [
    'musk', 'elon', 'trump', 'biden', 'modi', 'putin', 'obama', 'gandhi',
    'bill gates', 'gates', 'steve jobs', 'jeff bezos', 'bezos', 'mark zuckerberg',
    'zuckerberg', 'sundar pichai', 'pichai', 'dalai', 'tata',
    'ambani', 'adani', 'cristiano', 'messi', 'ronaldo', 'virat', 'kohli', 'dhoni',
    'sachin', 'tendulkar', 'shahrukh', 'salman', 'aamir', 'deepika', 'priyanka',
    'rihanna', 'taylor swift', 'justin bieber', 'ariana', 'kim kardashian',
    'einstein', 'newton', 'nikola tesla', 'nehru', 'napoleon', 'shakespeare',
    'zuckerberg', 'larry page', 'sergey brin', 'jensen huang', 'sam altman',
];

/** Generic off-topic categories — we refuse all of these */
const OFF_TOPIC_PATTERNS: RegExp[] = [
    // General knowledge / facts
    /\b(capital of|president of|prime minister of|population of|currency of|flag of)\b/i,
    // Weather
    /\b(weather|temperature|forecast|rain|sunny|cloudy|humidity)\b/i,
    // Math / calculations
    /\b(calculate|compute|solve|equation|integral|derivative|factorial|prime number|fibonacci)\b/i,
    // Cooking / recipes
    /\b(recipe|cook|bake|ingredient|dish|food|restaurant|meal)\b/i,
    // Medical / health
    /\b(symptom|disease|medicine|doctor|hospital|diagnose|treat|pill|vaccine)\b/i,
    // News / politics
    /\b(news|politics|election|vote|government|parliament|senate|congress|war|military|army)\b/i,
    // Entertainment (not about Samarth's projects)
    /\b(movie|film|song|lyric|actor|actress|singer|band|album|celebrity|gossip)\b/i,
    // Sports (not Samarth-related)
    /\b(cricket match|football match|score|ipl|nba|nfl|fifa|olympics|world cup)\b/i,
    // Stock market / finance
    /\b(stock price|share price|invest|crypto|bitcoin|ethereum|forex|market cap|nifty|sensex)\b/i,
    // General coding help (not about Samarth's specific tech)
    /\b(write me a|generate code for|how to code|fix this bug|debug this|explain this algorithm)\b/i,
    // Jokes / entertainment
    /\b(tell me a joke|funny|meme|prank|riddle)\b/i,
    // Geography / history (not India-context relevant to Samarth)
    /\b(world war|ancient|medieval|pyramid|roman empire|greek|viking)\b/i,
];

/** Questions about Samarth — always allow these through */
const SAMARTH_ALLOW_PATTERNS: RegExp[] = [
    /\bsamarth\b/i,
    /\bhis (project|skill|work|education|experience|background|journey|college|tech|stack|contact|email|github|linkedin|resume|ai|jarvis|aion|snaptrace|portfolio)\b/i,
    /\b(project|skill|tech|experience|education|contact|github|linkedin|resume)\b/i,
    /\b(who are you|what (can|do) you (do|know|tell)|about (you|him)|introduce yourself)\b/i,
    /\b(jarvis|aion|snaptrace|dotnet|portfolio)\b/i,
    /\b(hire|freelance|intern|internship|collaborate|collaboration)\b/i,
    /\b(python|react|nextjs|node|django|fastapi|tensorflow|pytorch|docker|aws)\b/i,
];

function normalizeForGuard(q: string): string {
    return q.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Returns a polite refusal message if the question is off-topic,
 * or null if it looks like it could be about Samarth.
 */
function detectOffTopic(query: string): string | null {
    const q = normalizeForGuard(query);

    // If question explicitly mentions Samarth or his work → always allow
    for (const pattern of SAMARTH_ALLOW_PATTERNS) {
        if (pattern.test(query)) return null;
    }

    // Block questions about specific other people
    for (const name of NON_SAMARTH_NAMES) {
        if (q.includes(name)) {
            return `I'm Samarth's AI assistant — I only know about Samarth Maheshwari, his projects, skills, and background. I can't answer questions about other people, but I'd love to tell you about Samarth! 😊`;
        }
    }

    // Block clearly off-topic categories
    for (const pattern of OFF_TOPIC_PATTERNS) {
        if (pattern.test(query)) {
            return `Sorry, I can only answer questions about Samarth Maheshwari — his projects, skills, education, and background. I can't help with that topic, but feel free to ask me about Samarth! 🤖`;
        }
    }

    return null; // looks on-topic, proceed
}

/** Build a readable answer from retrieved knowledge chunks. */
function buildGroundedAnswer(retrievedChunks: { title: string; content: string }[]): string {
    if (retrievedChunks.length === 0) {
        return "I only have knowledge about Samarth Maheshwari — his projects, skills, education, and background. I can't help with anything else, but feel free to ask about him!";
    }
    const top = retrievedChunks[0];
    return top.content
        .replace(/#{1,6}\s*/g, '')
        .replace(/\*\*/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

// ── Tightly scoped system prompt ────────────────────────────
// This is the single source of truth for what the LLM is allowed to do.
// It is intentionally restrictive — the LLM must stay in its lane.
const SYSTEM_PROMPT = `You are "Samarth AI", the official AI representative embedded in Samarth Maheshwari's portfolio website.

YOUR ONLY JOB:
Answer questions about Samarth Maheshwari using ONLY the CONTEXT provided below.
You must NEVER answer questions that are not about Samarth, his projects, skills, education, or background.

STRICT RULES:
1. ONLY use information from the CONTEXT. Never invent facts, stats, or details not present in the context.
2. If the CONTEXT does not contain enough information to answer, say: "I don't have that specific detail about Samarth right now. You can contact him directly through the contact section!"
3. If the question is NOT about Samarth at all, say: "Sorry, I can only answer questions about Samarth Maheshwari! Feel free to ask about his projects, skills, education, or background. 😊"
4. Never discuss other people, topics, or provide general knowledge.
5. Keep answers concise (2-4 sentences or a short bullet list). Be warm, professional, and friendly.
6. Respond in plain text with Markdown formatting (bold, bullets). No JSON.`;

/**
 * Handle POST /api/ask
 */
export async function handleAsk(request: Request, env: Env): Promise<Response> {
    const ip = request.headers.get('cf-connecting-ip') || 'unknown';

    try {
        // 1. Parse & Validate Body
        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return errorResponse('Invalid JSON', 400);
        }

        const { valid, error, data } = validateRequest(body);
        if (!valid || !data) {
            return errorResponse(error || 'Invalid request', 400);
        }
        const query = data.message;
        const history: HistoryTurn[] = data.history || [];

        // 2. Rate Limiting
        const rateLimit = await checkRateLimit(ip, env);
        if (!rateLimit.allowed) {
            // Return as 200 with a friendly message — don't show "error" in UI
            return jsonResponse({
                message: rateLimit.error || 'Too many requests. Please wait a moment.',
                sources: [],
                actions: []
            });
        }

        // 3. Off-topic / non-Samarth guard
        const offTopic = detectOffTopic(query);
        if (offTopic) {
            return jsonResponse({ message: offTopic, sources: [], actions: [] });
        }

        // 4. Static FAQ Cache (Layer 1 — zero AI cost, instant)
        const faqMatch = checkFaqCache(query);
        if (faqMatch) {
            return jsonResponse({ ...faqMatch, fromCache: true });
        }

        // 5. Response Cache (Layer 2)
        const cacheMatch = getCachedResponse(query);
        if (cacheMatch) {
            return jsonResponse(cacheMatch);
        }

        // 6. RAG Retrieval — deterministic, always available, always fast.
        const retrievedChunks = retrieve(query);

        if (!isConfident(retrievedChunks)) {
            // No confident match — be honest, never hallucinate
            const answer = "I don't have that specific detail in my knowledge base yet. I can tell you about Samarth's projects, skills, education, or how to contact him — what would you like to know?";
            const safeResponse: AskResponse = {
                message: answer,
                sources: [],
                actions: [
                    { type: 'SCROLL_TO_SECTION', target: 'about-section', label: 'About Samarth' },
                    { type: 'OPEN_CONTACT', target: 'contact-section', label: 'Contact Samarth' }
                ]
            };
            cacheResponse(query, safeResponse, CONFIG.CACHE_TTL * 1000);
            return jsonResponse(safeResponse);
        }

        const sourceTitles = Array.from(new Set(retrievedChunks.map(c => c.title)));
        const actions = buildActions(query);

        // 7. Build grounded answer (deterministic — never fails, never "offline")
        const groundedAnswer = buildGroundedAnswer(retrievedChunks);
        const context = buildContext(retrievedChunks);

        // 8. Optional LLM polish — best-effort only.
        //    ANY failure falls back silently to groundedAnswer (200, no error shown).
        let finalMessage = groundedAnswer;

        if (env.OPENCODE_API_KEY) {
            try {
                const ai = new OpenCodeProvider(env.OPENCODE_API_KEY, env.AI_MODEL || CONFIG.AI_MODEL);

                // Include recent conversation turns for contextual continuity
                const historyBlock = history
                    .slice(-4) // only last 4 turns to save tokens
                    .map(h => `${h.role === 'user' ? 'User' : 'Samarth AI'}: ${h.content}`)
                    .join('\n');

                const userMessage = [
                    historyBlock ? `CONVERSATION HISTORY:\n${historyBlock}` : '',
                    `CONTEXT:\n${context}`,
                    `QUESTION:\n${query}`
                ].filter(Boolean).join('\n\n');

                const llmAnswer = await ai.generateResponse(
                    SYSTEM_PROMPT,
                    query,
                    userMessage,
                    CONFIG.MAX_OUTPUT_TOKENS
                );

                // Only use LLM answer if it's substantive and not an error/offline message
                if (
                    llmAnswer &&
                    llmAnswer.trim().length > 15 &&
                    !/temporarily offline|unavailable|cannot assist|i (can't|cannot) (help|answer)/i.test(llmAnswer)
                ) {
                    finalMessage = llmAnswer;
                }
            } catch (err: any) {
                // Silent fallback — the groundedAnswer is already set, just log
                console.warn('LLM polish failed, using RAG answer:', err?.message || err);
            }
        }

        // 9. Build, cache, and return final response
        const responseData: AskResponse = {
            message: finalMessage,
            sources: sourceTitles,
            actions,
        };

        cacheResponse(query, responseData, CONFIG.CACHE_TTL * 1000);
        return jsonResponse(responseData);

    } catch (err: any) {
        console.error('Unhandled error in handleAsk:', err?.message || err);
        // NEVER return 500 — the frontend shows "SYSTEM ERROR" for non-200.
        // Return a safe 200 with a helpful message.
        return jsonResponse({
            message: "I had a small hiccup! You can ask me about Samarth's projects, skills, education, or how to contact him.",
            sources: [],
            actions: [
                { type: 'SCROLL_TO_SECTION', target: 'about-section', label: 'About Samarth' }
            ]
        }, 200);
    }
}

function buildActions(query: string): PortfolioAction[] {
    const actions: PortfolioAction[] = [];
    const q = query.toLowerCase();

    if (q.match(/\b(project|build|made|aion|snaptrace|jarvis|dotnet)\b/)) {
        actions.push({ type: 'SCROLL_TO_SECTION', target: 'projects-section', label: 'View Projects' });
    } else if (q.match(/\b(skill|tech|stack|language|framework|tool|python|react)\b/)) {
        actions.push({ type: 'SCROLL_TO_SECTION', target: 'tech-section', label: 'View Skills' });
    } else if (q.match(/\b(contact|hire|email|reach|freelance|intern)\b/)) {
        actions.push({ type: 'OPEN_CONTACT', target: 'contact-section', label: 'Contact Samarth' });
    } else if (q.match(/\b(about|who is|education|college|aitr|background|experience)\b/)) {
        actions.push({ type: 'SCROLL_TO_SECTION', target: 'about-section', label: 'View About' });
    }

    return actions;
}

// ── Helpers ──────────────────────────────────────────────────

function jsonResponse(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

function errorResponse(error: string, status = 400): Response {
    return new Response(JSON.stringify({ error }), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}