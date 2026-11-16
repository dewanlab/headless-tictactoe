import { BOARD_SIZE, WIN_PATTERNS } from './constants';
import type { Cell, EvaluationResult, Player, WinningLine } from './types';

export function checkWinner(
  board: readonly Cell[]
): { readonly winner: Player; readonly winningLine: WinningLine } | null {
  for (const pattern of WIN_PATTERNS) {
    const [a, b, c] = pattern;
    const cellA = board[a];
    const cellB = board[b];
    const cellC = board[c];

    if (
      cellA !== null &&
      cellA !== undefined &&
      cellA === cellB &&
      cellA === cellC
    ) {
      return {
        winner: cellA,
        winningLine: pattern,
      };
    }
  }

  return null;
}

export function isBoardFull(board: readonly Cell[]): boolean {
  if (board.length !== BOARD_SIZE) {
    return false;
  }

  return board.every((cell) => cell !== null);
}

export function evaluateBoard(board: readonly Cell[]): EvaluationResult {
  const winMatch = checkWinner(board);
  if (winMatch !== null) {
    return {
      status: 'WON',
      winner: winMatch.winner,
      winningLine: winMatch.winningLine,
    };
  }

  if (isBoardFull(board)) {
    return {
      status: 'DRAW',
      winner: null,
      winningLine: null,
    };
  }

  return {
    status: 'IN_PROGRESS',
    winner: null,
    winningLine: null,
  };
}
