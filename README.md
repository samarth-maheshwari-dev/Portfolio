# Samarth Maheshwari — Portfolio

**Full Stack Engineer · AI & Automation Builder** · Indore, India

🔗 Live: https://samarth-portfolio-kappa-virid.vercel.app

![Portfolio preview](og-image.png)

## What's inside

| Part | Tech | Notes |
|------|------|-------|
| Site | HTML, CSS, vanilla JS, Three.js (WebGL fluid background), Lenis | Single static page deployed on Vercel. No build step. |
| AI chat ("Ask my AI") | Cloudflare Worker (TypeScript) in [`samarth-ai-worker/`](samarth-ai-worker) | Answers only about Samarth from [`knowledge.md`](samarth-ai-worker/knowledge.md). Provider chain: Cloudflare Workers AI → Groq → Gemini, then a deterministic answer from the knowledge file, so it never shows "offline". Rate limiting, validation, FAQ + answer caching, daily health check. |
| Contact form | FormSubmit (AJAX) | Client-side validation + honeypot spam trap. |

## Featured projects

- **JARVIS** — Windows AI desktop assistant with a 5-model LLM fallback chain (cloud → local). [Repo](https://github.com/samarth-maheshwari-dev/Personal-Ai-ASISTANT)
- **Project Aion** — RAG + knowledge-graph assistant for industrial documents (ET AI Hackathon 2026). [Repo](https://github.com/samarth-maheshwari-dev/Aion-project-for-Economic-Times)
- **SnapTrace AI** — photo-first AI lost-and-found app, shipped live at IntelliAI Arena 2026. [Live](https://snaptrace-ai.vercel.app)

## Run locally

```bash
# site
npx serve .            # or: python -m http.server 3000

# AI worker — works with no keys (Workers AI); optional GROQ_API_KEY / GEMINI_API_KEY in .dev.vars
cd samarth-ai-worker
npm install
npm test               # 22 end-to-end tests with mocked providers
npm run dev            # http://127.0.0.1:8787 — the site auto-uses this on localhost
```

## Deploy

- **Site:** push to `main` → Vercel deploys automatically.
- **Worker:** `cd samarth-ai-worker && npm run deploy` (to update what the bot knows, edit `knowledge.md` and deploy)

## Contact

[LinkedIn](https://www.linkedin.com/in/samarth-maheshwari-71a152326/) · [GitHub](https://github.com/samarth-maheshwari-dev) · samarthmaheshwari54321@gmail.com
