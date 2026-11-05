# Portfolio Audit — fix list (priority order)

## STATUS (updated 2026-11-05)
DONE in this pass: 1, 2, 3, 4, 5, 6, 7, 8 (README; you still `git rm repo.json`), 9, 10, 11, 12, 13, 19, 21 (ogl+GSAP removed, fluid sim lighter), 22 (needs `npm run deploy` in samarth-ai-worker), 24, 25 (enable Web Analytics in Vercel dashboard), 27, 28 (recruiter chips + hero CTA).
Also fixed: hero locked scrolling for ~6s; ogl was loaded from unpkg as an ES module (SyntaxError, dead code); reveal delays grew with page position (2-3s on lower sections); chat error copy + retry duplicating history; .gitignore was ignoring the resume PDF.
Already OK (audit was wrong): 23 — worker already has a static fallback provider + grounded answer fallback. Skills marquee "4x repeat" is the seamless-loop technique, not a bug (duplicates now aria-hidden).

NEEDS SAMARTH (can't be done without your data/decision):
- 14 real screenshots / short clips for Aion, SnapTrace, Animated Website cards
- 15 Animated Website: live link + client name, or drop it
- 16 Waterfall: you chose to remove it earlier — kept removed
- 17 your own metrics (latency, accuracy, users, placements)
- 18 case-study modal for each project (only JARVIS has one)
- 20 Next.js rebuild (decision pending)
- 26 custom domain (then update canonical/og URLs in <head>)
- Resume content is outdated vs site (lists Tic Tac Toe + Waterfall, no Aion; JARVIS provider chain differs) — update the .docx, re-export PDF
- knowledge.md still lists MongoDB as a skill; site no longer claims it
- GitHub repo name typo Personal-Ai-ASISTANT (rename on GitHub; old URL redirects; update link in index.html)

## P0 — Broken / embarrassing (fix first)
1. Mobile has NO navigation: `.nav-links { display:none }` at <=768px, no hamburger. Add mobile menu.
2. JS crash on every load: `document.getElementById('techPyramid')` is null (~line 6850) -> TypeError. Skills-pyramid HTML was removed but its ~66KB inline script + skill data remain. Delete dead code.
3. Hero above fold = only the word "SAMARTH". No role, no proof, no CTA. Hero must say: name + role + 1-line proof + [View Projects] [Resume] [Ask my AI].
4. About paragraph text-generate blur: text stays blurred mid-read. Make it finish <600ms or remove.
5. Resume is .docx with `download` -> bad on phones. Use PDF, open in new tab.
6. SEO/share: title "Portfolio - Home", no favicon, no og:image / twitter card, no canonical, no JSON-LD Person. LinkedIn link preview is blank.
7. Mobile overlaps: "Ask something about Samarth" pill covers content; theme toggle sits on top of profile photo. Collapse pill to icon on mobile; move toggle into navbar.
8. Repo hygiene: no README; `repo.json` empty file; "WhatsApp Image ...jpeg" deleted locally but still in git; GitHub repo name typo `Personal-Ai-ASISTANT`.

## P1 — Content (biggest recruiter impact)
9. Bio is generic ("enthusiastic", "state-of-the-art", "strive to keep code clean"). Rewrite with specifics: year/college, what you shipped, numbers.
10. Skills marquee repeated 4x and lists tools as skills (VS Code, Postman, ChatGPT, Cursor, Copilot, Bootstrap, HTML5, "Database"). Rule: every skill shown must map to a project. Drop the rest.
11. Claims without proof: "Mobile Development / React Native" service, no mobile project. Remove or add project.
12. "WHAT WE CAN DO" + 5 numbered services = agency copy, not candidate copy. Decide audience (recruiter vs client).
13. "Identity Verified" + "Online" badge = fake status, reads as fluff. Remove.
14. Project visuals: only JARVIS has a real screenshot. Aion/SnapTrace/Animated use emoji covers. Use real screenshots / 5-10s muted autoplay clips.
15. "Animated Website": generic name, no live link, no client named, repo `ANIMATED-WEBSITE-FOR-ANIMATED-WEBSITE`. Add live link + client or drop it.
16. Waterfall Restaurant (real client, live URL) was removed — it is the only proof of paid freelance work. Re-add as client case study.
17. Metrics: add YOUR results (latency, accuracy, users, hackathon placement), not problem stats.
18. Case-study modal exists only for JARVIS. Add for every project: problem, architecture diagram, key decisions, trade-offs, what broke.
19. Missing sections: Experience/Hackathons timeline (SIH 2026 team lead, ET AI Hackathon, IntelliAI Arena), short Education line, achievements.

## P2 — Engineering (engineer-recruiters view-source)
20. Single 8734-line, 367KB index.html with inline CSS/JS while claiming React/Next/TS. package.json lists react/framer-motion/typescript but they are unused. Rebuild in Next.js + Tailwind (or Astro), or at minimum split css/js files.
21. 4 animation libs: three.js r128 (2021, ~600KB) + ogl + GSAP + Lenis. Keep one or two. Target Lighthouse mobile >= 90.
22. AI worker rate limit is in-memory (per-isolate, resets on cold start); wrangler.toml has no RATE_LIMITER binding -> effectively unlimited. CORS is not auth (curl bypasses). Add CF rate-limit binding or Turnstile.
23. AI model `x-preview-f-free` is a free preview model — if it dies the chatbot breaks in front of a recruiter. Verify fallback message + health check.
24. Contact form (FormSubmit AJAX): add `_honey` honeypot, handle non-JSON error responses.
25. No analytics. Add Vercel Analytics to see who visits and which section.
26. Domain `samarth-portfolio-kappa-virid.vercel.app` looks auto-generated. Buy a custom domain (.dev/.in).
27. Accessibility: check all images alt, focus states, contrast in light mode, full prefers-reduced-motion coverage.

## P3 — Wow factor (only after P0-P2)
28. Make AI chat the hero feature: "Ask my AI if I fit your role" + recruiter preset questions + streaming + cites knowledge.md.
29. Recruiter TL;DR card (30-second summary: role, stack, best 3 projects, availability, resume).
30. Live "currently building" / GitHub activity strip.
31. Cmd+K command palette (projects, resume, contact).

## Done = verification
- 0 console errors, desktop + mobile.
- Lighthouse mobile: Perf >= 90, A11y >= 95, SEO 100.
- LinkedIn post preview shows image + title.
- 5-second test with 3 people: they can say your role + your best project.
