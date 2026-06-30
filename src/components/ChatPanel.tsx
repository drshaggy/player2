'use client';

import { RefObject } from 'react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatPanelProps {
  chatMessages: ChatMessage[];
  isTyping: boolean;
  chatInput: string;
  onChatInputChange: (value: string) => void;
  onSend: () => void;
  chatEndRef: RefObject<HTMLDivElement | null>;
}

export function ChatPanel({
  chatMessages,
  isTyping,
  chatInput,
  onChatInputChange,
  onSend,
  chatEndRef,
}: ChatPanelProps) {
  return (
    <div className="flex flex-1 flex-col h-[600px] mt-[90px]">
      <div className="flex flex-col w-full h-full bg-zinc-800 rounded-lg p-4 shadow-xl border border-zinc-700">
        <h2 className="text-xl font-semibold mb-4 border-b border-zinc-700 pb-2">Coach&apos;s Voice</h2>
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar mb-4 space-y-3">
          {chatMessages.length === 0 && <div className="text-zinc-500 italic text-sm">No conversation yet...</div>}
          {chatMessages.map((msg, i) => (
            <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[80%] p-2 rounded-lg text-sm ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-tr-none'
                  : 'bg-zinc-700 text-zinc-200 rounded-tl-none'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          {isTyping && <div className="text-zinc-500 text-xs italic animate-pulse">Coach is thinking...</div>}
          <div ref={chatEndRef} />
        </div>
        <div className="flex gap-2 mt-auto">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => onChatInputChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSend()}
            placeholder="Ask a question..."
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={onSend}
            className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm font-medium transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
