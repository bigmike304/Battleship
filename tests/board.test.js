import { describe, it, expect, beforeEach } from 'vitest';
import { Board, GRID_SIZE, CELL_STATES } from '../src/engine/board.js';
import { createShip } from '../src/engine/ship.js';

describe('Board', () => {
  let board;

  beforeEach(() => {
    board = new Board();
  });

  describe('createGrid', () => {
    it('should create a 10x10 grid', () => {
      expect(board.grid.length).toBe(GRID_SIZE);
      expect(board.grid[0].length).toBe(GRID_SIZE);
    });

    it('should initialize all cells as empty', () => {
      for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
          expect(board.grid[row][col].state).toBe(CELL_STATES.EMPTY);
          expect(board.grid[row][col].shipId).toBeNull();
        }
      }
    });
  });

  describe('isValidPlacement', () => {
    it('should allow valid horizontal placement', () => {
      const ship = createShip('Destroyer', 2);
      expect(board.isValidPlacement(ship, 0, 0, true)).toBe(true);
    });

    it('should allow valid vertical placement', () => {
      const ship = createShip('Destroyer', 2);
      expect(board.isValidPlacement(ship, 0, 0, false)).toBe(true);
    });

    it('should reject horizontal placement that exceeds grid bounds', () => {
      const ship = createShip('Carrier', 5);
      expect(board.isValidPlacement(ship, 0, 6, true)).toBe(false);
      expect(board.isValidPlacement(ship, 0, 7, true)).toBe(false);
    });

    it('should reject vertical placement that exceeds grid bounds', () => {
      const ship = createShip('Carrier', 5);
      expect(board.isValidPlacement(ship, 6, 0, false)).toBe(false);
      expect(board.isValidPlacement(ship, 7, 0, false)).toBe(false);
    });

    it('should allow placement at grid edges (horizontal)', () => {
      const ship = createShip('Carrier', 5);
      expect(board.isValidPlacement(ship, 0, 5, true)).toBe(true);
      expect(board.isValidPlacement(ship, 9, 5, true)).toBe(true);
    });

    it('should allow placement at grid edges (vertical)', () => {
      const ship = createShip('Carrier', 5);
      expect(board.isValidPlacement(ship, 5, 0, false)).toBe(true);
      expect(board.isValidPlacement(ship, 5, 9, false)).toBe(true);
    });

    it('should reject placement on occupied cells', () => {
      const ship1 = createShip('Destroyer', 2);
      const ship2 = createShip('Cruiser', 3);
      
      board.placeShip(ship1, 0, 0, true);
      expect(board.isValidPlacement(ship2, 0, 0, false)).toBe(false);
      expect(board.isValidPlacement(ship2, 0, 1, false)).toBe(false);
    });

    it('should allow placement next to existing ships', () => {
      const ship1 = createShip('Destroyer', 2);
      const ship2 = createShip('Cruiser', 3);
      
      board.placeShip(ship1, 0, 0, true);
      expect(board.isValidPlacement(ship2, 1, 0, true)).toBe(true);
    });
  });

  describe('placeShip', () => {
    it('should place ship horizontally and update grid', () => {
      const ship = createShip('Destroyer', 2);
      const result = board.placeShip(ship, 0, 0, true);
      
      expect(result).toBe(true);
      expect(board.grid[0][0].state).toBe(CELL_STATES.SHIP);
      expect(board.grid[0][1].state).toBe(CELL_STATES.SHIP);
      expect(board.grid[0][0].shipId).toBe(ship.id);
      expect(board.grid[0][1].shipId).toBe(ship.id);
    });

    it('should place ship vertically and update grid', () => {
      const ship = createShip('Destroyer', 2);
      const result = board.placeShip(ship, 0, 0, false);
      
      expect(result).toBe(true);
      expect(board.grid[0][0].state).toBe(CELL_STATES.SHIP);
      expect(board.grid[1][0].state).toBe(CELL_STATES.SHIP);
    });

    it('should add ship to ships array', () => {
      const ship = createShip('Destroyer', 2);
      board.placeShip(ship, 0, 0, true);
      
      expect(board.ships.length).toBe(1);
      expect(board.ships[0]).toBe(ship);
    });

    it('should set ship positions correctly', () => {
      const ship = createShip('Cruiser', 3);
      board.placeShip(ship, 2, 3, true);
      
      expect(ship.positions).toEqual([
        { row: 2, col: 3 },
        { row: 2, col: 4 },
        { row: 2, col: 5 },
      ]);
    });

    it('should return false for invalid placement', () => {
      const ship = createShip('Carrier', 5);
      const result = board.placeShip(ship, 0, 8, true);
      
      expect(result).toBe(false);
      expect(board.ships.length).toBe(0);
    });
  });

  describe('receiveAttack', () => {
    it('should register a miss on empty cell', () => {
      const result = board.receiveAttack(0, 0);
      
      expect(result.valid).toBe(true);
      expect(result.result).toBe('miss');
      expect(board.grid[0][0].state).toBe(CELL_STATES.MISS);
    });

    it('should register a hit on ship cell', () => {
      const ship = createShip('Destroyer', 2);
      board.placeShip(ship, 0, 0, true);
      
      const result = board.receiveAttack(0, 0);
      
      expect(result.valid).toBe(true);
      expect(result.result).toBe('hit');
      expect(board.grid[0][0].state).toBe(CELL_STATES.HIT);
    });

    it('should reject attack on already attacked cell', () => {
      board.receiveAttack(0, 0);
      const result = board.receiveAttack(0, 0);
      
      expect(result.valid).toBe(false);
      expect(result.result).toBe('already_attacked');
    });

    it('should sink ship when all cells are hit', () => {
      const ship = createShip('Destroyer', 2);
      board.placeShip(ship, 0, 0, true);
      
      board.receiveAttack(0, 0);
      const result = board.receiveAttack(0, 1);
      
      expect(result.valid).toBe(true);
      expect(result.result).toBe('sunk');
      expect(ship.isSunk).toBe(true);
      expect(board.grid[0][0].state).toBe(CELL_STATES.SUNK);
      expect(board.grid[0][1].state).toBe(CELL_STATES.SUNK);
    });
  });

  describe('allShipsSunk', () => {
    it('should return false when no ships are placed', () => {
      expect(board.allShipsSunk()).toBe(false);
    });

    it('should return false when ships are not sunk', () => {
      const ship = createShip('Destroyer', 2);
      board.placeShip(ship, 0, 0, true);
      
      expect(board.allShipsSunk()).toBe(false);
    });

    it('should return false when some ships are sunk', () => {
      const ship1 = createShip('Destroyer', 2);
      const ship2 = createShip('Cruiser', 3);
      board.placeShip(ship1, 0, 0, true);
      board.placeShip(ship2, 2, 0, true);
      
      board.receiveAttack(0, 0);
      board.receiveAttack(0, 1);
      
      expect(board.allShipsSunk()).toBe(false);
    });

    it('should return true when all ships are sunk', () => {
      const ship1 = createShip('Destroyer', 2);
      const ship2 = createShip('Submarine', 3);
      board.placeShip(ship1, 0, 0, true);
      board.placeShip(ship2, 2, 0, true);
      
      board.receiveAttack(0, 0);
      board.receiveAttack(0, 1);
      board.receiveAttack(2, 0);
      board.receiveAttack(2, 1);
      board.receiveAttack(2, 2);
      
      expect(board.allShipsSunk()).toBe(true);
    });
  });

  describe('corner placements', () => {
    it('should allow placement at top-left corner', () => {
      const ship = createShip('Destroyer', 2);
      expect(board.placeShip(ship, 0, 0, true)).toBe(true);
    });

    it('should allow placement at top-right corner', () => {
      const ship = createShip('Destroyer', 2);
      expect(board.placeShip(ship, 0, 8, true)).toBe(true);
    });

    it('should allow placement at bottom-left corner', () => {
      const ship = createShip('Destroyer', 2);
      expect(board.placeShip(ship, 8, 0, false)).toBe(true);
    });

    it('should allow placement at bottom-right corner', () => {
      const ship = createShip('Destroyer', 2);
      expect(board.placeShip(ship, 9, 8, true)).toBe(true);
    });
  });
});
