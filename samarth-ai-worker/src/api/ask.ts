// ============================================================
// Samarth AI — Main API Logic
// Answers ONLY about Samarth, grounded in his knowledge base.
// The knowledge-base answer is ALWAYS the fallback, so the worker
// never returns 500 (which the frontend shows as "SYSTEM ERROR").
// LLM is an optional enhancement; its failure never breaks the reply.
// ============================================================

import { CONFIG } from '../config';
import type { Env, AskRequest, AskResponse, PortfolioAction, HistoryTurn } from '../types';
import { OpenCodeProvider } from '../ai/opencode';
import { retrieve, isConfident, buildContext } from '../rag/retrieve';
import { validateRequest } from '../security/validation';
import { checkRateLimit } from '../security/rate-limit';
import { checkFaqCache, getCachedResponse, cacheResponse } from '../cache/responses';

// People/entities that are clearly NOT Samarth — refuse these politely.
const NON_SAMARTH_NAMES: string[] = [
    'musk', 'elon', 'trump', 'biden', 'modi', 'putin', 'obama', 'gandhi',
    'bill gates', 'gates', 'steve jobs', 'jeff bezos', 'bezos', 'mark zuckerberg',
    'zuckerberg', 'sundar pichai', 'pichai', 'dalai', 'teresa', 'tata',
    'ambani', 'adani', 'cristiano', 'messi', 'ronaldo', 'virat', 'kohli', 'dhoni',
    'sachin', 'tendulkar', 'shahrukh', 'salman', 'aamir', 'deepika', 'priyanka',
    'rihana', 'taylor swift', 'justin bieber', 'ariana grande', 'kim kardashian',
    'einstein', 'newton', 'tesla', 'nehru', 'putin', 'kim',
];

