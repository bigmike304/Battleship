import { describe, it, expect, beforeEach } from 'vitest';
import { 
  BattleshipAI, 
  AI_DIFFICULTY, 
  AI_MODES,
  createAIState, 
  getNextMove, 
  recordAttack,
  resetAIState,
  SeededRNG,
  toClassicCoord
} from '../src/ai/aiCore.js';
import { Board, GRID_SIZE } from '../src/engine/board.js';
import { createFleet } from '../src/engine/ship.js';

describe('SeededRNG', () => {
  it('should produce deterministic results with same seed', () => {
    const rng1 = new SeededRNG(12345);
    const rng2 = new SeededRNG(12345);
    
    for (let i = 0; i < 10; i++) {
      expect(rng1.next()).toBe(rng2.next());
    }
  });

  it('should produce different results with different seeds', () => {
    const rng1 = new SeededRNG(12345);
    const rng2 = new SeededRNG(54321);
    
    const results1 = [];
    const results2 = [];
    
    for (let i = 0; i < 10; i++) {
      results1.push(rng1.next());
      results2.push(rng2.next());
    }
    
    expect(results1).not.toEqual(results2);
  });

  it('should pick random element from array', () => {
    const rng = new SeededRNG(12345);
    const array = [1, 2, 3, 4, 5];
    const picked = rng.pick(array);
    
    expect(array).toContain(picked);
  });

  it('should return null when picking from empty array', () => {
    const rng = new SeededRNG(12345);
    expect(rng.pick([])).toBeNull();
  });
});

describe('toClassicCoord', () => {
  it('should convert (0, 0) to A1', () => {
    expect(toClassicCoord(0, 0)).toBe('A1');
  });

  it('should convert (0, 9) to J1', () => {
    expect(toClassicCoord(0, 9)).toBe('J1');
  });

  it('should convert (9, 0) to A10', () => {
    expect(toClassicCoord(9, 0)).toBe('A10');
  });

  it('should convert (4, 1) to B5', () => {
    expect(toClassicCoord(4, 1)).toBe('B5');
  });

  it('should convert (6, 5) to F7', () => {
    expect(toClassicCoord(6, 5)).toBe('F7');
  });
});

