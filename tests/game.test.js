import { describe, it, expect, beforeEach } from 'vitest';
import { Game, GAME_STATES, PLACEMENT_MODES } from '../src/engine/game.js';
import { Board, CELL_STATES } from '../src/engine/board.js';
import { createShip, resetShipIdCounter } from '../src/engine/ship.js';

describe('Game', () => {
  let game;

  beforeEach(() => {
    resetShipIdCounter();
    game = new Game();
  });

  describe('initialize', () => {
    it('should set game state to SETUP_PLAYER after initialization', () => {
      game.initialize();
      expect(game.state).toBe(GAME_STATES.SETUP_PLAYER);
    });

    it('should have empty player board initially', () => {
      game.initialize();
      expect(game.playerBoard.ships.length).toBe(0);
    });

    it('should have empty AI board initially', () => {
      game.initialize();
      expect(game.aiBoard.ships.length).toBe(0);
    });

    it('should have no winner initially', () => {
      game.initialize();
      expect(game.winner).toBeNull();
    });
  });

  describe('randomizePlayerShips', () => {
    beforeEach(() => {
      game.initialize();
    });

    it('should place 5 ships on player board', () => {
      game.randomizePlayerShips();
      expect(game.playerBoard.ships.length).toBe(5);
    });

    it('should return true when in SETUP_PLAYER state', () => {
      const result = game.randomizePlayerShips();
      expect(result).toBe(true);
    });

    it('should return false when not in SETUP_PLAYER state', () => {
      game.state = GAME_STATES.PLAYER_TURN;
      const result = game.randomizePlayerShips();
      expect(result).toBe(false);
    });
  });

  describe('startGame', () => {
    beforeEach(() => {
      game.initialize();
    });

    it('should return false if player ships not placed', () => {
      const result = game.startGame();
      expect(result).toBe(false);
    });

    it('should set state to PLAYER_TURN after starting', () => {
      game.randomizePlayerShips();
      game.startGame();
      expect(game.state).toBe(GAME_STATES.PLAYER_TURN);
    });

    it('should place 5 ships on AI board', () => {
      game.randomizePlayerShips();
      game.startGame();
      expect(game.aiBoard.ships.length).toBe(5);
    });
  });

  describe('playerAttack', () => {
    beforeEach(() => {
      game.initialize();
      game.randomizePlayerShips();
      game.startGame();
    });

    it('should return null when not player turn', () => {
      game.state = GAME_STATES.AI_TURN;
      const result = game.playerAttack(0, 0);
      expect(result).toBeNull();
    });

    it('should return null when game is not in PLAYER_TURN state', () => {
      game.state = GAME_STATES.GAME_OVER;
      const result = game.playerAttack(0, 0);
      expect(result).toBeNull();
    });

    it('should switch state to AI_TURN after valid attack', () => {
      game.playerAttack(0, 0);
      expect(game.state).toBe(GAME_STATES.AI_TURN);
    });
  });

  describe('aiAttack', () => {
    beforeEach(() => {
      game.initialize();
      game.randomizePlayerShips();
      game.startGame();
      game.state = GAME_STATES.AI_TURN;
    });

    it('should return null when it is player turn', () => {
      game.state = GAME_STATES.PLAYER_TURN;
      const result = game.aiAttack(0, 0);
      expect(result).toBeNull();
    });

    it('should switch state to PLAYER_TURN after valid attack', () => {
      game.aiAttack(0, 0);
      expect(game.state).toBe(GAME_STATES.PLAYER_TURN);
    });
  });

  describe('win detection', () => {
    it('should detect player win when all AI ships are sunk', () => {
      game.initialize();
      game.randomizePlayerShips();
      game.startGame();
      
      for (const ship of game.aiBoard.ships) {
        for (const pos of ship.positions) {
          game.playerAttack(pos.row, pos.col);
          if (game.state !== GAME_STATES.GAME_OVER) {
            game.state = GAME_STATES.PLAYER_TURN;
          }
        }
      }

      expect(game.state).toBe(GAME_STATES.GAME_OVER);
      expect(game.winner).toBe('player');
    });

    it('should detect AI win when all player ships are sunk', () => {
      game.initialize();
      game.randomizePlayerShips();
      game.startGame();
      game.state = GAME_STATES.AI_TURN;
      
      for (const ship of game.playerBoard.ships) {
        for (const pos of ship.positions) {
          game.aiAttack(pos.row, pos.col);
          if (game.state !== GAME_STATES.GAME_OVER) {
            game.state = GAME_STATES.AI_TURN;
          }
        }
      }

      expect(game.state).toBe(GAME_STATES.GAME_OVER);
      expect(game.winner).toBe('ai');
    });

    it('should require exactly 17 hits to win (5+4+3+3+2)', () => {
      game.initialize();
      game.randomizePlayerShips();
      game.startGame();
      
      let hitCount = 0;
      for (const ship of game.aiBoard.ships) {
        for (const pos of ship.positions) {
          game.playerAttack(pos.row, pos.col);
          hitCount++;
          if (game.state !== GAME_STATES.GAME_OVER) {
            game.state = GAME_STATES.PLAYER_TURN;
          }
        }
      }

      expect(hitCount).toBe(17);
      expect(game.state).toBe(GAME_STATES.GAME_OVER);
    });
  });

  describe('restart', () => {
    it('should reset game state to SETUP_PLAYER', () => {
      game.initialize();
      game.randomizePlayerShips();
      game.startGame();
      game.state = GAME_STATES.GAME_OVER;
      game.restart();
      expect(game.state).toBe(GAME_STATES.SETUP_PLAYER);
    });

    it('should reset winner to null', () => {
      game.initialize();
      game.winner = 'player';
      game.restart();
      expect(game.winner).toBeNull();
    });

    it('should clear ships from both boards', () => {
      game.initialize();
      game.randomizePlayerShips();
      game.startGame();
      
      game.restart();
      
      expect(game.playerBoard.ships.length).toBe(0);
      expect(game.aiBoard.ships.length).toBe(0);
    });
  });
});

