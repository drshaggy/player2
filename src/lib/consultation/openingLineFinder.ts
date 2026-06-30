import { Chess, type Move } from 'chess.js';
import { OPENING_BOOK, type OpeningNode } from '@/lib/openingBook';
import { getMasterOpeningMoves, type LichessMove } from '@/lib/services/lichess';

export type OpeningSpine = {
  name: string;
  sans: string[];
};

export type LinePosition = {
  /** Human-readable label, e.g. "Start of opening" or "After move 4 (Black's reply)". */
  label: string;
  /** Full 6-field FEN, side-to-move guaranteed 'w'. */
  fen: string;
  /** SAN moves from the standard starting position to this position.
   *  Lets the client replay the game so chess.js history is populated. */
  line: string[];
  /** Game count for the move that led here (undefined for the start position). */
  games?: number;
};

export type PopularLine = {
  /** The detected opening's name (from the book node). */
  openingName: string;
  /** White-to-move positions along the most popular master line, shallowest first.
   *  [0] is the start of the opening (spine tip); each later entry is one
   *  Black reply deeper into the line. */
  positions: LinePosition[];
};

// Trailing category words stripped from an opening name to derive its
// distinctive "head" (e.g. "Caro-Kann Defense" -> "Caro-Kann"). Used so a
// partial mention like "play caro kann" (without the word "Defense") still
// matches.
const CATEGORY_STOPWORDS = new Set([
  'defense', 'opening', 'game', 'gambit', 'setup', 'line', 'response',
  'declined', 'accepted',
]);

// Single-word heads that are too generic to match on their own (they'd fire
// on unrelated messages). A node whose only head key is one of these must be
// matched via its full name instead.
const GENERIC_SINGLE_WORDS = new Set([
  'open', 'main', 'common', 'closed', 'line', 'response', 'setup',
  'game', 'gambit', 'defense', 'opening',
]);

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function headKeys(name: string): string[] {
  // "/" separates alternatives (e.g. "Najdorf/Dragon setup").
  const alts = name.split('/').map(s => s.trim()).filter(Boolean);
  const keys: string[] = [];
  for (const alt of alts) {
    const tokens = alt.toLowerCase().split(/\s+/);
    while (tokens.length > 1 && CATEGORY_STOPWORDS.has(tokens[tokens.length - 1])) {
      tokens.pop();
    }
    const head = normalize(tokens.join(' '));
    if (head && !GENERIC_SINGLE_WORDS.has(head)) {
      keys.push(head);
    }
  }
  return keys;
}

function keysForName(name: string): string[] {
  const keys = new Set<string>();
  const full = normalize(name);
  if (full) keys.add(full);
  for (const h of headKeys(name)) keys.add(h);
  return [...keys];
}

function collectNamedNodes(
  node: OpeningNode,
  path: string[] = [],
  acc: OpeningSpine[] = [],
): OpeningSpine[] {
  if (node.moveInfo) {
    acc.push({ name: node.moveInfo.name, sans: [...path] });
  }
  for (const [san, child] of Object.entries(node.children)) {
    collectNamedNodes(child, [...path, san], acc);
  }
  return acc;
}

/**
 * Detects whether the user's consultation message mentions a known opening
 * from the hand-authored opening book, and returns the SAN path ("spine")
 * from the start position to that opening's defining node.
 *
 * Matching is deliberately fuzzy: the full normalized name is tried first
 * (e.g. "sicilian defense"), then a "head" with category words stripped so
 * "caro kann" matches "Caro-Kann Defense". The longest matched key wins,
 * ties broken by the deepest spine (e.g. "Caro-Kann Response" at 4 plies
 * beats "Caro-Kann Defense" at 2 plies when both match "caro-kann" — deeper
 * is closer to the user's requested "middle game").
 */
