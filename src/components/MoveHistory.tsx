'use client';

interface MoveHistoryProps {
  moveHistory: string[];
}

export function MoveHistory({ moveHistory }: MoveHistoryProps) {
  return (
    <div className="flex flex-row gap-6 items-start justify-center w-full max-w-[300px] h-[600px] mt-[90px]">
      <div className="flex flex-col w-full max-w-[300px] h-full bg-zinc-800 rounded-lg p-4 shadow-xl border border-zinc-700">
        <h2 className="text-xl font-semibold mb-4 border-b border-zinc-700 pb-2">Move History</h2>
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          <div className="grid grid-cols-2 gap-2 font-mono text-sm">
            {Array.from({ length: Math.ceil(moveHistory.length / 2) }).map((_, i) => (
              <div key={i} className="contents">
                <div className="flex items-center gap-2 p-1 border-b border-zinc-700/50">
                  <span className="text-zinc-500 w-6">{i + 1}.</span>
                  <span>{moveHistory[i * 2]}</span>
                </div>
                <div className="flex items-center gap-2 p-1 border-b border-zinc-700/50">
                  {moveHistory[i * 2 + 1] ? <span>{moveHistory[i * 2 + 1]}</span> : <span className="text-zinc-600">...</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
