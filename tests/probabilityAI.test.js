import { describe, it, expect, beforeEach } from 'vitest';
import { ProbabilityAI, AI_MODES } from '../src/ai/probabilityAI.js';
import { Board, GRID_SIZE, CELL_STATES } from '../src/engine/board.js';
import { createShip, resetShipIdCounter, SHIP_TYPES } from '../src/engine/ship.js';

describe('ProbabilityAI', () => {
  let ai;
  let board;

  beforeEach(() => {
    resetShipIdCounter();
    ai = new ProbabilityAI();
    board = new Board();
  });

  describe('computeScoreGrid', () => {
    it('should assign higher scores to center cells on empty board', () => {
      const scores = ai.computeScoreGrid(board);
      
      const centerScore = scores[5][5];
      const cornerScore = scores[0][0];
      
      expect(centerScore).toBeGreaterThan(cornerScore);
    });

    it('should assign zero scores to already-attacked cells', () => {
      ai.attackedCells.add('5,5');
      board.grid[5][5].state = CELL_STATES.MISS;
      
      const scores = ai.computeScoreGrid(board);
      
      expect(scores[5][5]).toBe(0);
    });

    it('should reduce scores near miss cells', () => {
      const scoresBeforeMiss = ai.computeScoreGrid(board);
      const scoreBefore = scoresBeforeMiss[5][6];
      
      ai.attackedCells.add('5,5');
      board.grid[5][5].state = CELL_STATES.MISS;
      
      const scoresAfterMiss = ai.computeScoreGrid(board);
      const scoreAfter = scoresAfterMiss[5][6];
      
      expect(scoreAfter).toBeLessThan(scoreBefore);
    });

    it('should handle edge cells correctly', () => {
      const scores = ai.computeScoreGrid(board);
      
      expect(scores[0][0]).toBeGreaterThan(0);
      expect(scores[9][9]).toBeGreaterThan(0);
      expect(scores[0][9]).toBeGreaterThan(0);
      expect(scores[9][0]).toBeGreaterThan(0);
    });

    it('should return all zeros when no ships remain', () => {
      ai.remainingShips = [];
      
      const scores = ai.computeScoreGrid(board);
      
      for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
          expect(scores[row][col]).toBe(0);
        }
      }
    });
  });

  describe('hit cluster awareness', () => {
    it('should boost scores adjacent to active hits', () => {
      const ship = createShip('Cruiser', 3);
      board.placeShip(ship, 5, 5, true);
      
      const scoresBeforeHit = ai.computeScoreGrid(board);
      const adjacentScoreBefore = scoresBeforeHit[5][6];
      
      board.receiveAttack(5, 5);
      
      const scoresAfterHit = ai.computeScoreGrid(board);
      const adjacentScoreAfter = scoresAfterHit[5][6];
      
      expect(adjacentScoreAfter).toBeGreaterThan(adjacentScoreBefore);
    });

    it('should detect horizontal hit direction', () => {
      const activeHits = [
        { row: 5, col: 3 },
        { row: 5, col: 4 },
        { row: 5, col: 5 },
      ];
      
      const direction = ai.detectHitDirection(activeHits);
      
      expect(direction).toBe('horizontal');
    });

    it('should detect vertical hit direction', () => {
      const activeHits = [
        { row: 3, col: 5 },
        { row: 4, col: 5 },
        { row: 5, col: 5 },
      ];
      
      const direction = ai.detectHitDirection(activeHits);
      
      expect(direction).toBe('vertical');
    });

    it('should return null for single hit', () => {
      const activeHits = [{ row: 5, col: 5 }];
      
      const direction = ai.detectHitDirection(activeHits);
      
      expect(direction).toBeNull();
    });

    it('should return null for scattered hits', () => {
      const activeHits = [
        { row: 2, col: 3 },
        { row: 5, col: 7 },
      ];
      
      const direction = ai.detectHitDirection(activeHits);
      
      expect(direction).toBeNull();
    });
  });

  describe('remaining ships tracking', () => {
    it('should initialize with all ship lengths', () => {
      const expectedLengths = SHIP_TYPES.map(s => s.length);
      
      expect(ai.remainingShips).toEqual(expectedLengths);
    });

    it('should remove ship length when sunk', () => {
      const ship = createShip('Destroyer', 2);
      board.placeShip(ship, 0, 0, true);
      
      const hit1 = board.receiveAttack(0, 0);
      ai.recordAttack(0, 0, hit1);
      
      const sunk = board.receiveAttack(0, 1);
      ai.recordAttack(0, 1, sunk);
      
      expect(ai.remainingShips).not.toContain(2);
      expect(ai.remainingShips.length).toBe(4);
    });

    it('should compute scores based only on remaining ships', () => {
      ai.remainingShips = [2];
      
      const scores = ai.computeScoreGrid(board);
      
      const maxPossibleScore = 2 * 2;
      for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
          expect(scores[row][col]).toBeLessThanOrEqual(maxPossibleScore);
        }
      }
    });

    it('should reset remaining ships on reset', () => {
      ai.remainingShips = [2];
      
      ai.reset();
      
      expect(ai.remainingShips).toEqual(SHIP_TYPES.map(s => s.length));
    });
  });

  describe('AI never repeats shots', () => {
    it('should never return the same cell twice across multiple moves', () => {
      const attackedCells = new Set();
      
      for (let i = 0; i < 100; i++) {
        const move = ai.getNextMove(board);
        if (!move) break;
        
        const key = `${move.row},${move.col}`;
        expect(attackedCells.has(key)).toBe(false);
        
        attackedCells.add(key);
        ai.recordAttack(move.row, move.col, { result: 'miss' });
        board.grid[move.row][move.col].state = CELL_STATES.MISS;
      }
    });

    it('should track attacked cells correctly after hits', () => {
      const ship = createShip('Destroyer', 2);
      board.placeShip(ship, 0, 0, true);
      
      const attackedCells = new Set();
      
      for (let i = 0; i < 50; i++) {
        const move = ai.getNextMove(board);
        if (!move) break;
        
        const key = `${move.row},${move.col}`;
        expect(attackedCells.has(key)).toBe(false);
        
        attackedCells.add(key);
        const result = board.receiveAttack(move.row, move.col);
        ai.recordAttack(move.row, move.col, result);
      }
    });
  });

  describe('target mode with probability', () => {
    it('should switch to TARGET mode after a hit', () => {
      const ship = createShip('Destroyer', 2);
      board.placeShip(ship, 0, 0, true);
      
      expect(ai.mode).toBe(AI_MODES.HUNT);
      
      const result = board.receiveAttack(0, 0);
      ai.recordAttack(0, 0, result);
      
      expect(ai.mode).toBe(AI_MODES.TARGET);
    });

    it('should add adjacent cells to target stack after a hit', () => {
      const ship = createShip('Destroyer', 2);
      board.placeShip(ship, 5, 5, true);
      
      const result = board.receiveAttack(5, 5);
      ai.recordAttack(5, 5, result);
      
      expect(ai.targetStack.length).toBeGreaterThan(0);
    });

    it('should return to HUNT mode after sinking a ship', () => {
      const ship = createShip('Destroyer', 2);
      board.placeShip(ship, 0, 0, true);
      
      const hit1 = board.receiveAttack(0, 0);
      ai.recordAttack(0, 0, hit1);
      expect(ai.mode).toBe(AI_MODES.TARGET);
      
      const sunk = board.receiveAttack(0, 1);
      ai.recordAttack(0, 1, sunk);
      
      expect(ai.mode).toBe(AI_MODES.HUNT);
    });

    it('should sort target stack by probability score', () => {
      const ship = createShip('Cruiser', 3);
      board.placeShip(ship, 5, 5, true);
      
      const result = board.receiveAttack(5, 5);
      ai.recordAttack(5, 5, result);
      
      const nextMove = ai.getNextMove(board);
      
      const isAdjacent = 
        (nextMove.row === 4 && nextMove.col === 5) ||
        (nextMove.row === 6 && nextMove.col === 5) ||
        (nextMove.row === 5 && nextMove.col === 4) ||
        (nextMove.row === 5 && nextMove.col === 6);
      
      expect(isAdjacent).toBe(true);
    });
  });

  describe('hunt mode uses probability', () => {
    it('should prefer higher probability cells', () => {
      for (let row = 0; row < 5; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
          ai.attackedCells.add(`${row},${col}`);
          board.grid[row][col].state = CELL_STATES.MISS;
        }
      }
      
      const move = ai.getNextMove(board);
      
      expect(move.row).toBeGreaterThanOrEqual(5);
    });

    it('should return null when all cells attacked', () => {
      for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
          ai.attackedCells.add(`${row},${col}`);
          board.grid[row][col].state = CELL_STATES.MISS;
        }
      }
      
      const move = ai.getNextMove(board);
      
      expect(move).toBeNull();
    });
  });

  describe('getScoreGrid and getRemainingShips helpers', () => {
    it('should expose score grid for debugging', () => {
      const scores = ai.getScoreGrid(board);
      
      expect(scores.length).toBe(GRID_SIZE);
      expect(scores[0].length).toBe(GRID_SIZE);
    });

    it('should expose remaining ships for debugging', () => {
      const ships = ai.getRemainingShips();
      
      expect(ships).toEqual(SHIP_TYPES.map(s => s.length));
      
      ships.push(10);
      expect(ai.remainingShips).not.toContain(10);
    });
  });
});
