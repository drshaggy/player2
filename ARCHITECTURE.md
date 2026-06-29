# Architecture Document: Player 2

## System Overview
Player 2 is an AI-powered chess coaching application designed to guide users through specific chess openings and strategic goals using a hybrid approach of engine candidates and LLM decision-making.

## Core Components

### 1. AI Move Selection Pipeline
The move selection process follows a strict hierarchy to ensure educational goals take priority over optimal engine play:
`Session Goal` $\rightarrow$ `Opening Book Mapping` $\rightarrow$ `Lichess Masters Theory` $\rightarrow$ `Stockfish Multi-PV Candidates` $\rightarrow$ `LLM Selection` $\rightarrow$ `Final Move`.

- **Opening Book**: A hierarchical tree lookup that provides a map of opening names to specific SAN moves. It is queried on every turn to ensure goal alignment throughout the opening phase.
- **Lichess Masters Database**: Provides statistically most-played moves by masters for the current position. These are injected as high-priority candidates to guide the AI toward theory.
- **Stockfish**: Generates a list of legal candidate moves with evaluation scores.
- **LLM (Cerebras Gemma-4)**: Receives the context and selects the move index based on the session objective.

### 2. Prompting Strategy
To prevent LLM hallucinations regarding move indices, the system uses:
- **Strict Execution Logic**: A step-by-step instructional chain in the system prompt.
- **Reference Mapping**: Explicitly mapping opening names to moves and then moves to candidate indices.
- **Externalized Prompts**: Prompts are stored in `src/lib/prompts/index.js` for manual tweaking without code changes.

### 3. Board Representation
- **ASCII Board**: Converts FEN strings into an ASCII grid for LLM spatial awareness.
- **Semantic State**: Provides a high-level description of the game phase and material balance.

## Tech Stack
- **Frontend/Backend**: Next.js (App Router), TypeScript, Tailwind CSS.
- **Database**: Supabase (PostgreSQL).
- **Chess Logic**: `chess.js`.
- **Testing**: Vitest (with JSDOM).

## Key Workflows
- **Goal Alignment**: If a user sets a goal (e.g., "Caro-Kann"), the system filters the opening book, identifies the move `c6`, finds `c6` in the Stockfish candidates, and forces the LLM to select that index.
