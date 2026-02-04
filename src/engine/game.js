import { Board, GRID_SIZE } from './board.js';
import { createFleet, resetShipIdCounter, SHIP_TYPES } from './ship.js';

// Convert row/col to classic coordinate format (e.g., "B7")
function toClassicCoord(row, col) {
  const colLetter = String.fromCharCode(65 + col); // A-J
  const rowNumber = row + 1; // 1-10
  return `${colLetter}${rowNumber}`;
}

// Placement modes for setup phase
export const PLACEMENT_MODES = {
  NONE: 'none',
  MANUAL: 'manual',
  RANDOM: 'random',
};

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
    this.placementMode = PLACEMENT_MODES.NONE;
    this.winner = null;
    this.onMessage = null;
    this.onUpdate = null;
    // Track ships for manual placement
    this.playerFleet = [];
    this.placedShips = new Set();
  }

  initialize() {
    resetShipIdCounter();
    this.playerBoard.reset();
    this.aiBoard.reset();
    this.state = GAME_STATES.SETUP_PLAYER;
    this.placementMode = PLACEMENT_MODES.NONE;
    this.winner = null;
    this.playerFleet = [];
    this.placedShips = new Set();
    this.log('Choose a placement mode to begin setting up your fleet.', 'system');
    this.triggerUpdate();
  }

  // Set the placement mode (manual or random)
  setPlacementMode(mode) {
    if (this.state !== GAME_STATES.SETUP_PLAYER) {
      return false;
    }
    this.placementMode = mode;
    
    if (mode === PLACEMENT_MODES.MANUAL) {
      // Create fleet for manual placement
      this.playerFleet = createFleet();
      this.placedShips = new Set();
      this.log('Manual placement mode. Select a ship and click on the board to place it.', 'system');
    } else if (mode === PLACEMENT_MODES.RANDOM) {
      this.log('Random placement mode. Click "Randomize My Ships" to place your fleet.', 'system');
    }
    
    this.triggerUpdate();
    return true;
  }

  // Get ships available for manual placement
  getAvailableShips() {
    return this.playerFleet.filter(ship => !this.placedShips.has(ship.id));
  }

  // Get all ships in the fleet (for rendering the tray)
  getFleetShips() {
    return this.playerFleet;
  }

  // Check if a ship has been placed
  isShipPlaced(shipId) {
    return this.placedShips.has(shipId);
  }

  // Place a single ship manually
  placePlayerShip(ship, startRow, startCol, isHorizontal) {
    if (this.state !== GAME_STATES.SETUP_PLAYER || this.placementMode !== PLACEMENT_MODES.MANUAL) {
      return false;
    }

    if (this.placedShips.has(ship.id)) {
      this.log(`${ship.name} has already been placed!`, 'system');
      return false;
    }

    const placed = this.playerBoard.placeShip(ship, startRow, startCol, isHorizontal);
    
    if (placed) {
      this.placedShips.add(ship.id);
      this.log(`${ship.name} placed successfully!`, 'system');
      this.triggerUpdate();
      return true;
    } else {
      this.log('Invalid placement! Ships cannot overlap or go out of bounds.', 'system');
      return false;
    }
  }

  // Check if placement is valid without actually placing
  isValidPlacement(ship, startRow, startCol, isHorizontal) {
    return this.playerBoard.isValidPlacement(ship, startRow, startCol, isHorizontal);
  }

  // Check if all ships have been placed
  allShipsPlaced() {
    return this.placedShips.size === this.playerFleet.length && this.playerFleet.length > 0;
  }

  // Clear all placed ships (for manual placement reset)
  clearPlayerShips() {
    if (this.state !== GAME_STATES.SETUP_PLAYER) {
      return false;
    }
    
    this.playerBoard.reset();
    this.placedShips = new Set();
    
    // Recreate fleet with fresh ships
    resetShipIdCounter();
    this.playerFleet = createFleet();
    
    this.log('All ships cleared. Place your ships again.', 'system');
    this.triggerUpdate();
    return true;
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

    // Check if ships are placed based on placement mode
    if (this.placementMode === PLACEMENT_MODES.MANUAL) {
      if (!this.allShipsPlaced()) {
        this.log('Please place all your ships before starting!', 'system');
        return false;
      }
    } else if (this.playerBoard.ships.length === 0) {
      this.log('Please place your ships first!', 'system');
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
    const coord = toClassicCoord(row, col);

    if (!result.valid) {
      this.log(`You already attacked ${coord}!`, 'system');
      return null;
    }

    if (result.result === 'hit') {
      this.log(`You fired ${coord}: Hit on ${result.ship.name}!`, 'player');
    } else if (result.result === 'sunk') {
      this.log(`You fired ${coord}: Hit! You sunk AI's ${result.ship.name}!`, 'player');
    } else {
      this.log(`You fired ${coord}: Miss`, 'player');
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
    const coord = toClassicCoord(row, col);

    if (!result.valid) {
      return null;
    }

    if (result.result === 'hit') {
      this.log(`AI fired ${coord}: Hit on your ${result.ship.name}!`, 'ai');
    } else if (result.result === 'sunk') {
      this.log(`AI fired ${coord}: Hit! AI sunk your ${result.ship.name}!`, 'ai');
    } else {
      this.log(`AI fired ${coord}: Miss`, 'ai');
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
