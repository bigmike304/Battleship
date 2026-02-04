import { Board, GRID_SIZE } from './board.js';
import { createFleet, resetShipIdCounter } from './ship.js';

export const GAME_STATES = {
  SETUP_PLAYER: 'setup_player',
  SETUP_AI: 'setup_ai',
  PLAYER_TURN: 'player_turn',
  AI_TURN: 'ai_turn',
  GAME_OVER: 'game_over',
};

export class Game {
  constructor() {
    this.playerBoard = new Board();
    this.aiBoard = new Board();
    this.state = GAME_STATES.SETUP_PLAYER;
    this.winner = null;
    this.onMessage = null;
    this.onUpdate = null;
  }

  initialize() {
    resetShipIdCounter();
    this.playerBoard.reset();
    this.aiBoard.reset();
    this.state = GAME_STATES.SETUP_PLAYER;
    this.winner = null;
    this.log('Click "Randomize My Ships" to place your fleet, then "Start Game" to begin.', 'system');
    this.triggerUpdate();
  }

  randomizePlayerShips() {
    if (this.state !== GAME_STATES.SETUP_PLAYER) {
      return false;
    }

    this.playerBoard.reset();
    const playerFleet = createFleet();
    this.placeShipsRandomly(this.playerBoard, playerFleet);
    this.log('Your ships have been placed randomly. Click "Start Game" when ready!', 'system');
    this.triggerUpdate();
    return true;
  }

  startGame() {
    if (this.state !== GAME_STATES.SETUP_PLAYER) {
      return false;
    }

    if (this.playerBoard.ships.length === 0) {
      this.log('Please randomize your ships first!', 'system');
      return false;
    }

    this.state = GAME_STATES.SETUP_AI;
    this.log('AI is placing ships...', 'system');
    this.triggerUpdate();

    const aiFleet = createFleet();
    this.placeShipsRandomly(this.aiBoard, aiFleet);

    this.state = GAME_STATES.PLAYER_TURN;
    this.log('Game started! Click on enemy waters to fire.', 'system');
    this.triggerUpdate();
    return true;
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
    if (this.state !== GAME_STATES.PLAYER_TURN) {
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

    this.state = GAME_STATES.AI_TURN;
    this.triggerUpdate();

    return result;
  }

  aiAttack(row, col) {
    if (this.state !== GAME_STATES.AI_TURN) {
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

    this.state = GAME_STATES.PLAYER_TURN;
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
