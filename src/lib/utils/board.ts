export function generateAsciiBoard(fen: string) {
  const boardPart = fen.split(' ')[0];
  const rows = boardPart.split('/');
  const board: string[][] = [];

  for (const row of rows) {
    const parsedRow: string[] = [];
    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      const digit = parseInt(char);
      if (isNaN(digit)) {
        parsedRow.push(char);
      } else {
        for (let j = 0; j < digit; j++) {
          parsedRow.push('.');
        }
      }
    }
    while (parsedRow.length < 8) {
      parsedRow.push('.');
    }
    board.push(parsedRow.slice(0, 8));
  }

  return board.map(r => r.join(' ')).join('\n');
}

const PIECE_VALUES: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const PIECE_NAMES: Record<string, string> = { p: 'pawns', n: 'knights', b: 'bishops', r: 'rooks', q: 'queens', k: 'kings' };

interface PieceCounts {
  white: Record<string, number>;
  black: Record<string, number>;
}

function countPieces(fen: string): PieceCounts {
  const boardPart = fen.split(' ')[0];
  const white: Record<string, number> = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 };
  const black: Record<string, number> = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 };

  for (const char of boardPart) {
    if ('PNBRQK'.includes(char)) {
      white[char.toLowerCase()]++;
    } else if ('pnbrqk'.includes(char)) {
      black[char]++;
    }
  }

  return { white, black };
}

function materialValue(counts: Record<string, number>): number {
  return Object.entries(counts).reduce((sum, [piece, n]) => sum + (PIECE_VALUES[piece] ?? 0) * n, 0);
}

function totalPieces(counts: Record<string, number>): number {
  return Object.values(counts).reduce((sum, n) => sum + n, 0);
}

type GamePhase = 'opening' | 'middlegame' | 'endgame';

function detectPhase(fen: string, white: Record<string, number>, black: Record<string, number>): GamePhase {
  const moveNumber = parseInt(fen.split(' ')[5] || '1', 10);

  // Endgame: few major pieces (queens + rooks + knights + bishops) on the board.
  // Threshold: if both sides combined have <= 6 non-pawn, non-king pieces.
  const whiteMajor = white.n + white.b + white.r + white.q;
  const blackMajor = black.n + black.b + black.r + black.q;
  const majorPieces = whiteMajor + blackMajor;

  // Opening: first ~10 moves and most material still on the board.
  if (moveNumber <= 10 && majorPieces >= 10) {
    return 'opening';
  }

  // Endgame: queens off or very few major pieces, low pawn count.
  const totalPawns = white.p + black.p;
  if (majorPieces <= 4 || (white.q === 0 && black.q === 0 && majorPieces <= 6)) {
    return 'endgame';
  }

  return 'middlegame';
}

function formatImbalance(white: Record<string, number>, black: Record<string, number>): string {
  const whiteMaterial = materialValue(white);
  const blackMaterial = materialValue(black);
  const diff = whiteMaterial - blackMaterial;

  if (diff === 0) return 'Material is equal.';

  const ahead = diff > 0 ? 'White' : 'Black';
  const absDiff = Math.abs(diff);

  // Identify which piece types differ for a more descriptive summary.
  const differences: string[] = [];
  for (const piece of ['q', 'r', 'b', 'n', 'p']) {
    const d = white[piece] - black[piece];
    if (d !== 0) {
      const side = d > 0 ? 'White' : 'Black';
      const count = Math.abs(d);
      const name = PIECE_NAMES[piece];
      differences.push(`${side} is up ${count} ${name}`);
    }
  }

  const detail = differences.length > 0 ? ` (${differences.join(', ')})` : '';
  return `${ahead} is ahead by ${absDiff} in material${detail}.`;
}

export function generateSemanticState(fen: string): string {
  const { white, black } = countPieces(fen);
  const phase = detectPhase(fen, white, black);
  const materialLine = formatImbalance(white, black);

  const whitePieces = totalPieces(white);
  const blackPieces = totalPieces(black);

  const turn = fen.split(' ')[1] === 'w' ? 'White' : 'Black';

  return [
    `Phase: ${phase}.`,
    `Turn: ${turn} to move.`,
    materialLine,
    `Piece count: White ${whitePieces}, Black ${blackPieces}.`,
  ].join(' ');
}
