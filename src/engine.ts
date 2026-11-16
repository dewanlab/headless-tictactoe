import {
  createGame,
  getLegalMoves,
  hydrateState,
  isGameOver,
  isValidMove,
  makeMove,
  redoMove,
  resetGame,
  serializeState,
  undoMove,
  validateMove,
} from './core';
import type {
  Cell,
  GameOptions,
  GameState,
  GameStatus,
  MoveErrorReason,
  MoveRecord,
  MoveResult,
  Player,
  WinningLine,
} from './types';

export class TicTacToe {
  #state: GameState;

  constructor(optionsOrSnapshot?: GameOptions | GameState | string) {
    if (
      typeof optionsOrSnapshot === 'string' ||
      (typeof optionsOrSnapshot === 'object' &&
        optionsOrSnapshot !== null &&
        'board' in optionsOrSnapshot)
    ) {
      this.#state = hydrateState(optionsOrSnapshot);
    } else {
      this.#state = createGame(optionsOrSnapshot);
    }
  }

  static fromJSON(snapshot: string | GameState): TicTacToe {
    return new TicTacToe(snapshot);
  }

  getState(): GameState {
    return this.#state;
  }

  get board(): readonly Cell[] {
    return this.#state.board;
  }

  get turn(): Player {
    return this.#state.turn;
  }

  get startingPlayer(): Player {
    return this.#state.startingPlayer;
  }

  get status(): GameStatus {
    return this.#state.status;
  }

  get winner(): Player | null {
    return this.#state.winner;
  }

  get winningLine(): WinningLine | null {
    return this.#state.winningLine;
  }

  get history(): readonly MoveRecord[] {
    return this.#state.history;
  }

  get redoStack(): readonly MoveRecord[] {
    return this.#state.redoStack;
  }

  get canUndo(): boolean {
    return this.#state.history.length > 0;
  }

  get canRedo(): boolean {
    return this.#state.redoStack.length > 0;
  }

  getCell(index: number): Cell | undefined {
    return this.#state.board[index];
  }

  isGameOver(): boolean {
    return isGameOver(this.#state);
  }

  getLegalMoves(): readonly number[] {
    return getLegalMoves(this.#state);
  }

  validateMove(index: number, player?: Player): MoveErrorReason | null {
    return validateMove(this.#state, index, player);
  }

  isValidMove(index: number, player?: Player): boolean {
    return isValidMove(this.#state, index, player);
  }

  makeMove(index: number, player?: Player): MoveResult {
    const result = makeMove(this.#state, index, player);
    if (result.ok) {
      this.#state = result.state;
    }
    return result;
  }

  move(index: number, player?: Player): MoveResult {
    return this.makeMove(index, player);
  }

  undo(): GameState {
    this.#state = undoMove(this.#state);
    return this.#state;
  }

  undoMove(): GameState {
    return this.undo();
  }

  redo(): GameState {
    this.#state = redoMove(this.#state);
    return this.#state;
  }

  redoMove(): GameState {
    return this.redo();
  }

  reset(options?: GameOptions): GameState {
    this.#state = resetGame(this.#state, options);
    return this.#state;
  }

  hydrate(snapshot: string | GameState): GameState {
    this.#state = hydrateState(snapshot);
    return this.#state;
  }

  serialize(): string {
    return serializeState(this.#state);
  }

  toJSON(): GameState {
    return this.#state;
  }

  clone(): TicTacToe {
    return new TicTacToe(this.#state);
  }
}
