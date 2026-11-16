import type { Cell, Player, WinningLine } from './types';

export const BOARD_SIZE = 9 as const;

export const PLAYERS: readonly [Player, Player] = Object.freeze(['X', 'O'] as const);

export const DEFAULT_STARTING_PLAYER = 'X' as const;

export const INITIAL_BOARD: readonly Cell[] = Object.freeze(
  Array.from({ length: BOARD_SIZE }, () => null)
);

export const WIN_PATTERNS: readonly WinningLine[] = Object.freeze([
  Object.freeze([0, 1, 2] as const),
  Object.freeze([3, 4, 5] as const),
  Object.freeze([6, 7, 8] as const),
  Object.freeze([0, 3, 6] as const),
  Object.freeze([1, 4, 7] as const),
  Object.freeze([2, 5, 8] as const),
  Object.freeze([0, 4, 8] as const),
  Object.freeze([2, 4, 6] as const),
]);
