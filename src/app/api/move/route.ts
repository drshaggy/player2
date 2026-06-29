import { NextRequest, NextResponse } from 'next/server';
import { SYSTEM_PROMPTS } from '@/lib/prompts/index';
import { LLM_CONFIG } from '@/lib/config/llm';
import { generateAsciiBoard, generateSemanticState } from '@/lib/utils/board';
import { getMasterOpeningMoves } from '@/lib/services/lichess';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fen, candidates, persona = 'aggressive', messages = [], sessionGoal, openingContext, history = '' } = body;
    const API_KEY = process.env.LLM_API_KEY;


    if (!API_KEY) {
      return NextResponse.json({ error: 'LLM_API_KEY not configured' }, { status: 500 });
    }

    let processedCandidates = [...candidates];
    let masterOpeningContext: any[] = [];

    // 1. Integrate Lichess Masters Database
    try {
      const uciHistory = Array.isArray(history) ? history.join(',') : history;
      
      if (uciHistory || candidates.length > 0) {
        const masterMoves = await getMasterOpeningMoves(uciHistory);
        if (masterMoves.length > 0) {
          masterOpeningContext = masterMoves.map(m => ({
            move: m.uci,
            san: m.san,
            theoryCount: m.total,
            averageRating: m.averageRating,
            opening: m.opening
          }));

          // Add master moves to candidates if they aren't there
          for (const masterMove of masterOpeningContext) {
            const exists = processedCandidates.find(c => c.move === masterMove.move);
            if (!exists) {
              processedCandidates.push({
                move: masterMove.move,
                from: '', 
                to: '',
                score: `${masterMove.theoryCount} games (Masters)`,
                depth: 0
              });
            }
          }
        }
      }
    } catch (e) {
      console.error('Lichess integration failed:', e);
    }

    console.log('--- [DEBUG] Post-Lichess State ---');
    console.log('processedCandidates length:', processedCandidates.length);
    console.log('openingContext length:', openingContext?.length);

    // Ensure opening book moves that might match the goal are included as candidates
    if (Array.isArray(openingContext)) {

      for (const bookMove of openingContext) {
        const alreadyExists = processedCandidates.find(c => c.move === bookMove.move);
        if (!alreadyExists) {
          // In a real production app, we'd call Stockfish here for the score.
          // For this implementation, we'll add it with a neutral score to allow the LLM to pick it.
          processedCandidates.push({
            move: bookMove.move,
            from: '', // These will be resolved by the client/game engine via SAN
            to: '',
            score: '0.0 (Book)',
            depth: 0
          });
        }
      }
    }

    if (!processedCandidates || !Array.isArray(processedCandidates) || processedCandidates.length === 0) {
      return NextResponse.json({ error: 'No candidate moves provided' }, { status: 400 });
    }

    // 1. Build Context for LLM
    const boardMap = generateAsciiBoard(fen);
    const semanticState = generateSemanticState(fen);

    const systemPrompt = SYSTEM_PROMPTS.moveSelection(
      persona, 
      boardMap, 
      semanticState, 
      fen, 
      processedCandidates, 
      [...(openingContext || []), ...masterOpeningContext], 
      sessionGoal
    );


    const llmMessages = [
      { role: 'system', content: systemPrompt },
      ...messages,
      { role: 'user', content: 'What move should we make now?' }
    ];

    console.log('--- [DEBUG] API_MOVE PROMPT START ---');
    console.log('System Prompt:', systemPrompt);
    console.log('Session Goal:', sessionGoal);
    console.log('Opening Context:', JSON.stringify(openingContext));
    console.log('Final Messages:', JSON.stringify(llmMessages, null, 2));
    console.log('--- [DEBUG] API_MOVE PROMPT END ---');

    console.log('Calling LLM at endpoint:', LLM_CONFIG.endpoint);
    const llmResponse = await fetch(LLM_CONFIG.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: LLM_CONFIG.model,
        messages: llmMessages,
        response_format: { type: 'json_object' },
      }),
    });

    console.log('LLM Response status:', llmResponse.status);
    if (!llmResponse.ok) {
      const errorText = await llmResponse.text();
      console.error('LLM API error response:', errorText);
      throw new Error(`LLM API failed with status ${llmResponse.status}: ${errorText}`);
    }

    const llmData = await llmResponse.json();
    
    if (!llmData.choices || llmData.choices.length === 0) {
      throw new Error('Invalid LLM response');
    }

    let content = llmData.choices[0].message.content;
    // Sanitize response in case LLM ignores "no markdown" instruction
    content = content.replace(/```json\n?/, '').replace(/```$/, '').trim();

    let result;
    try {
      result = JSON.parse(content);
    } catch (e) {
      console.error('Failed to parse LLM JSON response:', content);
      throw new Error('LLM returned invalid JSON');
    }

    if (!result || typeof result.selectedMoveIndex !== 'number') {
      console.error('LLM response missing selectedMoveIndex:', result);
      throw new Error('LLM response missing selectedMoveIndex');
    }

    const chosenCandidate = processedCandidates[result.selectedMoveIndex - 1] || processedCandidates[0];

    return NextResponse.json({
      move: {
        from: chosenCandidate.from,
        to: chosenCandidate.to,
        promotion: 'q',
        san: chosenCandidate.move
      },
      commentary: result.commentary,
    });


    } catch (error) {
      console.error('Error in /api/move:', error);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
  }
