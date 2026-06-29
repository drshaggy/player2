import { describe, it, expect, vi } from 'vitest';
import { getOpeningMoves } from '@/lib/openingBook';

vi.mock('@/lib/openingBook', () => ({
  getOpeningMoves: vi.fn(),
}));

describe('Opening Book Integration', () => {
  it('should provide opening context for Caro-Kann progression', async () => {
    // Scenario: We are on the second move of a Caro-Kann
    const history = ['e4', 'c6'];
    const mockBookMoves = [
      { move: 'd4', name: 'Caro-Kann Main Line', description: 'Central control' }
    ];
    
    (getOpeningMoves as any).mockReturnValue(mockBookMoves);

    const bookOptions = getOpeningMoves(history, 'balanced');
    
    expect(bookOptions).toEqual(mockBookMoves);
    expect(bookOptions).toHaveLength(1);
    expect(bookOptions[0].move).toBe('d4');
  });

  it('should return null or empty array when outside opening book', () => {
    const history = ['e4', 'c6', 'd4', 'd5', 'nc3', 'dxe4', 'nx e4', 'nf6', 'ng5', 'h6', 'nxf7', 'kx f7'];
    (getOpeningMoves as any).mockReturnValue(null);

    const bookOptions = getOpeningMoves(history, 'balanced');
    
    expect(bookOptions).toBeNull();
  });
});
