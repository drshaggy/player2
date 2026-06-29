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

export function generateSemanticState(fen: string) {
  return "The board is in a mid-game state. Material is equal.";
}
