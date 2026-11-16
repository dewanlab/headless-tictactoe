# headless-tictactoe

> Production-grade, zero-dependency, headless Tic-Tac-Toe state machine and Minimax AI engine in strict TypeScript (inspired by `chess.js`).

[![npm version](https://img.shields.io/npm/v/headless-tictactoe.svg)](https://www.npmjs.com/package/headless-tictactoe)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript Strict](https://img.shields.io/badge/TypeScript-Strict%20100%25-blue)](https://www.typescriptlang.org/)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-success.svg)](package.json)

---

## Key Highlights

- **Zero Runtime Dependencies:** Completely pure; `dependencies` in `package.json` is empty.
- **100% Headless & UI-Agnostic:** Operates exclusively on pure data structures with zero knowledge of the DOM, CLI, or networks. Power terminal apps, reactive web frameworks (React, Vue 3, Svelte), or authoritative multiplayer game servers (Node.js, WebSocket).
- **Dual API Design:**
  - **Pure Functional Core (`src/core.ts`, `src/evaluator.ts`):** Immutable, frozen state transitions (`makeMove`, `undoMove`, `redoMove`), strict discriminated union results (`{ ok: true, state } | { ok: false, error, state }`), and resilient JSON serialization/hydration.
  - **Stateful Class Wrapper (`src/engine.ts`):** Ergonomic `TicTacToe` class encapsulating native private state for object-oriented workflows.
- **Tree-Shakable Minimax AI Subpath (`headless-tictactoe/ai`):** Unbeatable Alpha-Beta pruned Minimax engine with depth-adjusted utility, strategic move ordering (Center → Corners → Edges), and configurable difficulty levels (`easy`, `medium`, `hard`). Consumers who don't need AI pay zero bundle cost.
- **Dual Module Build:** Distributed as dual ESM (`.mjs`) and CommonJS (`.cjs`) with accompanying TypeScript declarations (`.d.ts`).

---

## Installation

```bash
# npm
npm install headless-tictactoe

# pnpm
pnpm add headless-tictactoe

# yarn
yarn add headless-tictactoe

# bun
bun add headless-tictactoe
```

---

## Board Coordinate Map

The board is represented as a 1-dimensional, 9-element array (`readonly (Player | null)[]`) indexed from `0` to `8`:

```text
 0 | 1 | 2        Row 0: [0, 1, 2]     Col 0: [0, 3, 6]     Diag 1: [0, 4, 8]
---+---+---       Row 1: [3, 4, 5]     Col 1: [1, 4, 7]     Diag 2: [2, 4, 6]
 3 | 4 | 5        Row 2: [6, 7, 8]     Col 2: [2, 5, 8]
---+---+---
 6 | 7 | 8
```

---

## Quick Start

### 1. Stateful OOP Approach (`TicTacToe` Class)

Ideal for standard applications, UI components, and game sessions.

```typescript
import { TicTacToe } from 'headless-tictactoe'

// 1. Initialize a new game (default starting player is 'X')
const game = new TicTacToe()

// 2. Make moves (player alternates automatically)
const move1 = game.makeMove(4) // X plays center
if (move1.ok) {
  console.log(`Move succeeded! Current turn: ${game.turn}`) // 'O'
}

// 3. Move alias and validation
const move2 = game.move(0) // O plays top-left corner
if (!move2.ok) {
  console.error(`Move failed with error: ${move2.error}`)
}

// 4. Inspect current game status
console.log(game.status) // 'IN_PROGRESS' | 'WON' | 'DRAW'
console.log(game.board) // ['O', null, null, null, 'X', null, null, null, null]

// 5. Undo & Redo
if (game.canUndo) {
  game.undo()
  console.log(`Undid move. Current turn: ${game.turn}`) // 'O'
  game.redo() // Re-applies the move
}

// 6. Serialization & Hydration
const snapshot = game.serialize() // JSON string
const restored = TicTacToe.fromJSON(snapshot)
```

### 2. Pure Functional Approach

Ideal for functional state stores (Redux, Pinia, Vue 3, Zustand) and event-sourced backends.

```typescript
import {
  createGame,
  makeMove,
  undoMove,
  redoMove,
  evaluateBoard,
  serializeState,
  hydrateState,
} from 'headless-tictactoe'

// Create an immutable frozen state
const state0 = createGame({ startingPlayer: 'X' })

// Make moves (returns a frozen discriminated union)
const result1 = makeMove(state0, 4)
if (!result1.ok) {
  console.error(`Invalid move: ${result1.error}`)
} else {
  const state1 = result1.state
  console.log(state1.turn) // 'O'

  // Undo returns a new frozen state
  const undoneState = undoMove(state1)
  console.log(undoneState.turn) // 'X'
}
```

---

## Single-Player Minimax AI (`headless-tictactoe/ai`)

The AI engine is exposed as a separate subpath export (`headless-tictactoe/ai`). It does not increase the bundle size of the root package.

```typescript
import { TicTacToe } from 'headless-tictactoe'
import {
  getBestMove,
  getRandomMove,
  getScoredMoves,
} from 'headless-tictactoe/ai'

const game = new TicTacToe()

// Human move
game.makeMove(0) // X plays 0

// Compute unbeatable bot move ('hard' uses Alpha-Beta pruning Minimax)
const botMove = getBestMove(game.getState(), { difficulty: 'hard' })
if (botMove !== null) {
  game.makeMove(botMove) // O plays optimal move (4, center)
}

// Configurable difficulties:
const easyMove = getBestMove(game.getState(), { difficulty: 'easy' })
const mediumMove = getBestMove(game.getState(), { difficulty: 'medium' })

// Custom RNG injection for deterministic testing:
const deterministicMove = getBestMove(game.getState(), {
  difficulty: 'easy',
  random: () => 0.5,
})

// Inspect deep Minimax scores for all available candidate moves:
const scoredMoves = getScoredMoves(game.getState())
// => [{ index: 4, score: 0 }, { index: 2, score: -1 }, ...]
```

---

## Headless Architecture & Adapter Recipes

### Recipe 1: Vue 3 Composition API / Pinia Store Adapter

```typescript
import { defineStore } from 'pinia'
import { shallowRef, computed } from 'vue'
import {
  createGame,
  makeMove,
  undoMove,
  resetGame,
  type GameState,
} from 'headless-tictactoe'

export const useTicTacToeStore = defineStore('tictactoe', () => {
  const state = shallowRef<GameState>(createGame())

  const board = computed(() => state.value.board)
  const turn = computed(() => state.value.turn)
  const status = computed(() => state.value.status)
  const winner = computed(() => state.value.winner)
  const winningLine = computed(() => state.value.winningLine)
  const canUndo = computed(() => state.value.history.length > 0)

  function playCell(index: number) {
    const result = makeMove(state.value, index)
    if (result.ok) {
      state.value = result.state
    }
    return result
  }

  function undo() {
    state.value = undoMove(state.value)
  }

  function reset() {
    state.value = resetGame(state.value)
  }

  return {
    board,
    turn,
    status,
    winner,
    winningLine,
    canUndo,
    playCell,
    undo,
    reset,
  }
})
```

### Recipe 2: Authoritative Multiplayer Server (Node.js / Socket.io)

```typescript
import { TicTacToe, type Player } from 'headless-tictactoe'

export class GameRoom {
  #engine = new TicTacToe()
  #players = new Map<string, Player>() // socketId -> 'X' | 'O'

  assignPlayer(socketId: string): Player | null {
    if (this.#players.size === 0) {
      this.#players.set(socketId, 'X')
      return 'X'
    }
    if (this.#players.size === 1) {
      this.#players.set(socketId, 'O')
      return 'O'
    }
    return null // Spectator
  }

  handleIncomingMove(socketId: string, cellIndex: number) {
    const symbol = this.#players.get(socketId)
    if (!symbol) return { error: 'UNAUTHORIZED' }

    // Strictly validate that only the player whose turn it is can play
    const result = this.#engine.makeMove(cellIndex, symbol)
    if (!result.ok) {
      return { error: result.error } // e.g., 'WRONG_TURN', 'CELL_OCCUPIED'
    }

    // Broadcast authoritative snapshot to all connected clients
    return {
      success: true,
      snapshot: this.#engine.getState(),
    }
  }
}
```

### Recipe 3: Interactive Terminal CLI (`node:readline`)

```typescript
import * as readline from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import { TicTacToe } from 'headless-tictactoe'
import { getBestMove } from 'headless-tictactoe/ai'

async function main() {
  const rl = readline.createInterface({ input, output })
  const game = new TicTacToe()

  while (!game.isGameOver()) {
    console.log(`\nBoard:\n${game.board.map((c, i) => c ?? i).join(' ')}`)

    if (game.turn === 'X') {
      const answer = await rl.question('Enter cell index (0-8): ')
      const idx = Number.parseInt(answer.trim(), 10)
      const res = game.makeMove(idx)
      if (!res.ok) console.log(`Error: ${res.error}`)
    } else {
      const botMove = getBestMove(game.getState(), { difficulty: 'hard' })
      if (botMove !== null) game.makeMove(botMove)
      console.log(`Bot played cell ${botMove}`)
    }
  }

  console.log(
    `Game Over: ${game.status}! Winner: ${game.winner ?? 'None (Draw)'}`,
  )
  rl.close()
}
```

---

## Complete API Reference

### Core Functional API (`headless-tictactoe`)

| Function                 | Signature                                                                       | Description                                              |
| ------------------------ | ------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `createGame`             | `(options?: GameOptions) => GameState`                                          | Creates a deeply frozen initial game state.              |
| `makeMove` / `applyMove` | `(state: GameState, index: number, player?: Player) => MoveResult`              | Applies a move immutably; returns a discriminated union. |
| `undoMove`               | `(state: GameState) => GameState`                                               | Reverts the last move, restoring board and turn.         |
| `redoMove`               | `(state: GameState) => GameState`                                               | Re-applies the most recently undone move.                |
| `resetGame`              | `(state?: GameState, options?: GameOptions) => GameState`                       | Resets the game to an empty board.                       |
| `validateMove`           | `(state: GameState, index: number, player?: Player) => MoveErrorReason \| null` | Checks move validity without making the move.            |
| `isValidMove`            | `(state: GameState, index: number, player?: Player) => boolean`                 | Boolean wrapper for `validateMove`.                      |
| `getLegalMoves`          | `(state: GameState) => readonly number[]`                                       | Returns all available indices `[0..8]`.                  |
| `isGameOver`             | `(state: GameState) => boolean`                                                 | Returns `true` if game status is `'WON'` or `'DRAW'`.    |
| `evaluateBoard`          | `(board: readonly Cell[]) => EvaluationResult`                                  | Authoritative win/draw/in-progress evaluator.            |
| `checkWinner`            | `(board: readonly Cell[]) => { winner, winningLine } \| null`                   | Identifies 3-in-a-row winning patterns.                  |
| `isBoardFull`            | `(board: readonly Cell[]) => boolean`                                           | Checks if all 9 cells are occupied.                      |
| `getNextPlayer`          | `(player: Player) => Player`                                                    | Alternates `'X'` to `'O'` and `'O'` to `'X'`.            |
| `serializeState`         | `(state: GameState) => string`                                                  | Serializes state to a JSON string.                       |
| `hydrateState`           | `(snapshot: string \| GameState) => GameState`                                  | Validates, heals, and freezes a state snapshot.          |

### `TicTacToe` Class API (`headless-tictactoe`)

| Getter / Method                   | Returns                 | Description                                         |
| --------------------------------- | ----------------------- | --------------------------------------------------- |
| `constructor(optionsOrSnapshot?)` | `TicTacToe`             | Creates an instance from options or snapshot.       |
| `TicTacToe.fromJSON(snapshot)`    | `TicTacToe`             | Static factory to hydrate from snapshot.            |
| `board`                           | `readonly Cell[]`       | Array of 9 cells (`'X'`, `'O'`, or `null`).         |
| `turn`                            | `Player`                | Current active player (`'X'` or `'O'`).             |
| `status`                          | `GameStatus`            | `'IN_PROGRESS'`, `'WON'`, or `'DRAW'`.              |
| `winner`                          | `Player \| null`        | Winner symbol or `null`.                            |
| `winningLine`                     | `WinningLine \| null`   | Winning index triplet (e.g. `[0, 1, 2]`) or `null`. |
| `history`                         | `readonly MoveRecord[]` | Array of past moves in order.                       |
| `redoStack`                       | `readonly MoveRecord[]` | Array of undone moves available to redo.            |
| `canUndo` / `canRedo`             | `boolean`               | Whether undo/redo operations are available.         |
| `getCell(index)`                  | `Cell \| undefined`     | Gets cell value at specified index.                 |
| `makeMove(index, player?)`        | `MoveResult`            | Executes a move and updates internal state.         |
| `move(index, player?)`            | `MoveResult`            | Convenience alias for `makeMove`.                   |
| `undo()` / `undoMove()`           | `GameState`             | Undoes the last move.                               |
| `redo()` / `redoMove()`           | `GameState`             | Redoes the last undone move.                        |
| `reset(options?)`                 | `GameState`             | Resets the game session.                            |
| `hydrate(snapshot)`               | `GameState`             | Updates session state from snapshot.                |
| `serialize()`                     | `string`                | Serializes current state to JSON string.            |
| `toJSON()`                        | `GameState`             | Direct serializer hook for `JSON.stringify()`.      |
| `clone()`                         | `TicTacToe`             | Deeply clones the engine instance.                  |

### AI Module API (`headless-tictactoe/ai`)

| Function               | Signature                                                      | Description                                          |
| ---------------------- | -------------------------------------------------------------- | ---------------------------------------------------- |
| `getBestMove`          | `(state: GameState, options?: BotOptions) => number \| null`   | Calculates optimal or difficulty-scaled move index.  |
| `getRandomMove`        | `(state: GameState, random?: () => number) => number \| null`  | Picks a random legal move with optional custom PRNG. |
| `getScoredMoves`       | `(state: GameState, player?: Player) => readonly ScoredMove[]` | Evaluates Minimax score for every candidate move.    |
| `STRATEGIC_MOVE_ORDER` | `readonly number[]`                                            | Ordering array: `[4, 0, 2, 6, 8, 1, 3, 5, 7]`.       |

### Error Codes (`MoveErrorReason`)

| Code                  | Cause                                                             |
| --------------------- | ----------------------------------------------------------------- |
| `'GAME_ALREADY_OVER'` | Move attempted after game has concluded with `'WON'` or `'DRAW'`. |
| `'WRONG_TURN'`        | The player argument provided does not match the active turn.      |
| `'INVALID_INDEX'`     | Index is not an integer between `0` and `8` inclusive.            |
| `'CELL_OCCUPIED'`     | Index targets a cell that already contains `'X'` or `'O'`.        |

---

## License

[MIT](LICENSE) © [Abdullah Dewan](https://abdullahdewan.com)
