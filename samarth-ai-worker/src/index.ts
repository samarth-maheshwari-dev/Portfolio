// ============================================================
// Samarth AI — Cloudflare Worker Entry Point
// Handles CORS, routing, and environment injection.
// ============================================================

import { handleAsk } from './api/ask';
import type { Env } from './types';
import { CONFIG } from './config';

export default {
    async fetch(
        request: Request,
        env: Env,
        ctx: ExecutionContext
    ): Promise<Response> {
        const url = new URL(request.url);
        const origin = request.headers.get('Origin') || '';

        // Determine allowed origin (allow localhost strictly for dev)
        const allowedOrigin = env.ALLOWED_ORIGIN || '*';
        const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
        const isAllowed = allowedOrigin === '*' || origin === allowedOrigin || isLocalhost;

        // CORS Headers
        const corsHeaders: Record<string, string> = {
            'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigin,
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400',
            'Vary': 'Origin',
        };

        // Handle CORS preflight options
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        // Wrap the response to always inject CORS headers
        try {
            let response: Response;

            if (url.pathname === '/api/ask' && request.method === 'POST') {
                // Strict origin check for production (if not wildcard)
                if (allowedOrigin !== '*' && !isAllowed) {
                    response = new Response('Forbidden: Invalid Origin', { status: 403 });
                } else {
                    response = await handleAsk(request, env);
                }
            }
            else if (url.pathname === '/health' && request.method === 'GET') {
                response = new Response(JSON.stringify({ status: 'ok', enabled: env.AI_ENABLED }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            else {
                response = new Response('Not Found', { status: 404 });
            }

            // Add CORS headers to the valid response
            const newHeaders = new Headers(response.headers);
            for (const [key, value] of Object.entries(corsHeaders)) {
                newHeaders.set(key, value);
            }

            return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: newHeaders,
            });

        } catch (error: any) {
            console.error('Worker global error:', error);
            return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
                status: 500,
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                },
            });
        }
    },
};
