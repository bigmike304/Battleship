import { GRID_SIZE, CELL_STATES } from '../engine/board.js';
import { SHIP_TYPES } from '../engine/ship.js';

// AI Difficulty levels
export const AI_DIFFICULTY = {
  EASY: 'easy',
  NORMAL: 'normal',
  HARD: 'hard',
};

// AI modes for Hunt/Target strategy
export const AI_MODES = {
  HUNT: 'hunt',
  TARGET: 'target',
};

// Seeded random number generator for deterministic testing
export class SeededRNG {
  constructor(seed = Date.now()) {
    this.seed = seed;
  }

  // Simple LCG (Linear Congruential Generator)
  next() {
    this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
    return this.seed / 4294967296;
  }

  // Get random integer in range [0, max)
  nextInt(max) {
    return Math.floor(this.next() * max);
  }

  // Pick random element from array
  pick(array) {
    if (array.length === 0) return null;
    return array[this.nextInt(array.length)];
  }
}

// Convert row/col to classic coordinate format (e.g., "B7")
export function toClassicCoord(row, col) {
  const colLetter = String.fromCharCode(65 + col); // A-J
  const rowNumber = row + 1; // 1-10
  return `${colLetter}${rowNumber}`;
}

// Create initial AI knowledge state
export function createAIState(difficulty = AI_DIFFICULTY.NORMAL, seed = null) {
  return {
    difficulty,
    mode: AI_MODES.HUNT,
    shotsTaken: new Set(),
    hits: [],
    misses: [],
    hitClusters: [],
    sunkShips: [],
    remainingShipSizes: SHIP_TYPES.map(s => s.length),
    boardSize: GRID_SIZE,
    targetStack: [],
    currentHits: [],
    lineDirection: null,
    rng: new SeededRNG(seed || Date.now()),
  };
}

// Clone AI state (for immutability in tests)
export function cloneAIState(state) {
  return {
    ...state,
    shotsTaken: new Set(state.shotsTaken),
    hits: [...state.hits],
    misses: [...state.misses],
    hitClusters: state.hitClusters.map(c => [...c]),
    sunkShips: [...state.sunkShips],
    remainingShipSizes: [...state.remainingShipSizes],
    targetStack: state.targetStack.map(t => ({ ...t })),
    currentHits: state.currentHits.map(h => ({ ...h })),
    rng: new SeededRNG(state.rng.seed),
  };
}

// Pure function: Get next AI move
// Returns: { row, col, reason } or null if no valid moves
export function getNextMove(state, playerBoard) {
  const { difficulty } = state;

  switch (difficulty) {
    case AI_DIFFICULTY.EASY:
      return getEasyMove(state, playerBoard);
    case AI_DIFFICULTY.NORMAL:
      return getNormalMove(state, playerBoard);
    case AI_DIFFICULTY.HARD:
      return getHardMove(state, playerBoard);
    default:
      return getNormalMove(state, playerBoard);
  }
}

// Easy AI: Random valid shots only
function getEasyMove(state, playerBoard) {
  const availableCells = getAvailableCells(state, playerBoard);
  
  if (availableCells.length === 0) {
    return null;
  }

  const cell = state.rng.pick(availableCells);
  return {
    row: cell.row,
    col: cell.col,
    reason: 'Random shot',
  };
}

// Normal AI: Hunt/Target strategy
function getNormalMove(state, playerBoard) {
  // Target mode: prioritize adjacent cells after a hit
  if (state.mode === AI_MODES.TARGET && state.targetStack.length > 0) {
    const target = getValidTarget(state, playerBoard);
    if (target) {
      return {
        row: target.row,
        col: target.col,
        reason: 'Target mode: following up on hit',
      };
    }
  }

  // Hunt mode: random from available cells
  const availableCells = getAvailableCells(state, playerBoard);
  
  if (availableCells.length === 0) {
    return null;
  }

  const cell = state.rng.pick(availableCells);
  return {
    row: cell.row,
    col: cell.col,
    reason: 'Hunt mode: random search',
  };
}

