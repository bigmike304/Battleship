import { GRID_SIZE, CELL_STATES } from '../engine/board.js';
import { SHIP_TYPES } from '../engine/ship.js';

export const AI_MODES = {
  HUNT: 'hunt',
  TARGET: 'target',
};

export class ProbabilityAI {
  constructor() {
    this.mode = AI_MODES.HUNT;
    this.targetStack = [];
    this.attackedCells = new Set();
    this.currentHits = [];
    this.lineDirection = null;
    this.remainingShips = SHIP_TYPES.map(s => s.length);
  }

  reset() {
    this.mode = AI_MODES.HUNT;
    this.targetStack = [];
    this.attackedCells = new Set();
    this.currentHits = [];
    this.lineDirection = null;
    this.remainingShips = SHIP_TYPES.map(s => s.length);
  }

  getNextMove(playerBoard) {
    if (this.mode === AI_MODES.TARGET && this.targetStack.length > 0) {
      return this.getTargetMove(playerBoard);
    }

    this.mode = AI_MODES.HUNT;
    return this.getHuntMove(playerBoard);
  }

  getHuntMove(playerBoard) {
    const scores = this.computeScoreGrid(playerBoard);
    
    let maxScore = 0;
    let bestCells = [];
    
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const key = `${row},${col}`;
        if (this.attackedCells.has(key)) {
          continue;
        }
        
        if (scores[row][col] > maxScore) {
          maxScore = scores[row][col];
          bestCells = [{ row, col }];
        } else if (scores[row][col] === maxScore && maxScore > 0) {
          bestCells.push({ row, col });
        }
      }
    }
    
    if (bestCells.length === 0) {
      return null;
    }
    
    const randomIndex = Math.floor(Math.random() * bestCells.length);
    return bestCells[randomIndex];
  }

  computeScoreGrid(playerBoard) {
    const scores = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(0));
    
    for (const shipLength of this.remainingShips) {
      for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col <= GRID_SIZE - shipLength; col++) {
          if (this.isValidPlacementForScoring(playerBoard, row, col, shipLength, true)) {
            for (let i = 0; i < shipLength; i++) {
              scores[row][col + i]++;
            }
          }
        }
      }
      
      for (let row = 0; row <= GRID_SIZE - shipLength; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
          if (this.isValidPlacementForScoring(playerBoard, row, col, shipLength, false)) {
            for (let i = 0; i < shipLength; i++) {
              scores[row + i][col]++;
            }
          }
        }
      }
    }
    
    for (const key of this.attackedCells) {
      const [row, col] = key.split(',').map(Number);
      scores[row][col] = 0;
    }
    
    const activeHits = this.findActiveHits(playerBoard);
    if (activeHits.length > 0) {
      this.applyHitBoosts(playerBoard, scores, activeHits);
    }
    
    return scores;
  }

  isValidPlacementForScoring(playerBoard, startRow, startCol, length, isHorizontal) {
    for (let i = 0; i < length; i++) {
      const row = isHorizontal ? startRow : startRow + i;
      const col = isHorizontal ? startCol + i : startCol;
      
      if (row >= GRID_SIZE || col >= GRID_SIZE) {
        return false;
      }
      
      const cell = playerBoard.getCell(row, col);
      if (cell.state === CELL_STATES.MISS || cell.state === CELL_STATES.SUNK) {
        return false;
      }
    }
    return true;
  }

  findActiveHits(playerBoard) {
    const hits = [];
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const cell = playerBoard.getCell(row, col);
        if (cell.state === CELL_STATES.HIT) {
          hits.push({ row, col });
        }
      }
    }
    return hits;
  }

  applyHitBoosts(playerBoard, scores, activeHits) {
    const hitDirection = this.detectHitDirection(activeHits);
    
    for (const shipLength of this.remainingShips) {
      for (const hit of activeHits) {
        if (hitDirection === null || hitDirection === 'horizontal') {
          for (let startCol = Math.max(0, hit.col - shipLength + 1);
               startCol <= Math.min(hit.col, GRID_SIZE - shipLength);
               startCol++) {
            if (this.isValidPlacementForScoring(playerBoard, hit.row, startCol, shipLength, true)) {
              if (this.placementIncludesHit(hit.row, startCol, shipLength, true, activeHits)) {
                for (let i = 0; i < shipLength; i++) {
                  const col = startCol + i;
                  if (!this.attackedCells.has(`${hit.row},${col}`)) {
                    scores[hit.row][col] += 10;
                  }
                }
              }
            }
          }
        }
        
        if (hitDirection === null || hitDirection === 'vertical') {
          for (let startRow = Math.max(0, hit.row - shipLength + 1);
               startRow <= Math.min(hit.row, GRID_SIZE - shipLength);
               startRow++) {
            if (this.isValidPlacementForScoring(playerBoard, startRow, hit.col, shipLength, false)) {
              if (this.placementIncludesHit(startRow, hit.col, shipLength, false, activeHits)) {
                for (let i = 0; i < shipLength; i++) {
                  const row = startRow + i;
                  if (!this.attackedCells.has(`${row},${hit.col}`)) {
                    scores[row][hit.col] += 10;
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  detectHitDirection(activeHits) {
    if (activeHits.length < 2) {
      return null;
    }
    
    const sortedByRow = [...activeHits].sort((a, b) => a.row - b.row || a.col - b.col);
    
    let allSameRow = true;
    let allSameCol = true;
    
    for (let i = 1; i < sortedByRow.length; i++) {
      if (sortedByRow[i].row !== sortedByRow[0].row) {
        allSameRow = false;
      }
      if (sortedByRow[i].col !== sortedByRow[0].col) {
        allSameCol = false;
      }
    }
    
    if (allSameRow && !allSameCol) {
      return 'horizontal';
    }
    if (allSameCol && !allSameRow) {
      return 'vertical';
    }
    
    return null;
  }

  placementIncludesHit(startRow, startCol, length, isHorizontal, activeHits) {
    for (let i = 0; i < length; i++) {
      const row = isHorizontal ? startRow : startRow + i;
      const col = isHorizontal ? startCol + i : startCol;
      
      if (activeHits.some(h => h.row === row && h.col === col)) {
        return true;
      }
    }
    return false;
  }

  getTargetMove(playerBoard) {
    const scores = this.computeScoreGrid(playerBoard);
    
    this.targetStack.sort((a, b) => {
      const scoreA = scores[a.row][a.col];
      const scoreB = scores[b.row][b.col];
      return scoreA - scoreB;
    });
    
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
      if (result.ship) {
        const sunkLength = result.ship.length;
        const idx = this.remainingShips.indexOf(sunkLength);
        if (idx !== -1) {
          this.remainingShips.splice(idx, 1);
        }
      }
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
          this.targetStack.push({ row: firstHit.row, col: firstHit.col - 1 });
        }
      }
      if (this.isValidCell(lastHit.row, lastHit.col + 1)) {
        const key = `${lastHit.row},${lastHit.col + 1}`;
        if (!this.attackedCells.has(key)) {
          this.targetStack.push({ row: lastHit.row, col: lastHit.col + 1 });
        }
      }
    } else {
      if (this.isValidCell(firstHit.row - 1, firstHit.col)) {
        const key = `${firstHit.row - 1},${firstHit.col}`;
        if (!this.attackedCells.has(key)) {
          this.targetStack.push({ row: firstHit.row - 1, col: firstHit.col });
        }
      }
      if (this.isValidCell(lastHit.row + 1, lastHit.col)) {
        const key = `${lastHit.row + 1},${lastHit.col}`;
        if (!this.attackedCells.has(key)) {
          this.targetStack.push({ row: lastHit.row + 1, col: lastHit.col });
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

  getScoreGrid(playerBoard) {
    return this.computeScoreGrid(playerBoard);
  }

  getRemainingShips() {
    return [...this.remainingShips];
  }
}
