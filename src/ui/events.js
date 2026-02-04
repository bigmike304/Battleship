import { GAME_STATES } from '../engine/game.js';

export class EventHandler {
  constructor(game, ai, renderer) {
    this.game = game;
    this.ai = ai;
    this.renderer = renderer;
    this.aiTurnDelay = 800;
  }

  initialize() {
    this.setupBoardClickHandler();
    this.setupRestartHandler();
    this.setupGameCallbacks();
  }

  setupBoardClickHandler() {
    const enemyBoard = document.getElementById('enemy-board');
    
    enemyBoard.addEventListener('click', (e) => {
      if (!e.target.classList.contains('cell')) {
        return;
      }

      if (this.game.state !== GAME_STATES.PLAYING || !this.game.isPlayerTurn) {
        return;
      }

      const row = parseInt(e.target.dataset.row, 10);
      const col = parseInt(e.target.dataset.col, 10);

      const result = this.game.playerAttack(row, col);

      if (result) {
        this.renderer.renderBoards();

        if (this.game.state === GAME_STATES.GAME_OVER) {
          this.renderer.showGameOver(this.game.winner);
          return;
        }

        setTimeout(() => this.executeAiTurn(), this.aiTurnDelay);
      }
    });
  }

  executeAiTurn() {
    if (this.game.state !== GAME_STATES.PLAYING || this.game.isPlayerTurn) {
      return;
    }

    const move = this.ai.getNextMove(this.game.playerBoard);

    if (!move) {
      return;
    }

    const result = this.game.aiAttack(move.row, move.col);

    if (result) {
      this.ai.recordAttack(move.row, move.col, result);
      this.renderer.renderBoards();

      if (this.game.state === GAME_STATES.GAME_OVER) {
        this.renderer.showGameOver(this.game.winner);
      }
    }
  }

  setupRestartHandler() {
    const restartBtn = document.getElementById('restart-btn');
    
    restartBtn.addEventListener('click', () => {
      this.ai.reset();
      this.renderer.hideGameOver();
      this.renderer.clearMessages();
      this.game.restart();
    });
  }

  setupGameCallbacks() {
    this.game.onMessage = (message, type) => {
      this.renderer.addMessage(message, type);
    };

    this.game.onUpdate = () => {
      this.renderer.renderBoards();
    };
  }
}
