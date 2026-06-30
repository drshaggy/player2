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
