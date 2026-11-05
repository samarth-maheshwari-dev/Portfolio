# About Samarth Maheshwari

Samarth Maheshwari is a full stack developer from Indore, India, who builds AI-powered products end to end. He is pursuing a B.Tech in Computer Science & Information Technology at Acropolis Institute of Technology and Research (AITR), Indore (RGPV University), batch 2024–2028.

He is targeting Java full stack and AI full stack roles. Java is his chosen backend language for his career; the projects he has shipped so far are built with Python (FastAPI) and JavaScript/TypeScript (React), and he has object-oriented C# (.NET) experience from an AI game project.

## Availability and Role Fit

Samarth is open to internships, technical collaborations and interesting projects. He fits junior full stack, Java full stack and AI-integration roles where he can work across the frontend, the backend API and LLM features. Evidence from his work: he has shipped a live AI web app during a hackathon (SnapTrace AI), built a RAG backend with 19 REST endpoints (Project Aion), and built a desktop AI assistant with a 5-model LLM fallback chain (JARVIS). He also led a six-member team for Smart India Hackathon 2026.

## Technical Skills

- Languages: Java (target backend language), Python, JavaScript, TypeScript, C#, C++ (for DSA), SQL
- Frontend: React, Next.js, Vite, Tailwind CSS, HTML/CSS, GSAP, Lenis, Three.js
- Backend: FastAPI, Node.js, Express.js, REST API design, WebSockets, authentication
- Databases and data: Supabase (PostgreSQL), PostgreSQL, SQLite, Firebase, FAISS vector search
- AI: LLM integration (Groq, Gemini, Claude API, Ollama), retrieval-augmented generation (RAG), multi-model fallback, Gemini Vision, Model Context Protocol (MCP), n8n automation, prompt engineering
- Tools and deployment: Git, GitHub, GitHub Actions, Vercel, Netlify, Cloudflare Workers, Electron

## Project: JARVIS — AI Desktop Assistant

JARVIS is Samarth's flagship personal project: an AI desktop assistant for Windows 11. It uses a 5-model LLM fallback chain that moves from cloud models to local Ollama models when a model fails, so it keeps working offline. It routes each request through a regex-based Hinglish intent parser: common commands (open apps, close windows, change volume, play music) run instantly, live questions go to a DuckDuckGo search, and everything else goes to the LLM chain. It automates the Windows desktop (pywin32, pycaw, media sessions, Spotify and YouTube tabs, file search), can build PPT and PDF documents from a prompt, has a "hey jarvis" wake phrase and Ctrl+Alt+J hotkey, and replies with Indian English or Hindi neural voices (edge-tts). Stack: Python, FastAPI, Electron, React, Ollama, WebSockets. The Ollama chain is two cloud models followed by gemma4:e2b, qwen2.5:3b and phi3:mini running locally. Code: https://github.com/samarth-maheshwari-dev/Personal-Ai-ASISTANT

## Project: Project Aion — Industrial Knowledge AI

Project Aion was built for the Economic Times AI Hackathon 2026. It is a retrieval-augmented generation (RAG) system that turns scattered industrial documents (OEM manuals, SOPs, diagrams) into a searchable knowledge system: documents are ingested with OCR (Tesseract), embedded with sentence-transformers into a FAISS vector index, linked in an SQLite knowledge graph of equipment and incidents, and answered in natural language with source citations through Groq-hosted LLMs, with a local Ollama model as fallback. It also captures expert knowledge and lessons learned. The backend exposes 19 REST endpoints (FastAPI) with a React frontend. Code: https://github.com/samarth-maheshwari-dev/Aion-project-for-Economic-Times

## Project: SnapTrace AI — Campus Lost and Found

SnapTrace AI is a photo-first lost-and-found platform for college campuses, built by a team of three at IntelliAI Arena 2026 (AITR) and shipped live during the hackathon. Gemini Vision turns a photo of an item into details (type, colour, brand, marks) and found reports are ranked by similarity; claimants must describe a detail only the owner would know. Stack: TypeScript, React (Vite), Supabase, Gemini Vision, Vercel. Live: https://snaptrace-ai.vercel.app

## Project: AI Tic Tac Toe (C# / .NET)

A Tic Tac Toe game in C# with an unbeatable AI opponent using the Minimax algorithm with alpha-beta pruning, plus a two-player mode. The code separates AI logic, game state and rendering following SOLID object-oriented design.

## Project: Animated Website and this Portfolio

Samarth delivered a production animated website for a client using GSAP ScrollTrigger and Three.js in vanilla JavaScript. This portfolio is a static site with a WebGL fluid background, and its AI assistant (Samarth AI) runs on a Cloudflare Worker that answers only from this knowledge file, with rate limiting, caching and fallbacks across several AI providers.

## Hackathons and Leadership

- Smart India Hackathon 2026: team lead of a six-member team working on an AI and full stack problem statement.
- Economic Times AI Hackathon 2026: built Project Aion.
- IntelliAI Arena 2026 (AITR): built and shipped SnapTrace AI live with a team of three.

## Certifications

Anthropic: Claude 101, Introduction to Agent Skills, Introduction to Model Context Protocol, AI Fluency: Framework & Foundations, AI Fluency for Students. Others: Prompt Engineering with ChatGPT, Database Management System (NPTEL), Ultimate Web Development Course.

## Contact

Email: samarthmaheshwari54321@gmail.com. LinkedIn: https://www.linkedin.com/in/samarth-maheshwari-71a152326/ . GitHub: https://github.com/samarth-maheshwari-dev . His resume (PDF) and a contact form are on this portfolio, and the contact section also has a WhatsApp link.
