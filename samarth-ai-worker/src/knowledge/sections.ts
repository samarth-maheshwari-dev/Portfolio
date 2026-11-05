// ============================================================
// Samarth AI — Knowledge sections + lightweight retrieval
// knowledge.md is split on "## " headings. Each question gets
// only its most relevant sections, which keeps prompts small
// (free-tier token caps) and gives a deterministic answer when
// every AI provider is down.
// ============================================================

export interface Section {
    title: string;
    body: string;
    tokens: Set<string>;
    titleTokens: Set<string>;
}

const STOPWORDS = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'if', 'then', 'so', 'is', 'are', 'was', 'were', 'be', 'been',
    'am', 'of', 'to', 'for', 'with', 'on', 'at', 'by', 'from', 'in', 'into', 'about', 'which', 'what',
    'who', 'how', 'when', 'where', 'why', 'does', 'do', 'did', 'can', 'could', 'will', 'would', 'should',
    'this', 'that', 'these', 'those', 'it', 'its', 'as', 'not', 'no', 'yes', 'you', 'your', 'me', 'my',
    'tell', 'know', 'i', 'we', 'they', 'he', 'she', 'his', 'him', 'her', 'have', 'has', 'had', 'get',
    'please', 'also', 'any', 'some', 'very', 'just', 'like', 'more', 'most', 'there', 'here', 'samarth',
    'maheshwari', 'give', 'show', 'explain', 'walk', 'through', 'work', 'used', 'use',
]);

// Query words that should pull in a specific section even without literal overlap
const SYNONYMS: Record<string, string[]> = {
    fit: ['availability', 'role', 'junior', 'internship'],
    hire: ['availability', 'role', 'internship'],
    hiring: ['availability', 'role', 'internship'],
    intern: ['internship', 'availability'],
    internship: ['availability'],
    job: ['availability', 'role'],
    experience: ['hackathon', 'project', 'shipped'],
    built: ['project'],
    build: ['project'],
    made: ['project'],
    shipped: ['project', 'live', 'shipped'],
    stack: ['skills', 'technical'],
    tech: ['skills', 'technical'],
    skill: ['skills', 'technical'],
    languages: ['languages', 'skills'],
    email: ['contact'],
    reach: ['contact'],
    linkedin: ['contact'],
    phone: ['contact'],
    whatsapp: ['contact'],
    resume: ['contact', 'resume'],
    cv: ['contact', 'resume'],
    college: ['about', 'aitr', 'tech'],
    education: ['about', 'aitr', 'tech'],
    degree: ['about', 'tech'],
    spring: ['java'],
    springboot: ['java'],
    backend: ['backend', 'api', 'java'],
    frontend: ['frontend', 'react'],
    rag: ['aion', 'retrieval'],
    lost: ['snaptrace'],
    found: ['snaptrace'],
    assistant: ['jarvis'],
    team: ['hackathon', 'leadership', 'team'],
    leader: ['leadership', 'lead'],
    certificate: ['certifications'],
    certification: ['certifications'],
    certified: ['certifications'],
    study: ['about', 'aitr', 'tech'],
    studying: ['about', 'aitr', 'tech'],
    university: ['about', 'aitr', 'rgpv'],
    github: ['contact', 'github'],
    deployed: ['live', 'shipped', 'vercel'],
    deploy: ['live', 'vercel'],
    database: ['databases', 'supabase', 'postgresql'],
    api: ['rest', 'endpoints', 'backend'],
    model: ['llm', 'ai'],
};

export function tokenize(text: string): string[] {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9+#.\s-]/g, ' ')
        .split(/[\s/.-]+/)
        .map((t) => t.replace(/^[^a-z0-9]+|[^a-z0-9+#]+$/g, ''))
        .filter((t) => t.length > 1 && !STOPWORDS.has(t))
        .map(stem);
}

/** Tiny stemmer: enough to match "projects"→"project", "skills"→"skill". */
function stem(t: string): string {
    if (t.length > 4 && t.endsWith('ies')) return t.slice(0, -3) + 'y';
    if (t.length > 3 && t.endsWith('s') && !t.endsWith('ss')) return t.slice(0, -1);
    return t;
}

export function parseSections(markdown: string): Section[] {
    const text = markdown.replace(/^﻿/, '').replace(/\r\n/g, '\n');
    const parts = text.split(/\n(?=## )/);
    return parts
        .map((part) => {
            const lines = part.trim().split('\n');
            const title = lines[0].replace(/^#+\s*/, '').trim();
            const body = lines.slice(1).join('\n').trim();
            return {
                title,
                body,
                tokens: new Set(tokenize(title + ' ' + body)),
                titleTokens: new Set(tokenize(title)),
            };
        })
        .filter((s) => s.body.length > 0);
}

// Synonym keys are matched after stemming ("languages" → "language")
const STEMMED_SYNONYMS = new Map(Object.entries(SYNONYMS).map(([k, v]) => [stem(k), v] as const));

function expandQuery(query: string): string[] {
    const base = tokenize(query);
    const out = new Set(base);
    for (const t of base) for (const syn of STEMMED_SYNONYMS.get(t) ?? []) out.add(stem(syn));
    return [...out];
}

/** Score sections by token overlap (title hits weigh more). Ties keep file order. */
export function retrieve(sections: Section[], query: string, k: number): Section[] {
    const q = expandQuery(query);
    if (q.length === 0) return [];
    const scored = sections.map((s, idx) => {
        let score = 0;
        for (const t of q) {
            if (s.titleTokens.has(t)) score += 3;
            else if (s.tokens.has(t)) score += 1;
        }
        return { s, score, idx };
    });
    return scored
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score || a.idx - b.idx)
        .slice(0, k)
        .map((x) => x.s);
}

export function buildContext(selected: Section[], intro: Section | undefined): string {
    // Always include the short intro so the model knows who Samarth is
    const list = intro && !selected.includes(intro) ? [intro, ...selected] : selected;
    return list.map((s) => `## ${s.title}\n${s.body}`).join('\n\n');
}

/** Deterministic answer straight from the best section (used when all LLMs fail). */
export function groundedAnswer(best: Section | undefined): string {
    if (!best) {
        return "I can answer questions about Samarth's projects, skills, education, availability and contact details. What would you like to know?";
    }
    const body = best.body.length > 900 ? best.body.slice(0, 900).replace(/\s+\S*$/, '') + '…' : best.body;
    return `**${best.title}**\n\n${body}`;
}
