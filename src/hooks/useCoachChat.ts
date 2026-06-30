/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/refs */
'use client';

import { useEffect, useRef, useState } from 'react';
import type { Chess } from 'chess.js';
import type { Chessboard } from 'cm-chessboard';
import { supabase } from '@/lib/supabase';
import { processFen } from '@/lib/utils/chess';

const WELCOME_MESSAGE = "Welcome! Before we start this session, tell me: what's our goal for today? Do you want to practice a specific opening, work on your end-game, or just have me be an absolute menace on the board?";

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface UseCoachChatArgs {
  chessGameRef: React.MutableRefObject<Chess>;
  boardInstanceRef: React.MutableRefObject<Chessboard | null>;
  gameIdRef: React.MutableRefObject<string | null>;
  userRef: React.MutableRefObject<any>;
  opponentRef: React.MutableRefObject<any>;
  setSessionGoal: (g: string) => void;
  sessionGoalRef: React.MutableRefObject<string>;
  makeAIMove: () => Promise<void>;
  setChessPosition: (fen: string) => void;
  updateCapturedPieces: () => void;
  createGame: () => Promise<void>;
  /** Shared ref the orchestrator also passes into useChessGame so makeAIMove can append messages. */
  setChatMessagesRef: React.MutableRefObject<React.Dispatch<React.SetStateAction<ChatMessage[]>> | null>;
}

export function useCoachChat({
  chessGameRef,
  boardInstanceRef,
  gameIdRef,
  userRef,
  opponentRef,
  setSessionGoal,
  sessionGoalRef,
  makeAIMove,
  setChessPosition,
  updateCapturedPieces,
  createGame,
  setChatMessagesRef,
}: UseCoachChatArgs) {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: WELCOME_MESSAGE }
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [gamePhase, setGamePhase] = useState<'consultation' | 'playing'>('consultation');

  // Keep the shared ref pointed at the latest setter so useChessGame (created
  // before this hook) can append AI commentary via the ref.
  setChatMessagesRef.current = setChatMessages;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isTyping]);

  async function handleSendMessage() {
    if (!chatInput.trim()) return;
    const trimmedInput = chatInput.trim();

    const isFen = trimmedInput.includes('/') && (trimmedInput.length > 10);

    if (isFen && gamePhase === 'consultation') {
      const processedFenStr = processFen(trimmedInput);
      try {
        chessGameRef.current.load(processedFenStr);
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
            chessGameRef.current.load(processedFenStr);
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
              await createGame();
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

  return {
    chatMessages,
    setChatMessages,
    chatInput,
    setChatInput,
    isTyping,
    chatEndRef,
    gamePhase,
    setGamePhase,
    handleSendMessage,
    WELCOME_MESSAGE,
  };
}
