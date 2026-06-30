# Dynamic Starting Position Implementation Plan

Allow the AI and the user to specify the starting FEN for a game during the consultation phase.

## Goals
- Enable the AI to suggest a FEN based on user requests (e.g., "Sicilian Mainline", "Rook Endgames").
- Enable the user to provide a FEN directly via chat.
- Ensure the chosen FEN is persisted as the starting state of the game in the database.

## Technical Steps

### 1. API Enhancements (`/api/chat`)
- **Request Update**: Include the current `gamePhase` in the request to `/api/chat` so the AI knows it is in the `consultation` phase.
- **Response Update**: Add a `suggestedFen` field to the API response. The AI can populate this when it decides a specific position is required.
- **Prompt Engineering**: Update the system prompt to instruct the AI coach to provide a valid FEN in the `suggestedFen` field when the user requests specific openings or endgame practice.

### 2. Client-Side Logic (`src/hooks/useCoachChat.ts`)
- **FEN Parsing**: Implement a check in `handleSendMessage` to detect if the user's message is a valid FEN string. If so, update the local `chessGame` state immediately.
- **AI Suggestion Handling**: When the `/api/chat` response contains a `suggestedFen`, update the board and the internal `chessGame` instance.
- **Visual Feedback**: Ensure the board reflects the new FEN immediately during the consultation phase so the user can verify the position.

### 3. Database & Game Initialization
- **Initial State Persistence**: Modify the game creation logic. When transitioning from `consultation` to `playing`, use the current FEN from the `chessGame` instance for the `current_fen` column in the `games` table instead of the default starting position.

## Verification
- Test requesting "Sicilian mainline" in chat; verify the board updates and the game starts from that position.
- Test pasting a custom FEN; verify the board updates.
- Verify that the game is correctly restored from the custom FEN after a page refresh using the Supabase restoration logic.