describe('Board win detection edge cases', () => {
  let board;

  beforeEach(() => {
    resetShipIdCounter();
    board = new Board();
  });

  it('should not report all ships sunk with partial hits', () => {
    const ship1 = createShip('Destroyer', 2);
    const ship2 = createShip('Cruiser', 3);
    
    board.placeShip(ship1, 0, 0, true);
    board.placeShip(ship2, 2, 0, true);
    
    board.receiveAttack(0, 0);
    board.receiveAttack(0, 1);
    board.receiveAttack(2, 0);
    
    expect(board.allShipsSunk()).toBe(false);
  });

  it('should handle sinking ships in any order', () => {
    const ship1 = createShip('Destroyer', 2);
    const ship2 = createShip('Cruiser', 3);
    
    board.placeShip(ship1, 0, 0, true);
    board.placeShip(ship2, 2, 0, true);
    
    board.receiveAttack(2, 0);
    board.receiveAttack(2, 1);
    board.receiveAttack(2, 2);
    
    expect(board.allShipsSunk()).toBe(false);
    
    board.receiveAttack(0, 0);
    board.receiveAttack(0, 1);
    
    expect(board.allShipsSunk()).toBe(true);
  });

  it('should correctly track hits across multiple ships', () => {
    const ship1 = createShip('Destroyer', 2);
    const ship2 = createShip('Submarine', 3);
    const ship3 = createShip('Battleship', 4);
    
    board.placeShip(ship1, 0, 0, true);
    board.placeShip(ship2, 2, 0, true);
    board.placeShip(ship3, 4, 0, true);
    
    board.receiveAttack(0, 0);
    board.receiveAttack(2, 0);
    board.receiveAttack(4, 0);
    
    expect(ship1.hits.size).toBe(1);
    expect(ship2.hits.size).toBe(1);
    expect(ship3.hits.size).toBe(1);
    expect(board.allShipsSunk()).toBe(false);
  });
});

