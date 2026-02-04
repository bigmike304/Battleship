import { describe, it, expect, beforeEach } from 'vitest';
import { HuntTargetAI, AI_MODES } from '../src/ai/huntTarget.js';
import { Board, GRID_SIZE, CELL_STATES } from '../src/engine/board.js';
import { createShip, resetShipIdCounter } from '../src/engine/ship.js';

describe('HuntTargetAI', () => {
  let ai;
  let board;

  beforeEach(() => {
    resetShipIdCounter();
    ai = new HuntTargetAI();
    board = new Board();
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

    it('should never repeat shots even when switching between hunt and target modes', () => {
      const ship = createShip('Cruiser', 3);
      board.placeShip(ship, 5, 5, true);
      
      const attackedCells = new Set();
      
      for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
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

  describe('Target mode chooses adjacent cells after a hit', () => {
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
      
      const adjacentCells = [
        { row: 4, col: 5 },
        { row: 6, col: 5 },
        { row: 5, col: 4 },
        { row: 5, col: 6 },
      ];
      
      for (const adjacent of adjacentCells) {
        const inStack = ai.targetStack.some(
          t => t.row === adjacent.row && t.col === adjacent.col
        );
        expect(inStack).toBe(true);
      }
    });

    it('should choose from target stack when in TARGET mode', () => {
      const ship = createShip('Cruiser', 3);
      board.placeShip(ship, 5, 5, true);
      
      const hitResult = board.receiveAttack(5, 5);
      ai.recordAttack(5, 5, hitResult);
      
      const nextMove = ai.getNextMove(board);
      
      const isAdjacent = 
        (nextMove.row === 4 && nextMove.col === 5) ||
        (nextMove.row === 6 && nextMove.col === 5) ||
        (nextMove.row === 5 && nextMove.col === 4) ||
        (nextMove.row === 5 && nextMove.col === 6);
      
      expect(isAdjacent).toBe(true);
    });

    it('should prioritize line continuation after two hits in a row', () => {
      const ship = createShip('Cruiser', 3);
      board.placeShip(ship, 5, 5, true);
      
      const hit1 = board.receiveAttack(5, 5);
      ai.recordAttack(5, 5, hit1);
      
      const hit2 = board.receiveAttack(5, 6);
      ai.recordAttack(5, 6, hit2);
      
      expect(ai.lineDirection).toBe('horizontal');
      
      const nextMove = ai.getNextMove(board);
      
      const isOnLine = 
        (nextMove.row === 5 && nextMove.col === 4) ||
        (nextMove.row === 5 && nextMove.col === 7);
      
      expect(isOnLine).toBe(true);
    });

    it('should detect vertical line direction', () => {
      const ship = createShip('Cruiser', 3);
      board.placeShip(ship, 5, 5, false);
      
      const hit1 = board.receiveAttack(5, 5);
      ai.recordAttack(5, 5, hit1);
      
      const hit2 = board.receiveAttack(6, 5);
      ai.recordAttack(6, 5, hit2);
      
      expect(ai.lineDirection).toBe('vertical');
      
      const nextMove = ai.getNextMove(board);
      
      const isOnLine = 
        (nextMove.row === 4 && nextMove.col === 5) ||
        (nextMove.row === 7 && nextMove.col === 5);
      
      expect(isOnLine).toBe(true);
    });
  });

  describe('Hunt mode uses parity pattern', () => {
    it('should prefer checkerboard cells in hunt mode', () => {
      const moves = [];
      
      for (let i = 0; i < 20; i++) {
        const move = ai.getNextMove(board);
        if (!move) break;
        
        moves.push(move);
        ai.recordAttack(move.row, move.col, { result: 'miss' });
        board.grid[move.row][move.col].state = CELL_STATES.MISS;
      }
      
      const parityMoves = moves.filter(m => (m.row + m.col) % 2 === 0);
      expect(parityMoves.length).toBe(moves.length);
    });

    it('should fall back to non-parity cells when parity cells exhausted', () => {
      for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
          if ((row + col) % 2 === 0) {
            ai.attackedCells.add(`${row},${col}`);
            board.grid[row][col].state = CELL_STATES.MISS;
          }
        }
      }
      
      const move = ai.getNextMove(board);
      expect(move).not.toBeNull();
      expect((move.row + move.col) % 2).toBe(1);
    });
  });

  describe('Clear target context when ship is sunk', () => {
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

    it('should clear target stack after sinking a ship', () => {
      const ship = createShip('Destroyer', 2);
      board.placeShip(ship, 5, 5, true);
      
      const hit1 = board.receiveAttack(5, 5);
      ai.recordAttack(5, 5, hit1);
      expect(ai.targetStack.length).toBeGreaterThan(0);
      
      const sunk = board.receiveAttack(5, 6);
      ai.recordAttack(5, 6, sunk);
      
      expect(ai.targetStack.length).toBe(0);
    });

    it('should clear current hits after sinking a ship', () => {
      const ship = createShip('Destroyer', 2);
      board.placeShip(ship, 0, 0, true);
      
      const hit1 = board.receiveAttack(0, 0);
      ai.recordAttack(0, 0, hit1);
      expect(ai.currentHits.length).toBe(1);
      
      const sunk = board.receiveAttack(0, 1);
      ai.recordAttack(0, 1, sunk);
      
      expect(ai.currentHits.length).toBe(0);
    });

    it('should clear line direction after sinking a ship', () => {
      const ship = createShip('Cruiser', 3);
      board.placeShip(ship, 0, 0, true);
      
      const hit1 = board.receiveAttack(0, 0);
      ai.recordAttack(0, 0, hit1);
      
      const hit2 = board.receiveAttack(0, 1);
      ai.recordAttack(0, 1, hit2);
      expect(ai.lineDirection).toBe('horizontal');
      
      const sunk = board.receiveAttack(0, 2);
      ai.recordAttack(0, 2, sunk);
      
      expect(ai.lineDirection).toBeNull();
    });
  });

  describe('Edge cases', () => {
    it('should handle hits at board edges correctly', () => {
      const ship = createShip('Destroyer', 2);
      board.placeShip(ship, 0, 0, true);
      
      const hit = board.receiveAttack(0, 0);
      ai.recordAttack(0, 0, hit);
      
      const validTargets = ai.targetStack.filter(t => 
        t.row >= 0 && t.row < GRID_SIZE && t.col >= 0 && t.col < GRID_SIZE
      );
      expect(validTargets.length).toBe(ai.targetStack.length);
    });

    it('should handle corner hits correctly', () => {
      const ship = createShip('Destroyer', 2);
      board.placeShip(ship, 9, 8, true);
      
      const hit = board.receiveAttack(9, 9);
      ai.recordAttack(9, 9, hit);
      
      expect(ai.targetStack.length).toBe(2);
    });
  });
});
