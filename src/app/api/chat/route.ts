import { NextRequest, NextResponse } from 'next/server';
import { LLM_CONFIG } from '@/lib/config/llm';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
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
      // In consultation phase, we don't save to 'game_chat' table since there's no real game ID yet.
      // Instead, we treat it as a transient session setup.
      
      const consultationPrompt = `You are a world-class chess coach with an ${persona} persona.
You are currently in the "Consultation Phase" with a player. 
Your goal is to help the player define a specific objective for this session.
Ask them: "What's our goal for today? Do you want to practice a specific opening, work on your end-game, or just have me be an absolute menace on the board?"
Once they have clearly stated a goal, you MUST include the exact phrase 'TRANSITION_TO_GAME' in your response, followed by a summary of the goal they chose.

Examples:
- "That sounds great! Let's focus on the Sicilian Defense. TRANSITION_TO_GAME Goal: Practice Sicilian Defense"
- "I'm ready to destroy you then. TRANSITION_TO_GAME Goal: Aggressive play"

Keep it conversational and a bit edgy.`;

      const llmMessages = [
        { role: 'system', content: consultationPrompt },
        // We can't fetch from 'game_chat' for 'consultation', so we just use the current message
        // For a better experience, we could pass a history array in the body from the frontend.
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
        return NextResponse.json({ error: 'LLM API call failed' }, { status: 502 });
      }

      const llmData = await llmResponse.json();
      const aiContent = llmData.choices[0].message.content;

      if (aiContent.includes('TRANSITION_TO_GAME')) {
        const parts = aiContent.split('TRANSITION_TO_GAME');
        const cleanedContent = parts[0].trim();
        const goalPart = parts[1] || '';
        const sessionGoal = goalPart.replace(/Goal:/i, '').trim();

        return NextResponse.json({ 
          content: cleanedContent, 
          transitionToGame: true, 
          sessionGoal: sessionGoal 
        });
      }

      return NextResponse.json({ content: aiContent });
    }

    // 4. Standard Game Chat Phase (Existing Logic)
    // Persist the user message to Supabase using user's identity (RLS checked)
    const { error: insertError } = await userSupabase
      .from('game_chat')
      .insert({ game_id: gameId, role: 'user', content: message });

    if (insertError) {
      console.error('Supabase insert error:', insertError);
      return NextResponse.json({ error: 'Failed to save message', details: insertError.message }, { status: 500 });
    }

    // Fetch conversation history for context using user's identity
    const { data: history, error: historyError } = await userSupabase
      .from('game_chat')
      .select('role, content')
      .eq('game_id', gameId)
      .order('created_at', { ascending: true });

    if (historyError) {
      console.error('Supabase history error:', historyError);
      return NextResponse.json({ error: 'Failed to fetch history', details: historyError.message }, { status: 500 });
    }

    // Prepare LLM prompt
    const systemPrompt = `You are a world-class chess coach with an ${persona} persona.
You are chatting with a player during their game. Provide strategic advice, explain the current position, and be encouraging but honest.
Current FEN: ${fen || 'Not provided'}
Always keep your responses concise and conversational.`;

    const llmMessages = [
      { role: 'system', content: systemPrompt },
      ...(history || []),
    ];

    console.log('--- [DEBUG] API_CHAT PROMPT START ---');
    console.log('System Prompt:', systemPrompt);
    console.log('Messages:', JSON.stringify(llmMessages, null, 2));
    console.log('--- [DEBUG] API_CHAT PROMPT END ---');

    // 6. Call Cerebras LLM
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
      console.error('Cerebras API error:', llmResponse.status, errorText);
      return NextResponse.json({ error: 'LLM API call failed' }, { status: 502 });
    }

    const llmData = await llmResponse.json();
    
    if (!llmData.choices || llmData.choices.length === 0) {
      throw new Error('Invalid LLM response');
    }

    const aiContent = llmData.choices[0].message.content;

    // 7. Persist the assistant response.
    // Use the service role key here because the assistant is not a "user" in the auth sense.
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

  } catch (error: any) {
    console.error('Unhandled Error in /api/chat:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
