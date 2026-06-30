/* eslint-disable @typescript-eslint/no-explicit-any */
import { Chess } from 'chess.js';
import { Chessboard, COLOR, INPUT_EVENT_TYPE } from 'cm-chessboard';

/**
 * cm-chessboard move-input handler. Pure with respect to component state —
 * all dependencies are passed in as parameters so this can live outside React.
 *
 * On a legal player move it: updates the chess.js game, syncs the board,
 * records history + captured pieces, persists the move, and (if it is now
 * Black's turn) schedules the AI move and re-enables White's move input.
 */
export function handleChessInput(
  event: any,
  chessGame: Chess,
  boardInstance: Chessboard | null,
  saveGameMove: (move: any) => Promise<void>,
  makeAIMove: () => Promise<void>,
  setMoveHistory: (history: string[]) => void,
  updateCapturedPieces: () => void
) {
  if (event.type === INPUT_EVENT_TYPE.movingOverSquare) return;

  if (event.type !== INPUT_EVENT_TYPE.moveInputFinished) {
    event.chessboard.removeLegalMovesMarkers();
  }

  if (event.type === INPUT_EVENT_TYPE.moveInputStarted) {
    const moves = chessGame.moves({ square: event.squareFrom, verbose: true });
    event.chessboard.addLegalMovesMarkers(moves);
    return moves.length > 0;
  } else if (event.type === INPUT_EVENT_TYPE.validateMoveInput) {
    const move = { from: event.squareFrom, to: event.squareTo, promotion: 'q' };

    const movesFromSquare = chessGame.moves({ square: event.squareFrom, verbose: true });
    const isLegal = movesFromSquare.some((m: any) => m.to === event.squareTo);

    if (!isLegal) {
      setTimeout(() => {
        event.chessboard.setPosition(chessGame.fen());
      }, 0);
      return false;
    }

    let result;
    try {
      result = chessGame.move(move);
    } catch {
      result = null;
    }

    if (result) {
      event.chessboard.setPosition(chessGame.fen());
      setMoveHistory(chessGame.history());
      updateCapturedPieces();

      saveGameMove(result);

      if (chessGame.turn() === 'b') {
        setTimeout(() => {
          makeAIMove();
          try {
            if (boardInstance) {
              boardInstance.enableMoveInput((ev: any) => handleChessInput(
                ev, chessGame, boardInstance, saveGameMove, makeAIMove, setMoveHistory, updateCapturedPieces
              ), COLOR.white);
            }
          } catch {
            console.warn("Input already enabled");
          }
        }, 500);
      }
    } else {
      event.chessboard.setPosition(chessGame.fen());
    }
    return result;
  } else if (event.type === INPUT_EVENT_TYPE.moveInputFinished) {
    return true;
  }
}
