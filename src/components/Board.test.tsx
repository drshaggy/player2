import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Board } from './Board';
import { createRef } from 'react';

const baseProps = (overrides: Partial<Parameters<typeof Board>[0]> = {}) => ({
  boardRef: createRef<HTMLDivElement>(),
  gamePhase: 'playing' as const,
  capturedPieces: { w: [] as string[], b: [] as string[] },
  opponent: { username: 'Coach' },
  ...overrides,
});

describe('Board', () => {
  it('shows the opponent username in the status pill', () => {
    render(<Board {...baseProps({ opponent: { username: 'Magnus' } })} />);
    expect(screen.getByText(/Playing against Magnus/i)).toBeInTheDocument();
  });

  it('falls back to "Loading..." when no opponent is provided', () => {
    render(<Board {...baseProps({ opponent: null })} />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('renders the consultation overlay during the consultation phase', () => {
    render(<Board {...baseProps({ gamePhase: 'consultation' })} />);
    expect(screen.getByText(/Pre-Game Consultation/i)).toBeInTheDocument();
    expect(screen.getByText(/Chat with your coach/i)).toBeInTheDocument();
  });

  it('does not render the consultation overlay during the playing phase', () => {
    render(<Board {...baseProps({ gamePhase: 'playing' })} />);
    expect(screen.queryByText(/Pre-Game Consultation/i)).not.toBeInTheDocument();
  });

  it('renders captured black pieces (top) and white pieces (bottom)', () => {
    render(
      <Board
        {...baseProps({
          capturedPieces: { w: ['p', 'n'], b: ['q'] },
        })}
      />,
    );
    const imgs = screen.getAllByRole('img');
    // 3 captured piece images total.
    expect(imgs).toHaveLength(3);
    // Black queen captured-by-white shown at top: /bq.svg
    expect(imgs.some((i) => (i as HTMLImageElement).src.includes('bq.svg'))).toBe(true);
    // White pawn + knight captured-by-black shown at bottom: /wp.svg, /wn.svg
    expect(imgs.some((i) => (i as HTMLImageElement).src.includes('wp.svg'))).toBe(true);
    expect(imgs.some((i) => (i as HTMLImageElement).src.includes('wn.svg'))).toBe(true);
  });

  it('renders no piece images when nothing has been captured', () => {
    render(<Board {...baseProps()} />);
    expect(screen.queryAllByRole('img')).toHaveLength(0);
  });
});
