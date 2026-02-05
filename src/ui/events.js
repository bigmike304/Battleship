import { GAME_STATES, PLACEMENT_MODES } from '../engine/game.js';
import { AI_DIFFICULTY } from '../ai/aiCore.js';

export class EventHandler {
  constructor(game, ai, renderer) {
    this.game = game;
    this.ai = ai;
    this.renderer = renderer;
    this.aiTurnDelay = 800;
    
    // Manual placement state
    this.selectedShip = null;
    this.isHorizontal = true;
  }

  initialize() {
    this.setupDifficultyHandler();
    this.setupPlacementModeHandlers();
    this.setupManualPlacementHandlers();
    this.setupBoardClickHandler();
    this.setupSetupHandlers();
    this.setupRestartHandler();
    this.setupGameCallbacks();
    this.setupKeyboardHandlers();
  }

  // Handle AI difficulty selection
  setupDifficultyHandler() {
    const difficultySelect = document.getElementById('difficulty-select');
    
    difficultySelect.addEventListener('change', (e) => {
      const difficulty = e.target.value;
      this.ai.setDifficulty(difficulty);
    });
  }

  // Handle placement mode selection (Manual vs Random)
  setupPlacementModeHandlers() {
    const manualModeBtn = document.getElementById('manual-mode-btn');
    const randomModeBtn = document.getElementById('random-mode-btn');
    const changeModeBtn = document.getElementById('change-mode-btn');

    manualModeBtn.addEventListener('click', () => {
      this.game.setPlacementMode(PLACEMENT_MODES.MANUAL);
      this.renderer.renderShipTray();
      this.renderer.updateControlsVisibility(this.game.state, this.game.placementMode);
    });

    randomModeBtn.addEventListener('click', () => {
      this.game.setPlacementMode(PLACEMENT_MODES.RANDOM);
      this.renderer.updateControlsVisibility(this.game.state, this.game.placementMode);
    });

    // Handle changing placement mode (return to mode selection)
    changeModeBtn.addEventListener('click', () => {
      this.game.resetPlacementMode();
      this.selectedShip = null;
      this.isHorizontal = true;
      this.renderer.clearPlacementPreview();
      this.renderer.renderBoards();
      this.renderer.updateControlsVisibility(this.game.state, this.game.placementMode);
    });
  }

  // Handle manual ship placement interactions
  setupManualPlacementHandlers() {
    const shipTray = document.getElementById('ship-tray');
    const rotateBtn = document.getElementById('rotate-btn');
    const clearBtn = document.getElementById('clear-placement-btn');
    const playerBoard = document.getElementById('player-board');

    // Ship selection from tray
    shipTray.addEventListener('click', (e) => {
      const shipPiece = e.target.closest('.ship-piece');
      if (!shipPiece) return;
      
      const shipId = parseInt(shipPiece.dataset.shipId, 10);
      const ship = this.game.getFleetShips().find(s => s.id === shipId);
      
      if (ship && !this.game.isShipPlaced(shipId)) {
        this.selectedShip = ship;
        this.renderer.renderShipTray(shipId);
      }
    });

    // Rotate button
    rotateBtn.addEventListener('click', () => {
      this.isHorizontal = !this.isHorizontal;
      this.renderer.clearPlacementPreview();
    });

    // Clear all ships button
    clearBtn.addEventListener('click', () => {
      this.game.clearPlayerShips();
      this.selectedShip = null;
      this.isHorizontal = true;
      this.renderer.renderShipTray();
      this.renderer.renderBoards();
      this.renderer.updateControlsVisibility(this.game.state, this.game.placementMode);
    });

    // Player board hover for placement preview
    playerBoard.addEventListener('mousemove', (e) => {
      if (this.game.state !== GAME_STATES.SETUP_PLAYER || 
          this.game.placementMode !== PLACEMENT_MODES.MANUAL ||
          !this.selectedShip) {
        return;
      }

      const cell = e.target.closest('.cell');
      if (!cell) {
        this.renderer.clearPlacementPreview();
        return;
      }

      const row = parseInt(cell.dataset.row, 10);
      const col = parseInt(cell.dataset.col, 10);
      this.renderer.showPlacementPreview(this.selectedShip, row, col, this.isHorizontal);
    });

    // Player board mouse leave - clear preview
    playerBoard.addEventListener('mouseleave', () => {
      this.renderer.clearPlacementPreview();
    });

    // Player board click for ship placement
    playerBoard.addEventListener('click', (e) => {
      if (this.game.state !== GAME_STATES.SETUP_PLAYER || 
          this.game.placementMode !== PLACEMENT_MODES.MANUAL ||
          !this.selectedShip) {
        return;
      }

      const cell = e.target.closest('.cell');
      if (!cell) return;

      const row = parseInt(cell.dataset.row, 10);
      const col = parseInt(cell.dataset.col, 10);

      const placed = this.game.placePlayerShip(this.selectedShip, row, col, this.isHorizontal);
      
      if (placed) {
        this.selectedShip = null;
        this.renderer.renderShipTray();
        this.renderer.renderBoards();
        this.renderer.updateControlsVisibility(this.game.state, this.game.placementMode);
      }
    });

    // Right-click to rotate during placement
    playerBoard.addEventListener('contextmenu', (e) => {
      if (this.game.state === GAME_STATES.SETUP_PLAYER && 
          this.game.placementMode === PLACEMENT_MODES.MANUAL &&
          this.selectedShip) {
        e.preventDefault();
        this.isHorizontal = !this.isHorizontal;
        
        const cell = e.target.closest('.cell');
        if (cell) {
          const row = parseInt(cell.dataset.row, 10);
          const col = parseInt(cell.dataset.col, 10);
          this.renderer.showPlacementPreview(this.selectedShip, row, col, this.isHorizontal);
        }
      }
    });
  }

