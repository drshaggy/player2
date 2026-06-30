import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MoveHistory } from './MoveHistory';
import { PAIRED_MOVE_HISTORY, SINGLE_MOVE_HISTORY, EMPTY_MOVE_HISTORY } from '@/__fixtures__';

describe('MoveHistory', () => {
  it('renders the heading', () => {
    render(<MoveHistory moveHistory={EMPTY_MOVE_HISTORY} />);
    expect(screen.getByText('Move History')).toBeInTheDocument();
  });

  it('renders paired moves with 1-based numbering', () => {
    const { container } = render(<MoveHistory moveHistory={PAIRED_MOVE_HISTORY} />);
    // 5 moves -> 3 rows (ceil(5/2)).
    const rows = container.querySelectorAll('.grid > .contents');
    expect(rows).toHaveLength(3);

    expect(screen.getByText('1.')).toBeInTheDocument();
    expect(screen.getByText('2.')).toBeInTheDocument();
    expect(screen.getByText('3.')).toBeInTheDocument();
    expect(screen.getByText('e4')).toBeInTheDocument();
    expect(screen.getByText('c6')).toBeInTheDocument();
    expect(screen.getByText('d5')).toBeInTheDocument();
  });

  it('shows an ellipsis placeholder for an unfinished pair', () => {
    render(<MoveHistory moveHistory={SINGLE_MOVE_HISTORY} />);
    // Move 1 white = e4, black slot empty -> "..." placeholder.
    expect(screen.getByText('e4')).toBeInTheDocument();
    expect(screen.getByText('...')).toBeInTheDocument();
  });

  it('renders nothing but the heading for an empty history', () => {
    const { container } = render(<MoveHistory moveHistory={EMPTY_MOVE_HISTORY} />);
    expect(container.querySelectorAll('.contents')).toHaveLength(0);
  });
});
