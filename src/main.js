import { Game } from './engine/game.js';
import { BattleshipAI, AI_DIFFICULTY } from './ai/aiCore.js';
import { Renderer } from './ui/renderer.js';
import { EventHandler } from './ui/events.js';
import { GameFeatures } from './ui/gameFeatures.js';

const game = new Game();
const ai = new BattleshipAI(AI_DIFFICULTY.NORMAL);
const renderer = new Renderer(game);
const gameFeatures = new GameFeatures();
const eventHandler = new EventHandler(game, ai, renderer, gameFeatures);

function init() {
  game.initialize();
  renderer.renderBoards();
  renderer.updateControlsVisibility(game.state, game.placementMode);
  renderer.updatePhaseIndicator(game.state);
  eventHandler.initialize();
}

document.addEventListener('DOMContentLoaded', init);