  // Keyboard handlers for rotation
  setupKeyboardHandlers() {
    document.addEventListener('keydown', (e) => {
      if (this.game.state === GAME_STATES.SETUP_PLAYER && 
          this.game.placementMode === PLACEMENT_MODES.MANUAL &&
          this.selectedShip) {
        if (e.key === 'r' || e.key === 'R') {
          this.isHorizontal = !this.isHorizontal;
          this.renderer.clearPlacementPreview();
        }
      }
    });
  }

  setupSetupHandlers() {
    const randomizeBtn = document.getElementById('randomize-btn');
    const startBtn = document.getElementById('start-btn');

    randomizeBtn.addEventListener('click', () => {
      this.game.randomizePlayerShips();
      this.renderer.updateControlsVisibility(this.game.state, this.game.placementMode);
    });

    startBtn.addEventListener('click', () => {
      this.game.startGame();
      this.renderer.updateControlsVisibility(this.game.state, this.game.placementMode);
    });
  }

  setupBoardClickHandler() {
    const enemyBoard = document.getElementById('enemy-board');
    
    enemyBoard.addEventListener('click', (e) => {
      if (!e.target.classList.contains('cell')) {
        return;
      }

      if (this.game.state !== GAME_STATES.PLAYER_TURN) {
        return;
      }

      const row = parseInt(e.target.dataset.row, 10);
      const col = parseInt(e.target.dataset.col, 10);

      const result = this.game.playerAttack(row, col);

      if (result) {
        this.renderer.renderBoards();

        if (this.game.state === GAME_STATES.GAME_OVER) {
          this.renderer.showGameOver(this.game.winner);
          this.renderer.updateControlsVisibility(this.game.state);
          return;
        }

        setTimeout(() => this.executeAiTurn(), this.aiTurnDelay);
      }
    });
  }

  executeAiTurn() {
    if (this.game.state !== GAME_STATES.AI_TURN) {
      return;
    }

    // Update phase indicator to show AI turn
    this.renderer.updatePhaseIndicator(this.game.state);

    const move = this.ai.getNextMove(this.game.playerBoard);

    if (!move) {
      return;
    }

    const result = this.game.aiAttack(move.row, move.col);

    if (result) {
      // Pass the result to recordAttack so AI can update its state
      this.ai.recordAttack(move.row, move.col, result);
      this.renderer.renderBoards();
      this.renderer.updatePhaseIndicator(this.game.state);

      if (this.game.state === GAME_STATES.GAME_OVER) {
        this.renderer.showGameOver(this.game.winner);
        this.renderer.updateControlsVisibility(this.game.state);
      }
    }
  }

  setupRestartHandler() {
    const restartBtn = document.getElementById('restart-btn');
    
    restartBtn.addEventListener('click', () => {
      // Reset AI
      this.ai.reset();
      
      // Reset placement state
      this.selectedShip = null;
      this.isHorizontal = true;
      
      // Reset UI
      this.renderer.hideGameOver();
      this.renderer.clearMessages();
      this.game.restart();
      this.renderer.updateControlsVisibility(this.game.state, this.game.placementMode);
      this.renderer.updatePhaseIndicator(this.game.state);
    });
  }

  setupGameCallbacks() {
    this.game.onMessage = (message, type) => {
      this.renderer.addMessage(message, type);
    };

    this.game.onUpdate = () => {
      this.renderer.renderBoards();
      this.renderer.updateControlsVisibility(this.game.state, this.game.placementMode);
    };
  }
}
