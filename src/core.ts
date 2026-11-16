import { BOARD_SIZE, DEFAULT_STARTING_PLAYER, INITIAL_BOARD } from './constants';
import { evaluateBoard } from './evaluator';
import type {
  Cell,
  GameOptions,
  GameState,
  MoveErrorReason,
  MoveRecord,
  MoveResult,
  Player,
} from './types';

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

export function makeMove(
  state: GameState,
  index: number,
  player?: Player
): MoveResult {
  const error = validateMove(state, index, player);
  if (error !== null) {
    return Object.freeze({
      ok: false,
      error,
      state,
    });
  }

  const nextBoard: Cell[] = [...state.board];
  nextBoard[index] = state.turn;
  const frozenBoard = Object.freeze(nextBoard);

  const moveRecord: MoveRecord = Object.freeze({
    player: state.turn,
    index,
    moveNumber: state.history.length + 1,
  });

  const evaluation = evaluateBoard(frozenBoard);
  const nextTurn: Player =
    evaluation.status === 'IN_PROGRESS'
      ? getNextPlayer(state.turn)
      : state.turn;

  const nextState: GameState = Object.freeze({
    board: frozenBoard,
    turn: nextTurn,
    startingPlayer: state.startingPlayer,
    status: evaluation.status,
    winner: evaluation.winner,
    winningLine: evaluation.winningLine,
    history: Object.freeze([...state.history, moveRecord]),
    redoStack: Object.freeze([]),
  });

  return Object.freeze({
    ok: true,
    state: nextState,
  });
}

export const applyMove = makeMove;

export function undoMove(state: GameState): GameState {
  if (state.history.length === 0) {
    return state;
  }

  const lastMove = state.history[state.history.length - 1];
  if (!lastMove) {
    return state;
  }

  const nextBoard: Cell[] = [...state.board];
  nextBoard[lastMove.index] = null;
  const frozenBoard = Object.freeze(nextBoard);

  const evaluation = evaluateBoard(frozenBoard);

  return Object.freeze({
    board: frozenBoard,
    turn: lastMove.player,
    startingPlayer: state.startingPlayer,
    status: evaluation.status,
    winner: evaluation.winner,
    winningLine: evaluation.winningLine,
    history: Object.freeze(state.history.slice(0, -1)),
    redoStack: Object.freeze([...state.redoStack, lastMove]),
  });
}

export function redoMove(state: GameState): GameState {
  if (state.redoStack.length === 0) {
    return state;
  }

  const moveToRedo = state.redoStack[state.redoStack.length - 1];
  if (!moveToRedo) {
    return state;
  }

  const nextBoard: Cell[] = [...state.board];
  nextBoard[moveToRedo.index] = moveToRedo.player;
  const frozenBoard = Object.freeze(nextBoard);

  const evaluation = evaluateBoard(frozenBoard);
  const nextTurn: Player =
    evaluation.status === 'IN_PROGRESS'
      ? getNextPlayer(moveToRedo.player)
      : moveToRedo.player;

  return Object.freeze({
    board: frozenBoard,
    turn: nextTurn,
    startingPlayer: state.startingPlayer,
    status: evaluation.status,
    winner: evaluation.winner,
    winningLine: evaluation.winningLine,
    history: Object.freeze([...state.history, moveToRedo]),
    redoStack: Object.freeze(state.redoStack.slice(0, -1)),
  });
}

export function resetGame(state?: GameState, options?: GameOptions): GameState {
  const startingPlayer =
    options?.startingPlayer ?? state?.startingPlayer ?? DEFAULT_STARTING_PLAYER;
  return createGame({ startingPlayer });
}

export function serializeState(state: GameState): string {
  return JSON.stringify(state);
}

