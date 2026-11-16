/**
 * CLI Simulation Example
 *
 * Demonstrates how to build an interactive or automated terminal game
 * using the stateful TicTacToe engine and the tree-shakable Minimax bot.
 */

import { TicTacToe, type Cell } from '../src/index';
import { getBestMove } from '../src/ai/index';

declare const console: {
  log: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
};

/**
 * Formats a 1D board array into an ASCII 3x3 grid.
 */
export function formatAsciiBoard(board: readonly Cell[]): string {
  const rows: string[] = [];

  for (let r = 0; r < 3; r++) {
    const cells: string[] = [];
    for (let c = 0; c < 3; c++) {
      const idx = r * 3 + c;
      const val = board[idx];
      cells.push(val !== null && val !== undefined ? val : String(idx));
    }
    rows.push(` ${cells.join(' | ')} `);
  }

  return rows.join('\n---+---+---\n');
}

/**
 * Runs an automated simulation of a human player against the unbeatable 'hard' bot.
 */
export function runSimulation(logger: (msg: string) => void = console.log): {
  readonly winner: string | null;
  readonly status: string;
} {
  const game = new TicTacToe({ startingPlayer: 'X' });
  logger('=== Headless Tic-Tac-Toe: Human (X) vs Unbeatable Bot (O) ===\n');
  logger(formatAsciiBoard(game.board));
  logger('\n----------------------------------------\n');

  // Pre-selected human moves for demonstration: corner, then attempt fork
  const humanMoves = [0, 8, 2];
  let humanMoveIdx = 0;

  while (!game.isGameOver()) {
    if (game.turn === 'X') {
      const nextMove = humanMoves[humanMoveIdx++];
      const legal = game.getLegalMoves();
      const move =
        nextMove !== undefined && game.isValidMove(nextMove)
          ? nextMove
          : (legal[0] ?? 0);

      logger(`Player X plays index ${move}:`);
      game.makeMove(move);
    } else {
      const botMove = getBestMove(game.getState(), { difficulty: 'hard' });
      if (botMove === null) break;

      logger(`Bot O plays optimal index ${botMove}:`);
      game.makeMove(botMove);
    }

    logger(formatAsciiBoard(game.board));
    logger(`Status: ${game.status} | Turn: ${game.turn}\n`);
  }

  logger('=== Game Over ===');
  if (game.status === 'WON') {
    logger(`Winner: ${game.winner}`);
    logger(`Winning Line: [${game.winningLine?.join(', ') ?? ''}]`);
  } else {
    logger('Result: DRAW (Cat\'s Game)');
  }

  return {
    winner: game.winner,
    status: game.status,
  };
}