// Hard AI: Parity hunting + Hunt/Target
function getHardMove(state, playerBoard) {
  // Target mode: prioritize adjacent cells after a hit
  if (state.mode === AI_MODES.TARGET && state.targetStack.length > 0) {
    const target = getValidTarget(state, playerBoard);
    if (target) {
      return {
        row: target.row,
        col: target.col,
        reason: 'Target mode: following up on hit',
      };
    }
  }

  // Hunt mode with parity: only consider cells based on smallest remaining ship
  const smallestShip = Math.min(...state.remainingShipSizes);
  const parityCells = getParityCells(state, playerBoard, smallestShip);
  
  if (parityCells.length > 0) {
    const cell = state.rng.pick(parityCells);
    return {
      row: cell.row,
      col: cell.col,
      reason: `Hunt mode: parity pattern (smallest ship: ${smallestShip})`,
    };
  }

  // Fallback to any available cell
  const availableCells = getAvailableCells(state, playerBoard);
  if (availableCells.length > 0) {
    const cell = state.rng.pick(availableCells);
    return {
      row: cell.row,
      col: cell.col,
      reason: 'Hunt mode: fallback to available cell',
    };
  }

  return null;
}

// Get all available (unshot) cells
function getAvailableCells(state, playerBoard) {
  const cells = [];
  
  for (let row = 0; row < state.boardSize; row++) {
    for (let col = 0; col < state.boardSize; col++) {
      const key = `${row},${col}`;
      if (!state.shotsTaken.has(key)) {
        const cell = playerBoard.getCell(row, col);
        if (cell.state !== CELL_STATES.HIT && 
            cell.state !== CELL_STATES.MISS && 
            cell.state !== CELL_STATES.SUNK) {
          cells.push({ row, col });
        }
      }
    }
  }
  
  return cells;
}

// Get cells matching parity pattern for given ship size
function getParityCells(state, playerBoard, shipSize) {
  const cells = [];
  const parity = shipSize % 2 === 0 ? 0 : 1;
  
  for (let row = 0; row < state.boardSize; row++) {
    for (let col = 0; col < state.boardSize; col++) {
      // Parity check: (row + col) % shipSize === 0 for optimal coverage
      // Simplified: use checkerboard pattern adjusted for ship size
      if ((row + col) % shipSize === 0) {
        const key = `${row},${col}`;
        if (!state.shotsTaken.has(key)) {
          const cell = playerBoard.getCell(row, col);
          if (cell.state !== CELL_STATES.HIT && 
              cell.state !== CELL_STATES.MISS && 
              cell.state !== CELL_STATES.SUNK) {
            cells.push({ row, col });
          }
        }
      }
    }
  }
  
  return cells;
}

// Get valid target from target stack
function getValidTarget(state, playerBoard) {
  // Sort by priority if line direction is detected
  const sortedStack = [...state.targetStack];
  
  while (sortedStack.length > 0) {
    const target = sortedStack.pop();
    const key = `${target.row},${target.col}`;
    
    if (state.shotsTaken.has(key)) {
      continue;
    }
    
    const cell = playerBoard.getCell(target.row, target.col);
    if (cell.state === CELL_STATES.HIT || 
        cell.state === CELL_STATES.MISS || 
        cell.state === CELL_STATES.SUNK) {
      continue;
    }
    
    // Remove from actual target stack
    const idx = state.targetStack.findIndex(t => t.row === target.row && t.col === target.col);
    if (idx !== -1) {
      state.targetStack.splice(idx, 1);
    }
    
    return target;
  }
  
  return null;
}

// Record attack result and update AI state
export function recordAttack(state, row, col, result) {
  const key = `${row},${col}`;
  state.shotsTaken.add(key);
  
  if (result.result === 'hit') {
    state.hits.push({ row, col });
    state.currentHits.push({ row, col });
    state.mode = AI_MODES.TARGET;
    
    if (state.currentHits.length >= 2) {
      detectAndPrioritizeLine(state);
    } else {
      addAdjacentCells(state, row, col);
    }
  } else if (result.result === 'sunk') {
    state.hits.push({ row, col });
    
    if (result.ship) {
      state.sunkShips.push(result.ship.name);
      const sunkLength = result.ship.length;
      const idx = state.remainingShipSizes.indexOf(sunkLength);
      if (idx !== -1) {
        state.remainingShipSizes.splice(idx, 1);
      }
    }
    
    clearTargetContext(state);
  } else {
    state.misses.push({ row, col });
  }
}

