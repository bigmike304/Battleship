import { GRID_SIZE, CELL_STATES } from '../engine/board.js';
import { GAME_STATES, PLACEMENT_MODES } from '../engine/game.js';
import { SHIP_TYPES } from '../engine/ship.js';
import { toClassicCoord } from '../ai/aiCore.js';

// Map ship names to CSS class suffixes
const SHIP_CLASS_MAP = {
  'Carrier': 'carrier',
  'Battleship': 'battleship',
  'Cruiser': 'cruiser',
  'Submarine': 'submarine',
  'Destroyer': 'destroyer',
};

// Map ship names to asset file names
const SHIP_ASSET_MAP = {
  'Carrier': 'carrier.svg',
  'Battleship': 'battleship.svg',
  'Cruiser': 'cruiser.svg',
  'Submarine': 'submarine.svg',
  'Destroyer': 'destroyer.svg',
};

export class Renderer {
  constructor(game) {
    this.game = game;
    this.playerBoardEl = document.getElementById('player-board');
    this.enemyBoardEl = document.getElementById('enemy-board');
    this.messagesEl = document.getElementById('messages');
    this.shipTrayEl = document.getElementById('ship-tray');
  }

  renderBoards() {
    this.renderBoard(this.playerBoardEl, this.game.playerBoard, false);
    this.renderBoard(this.enemyBoardEl, this.game.aiBoard, true);
  }