describe('Placement mode transitions', () => {
  let game;

  beforeEach(() => {
    resetShipIdCounter();
    game = new Game();
    game.initialize();
  });

  describe('setPlacementMode', () => {
    it('should set placement mode to MANUAL', () => {
      const result = game.setPlacementMode(PLACEMENT_MODES.MANUAL);
      expect(result).toBe(true);
      expect(game.placementMode).toBe(PLACEMENT_MODES.MANUAL);
    });

    it('should set placement mode to RANDOM', () => {
      const result = game.setPlacementMode(PLACEMENT_MODES.RANDOM);
      expect(result).toBe(true);
      expect(game.placementMode).toBe(PLACEMENT_MODES.RANDOM);
    });

    it('should create fleet when setting MANUAL mode', () => {
      game.setPlacementMode(PLACEMENT_MODES.MANUAL);
      expect(game.playerFleet.length).toBe(5);
      expect(game.placedShips.size).toBe(0);
    });

    it('should return false when not in SETUP_PLAYER state', () => {
      game.state = GAME_STATES.PLAYER_TURN;
      const result = game.setPlacementMode(PLACEMENT_MODES.MANUAL);
      expect(result).toBe(false);
    });
  });

  describe('resetPlacementMode', () => {
    it('should reset placement mode from MANUAL to NONE', () => {
      game.setPlacementMode(PLACEMENT_MODES.MANUAL);
      expect(game.placementMode).toBe(PLACEMENT_MODES.MANUAL);
      
      const result = game.resetPlacementMode();
      expect(result).toBe(true);
      expect(game.placementMode).toBe(PLACEMENT_MODES.NONE);
    });

    it('should reset placement mode from RANDOM to NONE', () => {
      game.setPlacementMode(PLACEMENT_MODES.RANDOM);
      expect(game.placementMode).toBe(PLACEMENT_MODES.RANDOM);
      
      const result = game.resetPlacementMode();
      expect(result).toBe(true);
      expect(game.placementMode).toBe(PLACEMENT_MODES.NONE);
    });

    it('should clear player board when resetting from MANUAL mode', () => {
      game.setPlacementMode(PLACEMENT_MODES.MANUAL);
      const ship = game.playerFleet[0];
      game.placePlayerShip(ship, 0, 0, true);
      expect(game.playerBoard.ships.length).toBe(1);
      
      game.resetPlacementMode();
      expect(game.playerBoard.ships.length).toBe(0);
    });

    it('should clear player board when resetting from RANDOM mode', () => {
      game.setPlacementMode(PLACEMENT_MODES.RANDOM);
      game.randomizePlayerShips();
      expect(game.playerBoard.ships.length).toBe(5);
      
      game.resetPlacementMode();
      expect(game.playerBoard.ships.length).toBe(0);
    });

    it('should clear placed ships set when resetting', () => {
      game.setPlacementMode(PLACEMENT_MODES.MANUAL);
      const ship = game.playerFleet[0];
      game.placePlayerShip(ship, 0, 0, true);
      expect(game.placedShips.size).toBe(1);
      
      game.resetPlacementMode();
      expect(game.placedShips.size).toBe(0);
    });

    it('should clear player fleet when resetting', () => {
      game.setPlacementMode(PLACEMENT_MODES.MANUAL);
      expect(game.playerFleet.length).toBe(5);
      
      game.resetPlacementMode();
      expect(game.playerFleet.length).toBe(0);
    });

    it('should return false when not in SETUP_PLAYER state', () => {
      game.setPlacementMode(PLACEMENT_MODES.MANUAL);
      game.state = GAME_STATES.PLAYER_TURN;
      
      const result = game.resetPlacementMode();
      expect(result).toBe(false);
    });

    it('should allow switching from MANUAL to RANDOM mode', () => {
      game.setPlacementMode(PLACEMENT_MODES.MANUAL);
      const ship = game.playerFleet[0];
      game.placePlayerShip(ship, 0, 0, true);
      
      game.resetPlacementMode();
      game.setPlacementMode(PLACEMENT_MODES.RANDOM);
      
      expect(game.placementMode).toBe(PLACEMENT_MODES.RANDOM);
      expect(game.playerBoard.ships.length).toBe(0);
    });

    it('should allow switching from RANDOM to MANUAL mode', () => {
      game.setPlacementMode(PLACEMENT_MODES.RANDOM);
      game.randomizePlayerShips();
      
      game.resetPlacementMode();
      game.setPlacementMode(PLACEMENT_MODES.MANUAL);
      
      expect(game.placementMode).toBe(PLACEMENT_MODES.MANUAL);
      expect(game.playerBoard.ships.length).toBe(0);
      expect(game.playerFleet.length).toBe(5);
    });
  });

  describe('startGame restrictions', () => {
    it('should not allow starting game when placement mode is NONE', () => {
      expect(game.placementMode).toBe(PLACEMENT_MODES.NONE);
      const result = game.startGame();
      expect(result).toBe(false);
    });

    it('should not allow starting game in MANUAL mode without all ships placed', () => {
      game.setPlacementMode(PLACEMENT_MODES.MANUAL);
      const ship = game.playerFleet[0];
      game.placePlayerShip(ship, 0, 0, true);
      
      const result = game.startGame();
      expect(result).toBe(false);
    });

    it('should allow starting game in MANUAL mode with all ships placed', () => {
      game.setPlacementMode(PLACEMENT_MODES.MANUAL);
      
      // Place all ships
      let row = 0;
      for (const ship of game.playerFleet) {
        game.placePlayerShip(ship, row, 0, true);
        row += 2;
      }
      
      const result = game.startGame();
      expect(result).toBe(true);
      expect(game.state).toBe(GAME_STATES.PLAYER_TURN);
    });

    it('should not allow starting game in RANDOM mode without ships', () => {
      game.setPlacementMode(PLACEMENT_MODES.RANDOM);
      const result = game.startGame();
      expect(result).toBe(false);
    });

    it('should allow starting game in RANDOM mode after randomizing', () => {
      game.setPlacementMode(PLACEMENT_MODES.RANDOM);
      game.randomizePlayerShips();
      
      const result = game.startGame();
      expect(result).toBe(true);
      expect(game.state).toBe(GAME_STATES.PLAYER_TURN);
    });
  });

  describe('restart clears all state', () => {
    it('should reset placement mode to NONE on restart', () => {
      game.setPlacementMode(PLACEMENT_MODES.MANUAL);
      game.restart();
      expect(game.placementMode).toBe(PLACEMENT_MODES.NONE);
    });

    it('should clear player fleet on restart', () => {
      game.setPlacementMode(PLACEMENT_MODES.MANUAL);
      expect(game.playerFleet.length).toBe(5);
      
      game.restart();
      expect(game.playerFleet.length).toBe(0);
    });

    it('should clear placed ships on restart', () => {
      game.setPlacementMode(PLACEMENT_MODES.MANUAL);
      const ship = game.playerFleet[0];
      game.placePlayerShip(ship, 0, 0, true);
      
      game.restart();
      expect(game.placedShips.size).toBe(0);
    });

    it('should return to SETUP_PLAYER state on restart from any state', () => {
      game.setPlacementMode(PLACEMENT_MODES.RANDOM);
      game.randomizePlayerShips();
      game.startGame();
      expect(game.state).toBe(GAME_STATES.PLAYER_TURN);
      
      game.restart();
      expect(game.state).toBe(GAME_STATES.SETUP_PLAYER);
    });
  });
});
