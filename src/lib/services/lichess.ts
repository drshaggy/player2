export interface LichessMove {
  uci: string;
  san: string;
  averageRating: number;
  white: number;
  black: number;
  draws: number;
  total: number;
  opening?: {
    eco: string;
    name: string;
  } | null;
}

export interface LichessOpeningResponse {
  opening: {
    eco: string;
    name: string;
  } | null;
  moves: Array<{
    uci: string;
    san: string;
    averageRating: number;
    white: number;
    black: number;
    draws: number;
    opening: {
      eco: string;
      name: string;
    } | null;
  }>;
}

export async function getMasterOpeningMoves(play: string, movesLimit = 5): Promise<LichessMove[]> {
  const url = `https://explorer.lichess.org/masters?play=${play}&moves=${movesLimit}`;
  const token = process.env.LICHESS_API_TOKEN;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(url, { signal: controller.signal, headers });
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`Lichess API error: ${response.statusText}`);
    
    const data: LichessOpeningResponse = await response.json();
    
    if (!data || !Array.isArray(data.moves)) {
      return [];
    }

    return data.moves.map(m => ({
      uci: m.uci,
      san: m.san,
      averageRating: m.averageRating,
      white: m.white,
      black: m.black,
      draws: m.draws,
      total: m.white + m.black + m.draws,
      opening: m.opening
    }));
  } catch (error) {
    console.error('Failed to fetch Lichess opening moves:', error);
    return [];
  }
}
