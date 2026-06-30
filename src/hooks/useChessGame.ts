/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
'use client';

import { useEffect, useState } from 'react';
import { Chess } from 'chess.js';
import { Chessboard, COLOR } from 'cm-chessboard';
import { Markers } from 'cm-chessboard/src/extensions/markers/Markers';
import 'cm-chessboard/assets/chessboard.css';
import { supabase } from '@/lib/supabase';
import { getOpeningMoves, getOpeningMovesByFen } from '@/lib/openingBook';
import { computeCapturedPieces } from '@/lib/utils/chess';
import { handleChessInput } from '@/lib/utils/boardInput';
import { categorizeAiMoveError } from '@/lib/utils/errorCategorize';

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
  setIsTypingRef: React.MutableRefObject<React.Dispatch<React.SetStateAction<boolean>> | null>;
}

export function useChessGame({
  chessGameRef,
  boardInstanceRef,
  boardRef,
  gameIdRef,
  sessionGoalRef,
  saveGameMove,
  setChatMessagesRef,
  setIsTypingRef,
}: UseChessGameArgs) {
  const chessGame = chessGameRef.current;

  const [chessPosition, setChessPosition] = useState(chessGame.fen());
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [capturedPieces, setCapturedPieces] = useState<Record<'w' | 'b', string[]>>({ w: [], b: [] });

  function updateCapturedPieces() {
    setCapturedPieces(computeCapturedPieces(chessGameRef.current.fen()));
  }

  async function makeAIMove(isRetry = false) {
    const currentChessGame = chessGameRef.current;
    const possibleMoves = currentChessGame.moves();
    if (currentChessGame.isGameOver() || possibleMoves.length === 0) return;

    setIsTypingRef.current?.(true);
    let httpStatus: number | undefined;
    let aiMoveApplied = false;
    let shouldRetry = false;
    try {
      const history = currentChessGame.history();
      const bookOptions = history.length > 0
        ? getOpeningMoves(history)
        : getOpeningMovesByFen(currentChessGame.fen());
      let openingContext: ReturnType<typeof getOpeningMoves> | null = null;

      if (bookOptions && bookOptions.length > 0) {
        openingContext = bookOptions;
      }

      let candidates: { move: string, from: string, to: string, score: string, depth: number }[] = [];
      try {
        candidates = await new Promise<{
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
      } catch (wsError) {
        // Stockfish is unavailable — don't abort. Build fallback candidates
        // from whatever we have so the game continues without engine eval.
        // The pipeline will still merge Lichess master moves + book moves.
        console.warn('Stockfish unavailable, using fallback candidates:', wsError instanceof Error ? wsError.message : wsError);
      }

      if (candidates.length === 0) {
        // Fallback: use opening-book moves, then legal moves as last resort.
        if (openingContext && openingContext.length > 0) {
          candidates = openingContext.map(m => ({
            move: m.move, from: '', to: '', score: '0.0 (Book)', depth: 0,
          }));
        } else {
          // Generate a few candidate moves from legal moves (top by SAN sort
          // for determinism). This is a last resort — no engine eval at all.
          const legalMoves = currentChessGame.moves({ verbose: true }) as any[];
          candidates = legalMoves.slice(0, 5).map(m => ({
            move: m.san, from: m.from, to: m.to, score: '0.0 (fallback)', depth: 0,
          }));
        }
      }

      // Send UCI history so the pipeline can use the Lichess play-parameter
      // endpoint (non-auth-gated) for master game lookups.
      const verboseHistory = currentChessGame.history({ verbose: true }) as any[];
      const uciHistory = verboseHistory
        .map(m => m.from + m.to + (m.promotion ? m.promotion : ''));

      const response = await fetch("/api/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fen: currentChessGame.fen(),
          candidates,
          openingContext,
          sessionGoal: sessionGoalRef.current,
          history: uciHistory,
        }),
      });

      httpStatus = response.status;
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

        if (move) {
          aiMoveApplied = true;
          await saveGameMove(move);
        }

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
      const categorized = categorizeAiMoveError(error, httpStatus);
      console.error(`AI Move error [${categorized.category}]:`, categorized.message, {
        httpStatus: categorized.httpStatus,
        raw: error,
      });
      // Only undo if the AI's move was actually applied to the game. If the
      // error happened BEFORE the AI moved (WebSocket timeout, LLM error),
      // undoing would revert the PLAYER's last move — don't do that.
      if (aiMoveApplied) {
        currentChessGame.undo();
        if (boardInstanceRef.current) {
          boardInstanceRef.current.setPosition(currentChessGame.fen());
        }
        setChessPosition(currentChessGame.fen());
        setMoveHistory(currentChessGame.history());
        updateCapturedPieces();
        alert("The AI coach encountered an error after making its move. The AI's move has been reverted. Please try again or reset the game.");
      } else if (!isRetry && categorized.category === 'network') {
        // Pre-move network error (e.g. /api/move fetch failure) — retry
        // once after a short delay. Stockfish WebSocket failures are caught
        // by the inner try/catch above and handled via fallback candidates,
        // so they never reach this branch.
        shouldRetry = true;
      } else {
        if (boardInstanceRef.current) {
          boardInstanceRef.current.setPosition(currentChessGame.fen());
        }
        setChessPosition(currentChessGame.fen());
        setMoveHistory(currentChessGame.history());
        updateCapturedPieces();
        alert("The AI coach couldn't respond. Please try again or start a new game.");
      }
    } finally {
      if (!shouldRetry) {
        setIsTypingRef.current?.(false);
      }
    }

    if (shouldRetry) {
      setTimeout(() => makeAIMove(true), 2000);
      return;
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
