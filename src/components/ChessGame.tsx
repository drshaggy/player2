'use client';

/* eslint-disable react-hooks/refs */
import { useRef, useState } from 'react';
import { Chess } from 'chess.js';
import type { Chessboard } from 'cm-chessboard';
import { useAuth } from '@/hooks/useAuth';
import { useGamePersistence } from '@/hooks/useGamePersistence';
import { useChessGame } from '@/hooks/useChessGame';
import { useCoachChat } from '@/hooks/useCoachChat';
import { AuthBadge } from '@/components/AuthBadge';
import { Board } from '@/components/Board';
import { ChatPanel } from '@/components/ChatPanel';
import { MoveHistory } from '@/components/MoveHistory';

interface RestoredState {
  game: { id: string; session_goal: string | null; current_fen: string };
  sanHistory: string[];
  fen: string;
  chatHistory: { role: 'user' | 'assistant'; content: string }[];
}

export default function ChessGame() {
  // Truly shared refs owned by the orchestrator (used by multiple hooks).
  const chessGameRef = useRef(new Chess());
  const boardInstanceRef = useRef<Chessboard | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const sessionGoalRef = useRef<string>("");
  const setChatMessagesRef = useRef<React.Dispatch<React.SetStateAction<{ role: 'user' | 'assistant'; content: string }[]>> | null>(null);
  const setIsTypingRef = useRef<React.Dispatch<React.SetStateAction<boolean>> | null>(null);
  const applyRestoredStateRef = useRef<((data: RestoredState) => void) | null>(null);

  const [, setSessionGoal] = useState<string>("");

  const { user, userRef, handleLogin, handleLogout } = useAuth();

  const persistence = useGamePersistence({
    chessGameRef,
    boardInstanceRef,
    user,
    userRef,
    applyRestoredStateRef,
  });

  const chess = useChessGame({
    chessGameRef,
    boardInstanceRef,
    boardRef,
    gameIdRef: persistence.gameIdRef,
    sessionGoalRef,
    saveGameMove: persistence.saveGameMove,
    setChatMessagesRef,
    setIsTypingRef,
  });

  const chat = useCoachChat({
    chessGameRef,
    boardInstanceRef,
    gameIdRef: persistence.gameIdRef,
    userRef,
    opponentRef: persistence.opponentRef,
    setSessionGoal,
    sessionGoalRef,
    makeAIMove: chess.makeAIMove,
    setChessPosition: chess.setChessPosition,
    updateCapturedPieces: chess.updateCapturedPieces,
    createGame: persistence.createGame,
    setChatMessagesRef,
    setIsTypingRef,
  });

  // Applied by useGamePersistence after restore loads + replays the game.
  applyRestoredStateRef.current = (data: RestoredState) => {
    chess.setMoveHistory(data.sanHistory);
    chess.setChessPosition(data.fen);
    chess.updateCapturedPieces();
    if (data.chatHistory.length > 0) {
      chat.setChatMessages(data.chatHistory);
    }
    chat.setGamePhase('playing');
    if (data.game.session_goal) {
      setSessionGoal(data.game.session_goal);
      sessionGoalRef.current = data.game.session_goal;
    }
  };

  async function handleNewGame() {
    const oldGameId = persistence.gameIdRef.current;

    chess.resetBoard();
    chat.setChatMessages([{ role: 'assistant', content: chat.WELCOME_MESSAGE }]);
    persistence.resetGameId();
    chat.setGamePhase('consultation');
    setSessionGoal("");
    sessionGoalRef.current = "";

    await persistence.finishGame(oldGameId);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-900 text-white p-4">
      <AuthBadge user={user} onLogin={handleLogin} onLogout={handleLogout} />
      <h1 className="text-4xl font-bold mb-8">Player 2: Your AI Chess Coach</h1>

      <div className="flex flex-col md:flex-row gap-8 items-start justify-center w-full max-w-screen-xl">
        <MoveHistory moveHistory={chess.moveHistory} />

        <Board
          boardRef={boardRef}
          gamePhase={chat.gamePhase}
          capturedPieces={chess.capturedPieces}
          opponent={persistence.opponent}
        />

        <ChatPanel
          chatMessages={chat.chatMessages}
          isTyping={chat.isTyping}
          chatInput={chat.chatInput}
          onChatInputChange={chat.setChatInput}
          onSend={chat.handleSendMessage}
          chatEndRef={chat.chatEndRef}
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
          FEN: {chess.chessPosition.slice(0, 20)}...
        </div>
      </div>
    </div>
  );
}
