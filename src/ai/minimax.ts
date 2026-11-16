import { evaluateBoard } from '../evaluator';
import { getLegalMoves, getNextPlayer, isGameOver } from '../core';
import type { Cell, GameState, Player } from '../types';

export type BotDifficulty = 'easy' | 'medium' | 'hard';

export interface BotOptions {
  readonly difficulty?: BotDifficulty | undefined;
  readonly random?: (() => number) | undefined;
}

export interface ScoredMove {
  readonly index: number;
  readonly score: number;
}

export const STRATEGIC_MOVE_ORDER: readonly [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
] = Object.freeze([4, 0, 2, 6, 8, 1, 3, 5, 7] as const);

export function getRandomMove(
  state: GameState,
  random: () => number = Math.random
): number | null {
  const legalMoves = getLegalMoves(state);
  if (legalMoves.length === 0) {
    return null;
  }

  const randVal = random();
  const clampedIndex = Math.max(
    0,
    Math.min(legalMoves.length - 1, Math.floor(randVal * legalMoves.length))
  );

  return legalMoves[clampedIndex] ?? null;
}

function minimax(
  board: Cell[],
  currentTurn: Player,
  depth: number,
  alpha: number,
  beta: number,
  maximizingPlayer: Player
): number {
  const evalResult = evaluateBoard(board);
  if (evalResult.status === 'WON') {
    return evalResult.winner === maximizingPlayer
      ? 10 - depth
      : depth - 10;
  }
  if (evalResult.status === 'DRAW') {
    return 0;
  }

  if (currentTurn === maximizingPlayer) {
    let maxEval = -Infinity;
    for (const idx of STRATEGIC_MOVE_ORDER) {
      if (board[idx] !== null) {
        continue;
      }
      board[idx] = currentTurn;
      const score = minimax(
        board,
        getNextPlayer(currentTurn),
        depth + 1,
        alpha,
        beta,
        maximizingPlayer
      );
      board[idx] = null;
      maxEval = Math.max(maxEval, score);
      alpha = Math.max(alpha, score);
      if (beta <= alpha) {
        break;
      }
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const idx of STRATEGIC_MOVE_ORDER) {
      if (board[idx] !== null) {
        continue;
      }
      board[idx] = currentTurn;
      const score = minimax(
        board,
        getNextPlayer(currentTurn),
        depth + 1,
        alpha,
        beta,
        maximizingPlayer
      );
      board[idx] = null;
      minEval = Math.min(minEval, score);
      beta = Math.min(beta, score);
      if (beta <= alpha) {
        break;
      }
    }
    return minEval;
  }
}

export function getScoredMoves(
  state: GameState,
  player?: Player
): readonly ScoredMove[] {
  if (isGameOver(state)) {
    return Object.freeze([]);
  }

  const maximizingPlayer: Player = player ?? state.turn;
  const candidateMoves = STRATEGIC_MOVE_ORDER.filter(
    (idx) => state.board[idx] === null
  );

  const workingBoard: Cell[] = [...state.board];
  const scoredMoves: ScoredMove[] = [];

  for (const idx of candidateMoves) {
    workingBoard[idx] = state.turn;
    const evalResult = evaluateBoard(workingBoard);
    let score: number;

    if (evalResult.status === 'WON') {
      score =
        evalResult.winner === maximizingPlayer
          ? 10 - 1
          : 1 - 10;
    } else if (evalResult.status === 'DRAW') {
      score = 0;
    } else {
      score = minimax(
        workingBoard,
        getNextPlayer(state.turn),
        2,
        -Infinity,
        Infinity,
        maximizingPlayer
      );
    }

    workingBoard[idx] = null;

    scoredMoves.push(
      Object.freeze({
        index: idx,
        score,
      })
    );
  }

  return Object.freeze(scoredMoves);
}

export function getBestMove(
  state: GameState,
  options?: BotOptions
): number | null {
  if (isGameOver(state)) {
    return null;
  }

  const difficulty: BotDifficulty = options?.difficulty ?? 'hard';
  const random: () => number = options?.random ?? Math.random;

  if (difficulty === 'easy') {
    return getRandomMove(state, random);
  }

  if (difficulty === 'medium') {
    if (random() < 0.5) {
      return getRandomMove(state, random);
    }
  }

  const scoredMoves = getScoredMoves(state, state.turn);
  if (scoredMoves.length === 0) {
    return null;
  }

  let bestIndex: number | null = null;
  let bestScore = -Infinity;

  for (const move of scoredMoves) {
    if (move.score > bestScore) {
      bestScore = move.score;
      bestIndex = move.index;
    }
  }

  return bestIndex;
}
