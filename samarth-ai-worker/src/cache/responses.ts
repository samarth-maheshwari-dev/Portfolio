// ============================================================
// Samarth AI — Static FAQ Cache (Layer 1 — Zero AI Cost)
// Common questions answered instantly without AI calls.
// ============================================================

import type { AskResponse } from '../types';

interface CacheEntry {
    keywords: string[];
    response: AskResponse;
}

const FAQ_CACHE: CacheEntry[] = [
    {
        keywords: ['who are you', 'what are you', 'introduce yourself'],
        response: {
            message:
                "Hi! I'm Samarth AI — Samarth Maheshwari's digital AI representative. I can tell you about his projects, skills, education, technical journey, and what he's currently building. What would you like to know?",
            sources: ['Samarth AI System'],
            actions: [],
        },
    },
    {
        keywords: ['who is samarth', 'tell me about samarth', 'about samarth'],
        response: {
            message:
                "Samarth Maheshwari is an AI-focused Full Stack Developer currently pursuing B.Tech in Computer Science & Information Technology at Acropolis Institute of Technology and Research (AITR), Indore. He's passionate about building practical AI-powered applications, automation systems, and modern web experiences. His work spans from personal AI assistants to full-stack web platforms.",
            sources: ['Profile', 'Education'],
            actions: [
                {
                    type: 'SCROLL_TO_SECTION',
                    target: 'about-section',
                    label: 'View About',
                },
            ],
        },
    },
    {
        keywords: ['skills', 'tech stack', 'technologies', 'what can he do'],
        response: {
            message:
                "Samarth's core tech stack includes:\n\n**Languages:** Python, JavaScript, TypeScript, C, C++, Kotlin\n**Frontend:** React, Next.js, Tailwind CSS, HTML/CSS\n**Backend:** Node.js, Django, Flask, FastAPI\n**AI/ML:** TensorFlow, PyTorch, OpenCV, Scikit-Learn, Hugging Face, NumPy, Pandas\n**Databases:** MongoDB, PostgreSQL, MySQL, Firebase, Redis\n**Cloud & DevOps:** Docker, AWS, Azure, Linux, Vercel\n**Tools:** Git, GitHub, VS Code, Figma, Postman, Jupyter\n\nPython is his primary language for AI engineering, and he uses JavaScript/TypeScript for full-stack web development.",
            sources: ['Technical Skills'],
            actions: [
                {
                    type: 'SCROLL_TO_SECTION',
                    target: 'tech-section',
                    label: 'View Skills',
                },
            ],
        },
    },
    {
        keywords: [
            'contact', 'hire', 'hiring', 'reach', 'email', 'get in touch',
            'how to contact', 'connect',
        ],
        response: {
            message:
                "You can reach Samarth through the contact section of his portfolio. He's available for internship opportunities, collaborations, and freelance projects. Feel free to send him a message!",
            sources: ['Contact Information'],
            actions: [
                {
                    type: 'SCROLL_TO_SECTION',
                    target: 'contact-section',
                    label: 'Go to Contact',
                },
            ],
        },
    },
    {
        keywords: ['resume', 'cv', 'download resume'],
        response: {
            message:
                "You can view Samarth's professional background through the portfolio sections. For the most up-to-date resume, feel free to contact him directly through the contact section.",
            sources: ['Profile'],
            actions: [
                {
                    type: 'OPEN_CONTACT',
                    target: 'contact-section',
                    label: 'Contact Samarth',
                },
            ],
        },
    },
    {
        keywords: ['projects', 'what has he built', 'work', 'portfolio projects'],
        response: {
            message:
                "Samarth has built several notable projects:\n\n**Project Aion** — An Industrial Knowledge Intelligence Platform built for the ET AI Hackathon 2026.\n\n**JARVIS** — A personal AI assistant with system control, automation, and voice interaction.\n\n**Snaptrace AI** — An AI platform helping students find and claim lost items.\n\n**Dotnet AI Game** — An AI-integrated multiplayer game.\n\n**Portfolio** — This animated website featuring GSAP, WebGL, and me (an AI)!\n\nWant to know more about any specific project?",
            sources: ['Projects'],
            actions: [
                {
                    type: 'SCROLL_TO_SECTION',
                    target: 'services-section',
                    label: 'View Projects',
                },
            ],
        },
    },
    {
        keywords: ['jarvis', 'ai assistant', 'personal assistant'],
        response: {
            message:
                "JARVIS is Samarth's personal AI assistant — a Python-based system that can control the computer, automate tasks, interact through voice, and serve as an intelligent automation layer. It demonstrates Samarth's ability to build practical, real-world AI applications that go beyond simple chatbots.",
            sources: ['JARVIS Project'],
            actions: [
                {
                    type: 'SCROLL_TO_SECTION',
                    target: 'services-section',
                    label: 'View Projects',
                },
            ],
        },
    },
];

/**
 * Normalize a query for cache lookup.
 */
function normalize(query: string): string {
    return query
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Check static FAQ cache. Returns response if matched, null otherwise.
 * Zero AI cost for common questions.
 */
export function checkFaqCache(query: string): AskResponse | null {
    const normalized = normalize(query);

    for (const entry of FAQ_CACHE) {
        for (const keyword of entry.keywords) {
            const regex = new RegExp(`\\b${keyword}\\b`, 'i');
            if (regex.test(normalized)) {
                return entry.response;
            }
        }
    }

    return null;
}

// ── Response Cache (Layer 2 — cache AI responses) ──
const responseCache = new Map<string, { response: AskResponse; expiresAt: number }>();

export function getCachedResponse(query: string): AskResponse | null {
    const key = normalize(query);
    const cached = responseCache.get(key);
    if (cached && Date.now() < cached.expiresAt) {
        return { ...cached.response, fromCache: true };
    }
    if (cached) responseCache.delete(key);
    return null;
}

export function cacheResponse(query: string, response: AskResponse, ttlMs: number): void {
    const key = normalize(query);
    // Limit cache size to prevent memory issues
    if (responseCache.size > 200) {
        // Evict oldest entries
        const firstKey = responseCache.keys().next().value;
        if (firstKey) responseCache.delete(firstKey);
    }
    responseCache.set(key, { response, expiresAt: Date.now() + ttlMs });
}
