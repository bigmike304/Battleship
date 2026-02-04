import { describe, it, expect, beforeEach } from 'vitest';
import { Game, GAME_STATES } from '../src/engine/game.js';
import { Board, CELL_STATES } from '../src/engine/board.js';
import { createShip, resetShipIdCounter } from '../src/engine/ship.js';

describe('Game', () => {
  let game;

  beforeEach(() => {
    resetShipIdCounter();
    game = new Game();
  });

  describe('initialize', () => {
    it('should set game state to PLAYING after initialization', () => {
      game.initialize();
      expect(game.state).toBe(GAME_STATES.PLAYING);
    });

    it('should place 5 ships on player board', () => {
      game.initialize();
      expect(game.playerBoard.ships.length).toBe(5);
    });

    it('should place 5 ships on AI board', () => {
      game.initialize();
      expect(game.aiBoard.ships.length).toBe(5);
    });

    it('should set player turn to true', () => {
      game.initialize();
      expect(game.isPlayerTurn).toBe(true);
    });

    it('should have no winner initially', () => {
      game.initialize();
      expect(game.winner).toBeNull();
    });
  });

  describe('playerAttack', () => {
    beforeEach(() => {
      game.initialize();
    });

    it('should return null when not player turn', () => {
      game.isPlayerTurn = false;
      const result = game.playerAttack(0, 0);
      expect(result).toBeNull();
    });

    it('should return null when game is not in PLAYING state', () => {
      game.state = GAME_STATES.GAME_OVER;
      const result = game.playerAttack(0, 0);
      expect(result).toBeNull();
    });

    it('should switch turn to AI after valid attack', () => {
      game.playerAttack(0, 0);
      expect(game.isPlayerTurn).toBe(false);
    });
  });

  describe('aiAttack', () => {
    beforeEach(() => {
      game.initialize();
      game.isPlayerTurn = false;
    });

    it('should return null when it is player turn', () => {
      game.isPlayerTurn = true;
      const result = game.aiAttack(0, 0);
      expect(result).toBeNull();
    });

    it('should switch turn to player after valid attack', () => {
      game.aiAttack(0, 0);
      expect(game.isPlayerTurn).toBe(true);
    });
  });

  describe('win detection', () => {
    it('should detect player win when all AI ships are sunk', () => {
      game.initialize();
      
      for (const ship of game.aiBoard.ships) {
        for (const pos of ship.positions) {
          game.playerAttack(pos.row, pos.col);
          if (game.state !== GAME_STATES.GAME_OVER) {
            game.isPlayerTurn = true;
          }
        }
      }

      expect(game.state).toBe(GAME_STATES.GAME_OVER);
      expect(game.winner).toBe('player');
    });

    it('should detect AI win when all player ships are sunk', () => {
      game.initialize();
      game.isPlayerTurn = false;
      
      for (const ship of game.playerBoard.ships) {
        for (const pos of ship.positions) {
          game.aiAttack(pos.row, pos.col);
          if (game.state !== GAME_STATES.GAME_OVER) {
            game.isPlayerTurn = false;
          }
        }
      }

      expect(game.state).toBe(GAME_STATES.GAME_OVER);
      expect(game.winner).toBe('ai');
    });

    it('should require exactly 17 hits to win (5+4+3+3+2)', () => {
      game.initialize();
      
      let hitCount = 0;
      for (const ship of game.aiBoard.ships) {
        for (const pos of ship.positions) {
          game.playerAttack(pos.row, pos.col);
          hitCount++;
          if (game.state !== GAME_STATES.GAME_OVER) {
            game.isPlayerTurn = true;
          }
        }
      }

      expect(hitCount).toBe(17);
      expect(game.state).toBe(GAME_STATES.GAME_OVER);
    });
  });

  describe('restart', () => {
    it('should reset game state to PLAYING', () => {
      game.initialize();
      game.state = GAME_STATES.GAME_OVER;
      game.restart();
      expect(game.state).toBe(GAME_STATES.PLAYING);
    });

    it('should reset winner to null', () => {
      game.initialize();
      game.winner = 'player';
      game.restart();
      expect(game.winner).toBeNull();
    });

    it('should reset player turn to true', () => {
      game.initialize();
      game.isPlayerTurn = false;
      game.restart();
      expect(game.isPlayerTurn).toBe(true);
    });

    it('should place new ships on both boards', () => {
      game.initialize();
      const oldPlayerShips = [...game.playerBoard.ships];
      const oldAiShips = [...game.aiBoard.ships];
      
      game.restart();
      
      expect(game.playerBoard.ships.length).toBe(5);
      expect(game.aiBoard.ships.length).toBe(5);
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
