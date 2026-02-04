import { GRID_SIZE, CELL_STATES } from '../engine/board.js';
import { GAME_STATES } from '../engine/game.js';

export class Renderer {
  constructor(game) {
    this.game = game;
    this.playerBoardEl = document.getElementById('player-board');
    this.enemyBoardEl = document.getElementById('enemy-board');
    this.messagesEl = document.getElementById('messages');
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
          if (cell.state === CELL_STATES.HIT) {
            cellEl.classList.add('hit');
          } else if (cell.state === CELL_STATES.MISS) {
            cellEl.classList.add('miss');
          } else if (cell.state === CELL_STATES.SUNK) {
            cellEl.classList.add('sunk');
          }
        } else {
          if (cell.state === CELL_STATES.SHIP) {
            cellEl.classList.add('ship');
          } else if (cell.state === CELL_STATES.HIT) {
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

  updateControlsVisibility(state) {
    const setupControls = document.getElementById('setup-controls');
    const gameControls = document.getElementById('game-controls');

    if (state === GAME_STATES.SETUP_PLAYER) {
      setupControls.style.display = 'block';
      gameControls.style.display = 'none';
    } else {
      setupControls.style.display = 'none';
      gameControls.style.display = 'block';
    }
  }
}
