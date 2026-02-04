import { GRID_SIZE, CELL_STATES } from '../engine/board.js';

export class RandomAI {
  constructor() {
    this.attackedCells = new Set();
  }

  reset() {
    this.attackedCells = new Set();
  }

  getNextMove(playerBoard) {
    const availableCells = [];

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const key = `${row},${col}`;
        if (!this.attackedCells.has(key)) {
          const cell = playerBoard.getCell(row, col);
          if (cell.state !== CELL_STATES.HIT && 
              cell.state !== CELL_STATES.MISS && 
              cell.state !== CELL_STATES.SUNK) {
            availableCells.push({ row, col });
          }
        }
      }
    }

    if (availableCells.length === 0) {
      return null;
    }

    const randomIndex = Math.floor(Math.random() * availableCells.length);
    return availableCells[randomIndex];
  }

  recordAttack(row, col) {
    const key = `${row},${col}`;
    this.attackedCells.add(key);
  }
}
