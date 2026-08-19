import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Provide __dirname equivalent in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const KNOWLEDGE_DIR = path.join(__dirname, '../knowledge');
const OUTPUT_FILE = path.join(__dirname, '../data/vectors.json');

// Types
interface DocumentMetadata {
    id: string;
    category: string;
    title: string;
    visibility: 'public' | 'internal' | 'private';
}

interface ParsedDocument {
    metadata: DocumentMetadata;
    content: string;
}

interface Chunk {
    id: string;
    documentId: string;
    category: string;
    title: string;
    content: string;
    visibility: 'public' | 'internal' | 'private';
    tfidfVector: Record<string, number>;
}

// ── Helpers ──

/** Parse Simple YAML Frontmatter from Markdown */
function parseMD(content: string): ParsedDocument {
    const lines = content.split('\n');
    let inFrontmatter = false;
    let frontmatterRaw = '';
    let body = '';

    for (const line of lines) {
        if (line.trim() === '---') {
            if (inFrontmatter) {
                inFrontmatter = false;
            } else if (body.length === 0) {
                inFrontmatter = true;
            } else {
                body += line + '\n';
            }
        } else if (inFrontmatter) {
            frontmatterRaw += line + '\n';
        } else {
            body += line + '\n';
        }
    }

    const metadata: any = {
        id: `gen-${Date.now()}`,
        category: 'general',
        title: 'Untitled',
        visibility: 'private'
    };

    frontmatterRaw.split('\n').forEach(line => {
        const idx = line.indexOf(':');
        if (idx > -1) {
            const key = line.slice(0, idx).trim();
            const val = line.slice(idx + 1).trim();
            metadata[key] = val;
        }
    });

    return { metadata: metadata as DocumentMetadata, content: body.trim() };
}

/** Basic overlapping chunker by paragraphs/sentences (roughly ~300 tokens) */
function chunkText(text: string, maxTokensRoughly = 150): string[] {
    const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
    const chunks: string[] = [];
    let currentChunk = '';

    for (const p of paragraphs) {
        // very rough approximation: 1 token ≈ 4-5 chars. 150 tokens ≈ 600 chars.
        if (currentChunk.length + p.length > maxTokensRoughly * 4 && currentChunk.length > 0) {
            chunks.push(currentChunk.trim());
            // Overlap: keep the last sentence or part of the last paragraph
            const sentences = currentChunk.split(/(?<=[.!?])\s+/);
            currentChunk = sentences.length > 1 ? sentences.slice(-Math.min(2, sentences.length)).join(' ') + ' ' + p : p;
        } else {
            currentChunk += (currentChunk ? '\n\n' : '') + p;
        }
    }
    if (currentChunk) chunks.push(currentChunk.trim());

    return chunks.length ? chunks : [text];
}

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


// ── Main Pipeline ──

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
    if (!fs.existsSync(dirPath)) return arrayOfFiles;

    const files = fs.readdirSync(dirPath);
    files.forEach(function (file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
        } else if (file.endsWith('.md')) {
            arrayOfFiles.push(path.join(dirPath, "/", file));
        }
    });

    return arrayOfFiles;
}

async function buildIndex() {
    console.log('Building local TF-IDF Knowledge Index...');

    const files = getAllFiles(KNOWLEDGE_DIR);
    console.log(`Found ${files.length} knowledge documents.`);

    const allChunks: Chunk[] = [];

    files.forEach(file => {
        const rawContent = fs.readFileSync(file, 'utf-8');
        const { metadata, content } = parseMD(rawContent);

        // Security check: Only index public files
        if (metadata.visibility !== 'public') {
            console.log(`Skipping non-public document: ${metadata.id}`);
            return;
        }

        const textChunks = chunkText(content);

        textChunks.forEach((text, index) => {
            const tokens = tokenize(text);
            const tfidfVector = buildTfVector(tokens);

            allChunks.push({
                id: `${metadata.id}-chunk-${index}`,
                documentId: metadata.id,
                category: metadata.category || 'general',
                title: metadata.title,
                visibility: metadata.visibility,
                content: text,
                tfidfVector
            });
        });
    });

    // Ensure data dir exists
    const dataDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    // Write to vectors.json
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allChunks, null, 2));

    console.log(`Successfully generated index with ${allChunks.length} chunks.`);
    console.log(`Saved to ${OUTPUT_FILE}`);
}

buildIndex().catch(console.error);
