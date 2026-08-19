// ============================================================
// Samarth AI — Fallback Provider
// Returns static responses when the primary AI is unavailable.
// ============================================================

import type { AIProvider } from '../types';

export class FallbackProvider implements AIProvider {
    async generateResponse(): Promise<string> {
        return JSON.stringify({
            message:
                "Samarth AI is temporarily offline. You can explore the portfolio directly — check out the projects, skills, and contact sections. I'll be back soon!",
            sources: [],
            actions: [
                {
                    type: 'SCROLL_TO_SECTION',
                    target: 'about-section',
                    label: 'Explore About',
                },
            ],
        });
    }

    async healthCheck(): Promise<boolean> {
        return false;
    }
}
