/**
 * Authoritative Multiplayer Room Example
 *
 * Demonstrates an authoritative game room adapter suitable for WebSockets,
 * Socket.io, or HTTP servers. Handles player assignment, turn authorization,
 * move validation, and snapshot persistence/rehydration.
 */

import {
  TicTacToe,
  type GameState,
  type MoveErrorReason,
  type Player,
} from '../src/index';

export interface RoomBroadcastPayload {
  readonly roomId: string;
  readonly players: {
    readonly X: string | null;
    readonly O: string | null;
  };
  readonly state: GameState;
  readonly lastError?: string | undefined;
}

export type RoomActionResult =
  | { readonly success: true; readonly payload: RoomBroadcastPayload }
  | { readonly success: false; readonly reason: string; readonly payload: RoomBroadcastPayload };

export class MultiplayerRoom {
  readonly id: string;
  #engine: TicTacToe;
  #players: { X: string | null; O: string | null };

  constructor(id: string, savedSnapshot?: string) {
    this.id = id;
    this.#players = { X: null, O: null };
    this.#engine = savedSnapshot
      ? TicTacToe.fromJSON(savedSnapshot)
      : new TicTacToe({ startingPlayer: 'X' });
  }

  join(playerId: string): { assignedSymbol: Player | null; error?: string } {
    if (this.#players.X === playerId) return { assignedSymbol: 'X' };
    if (this.#players.O === playerId) return { assignedSymbol: 'O' };

    if (this.#players.X === null) {
      this.#players.X = playerId;
      return { assignedSymbol: 'X' };
    }

    if (this.#players.O === null) {
      this.#players.O = playerId;
      return { assignedSymbol: 'O' };
    }

    return { assignedSymbol: null, error: 'ROOM_FULL' };
  }

  handlePlayerMove(playerId: string, cellIndex: number): RoomActionResult {
    const symbol = this.#getPlayerSymbol(playerId);
    if (!symbol) {
      return {
        success: false,
        reason: 'NOT_A_PLAYER_IN_THIS_ROOM',
        payload: this.getBroadcastPayload('Sender is not a registered player'),
      };
    }

    if (symbol !== this.#engine.turn) {
      return {
        success: false,
        reason: 'NOT_YOUR_TURN',
        payload: this.getBroadcastPayload(`It is ${this.#engine.turn}'s turn`),
      };
    }

    const moveResult = this.#engine.makeMove(cellIndex, symbol);
    if (!moveResult.ok) {
      return {
        success: false,
        reason: moveResult.error,
        payload: this.getBroadcastPayload(this.#mapErrorReason(moveResult.error)),
      };
    }

    return {
      success: true,
      payload: this.getBroadcastPayload(),
    };
  }

  saveSnapshot(): string {
    return this.#engine.serialize();
  }

  restoreSnapshot(json: string): void {
    this.#engine.hydrate(json);
  }

  getBroadcastPayload(lastError?: string): RoomBroadcastPayload {
    return {
      roomId: this.id,
      players: { ...this.#players },
      state: this.#engine.getState(),
      ...(lastError !== undefined ? { lastError } : {}),
    };
  }

  #getPlayerSymbol(playerId: string): Player | null {
    if (this.#players.X === playerId) return 'X';
    if (this.#players.O === playerId) return 'O';
    return null;
  }

  #mapErrorReason(reason: MoveErrorReason): string {
    switch (reason) {
      case 'CELL_OCCUPIED':
        return 'That cell is already taken.';
      case 'INVALID_INDEX':
        return 'Invalid cell index provided (must be 0-8).';
      case 'GAME_ALREADY_OVER':
        return 'Game is already over.';
      case 'WRONG_TURN':
        return 'Not your turn.';
    }
  }
}
