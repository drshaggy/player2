'use client';

import { RefObject } from 'react';
import { getPieceImage } from '@/lib/utils/chess';

interface BoardProps {
  boardRef: RefObject<HTMLDivElement | null>;
  gamePhase: 'consultation' | 'playing';
  capturedPieces: Record<string, string[]>;
  opponent: { username?: string } | null;
}

export function Board({ boardRef, gamePhase, capturedPieces, opponent }: BoardProps) {
  return (
    <div className="flex flex-col gap-4 items-center">
      <div className="flex justify-center gap-1 h-8 text-2xl">
        {capturedPieces.b.map((p, i) => (
          <img key={i} src={getPieceImage(p, 'b')} alt={p} className="w-6 h-6 opacity-80" />
        ))}
      </div>
      <div className="flex items-center gap-2 px-3 py-1 bg-zinc-800 rounded-full text-xs font-medium text-zinc-400 border border-zinc-700 shrink-0">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        Playing against {opponent?.username || 'Loading...'}
      </div>
      <div className="relative shadow-2xl border-8 border-zinc-800 rounded-lg overflow-hidden w-[600px] h-[600px] aspect-square">
        {gamePhase === 'consultation' && (
          <div className="absolute inset-0 z-10 bg-zinc-900/80 backdrop-blur-sm flex items-center justify-center p-8 text-center">
            <div>
              <h3 className="text-2xl font-bold mb-4">Pre-Game Consultation</h3>
              <p className="text-zinc-400 mb-6">Chat with your coach to set the goals for this session before the board opens.</p>
              <div className="text-sm text-zinc-500 animate-bounce">Check the chat window &rarr;</div>
            </div>
          </div>
        )}
        <div ref={boardRef} className="w-full h-full" />
      </div>
      <div className="flex justify-center gap-1 h-8 text-2xl">
        {capturedPieces.w.map((p, i) => (
          <img key={i} src={getPieceImage(p, 'w')} alt={p} className="w-6 h-6 opacity-80" />
        ))}
      </div>
    </div>
  );
}
