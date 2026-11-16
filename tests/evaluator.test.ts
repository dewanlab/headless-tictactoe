import { describe, expect, it } from 'vitest';
import {
  checkWinner,
  evaluateBoard,
  isBoardFull,
  WIN_PATTERNS,
} from '../src';
import type { Cell, Player, WinningLine } from '../src';

describe('evaluator', () => {
  const players: Player[] = ['X', 'O'];

  describe('WIN_PATTERNS coverage (all 8 patterns for X and O)', () => {
    const testCases: Array<{ pattern: WinningLine; player: Player; description: string }> = [];

    const patternLabels: Record<string, string> = {
      '0,1,2': 'Row 0 [0, 1, 2]',
      '3,4,5': 'Row 1 [3, 4, 5]',
      '6,7,8': 'Row 2 [6, 7, 8]',
      '0,3,6': 'Column 0 [0, 3, 6]',
      '1,4,7': 'Column 1 [1, 4, 7]',
      '2,5,8': 'Column 2 [2, 5, 8]',
      '0,4,8': 'Diagonal [0, 4, 8]',
      '2,4,6': 'Anti-Diagonal [2, 4, 6]',
    };

    for (const pattern of WIN_PATTERNS) {
      for (const player of players) {
        const key = pattern.join(',');
        const label = patternLabels[key] ?? `Pattern [${key}]`;
        testCases.push({
          pattern,
          player,
          description: `detects win for ${player} on ${label}`,
        });
      }
    }

    it.each(testCases)('$description', ({ pattern, player }) => {
      const board: Cell[] = Array.from({ length: 9 }, () => null);
      const [a, b, c] = pattern;
      board[a] = player;
      board[b] = player;
      board[c] = player;

      const winResult = checkWinner(board);
      expect(winResult).toEqual({
        winner: player,
        winningLine: pattern,
      });

      const evalResult = evaluateBoard(board);
      expect(evalResult).toEqual({
        status: 'WON',
        winner: player,
        winningLine: pattern,
      });
    });
  });

  describe('isBoardFull', () => {
    it('returns false for an empty board', () => {
      const board: Cell[] = Array.from({ length: 9 }, () => null);
      expect(isBoardFull(board)).toBe(false);
    });

    it('returns false for a partially filled board', () => {
      const board: Cell[] = ['X', 'O', 'X', null, null, null, null, null, null];
      expect(isBoardFull(board)).toBe(false);
    });

    it('returns false if board length is not 9', () => {
      const board: Cell[] = ['X', 'O', 'X'];
      expect(isBoardFull(board)).toBe(false);
    });

    it('returns true when all 9 cells are filled', () => {
      const board: Cell[] = ['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X'];
      expect(isBoardFull(board)).toBe(true);
    });
  });

  describe('9th-move win priority over draw', () => {
    it('resolves a 9th-move win as WON instead of DRAW when the board is full', () => {
      // Board layout:
      // X X X  -> row 0 is winning line [0, 1, 2]
      // O O X
      // X O O
      const fullWinningBoard: Cell[] = [
        'X', 'X', 'X',
        'O', 'O', 'X',
        'X', 'O', 'O',
      ];

      expect(isBoardFull(fullWinningBoard)).toBe(true);

      const evalResult = evaluateBoard(fullWinningBoard);
      expect(evalResult).toEqual({
        status: 'WON',
        winner: 'X',
        winningLine: [0, 1, 2],
      });
    });

    it('resolves a 9th-move diagonal win for O as WON instead of DRAW', () => {
      // Board layout:
      // O X X
      // X O X
      // X O O  -> diagonal [0, 4, 8] is all O
      const board: Cell[] = [
        'O', 'X', 'X',
        'X', 'O', 'X',
        'X', 'O', 'O',
      ];

      expect(isBoardFull(board)).toBe(true);
      expect(evaluateBoard(board)).toEqual({
        status: 'WON',
        winner: 'O',
        winningLine: [0, 4, 8],
      });
    });
  });

  describe('True draw detection', () => {
    it('returns DRAW with null winner and winningLine on a full non-winning board', () => {
      // Board layout:
      // X O X
      // X O O
      // O X X
      const drawBoard: Cell[] = [
        'X', 'O', 'X',
        'X', 'O', 'O',
        'O', 'X', 'X',
      ];

      expect(isBoardFull(drawBoard)).toBe(true);
      expect(checkWinner(drawBoard)).toBeNull();
      expect(evaluateBoard(drawBoard)).toEqual({
        status: 'DRAW',
        winner: null,
        winningLine: null,
      });
    });
  });

  describe('In-progress board evaluation', () => {
    it('returns IN_PROGRESS for an empty board', () => {
      const emptyBoard: Cell[] = Array.from({ length: 9 }, () => null);
      expect(checkWinner(emptyBoard)).toBeNull();
      expect(evaluateBoard(emptyBoard)).toEqual({
        status: 'IN_PROGRESS',
        winner: null,
        winningLine: null,
      });
    });

    it('returns IN_PROGRESS for a partially filled board with no winner', () => {
      const partialBoard: Cell[] = [
        'X', 'O', null,
        null, 'X', null,
        null, null, 'O',
      ];
      expect(checkWinner(partialBoard)).toBeNull();
      expect(evaluateBoard(partialBoard)).toEqual({
        status: 'IN_PROGRESS',
        winner: null,
        winningLine: null,
      });
    });
  });
});