function normalizeForGuard(q: string): string {
    return q.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Return a polite refusal if the question is clearly about someone other than Samarth.
 */
function detectNonSamarth(query: string): string | null {
    const q = normalizeForGuard(query);

    // Direct name match anywhere in the query.
    for (const name of NON_SAMARTH_NAMES) {
        if (q.includes(name)) {
            return "I'm Samarth's AI assistant — I only have information about Samarth Maheshwari and his projects, skills, and background. I can't answer about anyone else, but I'm happy to tell you about him! 🤖";
        }
    }

    return null;
}

/** Build a crisp, human answer from the retrieved knowledge chunks. */
function buildGroundedAnswer(retrievedChunks: { title: string; content: string }[]): string {
    if (retrievedChunks.length === 0) {
        return "I only have knowledge about Samarth Maheshwari — his projects, skills, education, and background. I can't help with anything else, but feel free to ask about him!";
    }

    const top = retrievedChunks[0];
    const body = top.content
        .replace(/#{1,6}\s*/g, '')
        .replace(/\*\*/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

    return body;
}

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

        // 2. Rate Limiting Check
        const rateLimit = await checkRateLimit(ip, env);
        if (!rateLimit.allowed) {
            return errorResponse(rateLimit.error || 'Rate limit exceeded', 429);
        }

        // 3. Samarth-only guard — refuse questions about anyone else.
        const nonSamarth = detectNonSamarth(query);
        if (nonSamarth) {
            return jsonResponse({ message: nonSamarth, sources: [], actions: [] });
        }

        // 4. Static FAQ Cache (Layer 1)
        const faqMatch = checkFaqCache(query);
        if (faqMatch) {
            return jsonResponse({ ...faqMatch, fromCache: true });
        }

        // 5. Response Cache (Layer 2)
        const cacheMatch = getCachedResponse(query);
        if (cacheMatch) {
            return jsonResponse(cacheMatch);
        }

        // 6. RAG Retrieval — deterministic, always available.
        const retrievedChunks = retrieve(query);

        if (!isConfident(retrievedChunks)) {
            // No confident knowledge -> be honest, never hallucinate, never 500.
            const answer = history.length > 0
                ? "I don't have that specific detail about Samarth in my knowledge base. I can tell you about his projects, skills, education, or how to contact him. What would you like to know?"
                : "I can answer questions about Samarth Maheshwari — his projects like JARVIS, SnapTrace AI and Project Aion, his skills, his education, or how to contact him. What would you like to know?";
            const safeResponse: AskResponse = {
                message: answer,
                sources: [],
                actions: [
                    { type: 'SCROLL_TO_SECTION', target: 'projects-section', label: 'View Projects' },
                    { type: 'OPEN_CONTACT', target: 'contact-section', label: 'Contact Samarth' }
                ]
            };
            cacheResponse(query, safeResponse, CONFIG.CACHE_TTL * 1000);
            return jsonResponse(safeResponse);
        }

        const sourceTitles = Array.from(new Set(retrievedChunks.map(c => c.title)));
        const actions = buildActions(query);

        // 7. Build grounded, friendly answer (deterministic — never fails).
        const groundedAnswer = buildGroundedAnswer(retrievedChunks);
        const context = buildContext(retrievedChunks);

        // 8. Optional LLM enhancement — best-effort. Any failure keeps the grounded answer.
        let finalMessage = groundedAnswer;
        if (env.OPENCODE_API_KEY) {
            try {
                const ai = new OpenCodeProvider(env.OPENCODE_API_KEY, env.AI_MODEL || CONFIG.AI_MODEL);

                // Include recent conversation turns for continuity within the session.
                const historyBlock = history
                    .slice(-6)
                    .map(h => `${h.role === 'user' ? 'User' : 'Samarth AI'}: ${h.content}`)
                    .join('\n');

                const systemPrompt = `You are Samarth AI, the digital AI representative of Samarth Maheshwari.
You ONLY provide information about Samarth Maheshwari — his projects, skills, education, and background.
If the question is about anyone else, politely decline and offer to talk about Samarth.
Use ONLY the provided CONTEXT and conversation history to answer. Never invent facts.
Keep answers concise, professional, friendly, and structured with bullet points when helpful.
Respond in plain text with Markdown. Don't use JSON.`;

                const userMessage = (historyBlock ? `${historyBlock}\n\n` : '') +
                    `CONTEXT:\n${context}\n\nQUESTION:\n${query}`;

                const llm = await ai.generateResponse(systemPrompt, query, userMessage, CONFIG.MAX_OUTPUT_TOKENS);
                if (llm && llm.trim().length > 10 && !/temporarily offline/i.test(llm)) {
                    finalMessage = llm;
                }
            } catch (err: any) {
                console.error('LLM enhancement failed, using grounded answer:', err?.message || err);
                // fall through to groundedAnswer
            }
        }

        // 9. Construct and Cache Final Response
        const responseData: AskResponse = {
            message: finalMessage,
            sources: sourceTitles,
            actions: actions
        };

        cacheResponse(query, responseData, CONFIG.CACHE_TTL * 1000);
        return jsonResponse(responseData);

    } catch (err: any) {
        console.error('Error handling ask request:', err.message || err);
        console.error(err.stack);
        // NEVER return 500 for a bad AI call — the frontend shows "SYSTEM ERROR".
        // Return a safe, honest grounded response with 200.
        return jsonResponse({
            message: "Sorry, I hit a snag answering that. I can tell you about Samarth's projects, skills, education, or how to contact him — try asking one of those!",
            sources: [],
            actions: [{
                type: 'SCROLL_TO_SECTION',
                target: 'projects-section',
                label: 'View Projects'
            }]
        }, 200);
    }
}

function buildActions(query: string): PortfolioAction[] {
    const actions: PortfolioAction[] = [];
    const q = query.toLowerCase();

    if (q.includes('project') || q.includes('build') || q.includes('make') || q.includes('aion') || q.includes('snaptrace')) {
        actions.push({ type: 'SCROLL_TO_SECTION', target: 'projects-section', label: 'View Projects' });
    } else if (q.includes('skill') || q.includes('tech') || q.includes('what can he do')) {
        actions.push({ type: 'SCROLL_TO_SECTION', target: 'about-section', label: 'View Skills' });
    } else if (q.includes('contact') || q.includes('hire') || q.includes('email') || q.includes('reach')) {
        actions.push({ type: 'OPEN_CONTACT', target: 'contact-section', label: 'Contact Me' });
    } else if (q.includes('about') || q.includes('who is') || q.includes('educat')) {
        actions.push({ type: 'SCROLL_TO_SECTION', target: 'about-section', label: 'About Me' });
    }
    return actions;
}

// Helpers
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