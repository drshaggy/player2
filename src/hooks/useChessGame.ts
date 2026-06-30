/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps, react-hooks/refs */
'use client';

import { useEffect, useState } from 'react';
import { Chess } from 'chess.js';
import { Chessboard, COLOR } from 'cm-chessboard';
import { Markers } from 'cm-chessboard/src/extensions/markers/Markers';
import 'cm-chessboard/assets/chessboard.css';
import { supabase } from '@/lib/supabase';
import { getOpeningMoves } from '@/lib/openingBook';
import { computeCapturedPieces } from '@/lib/utils/chess';
import { handleChessInput } from '@/lib/utils/boardInput';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface UseChessGameArgs {
  /** Shared refs owned by the orchestrator. */
  chessGameRef: React.MutableRefObject<Chess>;
  boardInstanceRef: React.MutableRefObject<Chessboard | null>;
  boardRef: React.RefObject<HTMLDivElement | null>;
  gameIdRef: React.MutableRefObject<string | null>;
  sessionGoalRef: React.MutableRefObject<string>;
  /** Cross-hook dependencies (chat hook is instantiated after this hook). */
  saveGameMove: (move: any) => Promise<void>;
  setChatMessagesRef: React.MutableRefObject<React.Dispatch<React.SetStateAction<ChatMessage[]>> | null>;
}

export function useChessGame({
  chessGameRef,
  boardInstanceRef,
  boardRef,
  gameIdRef,
  sessionGoalRef,
  saveGameMove,
  setChatMessagesRef,
}: UseChessGameArgs) {
  const chessGame = chessGameRef.current;

  const [chessPosition, setChessPosition] = useState(chessGame.fen());
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [capturedPieces, setCapturedPieces] = useState<Record<'w' | 'b', string[]>>({ w: [], b: [] });

  function updateCapturedPieces() {
    setCapturedPieces(computeCapturedPieces(chessGameRef.current.fen()));
  }

  async function makeAIMove() {
    const currentChessGame = chessGameRef.current;
    const possibleMoves = currentChessGame.moves();
    if (currentChessGame.isGameOver() || possibleMoves.length === 0) return;

    try {
      const history = currentChessGame.history();
      const bookOptions = getOpeningMoves(history);
      let openingContext: ReturnType<typeof getOpeningMoves> | null = null;

      if (bookOptions && bookOptions.length > 0) {
        openingContext = bookOptions;
      }

      const candidates = await new Promise<{
        move: string, from: string, to: string, score: string, depth: number
      }[]>((resolve, reject) => {
        const ws = new WebSocket('wss://chess-api.com/v1');
        const gatheredCandidates: any[] = [];
        const timeout = setTimeout(() => {
          ws.close();
          reject(new Error('Stockfish WebSocket timeout'));
        }, 10000);

        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === 'move' || data.type === 'bestmove') {
            const candidate = {
              move: data.san,
              from: data.from,
              to: data.to,
              score: data.eval?.toString() || '0',
              depth: data.depth || 0
            };
            const existingIdx = gatheredCandidates.findIndex(c => c.move === candidate.move);
            if (existingIdx > -1) {
              gatheredCandidates[existingIdx] = candidate;
            } else {
              gatheredCandidates.push(candidate);
            }
            if (data.type === 'bestmove') {
              clearTimeout(timeout);
              ws.close();
              resolve(gatheredCandidates.slice(0, 3));
            }
          }
        };

        ws.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('WebSocket error'));
        };

        ws.onopen = () => {
          ws.send(JSON.stringify({ fen: currentChessGame.fen(), variants: 3 }));
        };
      });

      const response = await fetch("/api/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fen: currentChessGame.fen(),
          candidates,
          openingContext,
          sessionGoal: sessionGoalRef.current
        }),
      });

      const data = await response.json();

      if (data.move) {
        let move;
        if (data.move.from && data.move.to) {
          move = currentChessGame.move({
            from: data.move.from,
            to: data.move.to,
            promotion: data.move.promotion || 'q',
          });
        } else if (data.move.san) {
          move = currentChessGame.move(data.move.san);
        }

        if (move) await saveGameMove(move);

        if (gameIdRef.current && data.commentary) {
          const aiMsg = { role: 'assistant' as const, content: data.commentary };
          setChatMessagesRef.current?.(prev => [...prev, aiMsg]);
          await supabase
            .from('game_chat')
            .insert({ game_id: gameIdRef.current, role: 'assistant', content: data.commentary });
        }
      } else {
        throw new Error('No move from AI Coach');
      }
    } catch (error) {
      console.error("AI Move error:", error);
      currentChessGame.undo();
      if (boardInstanceRef.current) {
        boardInstanceRef.current.setPosition(currentChessGame.fen());
      }
      setChessPosition(currentChessGame.fen());
      setMoveHistory(currentChessGame.history());
      updateCapturedPieces();
      alert("The AI coach encountered an error while thinking. Your move has been reverted. Please try again or reset the game.");
    }

    if (boardInstanceRef.current) {
      boardInstanceRef.current.setPosition(currentChessGame.fen());
    }
    setChessPosition(currentChessGame.fen());
    setMoveHistory(currentChessGame.history());
    updateCapturedPieces();
  }

  async function inputHandler(event: any) {
    return handleChessInput(
      event,
      chessGameRef.current,
      boardInstanceRef.current,
      saveGameMove,
      makeAIMove,
      setMoveHistory,
      updateCapturedPieces
    );
  }

  useEffect(() => {
    if (boardRef.current && !boardInstanceRef.current) {
      const board = new Chessboard(boardRef.current, {
        position: chessGame.fen(),
        orientation: COLOR.white,
        assetsUrl: '/assets/',
        extensions: [{ class: Markers }],
      });
      boardInstanceRef.current = board;
      board.enableMoveInput(inputHandler, COLOR.white);
    }
  }, []);

  function resetBoard() {
    chessGameRef.current = new Chess();
    const newFen = chessGameRef.current.fen();
    if (boardInstanceRef.current) {
      boardInstanceRef.current.setPosition(newFen);
    }
    setChessPosition(newFen);
    setMoveHistory([]);
    setCapturedPieces({ w: [], b: [] });
  }

  return {
    chessPosition,
    moveHistory,
    capturedPieces,
    setChessPosition,
    setMoveHistory,
    updateCapturedPieces,
    makeAIMove,
    resetBoard,
  };
}
