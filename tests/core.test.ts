import { describe, expect, it } from 'vitest';
import {
  applyMove,
  BOARD_SIZE,
  createGame,
  DEFAULT_STARTING_PLAYER,
  getLegalMoves,
  getNextPlayer,
  hydrateState,
  isGameOver,
  isValidMove,
  makeMove,
  PACKAGE_VERSION,
  redoMove,
  resetGame,
  serializeState,
  undoMove,
  validateMove,
} from '../src';
import type { GameOptions, GameState, Player } from '../src';

describe('core state machine', () => {
  describe('package metadata', () => {
    it('exports PACKAGE_VERSION matching 1.0.0', () => {
      expect(PACKAGE_VERSION).toBe('1.0.0');
    });
  });

  describe('getNextPlayer', () => {
    it('alternates between X and O', () => {
      expect(getNextPlayer('X')).toBe('O');
      expect(getNextPlayer('O')).toBe('X');
    });
  });

  describe('createGame & resetGame initialization', () => {
    it('initializes default game with X starting and all 9 cells null', () => {
      const state = createGame();
      expect(state.startingPlayer).toBe(DEFAULT_STARTING_PLAYER);
      expect(state.turn).toBe('X');
      expect(state.status).toBe('IN_PROGRESS');
      expect(state.winner).toBeNull();
      expect(state.winningLine).toBeNull();
      expect(state.board).toHaveLength(BOARD_SIZE);
      expect(state.board.every((cell) => cell === null)).toBe(true);
      expect(state.history).toHaveLength(0);
      expect(state.redoStack).toHaveLength(0);
    });

    it('initializes custom starting player O when requested', () => {
      const state = createGame({ startingPlayer: 'O' });
      expect(state.startingPlayer).toBe('O');
      expect(state.turn).toBe('O');
      expect(state.status).toBe('IN_PROGRESS');
    });

    it('throws RangeError on invalid runtime startingPlayer', () => {
      expect(() =>
        createGame({ startingPlayer: 'INVALID' as unknown as Player })
      ).toThrow(RangeError);
      expect(() =>
        createGame({ startingPlayer: null as unknown as Player })
      ).toThrow(RangeError);
    });

    it('enforces deep immutability (frozen state, board, history, redoStack)', () => {
      const state = createGame();
      expect(Object.isFrozen(state)).toBe(true);
      expect(Object.isFrozen(state.board)).toBe(true);
      expect(Object.isFrozen(state.history)).toBe(true);
      expect(Object.isFrozen(state.redoStack)).toBe(true);
    });

    it('resetGame resets state preserving or updating startingPlayer', () => {
      const g1 = createGame({ startingPlayer: 'O' });
      const moveRes = makeMove(g1, 4);
      expect(moveRes.ok).toBe(true);
      if (!moveRes.ok) return;

      const reset1 = resetGame(moveRes.state);
      expect(reset1.startingPlayer).toBe('O');
      expect(reset1.turn).toBe('O');
      expect(reset1.board.every((cell) => cell === null)).toBe(true);

      const reset2 = resetGame(moveRes.state, { startingPlayer: 'X' });
      expect(reset2.startingPlayer).toBe('X');
      expect(reset2.turn).toBe('X');
    });
  });

  describe('Move validation & guard priority', () => {
    it('returns INVALID_INDEX for negative numbers, out of bounds, floats, NaN, and Infinity', () => {
      const state = createGame();

      expect(validateMove(state, -1)).toBe('INVALID_INDEX');
      expect(validateMove(state, 9)).toBe('INVALID_INDEX');
      expect(validateMove(state, 99)).toBe('INVALID_INDEX');
      expect(validateMove(state, 1.5)).toBe('INVALID_INDEX');
      expect(validateMove(state, Number.NaN)).toBe('INVALID_INDEX');
      expect(validateMove(state, Number.POSITIVE_INFINITY)).toBe('INVALID_INDEX');
      expect(isValidMove(state, -1)).toBe(false);
    });

    it('returns CELL_OCCUPIED when targeting an occupied cell', () => {
      const state = createGame();
      const moveRes = makeMove(state, 0);
      expect(moveRes.ok).toBe(true);
      if (!moveRes.ok) return;

      expect(validateMove(moveRes.state, 0)).toBe('CELL_OCCUPIED');
      expect(isValidMove(moveRes.state, 0)).toBe(false);
    });

    it('returns WRONG_TURN when passing an incorrect player symbol', () => {
      const state = createGame(); // turn is 'X'
      expect(validateMove(state, 0, 'O')).toBe('WRONG_TURN');
      expect(isValidMove(state, 0, 'O')).toBe(false);

      expect(validateMove(state, 0, 'X')).toBeNull();
      expect(isValidMove(state, 0, 'X')).toBe(true);
    });

    it('returns GAME_ALREADY_OVER when game is terminal and getLegalMoves returns empty', () => {
      // Play a quick winning game for X on row 0 [0, 1, 2]
      let s = createGame();
      // X: 0, O: 3, X: 1, O: 4, X: 2
      s = (makeMove(s, 0) as { ok: true; state: GameState }).state;
      s = (makeMove(s, 3) as { ok: true; state: GameState }).state;
      s = (makeMove(s, 1) as { ok: true; state: GameState }).state;
      s = (makeMove(s, 4) as { ok: true; state: GameState }).state;
      s = (makeMove(s, 2) as { ok: true; state: GameState }).state;

      expect(s.status).toBe('WON');
      expect(s.winner).toBe('X');
      expect(isGameOver(s)).toBe(true);
      expect(getLegalMoves(s)).toEqual([]);

      expect(validateMove(s, 8)).toBe('GAME_ALREADY_OVER');
      expect(isValidMove(s, 8)).toBe(false);
    });

    it('enforces strict guard priority order', () => {
      // 1. GAME_ALREADY_OVER takes priority over WRONG_TURN and INVALID_INDEX
      let s = createGame();
      s = (makeMove(s, 0) as { ok: true; state: GameState }).state;
      s = (makeMove(s, 3) as { ok: true; state: GameState }).state;
      s = (makeMove(s, 1) as { ok: true; state: GameState }).state;
      s = (makeMove(s, 4) as { ok: true; state: GameState }).state;
      s = (makeMove(s, 2) as { ok: true; state: GameState }).state; // X wins

      expect(validateMove(s, -99, 'O')).toBe('GAME_ALREADY_OVER');

      // 2. In active game, WRONG_TURN takes priority over INVALID_INDEX
      const activeState = createGame(); // turn is X
      expect(validateMove(activeState, -99, 'O')).toBe('WRONG_TURN');

      // 3. INVALID_INDEX takes priority over CELL_OCCUPIED
      expect(validateMove(activeState, 100)).toBe('INVALID_INDEX');
    });

    it('getLegalMoves returns all available unoccupied indices in-progress', () => {
      let s = createGame();
      expect(getLegalMoves(s)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);

      s = (makeMove(s, 0) as { ok: true; state: GameState }).state;
      s = (makeMove(s, 4) as { ok: true; state: GameState }).state;
      expect(getLegalMoves(s)).toEqual([1, 2, 3, 5, 6, 7, 8]);
    });
  });

  describe('Immutable move application (makeMove / applyMove)', () => {
    it('applies move, alternates turn, and keeps prior state unmutated', () => {
      const initial = createGame();
      const result = makeMove(initial, 4);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      // Prior state remains completely unmutated
      expect(initial.board[4]).toBeNull();
      expect(initial.turn).toBe('X');
      expect(initial.history).toHaveLength(0);

      // Next state reflects the move
      expect(result.state.board[4]).toBe('X');
      expect(result.state.turn).toBe('O');
      expect(result.state.history).toHaveLength(1);
      expect(result.state.history[0]).toEqual({
        player: 'X',
        index: 4,
        moveNumber: 1,
      });
      expect(Object.isFrozen(result.state)).toBe(true);
      expect(Object.isFrozen(result.state.board)).toBe(true);
      expect(Object.isFrozen(result.state.history[0])).toBe(true);
    });

    it('applyMove works identically as an alias for makeMove', () => {
      const initial = createGame();
      const r1 = makeMove(initial, 2);
      const r2 = applyMove(initial, 2);

      expect(r1).toEqual(r2);
    });

    it('returns exact unmutated state reference on invalid move', () => {
      const state = createGame();
      const res = makeMove(state, 999);

      expect(res.ok).toBe(false);
      if (res.ok) return;

      expect(res.error).toBe('INVALID_INDEX');
      expect(res.state).toBe(state); // Identical reference
    });

    it('handles terminal winning move properly', () => {
      let s = createGame();
      s = (makeMove(s, 0) as { ok: true; state: GameState }).state; // X: 0
      s = (makeMove(s, 3) as { ok: true; state: GameState }).state; // O: 3
      s = (makeMove(s, 1) as { ok: true; state: GameState }).state; // X: 1
      s = (makeMove(s, 4) as { ok: true; state: GameState }).state; // O: 4
      const winResult = makeMove(s, 2); // X: 2 -> wins on row 0

      expect(winResult.ok).toBe(true);
      if (!winResult.ok) return;

      expect(winResult.state.status).toBe('WON');
      expect(winResult.state.winner).toBe('X');
      expect(winResult.state.winningLine).toEqual([0, 1, 2]);
      expect(winResult.state.turn).toBe('X'); // Stays on terminal player
      expect(winResult.state.history).toHaveLength(5);
    });

    it('handles terminal draw move properly', () => {
      // Moves:
      // X: 0, O: 1, X: 2
      // X: 4, O: 3, X: 5
      // O: 6, X: 7, O: 8
      // Board:
      // X O X
      // O X X
      // O X O
      // Let's check draw sequence:
      // 0 (X), 1 (O), 2 (X), 4 (O), 3 (X), 5 (O), 7 (X), 6 (O), 8 (X)
      // Board:
      // X O X (0,1,2)
      // X O O (3,4,5)
      // O X X (6,7,8)
      // Moves: 0(X), 1(O), 2(X), 4(O), 3(X), 5(O), 7(X), 6(O), 8(X)
      let s = createGame();
      const moveSequence = [0, 1, 2, 4, 3, 5, 7, 6, 8];
      for (let i = 0; i < moveSequence.length; i++) {
        const moveRes = makeMove(s, moveSequence[i]!);
        expect(moveRes.ok).toBe(true);
        if (!moveRes.ok) return;
        s = moveRes.state;
      }

      expect(s.status).toBe('DRAW');
      expect(s.winner).toBeNull();
      expect(s.winningLine).toBeNull();
      expect(isGameOver(s)).toBe(true);
    });
  });

  describe('Undo & redo mechanics', () => {
    it('returns the exact same state reference when undoing on empty history or redoing on empty stack', () => {
      const state = createGame();
      expect(undoMove(state)).toBe(state);
      expect(redoMove(state)).toBe(state);
    });

    it('undoes a move, restores turn, and pushes to redoStack', () => {
      const initial = createGame();
      const m1 = (makeMove(initial, 4) as { ok: true; state: GameState }).state;

      const undone = undoMove(m1);
      expect(undone.board[4]).toBeNull();
      expect(undone.turn).toBe('X');
      expect(undone.history).toHaveLength(0);
      expect(undone.redoStack).toHaveLength(1);
      expect(undone.redoStack[0]).toEqual({
        player: 'X',
        index: 4,
        moveNumber: 1,
      });

      // Redoing re-applies the move
      const redone = redoMove(undone);
      expect(redone.board[4]).toBe('X');
      expect(redone.turn).toBe('O');
      expect(redone.history).toHaveLength(1);
      expect(redone.redoStack).toHaveLength(0);
    });

    it('reverts terminal WON state to IN_PROGRESS on undo and restores WON on redo', () => {
      let s = createGame();
      s = (makeMove(s, 0) as { ok: true; state: GameState }).state;
      s = (makeMove(s, 3) as { ok: true; state: GameState }).state;
      s = (makeMove(s, 1) as { ok: true; state: GameState }).state;
      s = (makeMove(s, 4) as { ok: true; state: GameState }).state;
      s = (makeMove(s, 2) as { ok: true; state: GameState }).state;

      expect(s.status).toBe('WON');
      expect(s.winner).toBe('X');
      expect(s.winningLine).toEqual([0, 1, 2]);

      const undone = undoMove(s);
      expect(undone.status).toBe('IN_PROGRESS');
      expect(undone.winner).toBeNull();
      expect(undone.winningLine).toBeNull();
      expect(undone.turn).toBe('X');
      expect(undone.board[2]).toBeNull();
      expect(getLegalMoves(undone)).toContain(2);

      const redone = redoMove(undone);
      expect(redone.status).toBe('WON');
      expect(redone.winner).toBe('X');
      expect(redone.winningLine).toEqual([0, 1, 2]);
    });

    it('reverts terminal DRAW state to IN_PROGRESS on undo and restores DRAW on redo', () => {
      let s = createGame();
      const moveSequence = [0, 1, 2, 4, 3, 5, 7, 6, 8];
      for (const idx of moveSequence) {
        s = (makeMove(s, idx) as { ok: true; state: GameState }).state;
      }
      expect(s.status).toBe('DRAW');

      const undone = undoMove(s);
      expect(undone.status).toBe('IN_PROGRESS');
      expect(undone.board[8]).toBeNull();
      expect(undone.turn).toBe('X');
      expect(getLegalMoves(undone)).toEqual([8]);

      const redone = redoMove(undone);
      expect(redone.status).toBe('DRAW');
      expect(redone.board[8]).toBe('X');
    });

    it('clears redoStack when making a new move after an undo (branching history)', () => {
      const initial = createGame();
      const s1 = (makeMove(initial, 0) as { ok: true; state: GameState }).state;
      const s2 = (makeMove(s1, 1) as { ok: true; state: GameState }).state;

      // Undo move at index 1
      const undone = undoMove(s2);
      expect(undone.redoStack).toHaveLength(1);

      // Make a different move at index 4
      const branched = (makeMove(undone, 4) as { ok: true; state: GameState }).state;
      expect(branched.board[4]).toBe('O');
      expect(branched.redoStack).toHaveLength(0); // redoStack cleared
    });
  });

  describe('Serialization & hydration', () => {
    it('round-trips state with history and redoStack', () => {
      let s = createGame();
      s = (makeMove(s, 0) as { ok: true; state: GameState }).state;
      s = (makeMove(s, 4) as { ok: true; state: GameState }).state;
      s = (makeMove(s, 8) as { ok: true; state: GameState }).state;
      s = undoMove(s); // 8 is on redoStack

      const serialized = serializeState(s);
      expect(typeof serialized).toBe('string');

      const hydrated = hydrateState(serialized);
      expect(hydrated).toEqual(s);
      expect(Object.isFrozen(hydrated)).toBe(true);
      expect(Object.isFrozen(hydrated.board)).toBe(true);
      expect(Object.isFrozen(hydrated.history)).toBe(true);
      expect(Object.isFrozen(hydrated.redoStack)).toBe(true);
    });

    it('hydrates from parsed object directly', () => {
      const s = createGame();
      const hydrated = hydrateState(s);
      expect(hydrated).toEqual(s);
    });

    it('throws on invalid JSON string', () => {
      expect(() => hydrateState('{ not valid json }')).toThrow(
        'Invalid state snapshot JSON'
      );
    });

    it('throws on non-object snapshot', () => {
      expect(() => hydrateState('123')).toThrow('expected an object');
      expect(() => hydrateState('null')).toThrow('expected an object');
    });

    it('throws on invalid startingPlayer', () => {
      const invalid = JSON.stringify({
        startingPlayer: 'Z',
        board: Array(9).fill(null),
        history: [],
        redoStack: [],
      });
      expect(() => hydrateState(invalid)).toThrow('invalid startingPlayer');
    });

    it('throws on invalid board length or invalid cells', () => {
      const wrongLen = JSON.stringify({
        startingPlayer: 'X',
        board: [null, null],
        history: [],
        redoStack: [],
      });
      expect(() => hydrateState(wrongLen)).toThrow('board must be an array of length 9');

      const badCell = JSON.stringify({
        startingPlayer: 'X',
        board: ['X', 'O', 'INVALID', null, null, null, null, null, null],
        history: [],
        redoStack: [],
      });
      expect(() => hydrateState(badCell)).toThrow('invalid board cell at index 2');
    });

    it('throws on tampered board-vs-history mismatches', () => {
      // Board says cell 0 is X, but history is empty
      const mismatched = JSON.stringify({
        startingPlayer: 'X',
        board: ['X', null, null, null, null, null, null, null, null],
        history: [],
        redoStack: [],
      });
      expect(() => hydrateState(mismatched)).toThrow(
        'board cell at index 0 does not match history'
      );
    });

    it('throws on invalid history record structure or duplicate move', () => {
      const badRecord = JSON.stringify({
        startingPlayer: 'X',
        board: Array(9).fill(null),
        history: [{ player: 'X', index: 99, moveNumber: 1 }],
        redoStack: [],
      });
      expect(() => hydrateState(badRecord)).toThrow('invalid history record');
    });

    it('heals corrupted status and winner fields through authoritative re-evaluation', () => {
      // Valid game where X won on row 0, but JSON was corrupted to say DRAW and winner null
      const corruptedJson = JSON.stringify({
        startingPlayer: 'X',
        board: ['X', 'X', 'X', 'O', 'O', null, null, null, null],
        history: [
          { player: 'X', index: 0, moveNumber: 1 },
          { player: 'O', index: 3, moveNumber: 2 },
          { player: 'X', index: 1, moveNumber: 3 },
          { player: 'O', index: 4, moveNumber: 4 },
          { player: 'X', index: 2, moveNumber: 5 },
        ],
        redoStack: [],
        status: 'CORRUPTED_STATUS',
        winner: 'CORRUPTED_WINNER',
        winningLine: null,
      });

      const hydrated = hydrateState(corruptedJson);
      expect(hydrated.status).toBe('WON');
      expect(hydrated.winner).toBe('X');
      expect(hydrated.winningLine).toEqual([0, 1, 2]);
    });
  });
});