// Detect line direction from hits and prioritize endpoints
function detectAndPrioritizeLine(state) {
  if (state.currentHits.length < 2) {
    return;
  }

  const first = state.currentHits[0];
  const second = state.currentHits[1];

  if (first.row === second.row) {
    state.lineDirection = 'horizontal';
  } else if (first.col === second.col) {
    state.lineDirection = 'vertical';
  } else {
    return;
  }

  state.targetStack = [];

  const sortedHits = [...state.currentHits].sort((a, b) => {
    if (state.lineDirection === 'horizontal') {
      return a.col - b.col;
    }
    return a.row - b.row;
  });

  const firstHit = sortedHits[0];
  const lastHit = sortedHits[sortedHits.length - 1];

  if (state.lineDirection === 'horizontal') {
    if (isValidCell(state, firstHit.row, firstHit.col - 1)) {
      const key = `${firstHit.row},${firstHit.col - 1}`;
      if (!state.shotsTaken.has(key)) {
        state.targetStack.push({ row: firstHit.row, col: firstHit.col - 1, priority: 'high' });
      }
    }
    if (isValidCell(state, lastHit.row, lastHit.col + 1)) {
      const key = `${lastHit.row},${lastHit.col + 1}`;
      if (!state.shotsTaken.has(key)) {
        state.targetStack.push({ row: lastHit.row, col: lastHit.col + 1, priority: 'high' });
      }
    }
  } else {
    if (isValidCell(state, firstHit.row - 1, firstHit.col)) {
      const key = `${firstHit.row - 1},${firstHit.col}`;
      if (!state.shotsTaken.has(key)) {
        state.targetStack.push({ row: firstHit.row - 1, col: firstHit.col, priority: 'high' });
      }
    }
    if (isValidCell(state, lastHit.row + 1, lastHit.col)) {
      const key = `${lastHit.row + 1},${lastHit.col}`;
      if (!state.shotsTaken.has(key)) {
        state.targetStack.push({ row: lastHit.row + 1, col: lastHit.col, priority: 'high' });
      }
    }
  }
}

// Add adjacent cells to target stack
function addAdjacentCells(state, row, col) {
  const directions = [
    { row: -1, col: 0 },
    { row: 1, col: 0 },
    { row: 0, col: -1 },
    { row: 0, col: 1 },
  ];

  for (const dir of directions) {
    const newRow = row + dir.row;
    const newCol = col + dir.col;

    if (isValidCell(state, newRow, newCol)) {
      const key = `${newRow},${newCol}`;
      if (!state.shotsTaken.has(key)) {
        const alreadyInStack = state.targetStack.some(
          t => t.row === newRow && t.col === newCol
        );
        if (!alreadyInStack) {
          state.targetStack.push({ row: newRow, col: newCol });
        }
      }
    }
  }
}

// Clear target context after sinking a ship
function clearTargetContext(state) {
  state.targetStack = [];
  state.currentHits = [];
  state.lineDirection = null;
  state.mode = AI_MODES.HUNT;
}

// Check if cell is within board bounds
function isValidCell(state, row, col) {
  return row >= 0 && row < state.boardSize && col >= 0 && col < state.boardSize;
}

// Reset AI state
export function resetAIState(state) {
  state.mode = AI_MODES.HUNT;
  state.shotsTaken = new Set();
  state.hits = [];
  state.misses = [];
  state.hitClusters = [];
  state.sunkShips = [];
  state.remainingShipSizes = SHIP_TYPES.map(s => s.length);
  state.targetStack = [];
  state.currentHits = [];
  state.lineDirection = null;
  state.rng = new SeededRNG(Date.now());
}

// AI class wrapper for compatibility with existing code
export class BattleshipAI {
  constructor(difficulty = AI_DIFFICULTY.NORMAL, seed = null) {
    this.state = createAIState(difficulty, seed);
  }

  setDifficulty(difficulty) {
    this.state.difficulty = difficulty;
  }

  getDifficulty() {
    return this.state.difficulty;
  }

  reset() {
    resetAIState(this.state);
  }

  getNextMove(playerBoard) {
    const move = getNextMove(this.state, playerBoard);
    return move ? { row: move.row, col: move.col, reason: move.reason } : null;
  }

  recordAttack(row, col, result) {
    recordAttack(this.state, row, col, result);
  }

  // For testing: get internal state
  getState() {
    return this.state;
  }

  // For testing: set seed for deterministic behavior
  setSeed(seed) {
    this.state.rng = new SeededRNG(seed);
  }
}
