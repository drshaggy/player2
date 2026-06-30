export function getPieceImage(piece: string, color: 'w' | 'b'): string {
  const pieceMap: Record<string, string> = { p: 'p', n: 'n', b: 'b', r: 'r', q: 'q', k: 'k' };
  const pieceType = pieceMap[piece] || 'p';
  return `/assets/images/chess/${color}${pieceType}.svg`;
}

export function processFen(fen: string): string {
  const fields = fen.trim().split(' ');
  if (fields.length === 1) {
    return `${fen.trim()} w KQkq - 0 1`;
  } else if (fields.length < 6) {
    const defaultFields = ['w', 'KQkq', '-', '0', '1'];
    const padding = defaultFields.slice(0, 6 - fields.length);
    return [...fields, ...padding].join(' ');
  }
  return fen.trim();
}

/**
 * Compute captured pieces for each color from a FEN by diffing the on-board
 * piece counts against a full starting set. Captured pieces are returned as
 * lowercase type letters (e.g. ['p', 'p', 'n']) per color.
 */
export function computeCapturedPieces(fen: string): Record<'w' | 'b', string[]> {
  const pieces: Record<'w' | 'b', string[]> = { w: [], b: [] };
  const startingPieces = { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 };
  const counts: Record<'w' | 'b', Record<string, number>> = {
    w: { ...startingPieces },
    b: { ...startingPieces }
  };

  const boardPart = fen.split(' ')[0];
  const pieceRegex = /[pnbrqkPNBRQK]/g;
  let match;
  while ((match = pieceRegex.exec(boardPart)) !== null) {
    const char = match[0];
    const color = char === char.toUpperCase() ? 'w' : 'b';
    const type = char.toLowerCase();
    counts[color][type]--;
  }

  (Object.entries(counts) as [string, Record<string, number>][]).forEach(([color, piecesCount]) => {
    Object.entries(piecesCount).forEach(([type, count]) => {
      for (let i = 0; i < count; i++) {
        pieces[color as 'w' | 'b'].push(type);
      }
    });
  });

  return pieces;
}
