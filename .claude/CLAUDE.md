# ResumAI - AI-Powered Resume Builder

## Project Overview

ResumAI is an AI-powered resume builder that helps job seekers tailor resumes for specific job postings. Users upload a master resume, create job postings from descriptions, and the AI refactors their resume to highlight relevant skills and experience.

**Core Features:**
- Resume ingestion (PDF, DOCX, text) via LLM parsing
- Master resume stored in structured JSON format
- Job posting management with folder organization
- AI-powered resume refactoring to match job descriptions
- Skill gap analysis (matched/missing/partial skills)
- Job posting analysis (skills, responsibilities, seniority extraction)
- Resume export (PDF, DOCX)

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) with React 19 |
| Language | TypeScript 5 |
| Database | PostgreSQL with Drizzle ORM |
| Auth | NextAuth.js 5 (OAuth: Google, GitHub, LinkedIn, Facebook) |
| AI | Google Gemini 2.5 Flash (@google/genai) |
| State | Zustand (client), TanStack React Query (server) |
| Styling | Tailwind CSS 4, Radix UI components |
| Forms | React Hook Form + Zod validation |
| Export | @react-pdf/renderer, docx library |

## Directory Structure

```
src/
├── app/                      # Next.js App Router
│   ├── api/                  # API routes
│   │   ├── auth/             # NextAuth config
│   │   ├── job-postings/     # CRUD for job postings
│   │   ├── resumes/master/   # Master resume endpoints
│   │   ├── skill-gap/        # Skill gap analysis
│   │   ├── job-analysis/     # Job posting analysis
│   │   ├── refactor/         # Resume refactoring
│   │   └── ingest/           # Resume parsing
│   ├── app/                  # Protected routes (auth required)
│   │   ├── resume/           # Master resume editor
│   │   └── job-postings/[id]/ # Job posting workspace
│   └── login/                # OAuth login page
├── components/
│   ├── explorer/             # Sidebar navigation
│   ├── workbench/            # Main editing area & forms
│   ├── ui/                   # Radix-based UI primitives
│   ├── ingestion/            # Resume upload dialog
│   ├── layout/               # App shell layouts
│   └── providers/            # React Context providers
├── lib/
│   ├── ai/                   # LLM integration (Gemini)
│   │   ├── skill-gap.ts      # Skill gap analysis
│   │   ├── refactor.ts       # Resume refactoring
│   │   ├── job-analysis.ts   # Job requirement extraction
│   │   ├── ingest.ts         # Resume parsing
│   │   └── utils.ts          # JSON repair utilities
│   ├── db/
│   │   ├── schema.ts         # Drizzle schema definitions
│   │   └── services/         # Database service layer
│   ├── auth/                 # NextAuth configuration
│   ├── api.ts                # Frontend API client
│   ├── queries.ts            # React Query hooks
│   ├── store.ts              # Zustand store
│   └── export/               # PDF/DOCX generation
└── types/
    └── resume.ts             # Zod schemas & types
```

## Key Patterns

### Service Layer
Database operations are in `/lib/db/services/`. Each service handles a domain:
- `resume-service.ts` - Master resume CRUD
- `job-posting-service.ts` - Job postings with folders
- `skill-gap-service.ts` - Skill gap analysis caching
- `job-analysis-service.ts` - Job analysis caching

### API Client
Centralized in `/lib/api.ts` with typed fetch wrappers. All API calls use this client.

### React Query
Hooks in `/lib/queries.ts` with queryKeys factory for cache management. Use existing patterns when adding new queries.

### Zustand Store
Global UI state in `/lib/store.ts`: sidebar, theme, active job posting, diff review state.

### Type Safety
- Full TypeScript with strict mode
- Zod schemas in `/types/resume.ts` for runtime validation
- Database types inferred from Drizzle schema

## Data Models

### Resume Structure
JSON Resume-based format with sections:
- `basics` - name, email, phone, location, summary
- `work` - work experience with highlights/keywords
- `education` - degrees and institutions
- `skills` - categorized skills with keywords
- `projects` - portfolio items

