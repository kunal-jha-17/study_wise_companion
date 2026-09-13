# Studywise — Frontend

Turn a lecture PDF into condensed revision notes + an interactive 5-question practice quiz.

Built for **Prompt Wars** (Google for Developers × Hack2Skill × Android Club, VIT Bhopal) — track: AI-Powered Student Workspace.

**Live demo:** [PASTE YOUR PUBLISHED MANUS URL HERE]
**Backend repo:** https://github.com/kunal-jha-17/STUDYWISE

---

## What it does

1. **Upload** — drop in a lecture PDF (Word/slides also supported), optionally tag a subject and course level.
2. **Process** — the document is sent to the backend, which extracts the text and generates structured notes + a quiz.
3. **Study** — read condensed, sectioned revision notes on one side; answer an interactive multiple-choice quiz with instant feedback and a running score on the other. Export the whole kit as PDF or Markdown when you're done.

## Tech stack

- Vite + React + TypeScript
- Express (static file serving only — no business logic lives here; all AI processing happens on the backend)
- Deployed/built via [Manus](https://manus.im)

## Connecting to the backend

The app talks to the backend through a single environment variable:

```
VITE_API_BASE=https://studywise-ao2g.onrender.com
```

Set this before building — with it unset, the app runs in **mock mode** (`isMockMode()` in `src/lib/studyApi.ts`) and shows placeholder "Newton's Laws of Motion" content instead of calling a real API. This is intentional: it lets the UI be built and tested before a backend exists, but make sure it's set to your real deployed backend URL before demoing.

## API contract this app expects

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/upload` | multipart form: `file`, optional `subject`, `course_level` → `{ job_id, status }` |
| `GET` | `/status/{job_id}` | → `{ job_id, status: "processing"\|"done"\|"error", message? }` |
| `GET` | `/result/{job_id}` | → `{ notes: {...}, quiz: {...} }` |
| `POST` | `/export/{job_id}` | body `{ format: "pdf"\|"markdown" }` → downloadable file |

Full type definitions live in `src/lib/studyApi.ts`.

## Local development

```bash
npm install
VITE_API_BASE=https://studywise-ao2g.onrender.com npm run dev
```

## Notes on scope

This is a single, polished flow (per the hackathon's own "must have" scope discipline) — upload → notes + quiz — not a multi-tool suite. Bonus features implemented: multi-format upload (PDF/DOCX/PPTX, handled backend-side), export to PDF/Markdown, light personalization via subject/course level.
