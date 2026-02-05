const STORAGE_KEYS = {
  PLAYER_NAME: 'battleship_player_name',
  LEADERBOARD: 'battleship_leaderboard',
  SOUND_ENABLED: 'battleship_sound_enabled',
};

export class GameFeatures {
  constructor() {
    this.shotCount = 0;
    this.soundEnabled = this.loadSoundPreference();
    this.hitSound = null;
    this.missSound = null;
    this.audioInitialized = false;
    this.userHasInteracted = false;
    
    this.initializeUI();
    this.loadPlayerName();
    this.renderLeaderboard();
  }

  initializeUI() {
    this.setupPlayerNameInput();
    this.setupSaveNameButton();
    this.setupSoundToggle();
    this.setupClearLeaderboard();
    this.setupUserInteractionListener();
  }

  setupUserInteractionListener() {
    const initAudioOnInteraction = () => {
      if (!this.userHasInteracted) {
        this.userHasInteracted = true;
        this.initializeAudio();
      }
    };

    document.addEventListener('click', initAudioOnInteraction, { once: true });
    document.addEventListener('keydown', initAudioOnInteraction, { once: true });
  }

  initializeAudio() {
    if (this.audioInitialized) return;
    
    try {
      this.hitSound = new Audio('./assets/sounds/hit.mp3');
      this.missSound = new Audio('./assets/sounds/miss.mp3');
      
      this.hitSound.preload = 'auto';
      this.missSound.preload = 'auto';
      
      this.hitSound.load();
      this.missSound.load();
      
      this.audioInitialized = true;
    } catch (e) {
      // Silently fail - audio not critical
    }
  }