### Database Tables
- `users` - OAuth user accounts
- `resumes` - Master resumes (JSON)
- `jobPostings` - Job descriptions with folder organization
- `skillGapAnalyses` / `skillGapItems` - Cached skill comparisons
- `jobAnalyses` / `jobAnalysisSkills` / `jobAnalysisResponsibilities` - Parsed job requirements

## AI Integration

All LLM calls use Google Gemini 2.5 Flash in `/lib/ai/`:

1. **Resume Ingestion** (`ingest.ts`) - Parse documents into structured JSON
2. **Resume Refactoring** (`refactor.ts`) - Rewrite bullets to match job keywords
3. **Skill Gap Analysis** (`skill-gap.ts`) - Compare resume vs job requirements
4. **Job Analysis** (`job-analysis.ts`) - Extract skills, responsibilities, seniority

**Important:** LLM responses may be truncated. Use `extractJSON()` and `repairJSON()` from `utils.ts` to handle malformed JSON.

## Key Workflows

### Resume Ingestion
1. User uploads file → API route `/api/ingest`
2. Llama Cloud parses document text
3. Gemini structures into ResumeProfile JSON
4. Saved as master resume

### Resume Refactoring
1. User clicks "Refactor" on job posting
2. Gemini rewrites resume for job keywords
3. DiffEditor shows changes for review
4. User accepts/rejects individual changes

### Skill Gap Analysis
1. Triggered on job posting view
2. Gemini compares resume against job description
3. Results cached in database
4. Shows matched/missing/partial skills with recommendations

## Development Commands

```bash
pnpm dev          # Start dev server
pnpm build        # Production build
pnpm db:push      # Push schema to database
pnpm db:studio    # Open Drizzle Studio
pnpm db:generate  # Generate migrations
```

## Environment Variables

Required in `.env.local`:
```
DATABASE_URL=postgresql://...
AUTH_SECRET=...
AUTH_GOOGLE_ID=...
AUTH_GOOGLE_SECRET=...
GOOGLE_GENERATIVE_AI_API_KEY=...
LLAMA_CLOUD_API_KEY=...
```

## Conventions

- Use existing service layer patterns for database operations
- Add React Query hooks to `/lib/queries.ts` following existing patterns
- UI components should use Radix primitives from `/components/ui/`
- Form components go in `/components/workbench/forms/`
- AI prompts live in `/lib/ai/` with their corresponding logic
- All routes under `/app/app/` require authentication
- Cache AI analysis results in database to avoid re-processing

## Maintaining This Document

**IMPORTANT:** This CLAUDE.md file must be kept up-to-date as the codebase evolves. When making changes to the project, update this document accordingly.

### When to Update

Update this document whenever you:

1. **Add new features** - Add to "Core Features" list and document the workflow
2. **Create new API routes** - Add to the Directory Structure and document the endpoint
3. **Add database tables** - Update "Database Tables" section with new tables
4. **Create new services** - Add to the "Service Layer" section
5. **Add new AI capabilities** - Document in "AI Integration" section
6. **Introduce new patterns** - Add to "Key Patterns" section
7. **Add dependencies** - Update "Tech Stack" table if it's a significant addition
8. **Add environment variables** - Update "Environment Variables" section
9. **Create new component directories** - Update Directory Structure

### How to Update

- Keep descriptions concise - one line per item where possible
- Follow existing formatting patterns
- Place new items in logical locations within existing sections
- For major new features, add a new subsection under "Key Workflows"
- When adding new directories, include a brief comment explaining purpose

### Update Checklist

Before completing any feature work, verify:
- [ ] New files/directories reflected in Directory Structure
- [ ] New database tables documented
- [ ] New API endpoints documented
- [ ] New environment variables listed
- [ ] New workflows explained
- [ ] Tech stack updated if new major dependencies added

## Context7 MCP Tools

Refer to `.windsurf/context7/` for library documentation lookup. Use when implementing features with specific library APIs.