  renderBoard(boardEl, board, isEnemy) {
    boardEl.innerHTML = '';

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const cell = board.getCell(row, col);
        const cellEl = document.createElement('div');
        cellEl.className = 'cell';
        cellEl.dataset.row = row;
        cellEl.dataset.col = col;

        if (isEnemy) {
          // Enemy board: only show hits, misses, and sunk ships
          if (cell.state === CELL_STATES.HIT) {
            cellEl.classList.add('hit');
          } else if (cell.state === CELL_STATES.MISS) {
            cellEl.classList.add('miss');
          } else if (cell.state === CELL_STATES.SUNK) {
            cellEl.classList.add('sunk');
            // Add ship sprite for sunk enemy ships
            const ship = board.ships.find(s => s.id === cell.shipId);
            if (ship) {
              const shipClass = SHIP_CLASS_MAP[ship.name];
              if (shipClass) {
                cellEl.classList.add('ship', `ship--${shipClass}`);
              }
            }
          }
        } else {
          // Player board: show ships with sprites
          if (cell.state === CELL_STATES.SHIP || cell.state === CELL_STATES.HIT || cell.state === CELL_STATES.SUNK) {
            const ship = board.ships.find(s => s.id === cell.shipId);
            if (ship) {
              const shipClass = SHIP_CLASS_MAP[ship.name];
              if (shipClass) {
                cellEl.classList.add('ship', `ship--${shipClass}`);
              }
            }
          }
          
          if (cell.state === CELL_STATES.HIT) {
            cellEl.classList.add('hit');
          } else if (cell.state === CELL_STATES.MISS) {
            cellEl.classList.add('miss');
          } else if (cell.state === CELL_STATES.SUNK) {
            cellEl.classList.add('sunk');
          }
        }

        boardEl.appendChild(cellEl);
      }
    }
  }

  // Render the ship tray for manual placement
  renderShipTray(selectedShipId = null) {
    if (!this.shipTrayEl) return;
    
    this.shipTrayEl.innerHTML = '';
    const ships = this.game.getFleetShips();
    
    for (const ship of ships) {
      const isPlaced = this.game.isShipPlaced(ship.id);
      const isSelected = ship.id === selectedShipId;
      
      const pieceEl = document.createElement('div');
      pieceEl.className = 'ship-piece';
      pieceEl.dataset.shipId = ship.id;
      
      if (isPlaced) {
        pieceEl.classList.add('placed');
      }
      if (isSelected) {
        pieceEl.classList.add('selected');
      }
      
      // Ship image - use BASE_URL for correct path in production
      const imgEl = document.createElement('img');
      imgEl.src = `${import.meta.env.BASE_URL}assets/ships/${SHIP_ASSET_MAP[ship.name]}`;
      imgEl.alt = ship.name;
      
      // Ship info
      const infoEl = document.createElement('div');
      infoEl.innerHTML = `
        <div class="label">${ship.name}</div>
        <div class="meta">${ship.length} cells</div>
      `;
      
      pieceEl.appendChild(imgEl);
      pieceEl.appendChild(infoEl);
      this.shipTrayEl.appendChild(pieceEl);
    }
  }

  // Show placement preview on the board
  showPlacementPreview(ship, startRow, startCol, isHorizontal) {
    this.clearPlacementPreview();
    
    if (!ship) return;
    
    const isValid = this.game.isValidPlacement(ship, startRow, startCol, isHorizontal);
    
    for (let i = 0; i < ship.length; i++) {
      const row = isHorizontal ? startRow : startRow + i;
      const col = isHorizontal ? startCol + i : startCol;
      
      if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
        const cellEl = this.playerBoardEl.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        if (cellEl) {
          cellEl.classList.add('placement-preview');
          cellEl.classList.add(isValid ? 'valid' : 'invalid');
        }
      }
    }
  }

  // Clear placement preview
  clearPlacementPreview() {
    const previewCells = this.playerBoardEl.querySelectorAll('.placement-preview');
    previewCells.forEach(cell => {
      cell.classList.remove('placement-preview', 'valid', 'invalid');
    });
  }

  // Set player board to placement mode
  setPlacementMode(enabled) {
    if (enabled) {
      this.playerBoardEl.classList.add('placement-mode');
    } else {
      this.playerBoardEl.classList.remove('placement-mode');
      this.clearPlacementPreview();
    }
  }

  updateCell(boardEl, row, col, state) {
    const cellEl = boardEl.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    if (cellEl) {
      cellEl.className = 'cell';
      if (state === CELL_STATES.HIT) {
        cellEl.classList.add('hit');
      } else if (state === CELL_STATES.MISS) {
        cellEl.classList.add('miss');
      } else if (state === CELL_STATES.SUNK) {
        cellEl.classList.add('sunk');
      } else if (state === CELL_STATES.SHIP) {
        cellEl.classList.add('ship');
      }
    }
  }

  addMessage(message, type) {
    const messageEl = document.createElement('div');
    messageEl.className = `message ${type}`;
    messageEl.textContent = message;
    this.messagesEl.insertBefore(messageEl, this.messagesEl.firstChild);

    while (this.messagesEl.children.length > 50) {
      this.messagesEl.removeChild(this.messagesEl.lastChild);
    }
  }

  clearMessages() {
    this.messagesEl.innerHTML = '';
  }

  showGameOver(winner) {
    const existingOverlay = document.querySelector('.game-over');
    if (existingOverlay) {
      existingOverlay.remove();
    }

    const overlay = document.createElement('div');
    overlay.className = `game-over ${winner === 'player' ? 'win' : 'lose'}`;
    
    const title = document.createElement('h2');
    title.textContent = winner === 'player' ? 'Victory!' : 'Defeat!';
    
    const message = document.createElement('p');
    message.textContent = winner === 'player' 
      ? 'You have destroyed the enemy fleet!' 
      : 'Your fleet has been destroyed!';

    overlay.appendChild(title);
    overlay.appendChild(message);

    const gameContainer = document.getElementById('game-container');
    gameContainer.parentNode.insertBefore(overlay, gameContainer);
  }

  hideGameOver() {
    const overlay = document.querySelector('.game-over');
    if (overlay) {
      overlay.remove();
    }
  }

  updateControlsVisibility(state, placementMode = null) {
    const setupSection = document.getElementById('setup-section');
    const placementModeSelection = document.getElementById('placement-mode-selection');
    const shipTrayContainer = document.getElementById('ship-tray-container');
    const setupControls = document.getElementById('setup-controls');
    const gameControls = document.getElementById('game-controls');
    const randomizeBtn = document.getElementById('randomize-btn');
    const startBtn = document.getElementById('start-btn');

    if (state === GAME_STATES.SETUP_PLAYER) {
      // Show entire setup section during setup
      setupSection.style.display = 'block';
      gameControls.style.display = 'none';
      
      // Setup controls (Randomize + Start) are ALWAYS visible during setup
      setupControls.style.display = 'flex';
      
      if (placementMode === PLACEMENT_MODES.NONE || !placementMode) {
        // Initial state: show mode selection, buttons visible but Start disabled
        placementModeSelection.style.display = 'block';
        shipTrayContainer.style.display = 'none';
        randomizeBtn.style.display = 'block';
        startBtn.disabled = true;
        this.setPlacementMode(false);
      } else if (placementMode === PLACEMENT_MODES.MANUAL) {
        // Manual placement mode
        placementModeSelection.style.display = 'none';
        shipTrayContainer.style.display = 'block';
        randomizeBtn.style.display = 'none';
        startBtn.disabled = !this.game.allShipsPlaced();
        this.setPlacementMode(true);
      } else if (placementMode === PLACEMENT_MODES.RANDOM) {
        // Random placement mode
        placementModeSelection.style.display = 'none';
        shipTrayContainer.style.display = 'none';
        randomizeBtn.style.display = 'block';
        startBtn.disabled = this.game.playerBoard.ships.length === 0;
        this.setPlacementMode(false);
      }
    } else {
      // Game in progress or game over - hide setup section entirely
      setupSection.style.display = 'none';
      shipTrayContainer.style.display = 'none';
      gameControls.style.display = 'block';
      this.setPlacementMode(false);
    }
    
    // Update phase indicator
    this.updatePhaseIndicator(state);
  }

  // Update the phase indicator based on game state
  updatePhaseIndicator(state) {
    const phaseText = document.getElementById('phase-text');
    if (!phaseText) return;

    // Remove all phase classes
    phaseText.classList.remove('setup', 'your-turn', 'ai-turn', 'game-over');

    switch (state) {
      case GAME_STATES.SETUP_PLAYER:
      case GAME_STATES.SETUP_AI:
        phaseText.textContent = 'Setup';
        phaseText.classList.add('setup');
        break;
      case GAME_STATES.PLAYER_TURN:
        phaseText.textContent = 'Your Turn';
        phaseText.classList.add('your-turn');
        break;
      case GAME_STATES.AI_TURN:
        phaseText.textContent = 'AI Turn';
        phaseText.classList.add('ai-turn');
        break;
      case GAME_STATES.GAME_OVER:
        phaseText.textContent = 'Game Over';
        phaseText.classList.add('game-over');
        break;
      default:
        phaseText.textContent = 'Setup';
        phaseText.classList.add('setup');
    }
  }

  // Format coordinate in classic style (e.g., "B7")
  formatCoord(row, col) {
    return toClassicCoord(row, col);
  }
}
