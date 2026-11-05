// ============================================================
// Samarth AI — Answer caches
//  L1: static FAQ (zero AI cost) — covers the chat's suggestion chips
//  L2: in-memory map (per isolate)
//  L3: optional KV namespace CHAT_CACHE (shared across isolates)
// ============================================================

import { CONFIG } from '../config';
import type { AskResponse, KVLike } from '../types';

interface FaqEntry {
    patterns: RegExp[];
    response: AskResponse;
}

const PROJECTS = { type: 'SCROLL_TO_SECTION', target: 'projects-section', label: 'View Projects' };
const CONTACT = { type: 'OPEN_CONTACT', target: 'contact-section', label: 'Contact Samarth' };
const ABOUT = { type: 'SCROLL_TO_SECTION', target: 'about-section', label: 'View About' };

// Patterns run against the normalized question (lowercase, no punctuation).
// FAQ only answers SHORT, generic questions; anything specific goes to the AI.
const FAQ: FaqEntry[] = [
    {
        patterns: [/^(who|what) are you$/, /^introduce yourself$/, /^(hi|hello|hey)( there)?$/],
        response: {
            message:
                "Hi! I'm Samarth AI, Samarth Maheshwari's assistant on this portfolio. Ask me about his projects, skills, education, availability or how to contact him.",
            sources: [],
            actions: [],
        },
    },
    {
        patterns: [/^(who is|tell me about|about) samarth( maheshwari)?$/, /^who is he$/],
        response: {
            message:
                "Samarth Maheshwari is a full stack developer from Indore who builds AI-powered products end to end. He's doing a B.Tech in CSIT at AITR, Indore (2024–2028) and is targeting Java full stack and AI full stack roles.\n\nHe has shipped **SnapTrace AI** (live AI lost-and-found app, built at a hackathon), **Project Aion** (RAG platform with 22 REST endpoints, ET AI Hackathon 2026) and **JARVIS** (desktop AI assistant with a 5-model LLM fallback chain).",
            sources: ['About Samarth Maheshwari'],
            actions: [ABOUT],
        },
    },
    {
        patterns: [
            /^is (he|samarth) (a )?(good )?fit\b/,
            /^why should (i|we) hire (him|samarth)$/,
            /^(is he|is samarth) (available|open to work|looking for)/,
        ],
        response: {
            message:
                "Samarth fits junior full stack, Java full stack and AI-integration roles. What backs that up:\n\n- **Ships end to end:** SnapTrace AI went live on Vercel during a hackathon (TypeScript, Supabase, Gemini Vision).\n- **Backend + AI depth:** Project Aion has 22 REST endpoints with FAISS retrieval, OCR ingestion and source-cited answers.\n- **Reliability thinking:** JARVIS falls back across 5 LLMs from cloud to local so it keeps working offline.\n- **Leadership:** he led a six-member Smart India Hackathon 2026 team.\n\nHe's open to internships right now.",
            sources: ['Availability and Role Fit'],
            actions: [PROJECTS, CONTACT],
        },
    },
    {
        patterns: [
            /^what (has|did) (he|samarth) (shipped|built|made|build|ship)$/,
            /^(show me )?(his )?projects$/,
            /^what projects (has|did) (he|samarth) (built|done|made|build|do)$/,
        ],
        response: {
            message:
                "Main projects:\n\n- **JARVIS** — Windows AI desktop assistant, 5-model LLM fallback (cloud → local Ollama), desktop automation, web search, neural TTS.\n- **Project Aion** — RAG + knowledge-graph platform for industrial documents, 22 REST endpoints (ET AI Hackathon 2026).\n- **SnapTrace AI** — photo-first campus lost-and-found, shipped live during IntelliAI Arena 2026: https://snaptrace-ai.vercel.app\n- **AI Tic Tac Toe** — C#/.NET game with Minimax + alpha-beta pruning.\n\nAsk me about any one of them for details.",
            sources: ['Projects'],
            actions: [PROJECTS],
        },
    },
    {
        patterns: [/^(walk me through|tell me about|what is|explain) jarvis$/, /^jarvis$/],
        response: {
            message:
                "**JARVIS** is Samarth's AI desktop assistant for Windows 11.\n\n- **Reliability:** a 5-model LLM fallback chain moves from cloud models to local Ollama models when one fails, so it keeps working offline.\n- **Actions:** automates the Windows desktop (pywin32), searches the web (DuckDuckGo) and extracts pages (Trafilatura, BeautifulSoup fallback).\n- **Voice:** neural text-to-speech with edge-tts.\n- **Stack:** Python, FastAPI, Electron, React, Ollama, WebSockets.\n\nCode: https://github.com/samarth-maheshwari-dev/Personal-Ai-ASISTANT",
            sources: ['Project: JARVIS — AI Desktop Assistant'],
            actions: [PROJECTS],
        },
    },
    {
        patterns: [
            /^how (do|can) (i|we) (contact|reach|hire|email) (him|samarth)$/,
            /^(contact|contact him|contact details|email|his email)$/,
        ],
        response: {
            message:
                "You can reach Samarth at **samarthmaheshwari54321@gmail.com**, on LinkedIn (https://www.linkedin.com/in/samarth-maheshwari-71a152326/) or through the contact form and WhatsApp link on this page.",
            sources: ['Contact'],
            actions: [CONTACT],
        },
    },
    {
        patterns: [/^(resume|cv|his resume|download (his )?resume|where is (his )?resume)$/],
        response: {
            message:
                "Samarth's resume is a PDF on this portfolio: use the **Resume (PDF)** button at the top of the page or in the About section.",
            sources: ['Contact'],
            actions: [ABOUT],
        },
    },
];

export function normalize(query: string): string {
    return query
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export function checkFaqCache(query: string): AskResponse | null {
    const q = normalize(query);
    for (const entry of FAQ) {
        if (entry.patterns.some((p) => p.test(q))) return { ...entry.response, fromCache: true, via: 'faq' };
    }
    return null;
}

// ── L2: in-memory ──
const memory = new Map<string, { response: AskResponse; expiresAt: number }>();
const MEMORY_MAX = 300;

const cacheKey = (query: string) => 'ask:v2:' + normalize(query);

export async function getCachedResponse(query: string, kv?: KVLike): Promise<AskResponse | null> {
    const key = cacheKey(query);
    const hit = memory.get(key);
    if (hit && Date.now() < hit.expiresAt) return { ...hit.response, fromCache: true, via: 'cache' };
    if (hit) memory.delete(key);

    if (kv) {
        try {
            const raw = await kv.get(key);
            if (raw) {
                const response = JSON.parse(raw) as AskResponse;
                remember(key, response);
                return { ...response, fromCache: true, via: 'cache' };
            }
        } catch {
            /* cache is best-effort */
        }
    }
    return null;
}

function remember(key: string, response: AskResponse) {
    if (memory.size >= MEMORY_MAX) {
        const oldest = memory.keys().next().value;
        if (oldest) memory.delete(oldest);
    }
    memory.set(key, { response, expiresAt: Date.now() + CONFIG.CACHE_TTL_SECONDS * 1000 });
}

/** Only cache answers that came from an AI model (not fallbacks), so outages don't get cached. */
export async function cacheResponse(query: string, response: AskResponse, kv?: KVLike): Promise<void> {
    const key = cacheKey(query);
    remember(key, response);
    if (kv) {
        try {
            await kv.put(key, JSON.stringify(response), { expirationTtl: CONFIG.CACHE_TTL_SECONDS });
        } catch {
            /* KV write limits (free: 1k/day) — ignore */
        }
    }
}
