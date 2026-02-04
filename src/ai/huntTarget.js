import { GRID_SIZE, CELL_STATES } from '../engine/board.js';

export const AI_MODES = {
  HUNT: 'hunt',
  TARGET: 'target',
};

export class HuntTargetAI {
  constructor() {
    this.mode = AI_MODES.HUNT;
    this.targetQueue = [];
    this.attackedCells = new Set();
    this.lastHit = null;
  }

  reset() {
    this.mode = AI_MODES.HUNT;
    this.targetQueue = [];
    this.attackedCells = new Set();
    this.lastHit = null;
  }

  getNextMove(playerBoard) {
    if (this.mode === AI_MODES.TARGET && this.targetQueue.length > 0) {
      return this.getTargetMove(playerBoard);
    }

    this.mode = AI_MODES.HUNT;
    return this.getHuntMove(playerBoard);
  }

  getHuntMove(playerBoard) {
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

  getTargetMove(playerBoard) {
    while (this.targetQueue.length > 0) {
      const target = this.targetQueue.shift();
      const key = `${target.row},${target.col}`;

      if (this.attackedCells.has(key)) {
        continue;
      }

      const cell = playerBoard.getCell(target.row, target.col);
      if (cell.state === CELL_STATES.HIT || 
          cell.state === CELL_STATES.MISS || 
          cell.state === CELL_STATES.SUNK) {
        continue;
      }

      return target;
    }

    this.mode = AI_MODES.HUNT;
    return this.getHuntMove(playerBoard);
  }

  recordAttack(row, col, result) {
    const key = `${row},${col}`;
    this.attackedCells.add(key);

    if (result.result === 'hit') {
      this.lastHit = { row, col };
      this.mode = AI_MODES.TARGET;
      this.addAdjacentCells(row, col);
    } else if (result.result === 'sunk') {
      this.clearTargetsForSunkShip(result.ship);
      
      if (this.targetQueue.length === 0) {
        this.mode = AI_MODES.HUNT;
      }
    }
  }

  addAdjacentCells(row, col) {
    const directions = [
      { row: -1, col: 0 },
      { row: 1, col: 0 },
      { row: 0, col: -1 },
      { row: 0, col: 1 },
    ];

    for (const dir of directions) {
      const newRow = row + dir.row;
      const newCol = col + dir.col;

      if (this.isValidCell(newRow, newCol)) {
        const key = `${newRow},${newCol}`;
        if (!this.attackedCells.has(key)) {
          const alreadyInQueue = this.targetQueue.some(
            t => t.row === newRow && t.col === newCol
          );
          if (!alreadyInQueue) {
            this.targetQueue.push({ row: newRow, col: newCol });
          }
        }
      }
    }
  }

  clearTargetsForSunkShip(ship) {
    if (!ship || !ship.positions) {
      return;
    }

    const sunkPositions = new Set(
      ship.positions.map(pos => `${pos.row},${pos.col}`)
    );

    this.targetQueue = this.targetQueue.filter(target => {
      const isAdjacentToSunk = ship.positions.some(pos => {
        const rowDiff = Math.abs(target.row - pos.row);
        const colDiff = Math.abs(target.col - pos.col);
        return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
      });

      return !isAdjacentToSunk || this.targetQueue.some(t => {
        const key = `${t.row},${t.col}`;
        return !sunkPositions.has(key);
      });
    });
  }

  isValidCell(row, col) {
    return row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE;
  }
}
