import { NextRequest, NextResponse } from 'next/server';
import { LLM_CONFIG } from '@/lib/config/llm';
import { runMovePipeline, type ChatMessage } from '@/lib/pipeline/movePipeline';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fen, candidates, persona = 'aggressive', messages = [], sessionGoal, openingContext, history = '' } = body;
    const API_KEY = process.env.LLM_API_KEY;

    if (!API_KEY) {
      return NextResponse.json({ error: 'LLM_API_KEY not configured' }, { status: 500 });
    }

    console.log('Calling LLM at endpoint:', LLM_CONFIG.endpoint);

    const result = await runMovePipeline(
      { fen, candidates, persona, messages, sessionGoal, openingContext, history },
      {
        apiKey: API_KEY,
        fetchLLM: (_systemPrompt: string, llmMessages: ChatMessage[]) =>
          fetch(LLM_CONFIG.endpoint, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: LLM_CONFIG.model,
              messages: llmMessages,
              response_format: { type: 'json_object' },
            }),
          }),
      },
    );

    switch (result.status) {
      case 'ok':
        return NextResponse.json({ move: result.move, commentary: result.commentary });
      case 'no-candidates':
        return NextResponse.json({ error: result.error }, { status: 400 });
      case 'bad-index':
        console.error(`Bad LLM index (${result.candidateCount} candidates):`, result.llmResponse);
        return NextResponse.json(
          { error: result.error, llmResponse: result.llmResponse, candidateCount: result.candidateCount },
          { status: 422 },
        );
      case 'llm-error':
        console.error('LLM error in /api/move:', result.error);
        return NextResponse.json({ error: result.error }, { status: 500 });
    }
  } catch (error: unknown) {
    console.error('Error in /api/move:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
  }
}
