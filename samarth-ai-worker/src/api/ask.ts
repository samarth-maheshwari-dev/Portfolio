// ============================================================
// Samarth AI — Main API Logic
// Orchestrates the RAG pipeline, LLM call, and actions.
// ============================================================

import { CONFIG, ALLOWED_TARGETS } from '../config';
import type { Env, AskRequest, AskResponse, PortfolioAction } from '../types';
import { OpenCodeProvider } from '../ai/opencode';
import { FallbackProvider } from '../ai/fallback';
import { retrieve, isConfident, buildContext } from '../rag/retrieve';
import { validateRequest } from '../security/validation';
import { checkRateLimit } from '../security/rate-limit';
import { checkFaqCache, getCachedResponse, cacheResponse } from '../cache/responses';

/**
 * Handle POST /api/ask
 */
export async function handleAsk(request: Request, env: Env): Promise<Response> {
    // CORS Preflight handled in index.ts
    const ip = request.headers.get('cf-connecting-ip') || 'unknown';

    try {
        // 1. Kill Switch Check
        if (env.AI_ENABLED === 'false') {
            const fallback = new FallbackProvider();
            return new Response(await fallback.generateResponse(), {
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // 2. Parse & Validate Body
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

        // 3. Rate Limiting Check
        const rateLimit = checkRateLimit(ip);
        if (!rateLimit.allowed) {
            return errorResponse(rateLimit.error || 'Rate limit exceeded', 429);
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

        // 6. RAG Retrieval
        const retrievedChunks = retrieve(query);

        if (!isConfident(retrievedChunks)) {
            // Safe unknown response protecting against hallucinations
            const safeResponse: AskResponse = {
                message: "I don't have that specific information about Samarth in my current knowledge base. However, you can explore his projects and skills directly on the portfolio, or get in touch with him through the contact section.",
                sources: [],
                actions: [
                    { type: 'SCROLL_TO_SECTION', target: 'contact-section', label: 'Contact Samarth' }
                ]
            };
            cacheResponse(query, safeResponse, CONFIG.CACHE_TTL * 1000);
            return jsonResponse(safeResponse);
        }

        const context = buildContext(retrievedChunks);
        const sourceTitles = Array.from(new Set(retrievedChunks.map(c => c.title)));

        // 7. Determine Actions (Simple heuristic for V1, can be LLM-driven later)
        const actions: PortfolioAction[] = [];
        const qLower = query.toLowerCase();

        if (qLower.includes('project') || qLower.includes('build') || qLower.includes('make')) {
            actions.push({ type: 'SCROLL_TO_SECTION', target: 'services-section', label: 'View Projects' });
        } else if (qLower.includes('skill') || qLower.includes('tech') || qLower.includes('use')) {
            actions.push({ type: 'SCROLL_TO_SECTION', target: 'tech-section', label: 'View Skills' });
        } else if (qLower.includes('contact') || qLower.includes('hire') || qLower.includes('email')) {
            actions.push({ type: 'SCROLL_TO_SECTION', target: 'contact-section', label: 'Contact Me' });
        } else if (qLower.includes('about') || qLower.includes('who')) {
            actions.push({ type: 'SCROLL_TO_SECTION', target: 'about-section', label: 'About Me' });
        }

        // 8. Build System Prompt and Call AI
        const systemPrompt = `You are Samarth AI, the official AI digital representative of Samarth Maheshwari.
Your job is to answer questions about Samarth's skills, projects, and professional background.
You must ONLY use the provided context to answer. If the context does not contain the answer, say you don't have that information.
NEVER invent facts.
Keep answers concise, professional, friendly, and structured.
Respond with plain text formatted with Markdown. Don't use JSON format for your reply.`;

        // Ensure API Key exists
        if (!env.OPENCODE_API_KEY) {
            console.error("Missing OPENCODE_API_KEY environment variable");
            const fallback = new FallbackProvider();
            return new Response(await fallback.generateResponse(), {
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const aiProvider = new OpenCodeProvider(
            env.OPENCODE_API_KEY,
            env.AI_MODEL || CONFIG.AI_MODEL
        );

        const llmMessage = await aiProvider.generateResponse(
            systemPrompt,
            query,
            context,
            CONFIG.MAX_OUTPUT_TOKENS
        );

        // 9. Construct and Cache Final Response
        const responseData: AskResponse = {
            message: llmMessage,
            sources: sourceTitles,
            actions: actions
        };

        cacheResponse(query, responseData, CONFIG.CACHE_TTL * 1000);

        return jsonResponse(responseData);

    } catch (err: any) {
        console.error('Error handling ask request:', err);
        // Fallback on error
        const fallback = new FallbackProvider();
        return new Response(await fallback.generateResponse(), {
            headers: { 'Content-Type': 'application/json' },
            status: 500
        });
    }
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