describe('BattleshipAI', () => {
  let ai;
  let board;

  beforeEach(() => {
    ai = new BattleshipAI(AI_DIFFICULTY.NORMAL, 12345);
    board = new Board();
    const fleet = createFleet();
    
    // Place ships on the board for testing
    board.placeShip(fleet[0], 0, 0, true); // Carrier at A1-E1
    board.placeShip(fleet[1], 2, 0, true); // Battleship at A3-D3
    board.placeShip(fleet[2], 4, 0, true); // Cruiser at A5-C5
    board.placeShip(fleet[3], 6, 0, true); // Submarine at A7-C7
    board.placeShip(fleet[4], 8, 0, true); // Destroyer at A9-B9
  });

  describe('AI never repeats shots', () => {
    it('should never repeat a shot across multiple moves', () => {
      const shotsTaken = new Set();
      
      // Simulate 50 shots
      for (let i = 0; i < 50; i++) {
        const move = ai.getNextMove(board);
        if (!move) break;
        
        const key = `${move.row},${move.col}`;
        expect(shotsTaken.has(key)).toBe(false);
        shotsTaken.add(key);
        
        // Record the attack
        const result = board.receiveAttack(move.row, move.col);
        ai.recordAttack(move.row, move.col, result);
      }
    });

    it('should track shots in state correctly', () => {
      const move1 = ai.getNextMove(board);
      const result1 = board.receiveAttack(move1.row, move1.col);
      ai.recordAttack(move1.row, move1.col, result1);
      
      const state = ai.getState();
      expect(state.shotsTaken.has(`${move1.row},${move1.col}`)).toBe(true);
    });
  });

  describe('Easy AI - Random shots', () => {
    beforeEach(() => {
      ai = new BattleshipAI(AI_DIFFICULTY.EASY, 12345);
    });

    it('should return valid moves within board bounds', () => {
      for (let i = 0; i < 20; i++) {
        const move = ai.getNextMove(board);
        if (!move) break;
        
        expect(move.row).toBeGreaterThanOrEqual(0);
        expect(move.row).toBeLessThan(GRID_SIZE);
        expect(move.col).toBeGreaterThanOrEqual(0);
        expect(move.col).toBeLessThan(GRID_SIZE);
        
        const result = board.receiveAttack(move.row, move.col);
        ai.recordAttack(move.row, move.col, result);
      }
    });

    it('should have reason indicating random shot', () => {
      const move = ai.getNextMove(board);
      expect(move.reason).toBe('Random shot');
    });
  });

  describe('Normal AI - Hunt/Target mode', () => {
    beforeEach(() => {
      ai = new BattleshipAI(AI_DIFFICULTY.NORMAL, 12345);
    });

    it('should start in hunt mode', () => {
      const state = ai.getState();
      expect(state.mode).toBe(AI_MODES.HUNT);
    });

    it('should switch to target mode after a hit', () => {
      // Find a cell with a ship and simulate hitting it
      const move = { row: 0, col: 0 }; // Carrier is at A1
      const result = board.receiveAttack(move.row, move.col);
      ai.recordAttack(move.row, move.col, result);
      
      const state = ai.getState();
      expect(state.mode).toBe(AI_MODES.TARGET);
    });

    it('should add adjacent cells to target stack after a hit', () => {
      // Hit a cell
      const result = board.receiveAttack(0, 0);
      ai.recordAttack(0, 0, result);
      
      const state = ai.getState();
      expect(state.targetStack.length).toBeGreaterThan(0);
      
      // Check that adjacent cells are in the stack
      const adjacentCells = state.targetStack.map(t => `${t.row},${t.col}`);
      // (0,0) has adjacent cells (0,1) and (1,0)
      expect(adjacentCells.some(c => c === '0,1' || c === '1,0')).toBe(true);
    });

    it('should return to hunt mode after sinking a ship', () => {
      // Sink the destroyer (2 cells at row 8, cols 0-1)
      const result1 = board.receiveAttack(8, 0);
      ai.recordAttack(8, 0, result1);
      
      const result2 = board.receiveAttack(8, 1);
      ai.recordAttack(8, 1, result2);
      
      const state = ai.getState();
      expect(state.mode).toBe(AI_MODES.HUNT);
      expect(state.targetStack.length).toBe(0);
      expect(state.currentHits.length).toBe(0);
    });
  });

  describe('Hard AI - Parity hunting', () => {
    beforeEach(() => {
      ai = new BattleshipAI(AI_DIFFICULTY.HARD, 12345);
    });

    it('should only choose parity cells in hunt mode', () => {
      // Get several moves and check they follow parity pattern
      for (let i = 0; i < 20; i++) {
        const move = ai.getNextMove(board);
        if (!move) break;
        
        const state = ai.getState();
        if (state.mode === AI_MODES.HUNT) {
          // For smallest ship size 2, parity is (row + col) % 2 === 0
          const smallestShip = Math.min(...state.remainingShipSizes);
          const isParity = (move.row + move.col) % smallestShip === 0;
          expect(isParity).toBe(true);
        }
        
        const result = board.receiveAttack(move.row, move.col);
        ai.recordAttack(move.row, move.col, result);
      }
    });

    it('should have reason indicating parity pattern in hunt mode', () => {
      const move = ai.getNextMove(board);
      expect(move.reason).toContain('parity pattern');
    });

    it('should use target mode same as Normal after a hit', () => {
      // Hit a cell
      const result = board.receiveAttack(0, 0);
      ai.recordAttack(0, 0, result);
      
      const state = ai.getState();
      expect(state.mode).toBe(AI_MODES.TARGET);
      expect(state.targetStack.length).toBeGreaterThan(0);
    });
  });

  describe('Line detection and continuation', () => {
    beforeEach(() => {
      ai = new BattleshipAI(AI_DIFFICULTY.NORMAL, 12345);
    });

    it('should detect horizontal line after 2 hits', () => {
      // Hit two adjacent cells horizontally
      const result1 = board.receiveAttack(0, 0);
      ai.recordAttack(0, 0, result1);
      
      const result2 = board.receiveAttack(0, 1);
      ai.recordAttack(0, 1, result2);
      
      const state = ai.getState();
      expect(state.lineDirection).toBe('horizontal');
    });

    it('should detect vertical line after 2 hits', () => {
      // Hit two adjacent cells vertically (need a vertical ship)
      // Place a new board with vertical ship
      const vertBoard = new Board();
      const fleet = createFleet();
      vertBoard.placeShip(fleet[0], 0, 0, false); // Carrier vertical at A1-A5
      
      const result1 = vertBoard.receiveAttack(0, 0);
      ai.recordAttack(0, 0, result1);
      
      const result2 = vertBoard.receiveAttack(1, 0);
      ai.recordAttack(1, 0, result2);
      
      const state = ai.getState();
      expect(state.lineDirection).toBe('vertical');
    });

    it('should prioritize line endpoints after detecting direction', () => {
      // Hit two cells in a line
      const result1 = board.receiveAttack(0, 0);
      ai.recordAttack(0, 0, result1);
      
      const result2 = board.receiveAttack(0, 1);
      ai.recordAttack(0, 1, result2);
      
      const state = ai.getState();
      // Target stack should contain endpoints
      const targets = state.targetStack.map(t => `${t.row},${t.col}`);
      // For horizontal line at (0,0)-(0,1), endpoints are (0,-1) invalid and (0,2)
      expect(targets).toContain('0,2');
    });
  });

  describe('Remaining ships tracking', () => {
    it('should update remaining ship sizes when a ship is sunk', () => {
      ai = new BattleshipAI(AI_DIFFICULTY.NORMAL, 12345);
      
      const initialSizes = [...ai.getState().remainingShipSizes];
      
      // Sink the destroyer (size 2)
      const result1 = board.receiveAttack(8, 0);
      ai.recordAttack(8, 0, result1);
      
      const result2 = board.receiveAttack(8, 1);
      ai.recordAttack(8, 1, result2);
      
      const state = ai.getState();
      expect(state.remainingShipSizes.length).toBe(initialSizes.length - 1);
      expect(state.sunkShips).toContain('Destroyer');
    });
  });

  describe('Reset functionality', () => {
    it('should reset all state correctly', () => {
      ai = new BattleshipAI(AI_DIFFICULTY.NORMAL, 12345);
      
      // Make some moves
      const result = board.receiveAttack(0, 0);
      ai.recordAttack(0, 0, result);
      
      // Reset
      ai.reset();
      
      const state = ai.getState();
      expect(state.mode).toBe(AI_MODES.HUNT);
      expect(state.shotsTaken.size).toBe(0);
      expect(state.hits.length).toBe(0);
      expect(state.misses.length).toBe(0);
      expect(state.targetStack.length).toBe(0);
      expect(state.currentHits.length).toBe(0);
      expect(state.lineDirection).toBeNull();
    });
  });

  describe('Difficulty switching', () => {
    it('should allow changing difficulty', () => {
      ai = new BattleshipAI(AI_DIFFICULTY.EASY, 12345);
      expect(ai.getDifficulty()).toBe(AI_DIFFICULTY.EASY);
      
      ai.setDifficulty(AI_DIFFICULTY.HARD);
      expect(ai.getDifficulty()).toBe(AI_DIFFICULTY.HARD);
    });
  });

  describe('Bounds checking', () => {
    it('should never return moves outside board bounds', () => {
      ai = new BattleshipAI(AI_DIFFICULTY.NORMAL, 12345);
      
      for (let i = 0; i < 100; i++) {
        const move = ai.getNextMove(board);
        if (!move) break;
        
        expect(move.row).toBeGreaterThanOrEqual(0);
        expect(move.row).toBeLessThan(GRID_SIZE);
        expect(move.col).toBeGreaterThanOrEqual(0);
        expect(move.col).toBeLessThan(GRID_SIZE);
        
        const result = board.receiveAttack(move.row, move.col);
        ai.recordAttack(move.row, move.col, result);
      }
    });

    it('should ignore already-shot cells', () => {
      ai = new BattleshipAI(AI_DIFFICULTY.NORMAL, 12345);
      
      // Manually mark some cells as shot
      const state = ai.getState();
      state.shotsTaken.add('0,0');
      state.shotsTaken.add('0,1');
      state.shotsTaken.add('0,2');
      
      // Get next move - should not be any of the marked cells
      for (let i = 0; i < 20; i++) {
        const move = ai.getNextMove(board);
        if (!move) break;
        
        const key = `${move.row},${move.col}`;
        expect(['0,0', '0,1', '0,2']).not.toContain(key);
        
        const result = board.receiveAttack(move.row, move.col);
        ai.recordAttack(move.row, move.col, result);
      }
    });
  });
});