export function detectMentionedOpening(message: string): OpeningSpine | null {
  const nodes = collectNamedNodes(OPENING_BOOK);
  const msg = normalize(message);
  if (!msg) return null;

  let best: { spine: OpeningSpine; matchedKeyLen: number } | null = null;
  for (const spine of nodes) {
    const keys = keysForName(spine.name);
    for (const key of keys) {
      if (msg.includes(key)) {
        const better =
          !best ||
          key.length > best.matchedKeyLen ||
          (key.length === best.matchedKeyLen && spine.sans.length > best.spine.sans.length);
        if (better) best = { spine, matchedKeyLen: key.length };
      }
    }
  }
  return best ? best.spine : null;
}

function toUci(mv: Move): string {
  return mv.from + mv.to + (mv.promotion ? mv.promotion : '');
}

export type FindPopularLineDeps = {
  getMasterMoves?: typeof getMasterOpeningMoves;
  maxPlies?: number;
  minGames?: number;
};

/**
 * Builds a menu of White-to-move positions along the most popular master
 * line for the given opening spine, so the LLM (not this module) can decide
 * how deep to start based on the player's phrasing.
 *
 * The spine is played from the start position; the resulting tip is the
 * "start of opening" position (enforced White-to-move). Then the Lichess
 * masters explorer is queried repeatedly, following the top move by total
 * game count until the line peters out (<minGames), the explorer returns no
 * moves, or maxPlies plies have been followed. After each Black reply the
 * position is again White-to-move and is added to the menu as a deeper
 * starting point.
 *
 * Returns null if the spine is invalid. If Lichess is unavailable, the menu
 * contains just the start-of-opening position.
 */
export async function findPopularLine(
  spine: OpeningSpine,
  deps: FindPopularLineDeps = {},
): Promise<PopularLine | null> {
  const {
    getMasterMoves = getMasterOpeningMoves,
    maxPlies = 14,
    minGames = 20,
  } = deps;

  const game = new Chess();
  const uci: string[] = [];
  const spineSans: string[] = [];
  for (const san of spine.sans) {
    let mv: Move;
    try {
      mv = game.move(san);
    } catch {
      return null;
    }
    uci.push(toUci(mv));
    spineSans.push(san);
  }

  const positions: LinePosition[] = [];

  // Spine tip. If it's Black to move, drop back plies until White to move.
  // (Most book spines already end on White to move, but be defensive.)
  // Spine tip. If it's Black to move, drop back plies until White to move.
  // (Most book spines already end on White to move, but be defensive.)
  let trim = 0;
  while (game.fen().split(' ')[1] === 'b' && spineSans.length - trim > 0) {
    game.undo();
    trim++;
  }
  if (game.fen().split(' ')[1] !== 'w') return null;
  const tipSans = spineSans.slice(0, spineSans.length - trim);
  positions.push({ label: 'Start of opening', fen: game.fen(), line: tipSans });

  // Continue from the tip and follow the popular line, recording a
  // White-to-move position after each Black reply.
  let followed = 0;
  let moveNumber = spine.sans.length;
  let lineSans = [...tipSans];
  while (followed < maxPlies) {
    const playParam = uci.join(',');
    const moves: LichessMove[] = await getMasterMoves(playParam, 5);
    if (moves.length === 0) break;
    const top = [...moves].sort((a, b) => b.total - a.total)[0];
    if (top.total < minGames) break;
    let mv: Move;
    try {
      mv = game.move(top.san);
    } catch {
      break;
    }
    uci.push(toUci(mv));
    moveNumber++;
    followed++;
    lineSans = [...lineSans, top.san];

    // After White's move it's Black to move (not playable). After Black's
    // reply it's White to move again — record that as a deeper option.
    if (game.fen().split(' ')[1] === 'w') {
      positions.push({
        label: `After move ${moveNumber} (Black's reply)`,
        fen: game.fen(),
        line: [...lineSans],
        games: top.total,
      });
    }
  }

  return { openingName: spine.name, positions };
}
