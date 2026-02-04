import { GRID_SIZE, CELL_STATES } from '../engine/board.js';

export const AI_MODES = {
  HUNT: 'hunt',
  TARGET: 'target',
};

export class HuntTargetAI {
  constructor() {
    this.mode = AI_MODES.HUNT;
    this.targetStack = [];
    this.attackedCells = new Set();
    this.currentHits = [];
    this.lineDirection = null;
  }

  reset() {
    this.mode = AI_MODES.HUNT;
    this.targetStack = [];
    this.attackedCells = new Set();
    this.currentHits = [];
    this.lineDirection = null;
  }

  getNextMove(playerBoard) {
    if (this.mode === AI_MODES.TARGET && this.targetStack.length > 0) {
      return this.getTargetMove(playerBoard);
    }

    this.mode = AI_MODES.HUNT;
    return this.getHuntMove(playerBoard);
  }

  getHuntMove(playerBoard) {
    const parityCells = [];
    const nonParityCells = [];

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const key = `${row},${col}`;
        if (!this.attackedCells.has(key)) {
          const cell = playerBoard.getCell(row, col);
          if (cell.state !== CELL_STATES.HIT && 
              cell.state !== CELL_STATES.MISS && 
              cell.state !== CELL_STATES.SUNK) {
            if ((row + col) % 2 === 0) {
              parityCells.push({ row, col });
            } else {
              nonParityCells.push({ row, col });
            }
          }
        }
      }
    }

    if (parityCells.length > 0) {
      const randomIndex = Math.floor(Math.random() * parityCells.length);
      return parityCells[randomIndex];
    }

    if (nonParityCells.length > 0) {
      const randomIndex = Math.floor(Math.random() * nonParityCells.length);
      return nonParityCells[randomIndex];
    }

    return null;
  }

  getTargetMove(playerBoard) {
    while (this.targetStack.length > 0) {
      const target = this.targetStack.pop();
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
      this.currentHits.push({ row, col });
      this.mode = AI_MODES.TARGET;
      
      if (this.currentHits.length >= 2) {
        this.detectAndPrioritizeLine();
      } else {
        this.addAdjacentCells(row, col);
      }
    } else if (result.result === 'sunk') {
      this.clearTargetContext();
    }
  }

  detectAndPrioritizeLine() {
    if (this.currentHits.length < 2) {
      return;
    }

    const first = this.currentHits[0];
    const second = this.currentHits[1];

    if (first.row === second.row) {
      this.lineDirection = 'horizontal';
    } else if (first.col === second.col) {
      this.lineDirection = 'vertical';
    } else {
      return;
    }

    this.targetStack = [];

    const sortedHits = [...this.currentHits].sort((a, b) => {
      if (this.lineDirection === 'horizontal') {
        return a.col - b.col;
      }
      return a.row - b.row;
    });

    const firstHit = sortedHits[0];
    const lastHit = sortedHits[sortedHits.length - 1];

    if (this.lineDirection === 'horizontal') {
      if (this.isValidCell(firstHit.row, firstHit.col - 1)) {
        const key = `${firstHit.row},${firstHit.col - 1}`;
        if (!this.attackedCells.has(key)) {
          this.targetStack.push({ row: firstHit.row, col: firstHit.col - 1, priority: 'high' });
        }
      }
      if (this.isValidCell(lastHit.row, lastHit.col + 1)) {
        const key = `${lastHit.row},${lastHit.col + 1}`;
        if (!this.attackedCells.has(key)) {
          this.targetStack.push({ row: lastHit.row, col: lastHit.col + 1, priority: 'high' });
        }
      }
    } else {
      if (this.isValidCell(firstHit.row - 1, firstHit.col)) {
        const key = `${firstHit.row - 1},${firstHit.col}`;
        if (!this.attackedCells.has(key)) {
          this.targetStack.push({ row: firstHit.row - 1, col: firstHit.col, priority: 'high' });
        }
      }
      if (this.isValidCell(lastHit.row + 1, lastHit.col)) {
        const key = `${lastHit.row + 1},${lastHit.col}`;
        if (!this.attackedCells.has(key)) {
          this.targetStack.push({ row: lastHit.row + 1, col: lastHit.col, priority: 'high' });
        }
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
          const alreadyInStack = this.targetStack.some(
            t => t.row === newRow && t.col === newCol
          );
          if (!alreadyInStack) {
            this.targetStack.push({ row: newRow, col: newCol });
          }
        }
      }
    }
  }

  clearTargetContext() {
    this.targetStack = [];
    this.currentHits = [];
    this.lineDirection = null;
    this.mode = AI_MODES.HUNT;
  }

  isValidCell(row, col) {
    return row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE;
  }
}
