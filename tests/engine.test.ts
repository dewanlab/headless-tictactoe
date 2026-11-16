import { describe, expect, it } from 'vitest';
import { createGame, makeMove, TicTacToe } from '../src';
import type { GameState } from '../src';

describe('TicTacToe class engine wrapper', () => {
  describe('Constructor & Static Initialization', () => {
    it('initializes default state with turn X, 9 null cells, and empty history', () => {
      const engine = new TicTacToe();

      expect(engine.turn).toBe('X');
      expect(engine.startingPlayer).toBe('X');
      expect(engine.status).toBe('IN_PROGRESS');
      expect(engine.winner).toBeNull();
      expect(engine.winningLine).toBeNull();
      expect(engine.board).toHaveLength(9);
      expect(engine.board.every((c) => c === null)).toBe(true);
      expect(engine.history).toHaveLength(0);
      expect(engine.redoStack).toHaveLength(0);
      expect(engine.canUndo).toBe(false);
      expect(engine.canRedo).toBe(false);
      expect(engine.isGameOver()).toBe(false);
      expect(engine.getLegalMoves()).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    });

    it('initializes custom starting player when provided in options', () => {
      const engine = new TicTacToe({ startingPlayer: 'O' });

      expect(engine.turn).toBe('O');
      expect(engine.startingPlayer).toBe('O');
      expect(engine.status).toBe('IN_PROGRESS');
    });

    it('hydrates from an existing GameState object', () => {
      let state = createGame({ startingPlayer: 'X' });
      state = (makeMove(state, 4) as { ok: true; state: GameState }).state;

      const engine = new TicTacToe(state);
      expect(engine.board[4]).toBe('X');
      expect(engine.turn).toBe('O');
      expect(engine.history).toHaveLength(1);
      expect(engine.canUndo).toBe(true);
    });

    it('hydrates from a serialized JSON string', () => {
      let state = createGame({ startingPlayer: 'O' });
      state = (makeMove(state, 0) as { ok: true; state: GameState }).state;
      const json = JSON.stringify(state);

      const engine = new TicTacToe(json);
      expect(engine.startingPlayer).toBe('O');
      expect(engine.board[0]).toBe('O');
      expect(engine.turn).toBe('X');
    });

    it('creates an instance using static fromJSON method', () => {
      let state = createGame();
      state = (makeMove(state, 2) as { ok: true; state: GameState }).state;
      const json = JSON.stringify(state);

      const engine = TicTacToe.fromJSON(json);
      expect(engine.board[2]).toBe('X');
      expect(engine.turn).toBe('O');
    });
  });

  describe('Stateful moves, alias, and guard isolation', () => {
    it('makeMove updates internal state and getters', () => {
      const engine = new TicTacToe();

      expect(engine.getCell(4)).toBeNull();
      const res = engine.makeMove(4);

      expect(res.ok).toBe(true);
      expect(engine.getCell(4)).toBe('X');
      expect(engine.turn).toBe('O');
      expect(engine.history).toHaveLength(1);
      expect(engine.canUndo).toBe(true);
      expect(engine.getLegalMoves()).not.toContain(4);
    });

    it('move() works as an alias for makeMove()', () => {
      const engine = new TicTacToe();
      const res = engine.move(0);

      expect(res.ok).toBe(true);
      expect(engine.getCell(0)).toBe('X');
      expect(engine.turn).toBe('O');
    });

    it('returns false result and leaves internal state unmutated on invalid move', () => {
      const engine = new TicTacToe();
      engine.makeMove(0); // X plays 0, turn is O

      // 1. CELL_OCCUPIED
      const occupiedRes = engine.makeMove(0);
      expect(occupiedRes.ok).toBe(false);
      if (!occupiedRes.ok) {
        expect(occupiedRes.error).toBe('CELL_OCCUPIED');
      }
      expect(engine.turn).toBe('O');
      expect(engine.history).toHaveLength(1);

      // 2. INVALID_INDEX
      const outOfBoundsRes = engine.makeMove(99);
      expect(outOfBoundsRes.ok).toBe(false);
      if (!outOfBoundsRes.ok) {
        expect(outOfBoundsRes.error).toBe('INVALID_INDEX');
      }

      // 3. WRONG_TURN
      const wrongTurnRes = engine.makeMove(1, 'X'); // Current turn is O
      expect(wrongTurnRes.ok).toBe(false);
      if (!wrongTurnRes.ok) {
        expect(wrongTurnRes.error).toBe('WRONG_TURN');
      }
      expect(engine.turn).toBe('O');
    });

    it('validateMove, isValidMove, and getLegalMoves reflect live state', () => {
      const engine = new TicTacToe();

      expect(engine.isValidMove(4)).toBe(true);
      expect(engine.validateMove(4)).toBeNull();

      engine.makeMove(4);

      expect(engine.isValidMove(4)).toBe(false);
      expect(engine.validateMove(4)).toBe('CELL_OCCUPIED');
      expect(engine.getLegalMoves()).not.toContain(4);
    });
  });

  describe('Undo, redo, and reset workflows', () => {
    it('toggles canUndo and canRedo with undo() and redo()', () => {
      const engine = new TicTacToe();
      expect(engine.canUndo).toBe(false);
      expect(engine.canRedo).toBe(false);

      engine.makeMove(4);
      expect(engine.canUndo).toBe(true);
      expect(engine.canRedo).toBe(false);

      engine.undo();
      expect(engine.canUndo).toBe(false);
      expect(engine.canRedo).toBe(true);
      expect(engine.getCell(4)).toBeNull();
      expect(engine.turn).toBe('X');

      engine.redo();
      expect(engine.canUndo).toBe(true);
      expect(engine.canRedo).toBe(false);
      expect(engine.getCell(4)).toBe('X');
      expect(engine.turn).toBe('O');
    });

    it('supports undoMove() and redoMove() aliases', () => {
      const engine = new TicTacToe();
      engine.makeMove(2);

      engine.undoMove();
      expect(engine.getCell(2)).toBeNull();

      engine.redoMove();
      expect(engine.getCell(2)).toBe('X');
    });

    it('reverts terminal game with undo() and branches to a draw', () => {
      const engine = new TicTacToe();
      // X wins row 0: [0, 1, 2]
      engine.makeMove(0); // X
      engine.makeMove(3); // O
      engine.makeMove(1); // X
      engine.makeMove(4); // O
      engine.makeMove(2); // X wins

      expect(engine.status).toBe('WON');
      expect(engine.winner).toBe('X');
      expect(engine.isGameOver()).toBe(true);

      // Undo the winning move
      engine.undo();
      expect(engine.status).toBe('IN_PROGRESS');
      expect(engine.winner).toBeNull();
      expect(engine.winningLine).toBeNull();
      expect(engine.turn).toBe('X');
      expect(engine.getCell(2)).toBeNull();
      expect(engine.isGameOver()).toBe(false);

      // Play alternate moves to a draw:
      // Current board: 0: X, 1: X, 3: O, 4: O
      // X plays 5, O plays 2, X plays 6, O plays 8, X plays 7
      // Resulting board:
      // X X O (0, 1, 2)
      // O O X (3, 4, 5)
      // X X O (6, 7, 8)
      engine.makeMove(5); // X
      engine.makeMove(2); // O
      engine.makeMove(6); // X
      engine.makeMove(8); // O
      engine.makeMove(7); // X

      expect(engine.status).toBe('DRAW');
      expect(engine.winner).toBeNull();
      expect(engine.isGameOver()).toBe(true);
    });

    it('reset() resets board and preserves starting player, or accepts new options', () => {
      const engine = new TicTacToe({ startingPlayer: 'O' });
      engine.makeMove(4);
      expect(engine.history).toHaveLength(1);

      engine.reset();
      expect(engine.startingPlayer).toBe('O');
      expect(engine.turn).toBe('O');
      expect(engine.board.every((c) => c === null)).toBe(true);
      expect(engine.canUndo).toBe(false);

      engine.reset({ startingPlayer: 'X' });
      expect(engine.startingPlayer).toBe('X');
      expect(engine.turn).toBe('X');
    });

    it('hydrate() updates engine state from snapshot', () => {
      const engine = new TicTacToe();
      let state = createGame({ startingPlayer: 'O' });
      state = (makeMove(state, 8) as { ok: true; state: GameState }).state;

      engine.hydrate(state);
      expect(engine.startingPlayer).toBe('O');
      expect(engine.getCell(8)).toBe('O');
      expect(engine.turn).toBe('X');
    });
  });

  describe('Serialization, toJSON, and clone', () => {
    it('JSON.stringify(engine) natively serializes the GameState via toJSON()', () => {
      const engine = new TicTacToe();
      engine.makeMove(0);
      engine.makeMove(4);

      const serializedString = engine.serialize();
      const jsonString = JSON.stringify(engine);

      expect(jsonString).toBe(serializedString);
      expect(JSON.parse(jsonString)).toEqual(engine.getState());
    });

    it('clone() creates an independent instance where changes do not affect original', () => {
      const engine = new TicTacToe();
      engine.makeMove(4); // X plays center

      const copy = engine.clone();
      expect(copy.getState()).toEqual(engine.getState());

      // Move on copy
      copy.makeMove(0); // O plays 0
      expect(copy.getCell(0)).toBe('O');
      expect(copy.turn).toBe('X');

      // Original engine remains untouched
      expect(engine.getCell(0)).toBeNull();
      expect(engine.turn).toBe('O');
      expect(engine.history).toHaveLength(1);
      expect(copy.history).toHaveLength(2);
    });
  });
});
