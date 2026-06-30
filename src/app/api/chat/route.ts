import { NextRequest, NextResponse } from 'next/server';
import { LLM_CONFIG } from '@/lib/config/llm';
import { createClient } from '@supabase/supabase-js';
import { detectMentionedOpening, findPopularLine, type LinePosition } from '@/lib/consultation/openingLineFinder';

export async function POST(req: NextRequest) {
  try {
    try {
      // 1. Extract the JWT from the Authorization header
      const authHeader = req.headers.get('Authorization');
      const token = authHeader?.split('Bearer ')[1];

      if (!token) {
        console.error('Missing Authorization token');
        return NextResponse.json({ error: 'Authentication token required' }, { status: 401 });
      }

      const body = await req.json();
      const { gameId, message, fen, persona = 'aggressive' } = body;
      const API_KEY = process.env.LLM_API_KEY;

      if (!API_KEY) {
        console.error('Missing LLM_API_KEY');
        return NextResponse.json({ error: 'LLM_API_KEY not configured' }, { status: 500 });
      }

      if (!gameId || !message) {
        return NextResponse.json({ error: 'gameId and message are required' }, { status: 400 });
      }

      // 2. Initialize Supabase client with the user's token for RLS propagation
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      
      const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      });

      // 3. Handle Consultation Phase specially
      if (gameId === 'consultation') {
        // If the player mentions a known opening, query the Lichess masters
        // explorer for its most popular main line and present the LLM with a
        // menu of White-to-move positions at increasing depth (start of
        // opening, then each Black reply deeper). The LLM — not this code —
        // decides which depth matches the player's phrasing ("play caro kann"
        // = start, "caro kann middle game" = deep), with Lichess providing
        // the concrete legal positions + frequencies so the LLM never
        // fabricates a FEN.
        let validFens: LinePosition[] = [];
        let fenDirective = '';
        const spine = detectMentionedOpening(message);
        if (spine) {
          const line = await findPopularLine(spine);
          if (line && line.positions.length > 0) {
            validFens = line.positions;
            const menu = line.positions.map((p, i) => `${i}. ${p.label} — FEN: ${p.fen}`).join('\n');
            fenDirective = `\n\nThe player wants to play the ${line.openingName}. The Lichess masters database provides its most popular main line. Below are White-to-move positions at increasing depth along that line (all side-to-move 'w'). Pick the one that best matches the player's intent: if they just named the opening ("play caro kann"), choose the START; if they asked for the middle game / a deeper point ("caro kann middle game", "after a few moves"), choose a deeper position. You MUST emit the EXACT FEN you chose (copy verbatim, do not invent or modify) as the SET_FEN, then include TRANSITION_TO_GAME with a goal summarizing the player's request.\n\nAvailable positions:\n${menu}\n`;
          }
        }

        const consultationPrompt = `You are a world-class chess coach with an ${persona} persona.
You are currently in the "Consultation Phase" with a player. 
Your goal is to help the player define a specific objective for this session.
Ask them: "What's our goal for today? Do you want to practice a specific opening, work on your end-game, or just have me be an absolute menace on the board?"

If the user requests a specific opening, position, or endgame scenario, you MUST provide the corresponding FULL FEN string (including turn, castling rights, en passant square, halfmove clock, and fullmove number) using the format 'SET_FEN: <full_fen_string>'. 
Crucially, a partial FEN (piece placement only) is NOT acceptable; it must be a complete 6-field FEN.
The SET_FEN command must be on its own line or clearly separated so it can be parsed. Do not wrap it in other text on the same line if possible.

IMPORTANT - SIDE TO MOVE: The human player is ALWAYS White and moves first. The FEN's side-to-move field (the 2nd field) MUST be 'w' (White to move). Never emit a FEN where it is Black's turn. If the requested scenario would naturally have Black to move (e.g. a position after Black's reply, or "let me defend the Sicilian as Black"), instead return the position ONE PLY EARLIER — the position before Black's move — so that it becomes White's turn and the player can make the next move. If you cannot express the scenario with White to move, do not emit a SET_FEN at all; instead describe the position in words and ask the player how they'd like to proceed.
${fenDirective}
Once they have clearly stated a goal (or you have suggested a position that fulfills their request), you MUST include the exact phrase 'TRANSITION_TO_GAME' in your response, followed by a summary of the goal they chose.


Examples:
- "That sounds great! Let's focus on the Sicilian Defense. TRANSITION_TO_GAME Goal: Practice Sicilian Defense"
- "I'm ready to destroy you then. TRANSITION_TO_GAME Goal: Aggressive play"

Keep it conversational and a bit edgy.`;

        const llmMessages = [
          { role: 'system', content: consultationPrompt },
          { role: 'user', content: message },
        ];

         const llmResponse = await fetch(LLM_CONFIG.endpoint, {
           method: 'POST',
           headers: {
             'Authorization': `Bearer ${API_KEY}`,
             'Content-Type': 'application/json',
           },
            body: JSON.stringify({
              model: LLM_CONFIG.model,
              messages: llmMessages,
            }),
         });

         if (!llmResponse.ok) {
           const errorText = await llmResponse.text();
           console.error('LLM API error (Consultation):', llmResponse.status, errorText);
           return NextResponse.json({ error: `LLM API failed with status ${llmResponse.status}: ${errorText}` }, { status: 500 });
         }

          const llmData = await llmResponse.json();
          const aiContent = llmData.choices[0].message.content;
 
          let suggestedFen = null;
          if (aiContent.includes('SET_FEN:')) {
            // A FEN has exactly 6 space-separated fields. [^\s]+ only captures
            // the first field (piece placement), leaking "w KQkq - 0 1" into
            // the chat message.
            const fenMatch = aiContent.match(/SET_FEN:\s*((?:\S+\s+){5}\S+)/);
            if (fenMatch) {
              suggestedFen = fenMatch[1];
            }
          }
           const cleanedContent = aiContent.replace(/SET_FEN:\s*(?:\S+\s+){5}\S+/g, '').trim();

 
         if (cleanedContent.includes('TRANSITION_TO_GAME')) {
           const parts = cleanedContent.split('TRANSITION_TO_GAME');
           const finalContent = parts[0].trim();
           const goalPart = parts[1] || '';
           const sessionGoal = goalPart.replace(/Goal:/i, '').trim();

           // Validate the LLM's chosen FEN against the precomputed menu of
           // legal White-to-move positions. The LLM decides the depth; this
           // guard ensures it picked a real position (not a hallucination).
           // If it didn't, fall back to the start of the opening (shallowest,
           // safest White-to-move position), or to the LLM's own FEN if no
           // opening menu was computed.
           let transitionFen = suggestedFen;
           let transitionLine: string[] | null = null;
           if (validFens.length > 0) {
             const match = validFens.find(p => p.fen === suggestedFen);
             const chosen = match ?? validFens[0];
             transitionFen = chosen.fen;
             transitionLine = chosen.line;
           }

           return NextResponse.json({ 
             content: finalContent, 
             transitionToGame: true, 
             sessionGoal: sessionGoal,
             suggestedFen: transitionFen,
             suggestedLine: transitionLine
           });
         }
 
         return NextResponse.json({ 
           content: cleanedContent, 
           suggestedFen: suggestedFen,
           suggestedLine: null
         });
      }

      // 4. Standard Game Chat Phase
      const { error: insertError } = await userSupabase
        .from('game_chat')
        .insert({ game_id: gameId, role: 'user', content: message });

      if (insertError) {
        console.error('Supabase insert error:', insertError);
        return NextResponse.json({ error: 'Failed to save message', details: insertError.message }, { status: 500 });
      }

      const { data: history, error: historyError } = await userSupabase
        .from('game_chat')
        .select('role, content')
        .eq('game_id', gameId)
        .order('created_at', { ascending: true });

      if (historyError) {
        console.error('Supabase history error:', historyError);
        return NextResponse.json({ error: 'Failed to fetch history', details: historyError.message }, { status: 500 });
      }

      const systemPrompt = `You are a world-class chess coach with an ${persona} persona.
You are chatting with a player during their game. Provide strategic advice, explain the current position, and be encouraging but honest.
Current FEN: ${fen || 'Not provided'}
Always keep your responses concise and conversational.`;

      const llmMessages = [
        { role: 'system', content: systemPrompt },
        ...(history || []),
      ];

      const llmResponse = await fetch(LLM_CONFIG.endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
           body: JSON.stringify({
            model: LLM_CONFIG.model,
            messages: llmMessages,
          }),
      });

      if (!llmResponse.ok) {
        const errorText = await llmResponse.text();
        console.error('LLM API error (Chat):', llmResponse.status, errorText);
        return NextResponse.json({ error: `LLM API failed with status ${llmResponse.status}: ${errorText}` }, { status: 500 });
      }

      const llmData = await llmResponse.json();
      
      if (!llmData.choices || llmData.choices.length === 0) {
        throw new Error('Invalid LLM response');
      }

      const aiContent = llmData.choices[0].message.content;

      const supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });

      const { error: aiInsertError } = await supabaseAdmin
        .from('game_chat')
        .insert({ game_id: gameId, role: 'assistant', content: aiContent });

      if (aiInsertError) {
        console.error('Supabase assistant insert error:', aiInsertError);
      }

      return NextResponse.json({ content: aiContent });

    } catch (error: unknown) {
      console.error('Inner Error in /api/chat:', error);
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
    }
  } catch (globalError: unknown) {
    console.error('Global Error in /api/chat:', globalError);
    return NextResponse.json({ error: 'Critical Internal Server Error' }, { status: 500 });
  }
}
