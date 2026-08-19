// ============================================================
// Samarth AI — Type Definitions
// ============================================================

export interface Env {
    OPENCODE_API_KEY: string;
    AI_ENABLED: string;
    AI_MODEL: string;
    ALLOWED_ORIGIN: string;
}

export interface AskRequest {
    message: string;
}

export interface AskResponse {
    message: string;
    sources: string[];
    actions: PortfolioAction[];
    fromCache?: boolean;
}

export interface PortfolioAction {
    type: string;
    target: string;
    label?: string;
}

export interface RetrievedChunk {
    id: string;
    documentId: string;
    category: string;
    title: string;
    content: string;
    score: number;
    visibility: 'public' | 'internal' | 'private';
}

export interface KnowledgeDocument {
    id: string;
    category: string;
    title: string;
    visibility: 'public' | 'internal' | 'private';
    content: string;
}

export interface IndexedChunk {
    id: string;
    documentId: string;
    category: string;
    title: string;
    content: string;
    visibility: string;
    tfidfVector: Record<string, number>;
}

// AI Provider interface — swap implementations without changing consumers
export interface AIProvider {
    generateResponse(
        systemPrompt: string,
        userMessage: string,
        context: string,
        maxTokens: number
    ): Promise<string>;
    healthCheck(): Promise<boolean>;
}
