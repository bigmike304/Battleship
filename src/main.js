import { Game } from './engine/game.js';
import { ProbabilityAI } from './ai/probabilityAI.js';
import { Renderer } from './ui/renderer.js';
import { EventHandler } from './ui/events.js';

const game = new Game();
const ai = new ProbabilityAI();
const renderer = new Renderer(game);
const eventHandler = new EventHandler(game, ai, renderer);

function init() {
  game.initialize();
  renderer.renderBoards();
  renderer.updateControlsVisibility(game.state);
  eventHandler.initialize();
}

document.addEventListener('DOMContentLoaded', init);
