// ============================================================
// Samarth AI — Main API Logic
// Unified single-MD knowledge system.
// ============================================================

import { CONFIG } from '../config';
import type { Env, AskRequest, AskResponse, PortfolioAction, HistoryTurn } from '../types';
import { OpenCodeProvider } from '../ai/opencode';
import { validateRequest } from '../security/validation';
import { checkRateLimit } from '../security/rate-limit';
import { checkFaqCache, getCachedResponse, cacheResponse } from '../cache/responses';
// @ts-ignore
import KNOWLEDGE_CONTEXT from '../../knowledge.md';

// ── Off-topic Detection ──────────────────────────────────────
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

const OFF_TOPIC_PATTERNS: RegExp[] = [
    /\b(capital of|president of|prime minister of|population of|currency of|flag of)\b/i,
    /\b(weather|temperature|forecast|rain|sunny|cloudy|humidity)\b/i,
    /\b(calculate|compute|solve|equation|integral|derivative|factorial|prime number|fibonacci)\b/i,
    /\b(recipe|cook|bake|ingredient|dish|food|restaurant|meal)\b/i,
    /\b(symptom|disease|medicine|doctor|hospital|diagnose|treat|pill|vaccine)\b/i,
    /\b(news|politics|election|vote|government|parliament|senate|congress|war|military|army)\b/i,
    /\b(movie|film|song|lyric|actor|actress|singer|band|album|celebrity|gossip)\b/i,
    /\b(cricket match|football match|score|ipl|nba|nfl|fifa|olympics|world cup)\b/i,
    /\b(stock price|share price|invest|crypto|bitcoin|ethereum|forex|market cap|nifty|sensex)\b/i,
    /\b(write me a|generate code for|how to code|fix this bug|debug this|explain this algorithm)\b/i,
    /\b(tell me a joke|funny|meme|prank|riddle)\b/i,
    /\b(world war|ancient|medieval|pyramid|roman empire|greek|viking)\b/i,
];

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

function detectOffTopic(query: string): string | null {
    const q = normalizeForGuard(query);
    for (const pattern of SAMARTH_ALLOW_PATTERNS) {
        if (pattern.test(query)) return null;
    }
    for (const name of NON_SAMARTH_NAMES) {
        if (q.includes(name)) {
            return `I'm Samarth's AI assistant — I only know about Samarth Maheshwari, his projects, skills, and background. I can't answer questions about other people! 😊`;
        }
    }
    for (const pattern of OFF_TOPIC_PATTERNS) {
        if (pattern.test(query)) {
            return `Sorry, I can only answer questions about Samarth Maheshwari — his projects, skills, education, and background. I can't help with that topic! 🤖`;
        }
    }
    return null;
}

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

export async function handleAsk(request: Request, env: Env): Promise<Response> {
    const ip = request.headers.get('cf-connecting-ip') || 'unknown';

    try {
        let body: unknown;
        try { body = await request.json(); } catch { return errorResponse('Invalid JSON', 400); }

        const { valid, error, data } = validateRequest(body);
        if (!valid || !data) return errorResponse(error || 'Invalid request', 400);
        
        const query = data.message;
        const history: HistoryTurn[] = data.history || [];

        const rateLimit = await checkRateLimit(ip, env);
        if (!rateLimit.allowed) {
            return jsonResponse({ message: rateLimit.error || 'Too many requests. Please wait a moment.', sources: [], actions: [] });
        }

        const offTopic = detectOffTopic(query);
        if (offTopic) return jsonResponse({ message: offTopic, sources: [], actions: [] });

        const faqMatch = checkFaqCache(query);
        if (faqMatch) return jsonResponse({ ...faqMatch, fromCache: true });

        const cacheMatch = getCachedResponse(query);
        if (cacheMatch) return jsonResponse(cacheMatch);

        const actions = buildActions(query);
        let finalMessage = "I am having trouble connecting to my brain right now! But you can always contact Samarth directly below.";
        
        // Single knowledge file logic
        if (env.OPENCODE_API_KEY) {
            try {
                const ai = new OpenCodeProvider(env.OPENCODE_API_KEY, env.AI_MODEL || CONFIG.AI_MODEL);

                const historyBlock = history
                    .slice(-4)
                    .map(h => `${h.role === 'user' ? 'User' : 'Samarth AI'}: ${h.content}`)
                    .join('\n');

                const userMessage = [
                    historyBlock ? `CONVERSATION HISTORY:\n${historyBlock}` : '',
                    `CONTEXT:\n${KNOWLEDGE_CONTEXT}`,
                    `QUESTION:\n${query}`
                ].filter(Boolean).join('\n\n');

                const llmAnswer = await ai.generateResponse(
                    SYSTEM_PROMPT,
                    query,
                    userMessage,
                    CONFIG.MAX_OUTPUT_TOKENS
                );

                if (llmAnswer && llmAnswer.trim().length > 10 && !/temporarily offline/i.test(llmAnswer)) {
                    finalMessage = llmAnswer;
                }
            } catch (err: any) {
                console.warn('LLM failed:', err?.message || err);
            }
        }

        // Just list Samarth AI as source since everything is combined
        const responseData: AskResponse = {
            message: finalMessage,
            sources: ['Samarth AI Core System'],
            actions,
        };

        cacheResponse(query, responseData, CONFIG.CACHE_TTL * 1000);
        return jsonResponse(responseData);

    } catch (err: any) {
        console.error('Unhandled error in handleAsk:', err?.message || err);
        return jsonResponse({
            message: "I had a small hiccup! You can ask me about Samarth's projects, skills, education, or how to contact him.",
            sources: [],
            actions: [{ type: 'SCROLL_TO_SECTION', target: 'about-section', label: 'About Samarth' }]
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

function jsonResponse(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' }});
}

function errorResponse(error: string, status = 400): Response {
    return new Response(JSON.stringify({ error }), { status, headers: { 'Content-Type': 'application/json' }});
}