  setupPlayerNameInput() {
    const input = document.getElementById('player-name-input');
    if (!input) return;

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.handleSaveName();
      }
    });
  }

  setupSaveNameButton() {
    const saveBtn = document.getElementById('save-name-btn');
    if (!saveBtn) return;

    saveBtn.addEventListener('click', () => {
      this.handleSaveName();
    });
  }

  handleSaveName() {
    const input = document.getElementById('player-name-input');
    const statusEl = document.getElementById('name-save-status');
    if (!input) return;

    const name = input.value.trim();
    
    if (!name) {
      this.showNameStatus('Please enter a name', 'error');
      return false;
    }

    this.savePlayerName(name);
    this.showNameStatus('Name saved!', 'success');
    return true;
  }

  showNameStatus(message, type) {
    const statusEl = document.getElementById('name-save-status');
    if (!statusEl) return;

    statusEl.textContent = message;
    statusEl.className = `name-save-status ${type}`;
    
    setTimeout(() => {
      statusEl.textContent = '';
      statusEl.className = 'name-save-status';
    }, 3000);
  }

  setupSoundToggle() {
    const setupToggleBtn = document.getElementById('sound-toggle');
    const footerToggleBtn = document.getElementById('footer-sound-toggle');

    this.updateSoundToggleUI();

    const handleToggle = () => {
      this.soundEnabled = !this.soundEnabled;
      this.saveSoundPreference();
      this.updateSoundToggleUI();
    };

    if (setupToggleBtn) {
      setupToggleBtn.addEventListener('click', handleToggle);
    }
    if (footerToggleBtn) {
      footerToggleBtn.addEventListener('click', handleToggle);
    }
  }

  updateSoundToggleUI() {
    const setupToggleBtn = document.getElementById('sound-toggle');
    const footerToggleBtn = document.getElementById('footer-sound-toggle');
    const label = this.soundEnabled ? 'On' : 'Off';
    const addClass = this.soundEnabled ? 'sound-on' : 'sound-off';
    const removeClass = this.soundEnabled ? 'sound-off' : 'sound-on';

    [setupToggleBtn, footerToggleBtn].forEach(btn => {
      if (btn) {
        btn.textContent = label;
        btn.classList.remove(removeClass);
        btn.classList.add(addClass);
      }
    });
  }

  setupClearLeaderboard() {
    const clearBtn = document.getElementById('clear-leaderboard-btn');
    if (!clearBtn) return;

    clearBtn.addEventListener('click', () => {
      this.clearLeaderboard();
    });
  }

  loadPlayerName() {
    const input = document.getElementById('player-name-input');
    if (!input) return '';

    const savedName = localStorage.getItem(STORAGE_KEYS.PLAYER_NAME) || '';
    input.value = savedName;
    return savedName;
  }

  savePlayerName(name) {
    localStorage.setItem(STORAGE_KEYS.PLAYER_NAME, name);
  }

  getPlayerName() {
    const input = document.getElementById('player-name-input');
    return input ? input.value.trim() : '';
  }

  loadSoundPreference() {
    const saved = localStorage.getItem(STORAGE_KEYS.SOUND_ENABLED);
    return saved === null ? true : saved === 'true';
  }

  saveSoundPreference() {
    localStorage.setItem(STORAGE_KEYS.SOUND_ENABLED, this.soundEnabled.toString());
  }

  resetShotCount() {
    this.shotCount = 0;
    this.updateShotCounterUI();
  }

  incrementShotCount() {
    this.shotCount++;
    this.updateShotCounterUI();
  }

  updateShotCounterUI() {
    const shotCountEl = document.getElementById('shot-count');
    if (shotCountEl) {
      shotCountEl.textContent = this.shotCount;
    }
  }

  showShotCounter() {
    const shotCounter = document.getElementById('shot-counter');
    if (shotCounter) {
      shotCounter.style.display = 'block';
    }
  }

  hideShotCounter() {
    const shotCounter = document.getElementById('shot-counter');
    if (shotCounter) {
      shotCounter.style.display = 'none';
    }
  }

  playHitSound() {
    if (!this.soundEnabled || !this.hitSound) return;
    
    try {
      this.hitSound.currentTime = 0;
      this.hitSound.play().catch(() => {});
    } catch (e) {
      // Silently fail
    }
  }

  playMissSound() {
    if (!this.soundEnabled || !this.missSound) return;
    
    try {
      this.missSound.currentTime = 0;
      this.missSound.play().catch(() => {});
    } catch (e) {
      // Silently fail
    }
  }

  getLeaderboard() {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LEADERBOARD);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  }

  saveLeaderboard(leaderboard) {
    localStorage.setItem(STORAGE_KEYS.LEADERBOARD, JSON.stringify(leaderboard));
  }

  addLeaderboardEntry(name, shots, difficulty) {
    const leaderboard = this.getLeaderboard();
    
    leaderboard.push({
      name,
      shots,
      difficulty,
      date: new Date().toISOString(),
    });

    leaderboard.sort((a, b) => a.shots - b.shots);

    const top10 = leaderboard.slice(0, 10);
    this.saveLeaderboard(top10);
    this.renderLeaderboard();
  }

  clearLeaderboard() {
    localStorage.removeItem(STORAGE_KEYS.LEADERBOARD);
    this.renderLeaderboard();
  }

  renderLeaderboard() {
    const listEl = document.getElementById('leaderboard-list');
    if (!listEl) return;

    const leaderboard = this.getLeaderboard();

    if (leaderboard.length === 0) {
      listEl.innerHTML = '<p class="leaderboard-empty">No scores yet. Win a game to get on the board!</p>';
      return;
    }

    const table = document.createElement('table');
    table.className = 'leaderboard-table';

    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr>
        <th>#</th>
        <th>Name</th>
        <th>Shots</th>
        <th>Difficulty</th>
      </tr>
    `;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    leaderboard.forEach((entry, index) => {
      const tr = document.createElement('tr');
      const difficultyClass = `difficulty-${entry.difficulty.toLowerCase()}`;
      tr.innerHTML = `
        <td class="rank">${index + 1}</td>
        <td>${this.escapeHtml(entry.name)}</td>
        <td class="score">${entry.shots}</td>
        <td class="${difficultyClass}">${this.capitalizeFirst(entry.difficulty)}</td>
      `;
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    listEl.innerHTML = '';
    listEl.appendChild(table);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  handleGameWin(difficulty) {
    const playerName = this.getPlayerName();
    
    const existingMessage = document.querySelector('.score-save-message');
    if (existingMessage) {
      existingMessage.remove();
    }

    if (!playerName) {
      this.showScoreSaveMessage('Save your name to record your score.', 'error');
      this.highlightNameInput();
      return false;
    }

    this.addLeaderboardEntry(playerName, this.shotCount, difficulty);
    this.showScoreSaveMessage(`Score saved! ${this.shotCount} shots on ${this.capitalizeFirst(difficulty)}.`, 'success');
    return true;
  }

  highlightNameInput() {
    const nameSection = document.getElementById('player-name-section');
    const input = document.getElementById('player-name-input');
    if (nameSection) {
      nameSection.classList.add('highlight-warning');
      setTimeout(() => {
        nameSection.classList.remove('highlight-warning');
      }, 5000);
    }
    if (input) {
      input.focus();
    }
  }

  showScoreSaveMessage(message, type) {
    const existingMessage = document.querySelector('.score-save-message');
    if (existingMessage) {
      existingMessage.remove();
    }

    const gameOverEl = document.querySelector('.game-over');
    if (!gameOverEl) return;

    const messageEl = document.createElement('div');
    messageEl.className = `score-save-message ${type}`;
    messageEl.textContent = message;
    gameOverEl.appendChild(messageEl);
  }
}
