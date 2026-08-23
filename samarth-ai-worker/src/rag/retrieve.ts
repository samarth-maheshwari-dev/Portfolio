// ============================================================
// Samarth AI — TF-IDF Retrieval Engine
// V1: Local TF-IDF + cosine similarity.
// Interface is provider-independent — swap with semantic
// embeddings later without changing consumers.
// ============================================================

import { CONFIG } from '../config';
import type { IndexedChunk, RetrievedChunk } from '../types';

// Pre-computed index imported at build time
import vectorData from '../../data/vectors.json';

const chunks: IndexedChunk[] = vectorData as IndexedChunk[];

// ── TF-IDF Helpers ──

/** Tokenize and normalize a string */
function tokenize(text: string): string[] {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 1);
}

/** Build a TF vector from tokens */
function buildTfVector(tokens: string[]): Record<string, number> {
    const tf: Record<string, number> = {};
    for (const token of tokens) {
        tf[token] = (tf[token] || 0) + 1;
    }
    // Normalize by total tokens
    const total = tokens.length || 1;
    for (const key in tf) {
        tf[key] /= total;
    }
    return tf;
}

/** Helper to determine Levenshtein distance for typos */
function levenshtein(a: string, b: string): number {
    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    return matrix[b.length][a.length];
}

/** Cosine similarity with typo-tolerance (fuzzy matching) */
function cosineSimilarity(
    a: Record<string, number>,
    b: Record<string, number>
): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (const keyA in a) {
        normA += a[keyA] * a[keyA];
        let bestMatchScore = 0;

        for (const keyB in b) {
            if (keyA === keyB) {
                bestMatchScore = Math.max(bestMatchScore, a[keyA] * b[keyB]);
            } else {
                const maxLen = Math.max(keyA.length, keyB.length);
                if (maxLen > 3) {
                    const dist = levenshtein(keyA, keyB);
                    if (dist <= 2) {
                        const sim = 1 - (dist / maxLen);
                        if (sim >= 0.6) {
                            bestMatchScore = Math.max(bestMatchScore, a[keyA] * b[keyB] * sim);
                        }
                    } else if (keyA.includes(keyB) || keyB.includes(keyA)) {
                        bestMatchScore = Math.max(bestMatchScore, a[keyA] * b[keyB] * 0.7);
                    }
                }
            }
        }
        dotProduct += bestMatchScore;
    }

    for (const keyB in b) {
        normB += b[keyB] * b[keyB];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ── Public Retrieval Interface ──
// This is the stable interface. Replace internals with
// semantic embeddings later without changing callers.

/**
 * Retrieve top-K relevant public knowledge chunks for a query.
 * @param query - User's natural language question
 * @returns Ranked list of retrieved chunks with confidence scores
 */
export function retrieve(query: string): RetrievedChunk[] {
    const queryTokens = tokenize(query);
    if (queryTokens.length === 0) return [];

    const queryVector = buildTfVector(queryTokens);

    // Score all PUBLIC chunks
    const scored = chunks
        .filter((chunk) => chunk.visibility === 'public')
        .map((chunk) => ({
            ...chunk,
            score: cosineSimilarity(queryVector, chunk.tfidfVector),
        }))
        .filter((chunk) => chunk.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, CONFIG.TOP_K);

    return scored.map((c) => ({
        id: c.id,
        documentId: c.documentId,
        category: c.category,
        title: c.title,
        content: c.content,
        score: c.score,
        visibility: c.visibility as 'public',
    }));
}

/**
 * Check if retrieval confidence meets threshold.
 */
export function isConfident(chunks: RetrievedChunk[]): boolean {
    if (chunks.length === 0) return false;
    return chunks[0].score >= CONFIG.CONFIDENCE_THRESHOLD;
}

/**
 * Build grounded context string from retrieved chunks.
 */
export function buildContext(chunks: RetrievedChunk[]): string {
    return chunks
        .map(
            (c, i) =>
                `[Source ${i + 1}: ${c.title}]\n${c.content}`
        )
        .join('\n\n---\n\n');
}
