import { Board, GRID_SIZE } from './board.js';
import { createFleet, resetShipIdCounter } from './ship.js';

export const GAME_STATES = {
  SETUP: 'setup',
  PLAYING: 'playing',
  GAME_OVER: 'game_over',
};

export class Game {
  constructor() {
    this.playerBoard = new Board();
    this.aiBoard = new Board();
    this.state = GAME_STATES.SETUP;
    this.isPlayerTurn = true;
    this.winner = null;
    this.onMessage = null;
    this.onUpdate = null;
  }

  initialize() {
    resetShipIdCounter();
    this.playerBoard.reset();
    this.aiBoard.reset();
    this.state = GAME_STATES.SETUP;
    this.isPlayerTurn = true;
    this.winner = null;

    const playerFleet = createFleet();
    const aiFleet = createFleet();

    this.placeShipsRandomly(this.playerBoard, playerFleet);
    this.placeShipsRandomly(this.aiBoard, aiFleet);

    this.state = GAME_STATES.PLAYING;
    this.log('Game started! Click on enemy waters to fire.', 'system');
  }

  placeShipsRandomly(board, fleet) {
    for (const ship of fleet) {
      let placed = false;
      let attempts = 0;
      const maxAttempts = 100;

      while (!placed && attempts < maxAttempts) {
        const isHorizontal = Math.random() < 0.5;
        const maxRow = isHorizontal ? GRID_SIZE : GRID_SIZE - ship.length;
        const maxCol = isHorizontal ? GRID_SIZE - ship.length : GRID_SIZE;
        
        const startRow = Math.floor(Math.random() * maxRow);
        const startCol = Math.floor(Math.random() * maxCol);

        placed = board.placeShip(ship, startRow, startCol, isHorizontal);
        attempts++;
      }

      if (!placed) {
        throw new Error(`Failed to place ship: ${ship.name}`);
      }
    }
  }

  playerAttack(row, col) {
    if (this.state !== GAME_STATES.PLAYING || !this.isPlayerTurn) {
      return null;
    }

    const result = this.aiBoard.receiveAttack(row, col);

    if (!result.valid) {
      this.log('You already attacked that cell!', 'system');
      return null;
    }

    if (result.result === 'hit') {
      this.log(`You hit the enemy's ${result.ship.name}!`, 'player');
    } else if (result.result === 'sunk') {
      this.log(`You sunk the enemy's ${result.ship.name}!`, 'player');
    } else {
      this.log('You missed!', 'player');
    }

    if (this.aiBoard.allShipsSunk()) {
      this.endGame('player');
      return result;
    }

    this.isPlayerTurn = false;
    this.triggerUpdate();

    return result;
  }

  aiAttack(row, col) {
    if (this.state !== GAME_STATES.PLAYING || this.isPlayerTurn) {
      return null;
    }

    const result = this.playerBoard.receiveAttack(row, col);

    if (!result.valid) {
      return null;
    }

    if (result.result === 'hit') {
      this.log(`Enemy hit your ${result.ship.name}!`, 'ai');
    } else if (result.result === 'sunk') {
      this.log(`Enemy sunk your ${result.ship.name}!`, 'ai');
    } else {
      this.log('Enemy missed!', 'ai');
    }

    if (this.playerBoard.allShipsSunk()) {
      this.endGame('ai');
      return result;
    }

    this.isPlayerTurn = true;
    this.triggerUpdate();

    return result;
  }

  endGame(winner) {
    this.state = GAME_STATES.GAME_OVER;
    this.winner = winner;

    if (winner === 'player') {
      this.log('Congratulations! You won the battle!', 'system');
    } else {
      this.log('Game Over! The enemy has destroyed your fleet.', 'system');
    }

    this.triggerUpdate();
  }

  log(message, type) {
    if (this.onMessage) {
      this.onMessage(message, type);
    }
  }

  triggerUpdate() {
    if (this.onUpdate) {
      this.onUpdate();
    }
  }

  restart() {
    this.initialize();
    this.triggerUpdate();
  }
}
