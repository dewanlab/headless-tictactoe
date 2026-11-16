import { BOARD_SIZE, DEFAULT_STARTING_PLAYER, INITIAL_BOARD } from './constants';
import type { GameOptions, GameState, MoveErrorReason, Player } from './types';

export function getNextPlayer(player: Player): Player {
  return player === 'X' ? 'O' : 'X';
}

export function createGame(options?: GameOptions): GameState {
  const startingPlayer = options?.startingPlayer ?? DEFAULT_STARTING_PLAYER;

  if (startingPlayer !== 'X' && startingPlayer !== 'O') {
    throw new RangeError(
      `Invalid starting player: ${String(startingPlayer)}. Expected 'X' or 'O'.`
    );
  }

  return Object.freeze({
    board: INITIAL_BOARD,
    turn: startingPlayer,
    startingPlayer,
    status: 'IN_PROGRESS',
    winner: null,
    winningLine: null,
    history: Object.freeze([]),
    redoStack: Object.freeze([]),
  });
}

export function isGameOver(state: GameState): boolean {
  return state.status !== 'IN_PROGRESS';
}

export function getLegalMoves(state: GameState): readonly number[] {
  if (isGameOver(state)) {
    return Object.freeze([]);
  }

  const moves: number[] = [];
  for (let i = 0; i < BOARD_SIZE; i++) {
    if (state.board[i] === null) {
      moves.push(i);
    }
  }

  return Object.freeze(moves);
}

export function validateMove(
  state: GameState,
  index: number,
  player?: Player
): MoveErrorReason | null {
  if (state.status !== 'IN_PROGRESS') {
    return 'GAME_ALREADY_OVER';
  }

  if (player !== undefined && player !== state.turn) {
    return 'WRONG_TURN';
  }

  if (!Number.isInteger(index) || index < 0 || index >= BOARD_SIZE) {
    return 'INVALID_INDEX';
  }

  if (state.board[index] !== null) {
    return 'CELL_OCCUPIED';
  }

  return null;
}

export function isValidMove(
  state: GameState,
  index: number,
  player?: Player
): boolean {
  return validateMove(state, index, player) === null;
}
