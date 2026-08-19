// ============================================================
// Samarth AI — Request Validation
// Schema validation + sanitization for incoming requests.
// ============================================================

import { CONFIG } from '../config';
import type { AskRequest } from '../types';

export interface ValidationResult {
    valid: boolean;
    error?: string;
    data?: AskRequest;
}

/**
 * Validate and sanitize the incoming request body.
 * Rejects malformed, oversized, or missing payloads.
 */
export function validateRequest(body: unknown): ValidationResult {
    // Must be an object
    if (!body || typeof body !== 'object') {
        return { valid: false, error: 'Invalid request body.' };
    }

    const obj = body as Record<string, unknown>;

    // Must have "message" field
    if (!('message' in obj) || typeof obj.message !== 'string') {
        return { valid: false, error: 'Missing or invalid "message" field.' };
    }

    const message = obj.message.trim();

    // Must not be empty
    if (message.length === 0) {
        return { valid: false, error: 'Message cannot be empty.' };
    }

    // Must not exceed max length
    if (message.length > CONFIG.MAX_INPUT_CHARS) {
        return {
            valid: false,
            error: `Message too long. Maximum ${CONFIG.MAX_INPUT_CHARS} characters.`,
        };
    }

    // Reject if message contains only special characters
    const alphanumericCount = (message.match(/[a-zA-Z0-9]/g) || []).length;
    if (alphanumericCount < 2) {
        return { valid: false, error: 'Please ask a meaningful question.' };
    }

    return { valid: true, data: { message } };
}
