/**
 * Sample game rows and move-history sequences matching the Supabase schema.
 *
 * Shape mirrors the `games` and `moves` tables (see supabase/migrations).
 * IDs are stable UUIDs reserved for tests — never inserted into prod.
 */

import { FENS } from './fens';

export const SAMPLE_GAME_ROW = {
  id: '00000000-0000-4000-8000-000000000001',
  white_player_id: '00000000-0000-4000-8000-000000000002',
  black_player_id: '00000000-0000-4000-8000-000000000003',
  current_fen: FENS.starting,
  current_turn: 'w' as const,
  status: 'ongoing' as const,
  created_at: '2026-06-29T00:00:00.000Z',
  updated_at: '2026-06-29T00:00:00.000Z',
};

export const SAMPLE_MOVES = [
  { game_id: SAMPLE_GAME_ROW.id, move_number: 1, player_color: 'w' as const, move_san: 'e4', fen_after: FENS.afterE4 },
  { game_id: SAMPLE_GAME_ROW.id, move_number: 2, player_color: 'b' as const, move_san: 'c6', fen_after: FENS.caroKann },
];

// SAN move history as consumed by the MoveHistory component (flat list, no numbers).
export const PAIRED_MOVE_HISTORY = ['e4', 'c6', 'd4', 'd5', 'Nc3'];
export const SINGLE_MOVE_HISTORY = ['e4'];

export const EMPTY_MOVE_HISTORY: string[] = [];
