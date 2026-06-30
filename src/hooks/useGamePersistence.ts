/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
'use client';

import { useEffect, useRef, useState } from 'react';
import type { Chess } from 'chess.js';
import type { Chessboard } from 'cm-chessboard';
import { supabase } from '@/lib/supabase';

interface RestoredState {
  game: {
    id: string;
    session_goal: string | null;
    current_fen: string;
  };
  sanHistory: string[];
  fen: string;
  chatHistory: { role: 'user' | 'assistant'; content: string }[];
}

interface UseGamePersistenceArgs {
  chessGameRef: React.MutableRefObject<Chess>;
  boardInstanceRef: React.MutableRefObject<Chessboard | null>;
  user: any;
  userRef: React.MutableRefObject<any>;
  /** Applied after restore loads + replays the game so the orchestrator can sync cross-hook UI state. */
  applyRestoredStateRef: React.MutableRefObject<((data: RestoredState) => void) | null>;
}

export function useGamePersistence({
  chessGameRef,
  boardInstanceRef,
  user,
  userRef,
  applyRestoredStateRef,
}: UseGamePersistenceArgs) {
  const [gameId, setGameId] = useState<string | null>(null);
  const gameIdRef = useRef<string | null>(null);
  const [opponent, setOpponent] = useState<any>(null);
  const opponentRef = useRef<any>(null);

  useEffect(() => {
    async function fetchCoach() {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', 'Coach')
        .single();
      setOpponent(data);
      opponentRef.current = data;
    }
    fetchCoach();
  }, []);

  async function saveGameMove(move: any) {
    const currentUser = userRef.current;
    const currentOpponent = opponentRef.current;
    let currentGameId = gameIdRef.current;
    const currentChessGame = chessGameRef.current;

    if (!currentUser || !currentOpponent) return;

    if (!currentGameId) {
      const { data: game, error } = await supabase
        .from('games')
        .insert({
          white_player_id: currentUser.id,
          black_player_id: currentOpponent.id,
          status: 'ongoing',
          current_turn: currentChessGame.turn(),
          current_fen: currentChessGame.fen(),
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating game:', error);
        return;
      }
      currentGameId = game.id;
      gameIdRef.current = game.id;
      setGameId(game.id);
    }

    await supabase
      .from('moves')
      .insert({
        game_id: currentGameId,
        move_number: Math.floor(currentChessGame.history().length / 2) + 1,
        player_color: currentChessGame.turn() === 'w' ? 'b' : 'w',
        move_san: move.san,
        fen_after: currentChessGame.fen(),
      });

    await supabase
      .from('games')
      .update({ current_fen: currentChessGame.fen() })
      .eq('id', currentGameId);
  }

  async function createGame() {
    const currentUser = userRef.current;
    const currentOpponent = opponentRef.current;
    if (!currentUser || !currentOpponent) return;

    const { data: game } = await supabase
      .from('games')
      .insert({
        white_player_id: currentUser.id,
        black_player_id: currentOpponent.id,
        status: 'ongoing',
        current_turn: chessGameRef.current.turn(),
        current_fen: chessGameRef.current.fen(),
      })
      .select()
      .single();

    if (game) {
      setGameId(game.id);
      gameIdRef.current = game.id;
    }
  }

  async function finishGame(oldGameId: string | null) {
    if (!oldGameId) return;
    await supabase
      .from('games')
      .update({ status: 'finished' })
      .eq('id', oldGameId);
  }

  function resetGameId() {
    setGameId(null);
    gameIdRef.current = null;
  }

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    async function restoreGame() {
      if (!user || !opponent) return;

      const { data: games, error } = await supabase
        .from('games')
        .select('*')
        .eq('white_player_id', user.id)
        .eq('black_player_id', opponent.id)
        .eq('status', 'ongoing')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error restoring game:', error);
        return;
      }

      const game = games?.[0];
      if (!game) return;

      setGameId(game.id);
      gameIdRef.current = game.id;

      const { data: moveHistoryData } = await supabase
        .from('moves')
        .select('move_san')
        .eq('game_id', game.id)
        .order('move_number', { ascending: true });

      const chessGame = chessGameRef.current;
      let sanHistory: string[] = [];

      if (moveHistoryData) {
        sanHistory = moveHistoryData.map((m: any) => m.move_san);
        chessGame.reset();
        for (const san of sanHistory) {
          try {
            chessGame.move(san);
          } catch {
            console.error(`Failed to replay move ${san}`);
          }
        }
      } else {
        chessGame.load(game.current_fen);
        sanHistory = chessGame.history();
      }

      const { data: chatHistory } = await supabase
        .from('game_chat')
        .select('role, content')
        .eq('game_id', game.id)
        .order('created_at', { ascending: true });

      const chatRows = (chatHistory ?? []).map((m: any) => ({
        role: m.role,
        content: m.content,
      }));

      // Apply cross-hook UI state, then nudge the board to the restored FEN.
      applyRestoredStateRef.current?.({
        game,
        sanHistory,
        fen: chessGame.fen(),
        chatHistory: chatRows,
      });

      let attempts = 0;
      intervalId = setInterval(() => {
        if (boardInstanceRef.current) {
          boardInstanceRef.current.setPosition(game.current_fen);
          clearInterval(intervalId);
        } else {
          attempts++;
          if (attempts > 50) {
            clearInterval(intervalId);
          }
        }
      }, 100);
    }

    if (user && opponent) {
      restoreGame();
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [user, opponent]);

  return {
    gameId,
    gameIdRef,
    setGameId,
    opponent,
    opponentRef,
    saveGameMove,
    createGame,
    finishGame,
    resetGameId,
  };
}
