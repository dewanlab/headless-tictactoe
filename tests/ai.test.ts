import { describe, expect, it } from 'vitest';
import {
  createGame,
  getLegalMoves,
  isGameOver,
  makeMove,
  type GameState,
  type Player,
} from '../src';
import {
  getBestMove,
  getRandomMove,
  getScoredMoves,
  STRATEGIC_MOVE_ORDER,
} from '../src/ai';

describe('Minimax AI Engine (headless-tictactoe/ai)', () => {
  describe('Constants & exports', () => {
    it('exports STRATEGIC_MOVE_ORDER preferring center, corners, then edges', () => {
      expect(STRATEGIC_MOVE_ORDER).toEqual([4, 0, 2, 6, 8, 1, 3, 5, 7]);
      expect(Object.isFrozen(STRATEGIC_MOVE_ORDER)).toBe(true);
    });
  });

  describe('Terminal state handling', () => {
    it('returns null for getBestMove and getRandomMove, and empty array for getScoredMoves when game is over', () => {
      // Create a game won by X on row 0 [0, 1, 2]
      let s = createGame();
      s = (makeMove(s, 0) as { ok: true; state: GameState }).state; // X
      s = (makeMove(s, 3) as { ok: true; state: GameState }).state; // O
      s = (makeMove(s, 1) as { ok: true; state: GameState }).state; // X
      s = (makeMove(s, 4) as { ok: true; state: GameState }).state; // O
      s = (makeMove(s, 2) as { ok: true; state: GameState }).state; // X wins

      expect(s.status).toBe('WON');
      expect(getBestMove(s)).toBeNull();
      expect(getRandomMove(s)).toBeNull();
      expect(getScoredMoves(s)).toEqual([]);
    });

    it('returns null and empty array when game is a DRAW', () => {
      let s = createGame();
      const drawMoves = [0, 1, 2, 4, 3, 5, 7, 6, 8];
      for (const idx of drawMoves) {
        s = (makeMove(s, idx) as { ok: true; state: GameState }).state;
      }

      expect(s.status).toBe('DRAW');
      expect(getBestMove(s)).toBeNull();
      expect(getRandomMove(s)).toBeNull();
      expect(getScoredMoves(s)).toEqual([]);
    });
  });

  describe('Tactical accuracy (Immediate win & immediate block)', () => {
    it('takes the immediate win even when another threat exists', () => {
      // X has 0, 1 (wins at 2). O has 3, 4 (threatens 5).
      // It is X's turn -> Bot must immediately play 2 to win!
      let s = createGame();
      s = (makeMove(s, 0) as { ok: true; state: GameState }).state; // X: 0
      s = (makeMove(s, 3) as { ok: true; state: GameState }).state; // O: 3
      s = (makeMove(s, 1) as { ok: true; state: GameState }).state; // X: 1
      s = (makeMove(s, 4) as { ok: true; state: GameState }).state; // O: 4

      expect(s.turn).toBe('X');
      const bestMove = getBestMove(s, { difficulty: 'hard' });
      expect(bestMove).toBe(2);
    });

    it('blocks the opponent immediate win threat', () => {
      // X has 0, 1. O has 4.
      // Turn is O. X is threatening to win at 2.
      // Bot (O) MUST play 2 to block.
      let s = createGame();
      s = (makeMove(s, 0) as { ok: true; state: GameState }).state; // X: 0
      s = (makeMove(s, 4) as { ok: true; state: GameState }).state; // O: 4
      s = (makeMove(s, 1) as { ok: true; state: GameState }).state; // X: 1

      expect(s.turn).toBe('O');
      const bestMove = getBestMove(s, { difficulty: 'hard' });
      expect(bestMove).toBe(2);
    });

    it('controls center on opening and counters corner with center', () => {
      // On empty board, bot chooses center (4)
      const emptyGame = createGame();
      expect(getBestMove(emptyGame, { difficulty: 'hard' })).toBe(4);

      // If human opens at corner 0, bot responds with center 4
      const cornerGame = (makeMove(emptyGame, 0) as { ok: true; state: GameState }).state;
      expect(getBestMove(cornerGame, { difficulty: 'hard' })).toBe(4);
    });
  });

  describe('Difficulty modes & deterministic custom RNG', () => {
    it('easy mode picks moves according to custom random generator', () => {
      const state = createGame();
      const legalMoves = getLegalMoves(state); // [0, 1, ..., 8]

      // random returning 0 picks first legal move (0)
      const firstMove = getBestMove(state, {
        difficulty: 'easy',
        random: () => 0,
      });
      expect(firstMove).toBe(legalMoves[0]);

      // random returning 0.999 picks last legal move (8)
      const lastMove = getBestMove(state, {
        difficulty: 'easy',
        random: () => 0.999,
      });
      expect(lastMove).toBe(legalMoves[legalMoves.length - 1]);
    });

    it('getRandomMove handles random bounds properly', () => {
      const state = createGame();
      expect(getRandomMove(state, () => 0)).toBe(0);
      expect(getRandomMove(state, () => 0.999)).toBe(8);
    });

    it('medium mode branches between random and optimal based on random threshold', () => {
      // Board where X has 0, 1 (win at 2). Turn is X.
      // Legal moves are [2, 5, 6, 7, 8].
      // Optimal move is 2.
      let s = createGame();
      s = (makeMove(s, 0) as { ok: true; state: GameState }).state;
      s = (makeMove(s, 3) as { ok: true; state: GameState }).state;
      s = (makeMove(s, 1) as { ok: true; state: GameState }).state;
      s = (makeMove(s, 4) as { ok: true; state: GameState }).state;

      // When random is < 0.5: bot uses random branch.
      // Let random generator return 0.2 (falls in random branch) and second call return 0.99 (selects last legal move, 8).
      let callCount = 0;
      const randomForRandom = () => {
        callCount++;
        return callCount === 1 ? 0.2 : 0.99;
      };
      const randomResult = getBestMove(s, {
        difficulty: 'medium',
        random: randomForRandom,
      });
      expect(randomResult).not.toBeNull();
      // It picked from the random branch

      // When random is >= 0.5: bot uses optimal 'hard' branch (plays 2 to win)
      const optimalResult = getBestMove(s, {
        difficulty: 'medium',
        random: () => 0.8,
      });
      expect(optimalResult).toBe(2);
    });
  });

  describe('Exhaustive Unbeatability Proof (Hard bot never loses)', () => {
    function exploreAgainstBot(
      state: GameState,
      botPlayer: Player,
      humanPlayer: Player
    ): void {
      if (isGameOver(state)) {
        expect(state.winner).not.toBe(humanPlayer);
        return;
      }

      if (state.turn === botPlayer) {
        const botMove = getBestMove(state, { difficulty: 'hard' });
        expect(botMove).not.toBeNull();
        const res = makeMove(state, botMove!);
        expect(res.ok).toBe(true);
        if (res.ok) {
          exploreAgainstBot(res.state, botPlayer, humanPlayer);
        }
      } else {
        const humanMoves = getLegalMoves(state);
        for (const move of humanMoves) {
          const res = makeMove(state, move);
          expect(res.ok).toBe(true);
          if (res.ok) {
            exploreAgainstBot(res.state, botPlayer, humanPlayer);
          }
        }
      }
    }

    it('bot playing X (goes first) never loses against all legal human moves', () => {
      const initialGame = createGame({ startingPlayer: 'X' });
      exploreAgainstBot(initialGame, 'X', 'O');
    });

    it('bot playing O (goes second) never loses against all legal human moves', () => {
      const initialGame = createGame({ startingPlayer: 'X' });
      exploreAgainstBot(initialGame, 'O', 'X');
    });

    it('bot vs. bot always ends in a DRAW', () => {
      let state = createGame({ startingPlayer: 'X' });
      while (!isGameOver(state)) {
        const move = getBestMove(state, { difficulty: 'hard' });
        expect(move).not.toBeNull();
        const res = makeMove(state, move!);
        expect(res.ok).toBe(true);
        if (!res.ok) break;
        state = res.state;
      }

      expect(state.status).toBe('DRAW');
      expect(state.winner).toBeNull();
    });
  });
});
