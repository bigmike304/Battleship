export const GRID_SIZE = 10;
export const CELL_STATES = {
  EMPTY: 'empty',
  SHIP: 'ship',
  HIT: 'hit',
  MISS: 'miss',
  SUNK: 'sunk',
};

export class Board {
  constructor() {
    this.grid = this.createGrid();
    this.ships = [];
  }

  createGrid() {
    const grid = [];
    for (let row = 0; row < GRID_SIZE; row++) {
      grid[row] = [];
      for (let col = 0; col < GRID_SIZE; col++) {
        grid[row][col] = {
          state: CELL_STATES.EMPTY,
          shipId: null,
        };
      }
    }
    return grid;
  }

  isValidPlacement(ship, startRow, startCol, isHorizontal) {
    const positions = this.getShipPositions(ship.length, startRow, startCol, isHorizontal);
    
    if (!positions) {
      return false;
    }

    for (const pos of positions) {
      if (this.grid[pos.row][pos.col].state !== CELL_STATES.EMPTY) {
        return false;
      }
    }

    return true;
  }

  getShipPositions(length, startRow, startCol, isHorizontal) {
    const positions = [];

    for (let i = 0; i < length; i++) {
      const row = isHorizontal ? startRow : startRow + i;
      const col = isHorizontal ? startCol + i : startCol;

      if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) {
        return null;
      }

      positions.push({ row, col });
    }

    return positions;
  }

  placeShip(ship, startRow, startCol, isHorizontal) {
    if (!this.isValidPlacement(ship, startRow, startCol, isHorizontal)) {
      return false;
    }

    const positions = this.getShipPositions(ship.length, startRow, startCol, isHorizontal);
    
    ship.positions = positions;
    ship.hits = new Set();

    for (const pos of positions) {
      this.grid[pos.row][pos.col] = {
        state: CELL_STATES.SHIP,
        shipId: ship.id,
      };
    }

    this.ships.push(ship);
    return true;
  }

  receiveAttack(row, col) {
    const cell = this.grid[row][col];

    if (cell.state === CELL_STATES.HIT || cell.state === CELL_STATES.MISS || cell.state === CELL_STATES.SUNK) {
      return { valid: false, result: 'already_attacked' };
    }

    if (cell.state === CELL_STATES.SHIP) {
      const ship = this.ships.find(s => s.id === cell.shipId);
      ship.hits.add(`${row},${col}`);
      
      if (this.isShipSunk(ship)) {
        this.markShipAsSunk(ship);
        return { valid: true, result: 'sunk', ship };
      }
      
      this.grid[row][col].state = CELL_STATES.HIT;
      return { valid: true, result: 'hit', ship };
    }

    this.grid[row][col].state = CELL_STATES.MISS;
    return { valid: true, result: 'miss' };
  }

  isShipSunk(ship) {
    return ship.hits.size === ship.length;
  }

  markShipAsSunk(ship) {
    for (const pos of ship.positions) {
      this.grid[pos.row][pos.col].state = CELL_STATES.SUNK;
    }
    ship.isSunk = true;
  }

  allShipsSunk() {
    return this.ships.length > 0 && this.ships.every(ship => ship.isSunk);
  }

  getCell(row, col) {
    return this.grid[row][col];
  }

  reset() {
    this.grid = this.createGrid();
    this.ships = [];
  }
}
