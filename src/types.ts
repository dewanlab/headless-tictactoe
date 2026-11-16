export type Player = 'X' | 'O';

export type Cell = Player | null;

export type WinningLine = readonly [number, number, number];

export type GameStatus = 'IN_PROGRESS' | 'WON' | 'DRAW';

export interface MoveRecord {
  readonly player: Player;
  readonly index: number;
  readonly moveNumber: number;
}

export interface GameState {
  readonly board: readonly Cell[];
  readonly turn: Player;
  readonly startingPlayer: Player;
  readonly status: GameStatus;
  readonly winner: Player | null;
  readonly winningLine: WinningLine | null;
  readonly history: readonly MoveRecord[];
  readonly redoStack: readonly MoveRecord[];
}

export interface GameOptions {
  readonly startingPlayer?: Player | undefined;
}

export interface EvaluationResult {
  readonly status: GameStatus;
  readonly winner: Player | null;
  readonly winningLine: WinningLine | null;
}

export type MoveErrorReason =
  | 'GAME_ALREADY_OVER'
  | 'INVALID_INDEX'
  | 'CELL_OCCUPIED'
  | 'WRONG_TURN';

export type MoveResult =
  | { readonly ok: true; readonly state: GameState }
  | { readonly ok: false; readonly error: MoveErrorReason; readonly state: GameState };
