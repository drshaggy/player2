/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps, @next/next/no-img-element, react-hooks/refs */
// TODO: Phase 3+ — further extract useChessGame / useCoachChat / useGamePersistence
// hooks. The board state, AI move loop, chat, and persistence remain in this
// orchestrator because they share tightly-coupled refs (chessGameRef,
// boardInstanceRef, gameIdRef, sessionGoalRef). The presentational pieces
// (Board, ChatPanel, MoveHistory, AuthBadge) and useAuth have been extracted.
'use client';

import { useEffect, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { Chessboard, COLOR, INPUT_EVENT_TYPE } from 'cm-chessboard';
import { Markers } from 'cm-chessboard/src/extensions/markers/Markers';
import 'cm-chessboard/assets/chessboard.css';
import { supabase } from '@/lib/supabase';
import { getOpeningMoves } from '@/lib/openingBook';
import { processFen } from '@/lib/utils/chess';
import { useAuth } from '@/hooks/useAuth';
import { AuthBadge } from '@/components/AuthBadge';
import { Board } from '@/components/Board';
import { ChatPanel } from '@/components/ChatPanel';
import { MoveHistory } from '@/components/MoveHistory';

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

const WELCOME_MESSAGE = "Welcome! Before we start this session, tell me: what's our goal for today? Do you want to practice a specific opening, work on your end-game, or just have me be an absolute menace on the board?";

export default function ChessGame() {
  const boardRef = useRef<HTMLDivElement>(null);
  const boardInstanceRef = useRef<Chessboard | null>(null);
  const chessGameRef = useRef(new Chess());
  const chessGame = chessGameRef.current;

  const [chessPosition, setChessPosition] = useState(chessGame.fen());
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [capturedPieces, setCapturedPieces] = useState<Record<string, string[]>>({ w: [], b: [] });
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([
    { role: 'assistant', content: WELCOME_MESSAGE }
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [opponent, setOpponent] = useState<any>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [gamePhase, setGamePhase] = useState<'consultation' | 'playing'>('consultation');
  const [sessionGoal, setSessionGoal] = useState<string>("");

  const opponentRef = useRef<any>(null);
  const gameIdRef = useRef<string | null>(null);
  const sessionGoalRef = useRef<string>("");

  const { user, userRef, handleLogin, handleLogout } = useAuth();

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

  function updateCapturedPieces() {
    const currentFen = chessGame.fen();
    const pieces: Record<string, string[]> = { w: [], b: [] };
    const startingPieces = { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 };
    const counts: Record<'w' | 'b', Record<string, number>> = {
      w: { ...startingPieces },
      b: { ...startingPieces }
    };

    const boardPart = currentFen.split(' ')[0];
    const pieceRegex = /[pnbrqkPNBRQK]/g;
    let match;
    while ((match = pieceRegex.exec(boardPart)) !== null) {
      const char = match[0];
      const color = char === char.toUpperCase() ? 'w' : 'b';
      const type = char.toLowerCase();
      counts[color][type]--;
    }

    Object.entries(counts).forEach(([color, piecesCount]) => {
      Object.entries(piecesCount).forEach(([type, count]) => {
        for (let i = 0; i < count; i++) {
          pieces[color].push(type);
        }
      });
    });

    setCapturedPieces(pieces);
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
          setChatMessages(prev => [...prev, aiMsg]);
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

  async function handleSendMessage() {
    if (!chatInput.trim()) return;
    const trimmedInput = chatInput.trim();

    const isFen = trimmedInput.includes('/') && (trimmedInput.length > 10);

    if (isFen && gamePhase === 'consultation') {
      const processedFenStr = processFen(trimmedInput);
      try {
        chessGame.load(processedFenStr);
        if (boardInstanceRef.current) {
          boardInstanceRef.current.setPosition(processedFenStr);
        }
        setChessPosition(processedFenStr);
        updateCapturedPieces();
        setChatMessages(prev => [...prev,
        { role: 'user' as const, content: trimmedInput },
        { role: 'assistant' as const, content: "Position updated! I've set the board. What's the goal for this position?" }
        ]);
        setChatInput("");
        return;
      } catch {
        // proceed to chat
      }
    }

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (!token) {
      alert("Please log in to chat with the coach.");
      return;
    }

    const message = trimmedInput;
    setChatInput("");

    const userMsg = { role: 'user' as const, content: message };
    setChatMessages(prev => [...prev, userMsg]);

    try {
      setIsTyping(true);

      if (gamePhase === 'consultation') {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            gameId: 'consultation',
            fen: chessGameRef.current.fen(),
            message: message,
            persona: 'balanced'
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.content) {
          const aiMsg = { role: 'assistant' as const, content: data.content };
          setChatMessages(prev => [...prev, aiMsg]);

          if (data.suggestedFen) {
            const processedFenStr = processFen(data.suggestedFen);
            chessGame.load(processedFenStr);
            if (boardInstanceRef.current) {
              boardInstanceRef.current.setPosition(processedFenStr);
            }
            setChessPosition(processedFenStr);
            updateCapturedPieces();
          }

          if (data.transitionToGame) {
            setGamePhase('playing');
            setSessionGoal(data.sessionGoal || '');
            sessionGoalRef.current = data.sessionGoal || '';

            const currentUser = userRef.current;
            const currentOpponent = opponentRef.current;
            if (currentUser && currentOpponent) {
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
          }
        }
      } else {
        if (!gameIdRef.current) {
          console.warn('No gameId found for AI move');
          return;
        }

        if (chessGameRef.current.turn() === 'b') {
          await makeAIMove();
        } else {
          const response = await fetch("/api/chat", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
              gameId: gameIdRef.current,
              fen: chessGameRef.current.fen(),
              message: message,
              persona: 'balanced'
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
          }

          const data = await response.json();

          if (data.content) {
            const aiMsg = { role: 'assistant' as const, content: data.content };
            setChatMessages(prev => [...prev, aiMsg]);
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
    } finally {
      setIsTyping(false);
    }
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

      if (game) {
        setGameId(game.id);
        gameIdRef.current = game.id;
        setGamePhase('playing');

        if (game.session_goal) {
          setSessionGoal(game.session_goal);
          sessionGoalRef.current = game.session_goal;
        }

        const { data: moveHistoryData } = await supabase
          .from('moves')
          .select('move_san')
          .eq('game_id', game.id)
          .order('move_number', { ascending: true });

        if (moveHistoryData) {
          const sanHistory = moveHistoryData.map((m: any) => m.move_san);
          chessGame.reset();
          for (const san of sanHistory) {
            try {
              chessGame.move(san);
            } catch {
              console.error(`Failed to replay move ${san}`);
            }
          }
          setMoveHistory(sanHistory);
        } else {
          chessGame.load(game.current_fen);
          setMoveHistory(chessGame.history());
        }

        setChessPosition(chessGame.fen());
        updateCapturedPieces();

        const { data: chatHistory } = await supabase
          .from('game_chat')
          .select('role, content')
          .eq('game_id', game.id)
          .order('created_at', { ascending: true });

        if (chatHistory) {
          setChatMessages(chatHistory.map((m: any) => ({
            role: m.role,
            content: m.content
          })));
        }

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
    }

    if (user && opponent) {
      restoreGame();
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [user, opponent]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isTyping]);

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

  async function handleNewGame() {
    const oldGameId = gameIdRef.current;

    chessGameRef.current = new Chess();
    const newFen = chessGameRef.current.fen();
    if (boardInstanceRef.current) {
      boardInstanceRef.current.setPosition(newFen);
    }
    setChessPosition(newFen);
    setMoveHistory([]);
    setCapturedPieces({ w: [], b: [] });
    setChatMessages([{ role: 'assistant', content: WELCOME_MESSAGE }]);
    setGameId(null);
    gameIdRef.current = null;
    setGamePhase('consultation');
    setSessionGoal("");

    if (oldGameId) {
      await supabase
        .from('games')
        .update({ status: 'finished' })
        .eq('id', oldGameId);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-900 text-white p-4">
      <AuthBadge user={user} onLogin={handleLogin} onLogout={handleLogout} />
      <h1 className="text-4xl font-bold mb-8">Player 2: Your AI Chess Coach</h1>

      <div className="flex flex-col md:flex-row gap-8 items-start justify-center w-full max-w-screen-xl">
        <MoveHistory moveHistory={moveHistory} />

        <Board
          boardRef={boardRef}
          gamePhase={gamePhase}
          capturedPieces={capturedPieces}
          opponent={opponent}
        />

        <ChatPanel
          chatMessages={chatMessages}
          isTyping={isTyping}
          chatInput={chatInput}
          onChatInputChange={setChatInput}
          onSend={handleSendMessage}
          chatEndRef={chatEndRef}
        />
      </div>

      <div className="mt-8 flex gap-4">
        <button
          onClick={handleNewGame}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-md font-medium transition-colors"
        >
          New Game
        </button>
        <div className="px-6 py-2 bg-zinc-800 rounded-md font-mono text-sm">
          FEN: {chessPosition.slice(0, 20)}...
        </div>
      </div>
    </div>
  );
}
