# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-11-16

### Added

- **Pure Functional Core:**
  - `createGame`: State factory initializing deeply frozen, immutable game states.
  - `makeMove` / `applyMove`: Pure move execution returning discriminated union results (`{ ok: true, state } | { ok: false, error, state }`).
  - `undoMove` / `redoMove`: Immutable history stepping and branch recovery.
  - `resetGame`: Clean reset with optional starting player configuration.
  - `validateMove` / `isValidMove`: Priority-guarded validation checks.
  - `getLegalMoves`: Unoccupied cell discovery.
  - `isGameOver`: Fast terminal condition detection.
  - `serializeState` / `hydrateState`: Safe JSON snapshot serialization and structural verification/healing.
- **Board Evaluation Engine:**
  - `checkWinner`: Pattern-matched winning triplet detection across all 8 lines (3 rows, 3 columns, 2 diagonals).
  - `isBoardFull`: 9-cell occupancy verification.
  - `evaluateBoard`: Authoritative terminal status resolution ensuring 9th-move win priority over draw.
- **Stateful Class Wrapper:**
  - `TicTacToe`: Ergonomic class wrapper encapsulating private `#state: GameState`.
  - Comprehensive read-only getters (`board`, `turn`, `status`, `winner`, `winningLine`, `history`, `redoStack`, `canUndo`, `canRedo`).
  - Stateful methods (`makeMove`, `move`, `undo`, `redo`, `reset`, `hydrate`, `serialize`, `toJSON`, `clone`).
  - Static factory `TicTacToe.fromJSON()`.
- **Tree-Shakable Minimax AI Subpath (`headless-tictactoe/ai`):**
  - Unbeatable Alpha-Beta pruned Minimax engine with depth-adjusted scoring.
  - `STRATEGIC_MOVE_ORDER`: Optimized candidate move ordering (`[4, 0, 2, 6, 8, 1, 3, 5, 7]` — Center → Corners → Edges).
  - `getBestMove`: Calculates optimal move with difficulty tiers (`'easy'`, `'medium'`, `'hard'`).
  - `getRandomMove`: Random legal move selection with custom RNG injection.
  - `getScoredMoves`: Complete candidate move evaluation array.
- **Package & Toolchain Infrastructure:**
  - Zero runtime dependencies.
  - Dual ESM (`.mjs`) and CommonJS (`.cjs`) builds via `tsup`.
  - Strict TypeScript declarations (`.d.ts` / `.d.cts`) with full `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` support.
  - Vitest test suite with 100% code coverage including exhaustive unbeatability proof.
  - Multi-Node CI matrix workflow and npm provenance release automation.
