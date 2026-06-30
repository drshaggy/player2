# Project Instructions: Player 2

## Documentation
- **AGENTS.md** - Update this file with commands and rules specific to this project
- **ARCHITECTURE.md**
- **ENGINEERING_PLAN.md** - Architecture, testing harness, and deployment strategy
- **DYNAMIC_FEN_PLAN.md**
- **Update all Docs**  - When asked to update all docs, all .md files 
- Add new md files to this list so you know to read them 

## Project Setup
- **Project Path**: `/Users/connor/Repos/cerebras-hackathon/player2`
- **Tech Stack**: Next.js (App Router), TypeScript, Tailwind CSS, Supabase.
- **Key Libraries**: 
  - `chess.js`: Handles chess game logic, move validation, and FEN/PGN generation.
  - `chessground`: Provides the visual chessboard UI (Lichess engine).

## Development Commands
- **Run Development Server**: `cd player2 && npm run dev`
- **Build Project**: `cd player2 && npm run build`
- **Run Tests**: `cd player2 && npm run test`
- **Supabase**: Use the Supabase MCP Server

## Tooling
- **CLI Tools Available**: `vercel`, `cloudflare`, `gh`, `vitest`
- When unit tests fail, ALWAYS fix the root course. Never skip the failing test, or coerce the test to pass. Never change the test, escalate to the user if it is genuinely broken

## Database Schema
- `profiles`: Users and AI bots (`is_bot` flag, `bot_style`, `difficulty_level`).
- `games`: Current match state (`current_fen`, `current_turn`, `status`).
- `moves`: Chronological move history linked to games.
- **Auth**: Integrated with Supabase Auth; automatic profile creation via PG trigger.

## Deployment (Vercel)
- **Production URL**: https://player2-drab.vercel.app
- **Required Env Vars**:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `LLM_API_KEY`
- **Deployment Command**: `vercel --prod`
- **Known Build Fixes**: 
  - `cm-chessboard` requires a custom TypeScript declaration file (`src/types/cm-chessboard.d.ts`) because it lacks official types.
  - Use named imports for `Chessboard` from `cm-chessboard`.
  - dynamic indexing of state objects (like `capturedPieces`) requires explicit `Record<string, T>` typing to pass Vercel's build-time type checking.

## Current Progress
- [x] Project initialized with Next.js, TS, Tailwind.
- [x] Core chess dependencies installed.
- [x] Implement basic playable board.
- [x] Integrate Stockfish API for AI moves.
- [x] Implement move history and captured pieces display.
- [x] Setup Supabase schema.
- [x] Implement collocated unit tests with Vitest.
- [x] Implement iterative Opening Book lookup to support multi-turn opening goals.
- [x] Integrate Lichess Masters Database for theory-based move suggestions.
- [x] Deployed to Vercel and configured environment variables.
