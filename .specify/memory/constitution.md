# PZONE International ERP — Constitution

## Core Principles

### I. Construction-Domain Authority
Every module MUST reflect real-world construction and engineering management workflows. Domain terminology (FIDIC, BOQ, WBS, SRF, PCM) MUST be used accurately. No generic or consumer-app metaphors are permitted when a construction-industry term exists.

### II. Bilingual-First (AR/EN)
All user-facing content, AI-generated reports, and exported documents MUST support Arabic and English presentation. Arabic text MUST render RTL correctly. Bilingual output is the default, not an afterthought.

### III. Serverless Client-Side Architecture
Core intelligence (contract analysis, risk scoring, export generation) MUST execute in the browser using client-side libraries (pdfjs-dist, mammoth, xlsx, pptxgenjs, html2canvas, jspdf). Backend dependencies are permitted ONLY for persistent storage (Supabase) and authentication (Firebase Auth). No local backend servers (localhost:3000) are allowed in production paths.

### IV. Executive-Grade Reporting
All dashboards and exports MUST be presentation-ready for C-level stakeholders (General Manager, Project Director). PDFs, PowerPoints, and Excel reports MUST carry professional branding for **Hassan A. Soliman** with PZONE International identity. Reports MUST include risk matrices, financial summaries, and FIDIC compliance scores.

### V. Security & Credential Hygiene
API keys, tokens, and credentials MUST NEVER be hardcoded in source files. All secrets MUST be managed via environment variables (`.env.local`), secure browser-side memory, or Firebase Auth flows. The `.gitignore` MUST exclude `.env*`, `.specify/`, and `.gemini/` directories.

### VI. Spec-Driven Development
All new features MUST follow the Spec-Kit workflow: Constitution → Specification → Plan → Tasks → Implementation. No "vibe coding" — every change traces back to a documented spec artifact in `.specify/memory/`.

### VII. Progressive Enhancement & Resilience
The application MUST remain functional even when external APIs (Gemini, Google Workspace) are unavailable or quota-limited. Graceful degradation with informative user messaging is mandatory. localStorage caching MUST preserve analysis history across sessions.

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React + TypeScript + Vite | SPA framework |
| Styling | Vanilla CSS + inline styles | No Tailwind dependency |
| AI Engine | Google Gemini API (1.5/2.0 Flash) | Contract analysis via mega-prompt |
| Document Parsing | pdfjs-dist, mammoth | Client-side PDF/DOCX extraction |
| Export | jspdf, html2canvas, xlsx, pptxgenjs | Local report generation |
| Database | Supabase (PostgreSQL) | Persistent contract/project storage |
| Auth | Firebase Authentication | Google OAuth + email/password |
| Hosting | Firebase Hosting | Static SPA deployment |

## Quality Gates

- **Build Gate**: `npm run build` MUST complete with zero errors before any merge.
- **Type Safety**: TypeScript strict mode. `any` is discouraged; explicit types required for all exported functions.
- **Export Fidelity**: Every generated PDF/PPTX/Excel MUST be manually verified against the FIDIC audit checklist before a feature is marked complete.
- **Accessibility**: All interactive elements MUST have unique IDs for automated testing. Keyboard navigation MUST work for critical flows.

## Governance

This constitution supersedes all ad-hoc development practices. Amendments require:
1. A documented rationale in the Sync Impact Report.
2. Version bump following SemVer (MAJOR for principle removal, MINOR for additions, PATCH for clarifications).
3. Propagation check across all `.specify/templates/` artifacts.

All code reviews MUST verify compliance with these principles. Complexity MUST be justified against Principle VII (Progressive Enhancement).

**Version**: 1.0.0 | **Ratified**: 2026-03-31 | **Last Amended**: 2026-03-31