export function hydrateState(snapshot: string | GameState): GameState {
  let raw: unknown;
  if (typeof snapshot === 'string') {
    try {
      raw = JSON.parse(snapshot);
    } catch {
      throw new Error('Invalid state snapshot JSON');
    }
  } else {
    raw = snapshot;
  }

  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid state snapshot: expected an object');
  }

  const parsed = raw as Partial<GameState>;

  if (parsed.startingPlayer !== 'X' && parsed.startingPlayer !== 'O') {
    throw new Error(
      `Invalid state snapshot: invalid startingPlayer '${String(parsed.startingPlayer)}'`
    );
  }

  if (!Array.isArray(parsed.board) || parsed.board.length !== BOARD_SIZE) {
    throw new Error(
      `Invalid state snapshot: board must be an array of length ${BOARD_SIZE}`
    );
  }

  for (let i = 0; i < parsed.board.length; i++) {
    const cell = parsed.board[i];
    if (cell !== 'X' && cell !== 'O' && cell !== null) {
      throw new Error(
        `Invalid state snapshot: invalid board cell at index ${i}`
      );
    }
  }

  if (!Array.isArray(parsed.history)) {
    throw new Error('Invalid state snapshot: history must be an array');
  }

  if (!Array.isArray(parsed.redoStack)) {
    throw new Error('Invalid state snapshot: redoStack must be an array');
  }

  const validatedHistory: MoveRecord[] = [];
  const testBoard: (Player | null)[] = Array.from(
    { length: BOARD_SIZE },
    () => null
  );
  let expectedPlayer: Player = parsed.startingPlayer;

  for (let i = 0; i < parsed.history.length; i++) {
    const m = parsed.history[i] as Partial<MoveRecord> | undefined;
    if (
      !m ||
      (m.player !== 'X' && m.player !== 'O') ||
      typeof m.index !== 'number' ||
      !Number.isInteger(m.index) ||
      m.index < 0 ||
      m.index >= BOARD_SIZE ||
      typeof m.moveNumber !== 'number' ||
      !Number.isInteger(m.moveNumber) ||
      m.moveNumber !== i + 1
    ) {
      throw new Error(
        `Invalid state snapshot: invalid history record at index ${i}`
      );
    }

    if (m.player !== expectedPlayer) {
      throw new Error(
        `Invalid state snapshot: move ${i + 1} player '${m.player}' does not match expected '${expectedPlayer}'`
      );
    }

    if (testBoard[m.index] !== null) {
      throw new Error(
        `Invalid state snapshot: duplicate move at index ${m.index} in history`
      );
    }

    testBoard[m.index] = m.player;
    expectedPlayer = getNextPlayer(expectedPlayer);
    validatedHistory.push(
      Object.freeze({
        player: m.player,
        index: m.index,
        moveNumber: m.moveNumber,
      })
    );
  }

  for (let i = 0; i < BOARD_SIZE; i++) {
    if (testBoard[i] !== parsed.board[i]) {
      throw new Error(
        `Invalid state snapshot: board cell at index ${i} does not match history`
      );
    }
  }

  const validatedRedoStack: MoveRecord[] = [];
  for (let i = 0; i < parsed.redoStack.length; i++) {
    const m = parsed.redoStack[i] as Partial<MoveRecord> | undefined;
    if (
      !m ||
      (m.player !== 'X' && m.player !== 'O') ||
      typeof m.index !== 'number' ||
      !Number.isInteger(m.index) ||
      m.index < 0 ||
      m.index >= BOARD_SIZE ||
      typeof m.moveNumber !== 'number' ||
      !Number.isInteger(m.moveNumber)
    ) {
      throw new Error(
        `Invalid state snapshot: invalid redoStack record at index ${i}`
      );
    }
    validatedRedoStack.push(
      Object.freeze({
        player: m.player,
        index: m.index,
        moveNumber: m.moveNumber,
      })
    );
  }

  const frozenBoard: readonly Cell[] = Object.freeze([...parsed.board]);
  const evaluation = evaluateBoard(frozenBoard);

  const lastMove = validatedHistory[validatedHistory.length - 1];
  const nextTurn: Player =
    evaluation.status === 'IN_PROGRESS'
      ? lastMove
        ? getNextPlayer(lastMove.player)
        : parsed.startingPlayer
      : lastMove
      ? lastMove.player
      : parsed.startingPlayer;

  return Object.freeze({
    board: frozenBoard,
    turn: nextTurn,
    startingPlayer: parsed.startingPlayer,
    status: evaluation.status,
    winner: evaluation.winner,
    winningLine: evaluation.winningLine,
    history: Object.freeze(validatedHistory),
    redoStack: Object.freeze(validatedRedoStack),
  });
}
