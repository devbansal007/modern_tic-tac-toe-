/**
 * ==========================================================================
 * TIC TAC TOE — Modern Strategic Game Logic
 * Pure Vanilla JavaScript | Zero Frameworks
 * Features: 2-Player Local, vs Computer (Casual & Master AI),
 * Real-Time Scoreboard, Glowing Strike Lines, Sound Effects & Confetti Sparks
 * ==========================================================================
 */

// --- Game State Variables ---
const gameState = {
  board: Array(9).fill(''),
  currentPlayer: 'X',
  gameActive: true,
  gameMode: 'pvp',        // 'pvp' (2 Players) or 'pve' (vs Computer)
  aiDifficulty: 'master',  // 'casual' or 'master'
  isAiThinking: false,
  round: 1,
  soundEnabled: true,
  scores: {
    X: 0,
    O: 0,
    draws: 0
  }
};

// All 8 Winning Line Indices
const WINNING_COMBINATIONS = [
  [0, 1, 2], // Row 1
  [3, 4, 5], // Row 2
  [6, 7, 8], // Row 3
  [0, 3, 6], // Column 1
  [1, 4, 7], // Column 2
  [2, 5, 8], // Column 3
  [0, 4, 8], // Diagonal top-left to bottom-right
  [2, 4, 6]  // Diagonal top-right to bottom-left
];

// --- DOM Element References ---
const boardElement = document.getElementById('game-board');
const cells = document.querySelectorAll('.cell');
const statusMessage = document.getElementById('status-message');
const turnBadge = document.getElementById('turn-badge');
const scoreXElement = document.getElementById('score-x');
const scoreOElement = document.getElementById('score-o');
const scoreDrawElement = document.getElementById('score-draw');
const playerOLabel = document.getElementById('player-o-label');
const roundDisplay = document.getElementById('round-counter');
const restartBtn = document.getElementById('btn-restart');
const resetScoreBtn = document.getElementById('btn-reset-score');
const soundToggleBtn = document.getElementById('btn-sound-toggle');
const soundIcon = document.getElementById('sound-icon');
const pvpModeBtn = document.getElementById('btn-mode-pvp');
const pveModeBtn = document.getElementById('btn-mode-pve');
const diffCasualBtn = document.getElementById('btn-diff-casual');
const diffMasterBtn = document.getElementById('btn-diff-master');
const aiDifficultyGroup = document.getElementById('ai-difficulty-group');
const strikeSvg = document.getElementById('strike-svg');
const strikeLine = document.getElementById('strike-line');
const winnerBanner = document.getElementById('winner-banner');
const bannerIcon = document.getElementById('banner-icon');
const bannerTitle = document.getElementById('banner-title');
const bannerDesc = document.getElementById('banner-desc');
const bannerNextBtn = document.getElementById('banner-next-btn');
const fxCanvas = document.getElementById('fx-canvas');

// --- Web Audio Synthesizer (Retro-Futuristic Sound FX) ---
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Plays synthesized tone chords for tactical feedback
 */
function playSound(type) {
  if (!gameState.soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'move-x') {
      // Crisp high tactical pip (Cyan)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.08); // A5
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'move-o') {
      // Resonant deep tactical tone (Purple)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now); // A4
      osc.frequency.exponentialRampToValueAtTime(329.63, now + 0.09); // E4
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === 'win') {
      // Triumphant cyber arpeggio
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const noteOsc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        noteOsc.type = 'triangle';
        noteOsc.connect(noteGain);
        noteGain.connect(ctx.destination);
        const startTime = now + idx * 0.08;
        noteOsc.frequency.setValueAtTime(freq, startTime);
        noteGain.gain.setValueAtTime(0.12, startTime);
        noteGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.28);
        noteOsc.start(startTime);
        noteOsc.stop(startTime + 0.3);
      });
    } else if (type === 'draw') {
      // Minor resolving chord
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(329.63, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.25);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'button') {
      // Subtle UI click
      osc.type = 'sine';
      osc.frequency.setValueAtTime(700, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.start(now);
      osc.stop(now + 0.04);
    }
  } catch (err) {
    // Graceful fallback if Web Audio is restricted
    console.debug('Audio playback note:', err);
  }
}

// --- Particle Spark Celebration System ---
let particles = [];
let animFrameId = null;

function triggerParticles(winningPlayer) {
  if (!fxCanvas) return;
  const ctx = fxCanvas.getContext('2d');
  fxCanvas.width = window.innerWidth;
  fxCanvas.height = window.innerHeight;

  const count = 55;
  const colors = winningPlayer === 'X' 
    ? ['#00f0ff', '#38bdf8', '#ffffff', '#0ea5e9'] 
    : ['#c084fc', '#f43f5e', '#ffffff', '#e879f9'];

  particles = [];
  const originX = fxCanvas.width / 2;
  const originY = fxCanvas.height / 2;

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 3 + Math.random() * 8;
    particles.push({
      x: originX,
      y: originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      size: 2 + Math.random() * 3.5,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 1,
      decay: 0.015 + Math.random() * 0.02
    });
  }

  if (animFrameId) cancelAnimationFrame(animFrameId);
  renderParticles(ctx);
}

function renderParticles(ctx) {
  ctx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
  let alive = false;

  particles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.18; // gravity
    p.alpha -= p.decay;

    if (p.alpha > 0) {
      alive = true;
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  });

  if (alive) {
    animFrameId = requestAnimationFrame(() => renderParticles(ctx));
  } else {
    ctx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
  }
}

// --- LocalStorage Score Persistence ---
function loadScoresFromStorage() {
  try {
    const saved = localStorage.getItem('tictactoe_scores');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (typeof parsed.X === 'number' && typeof parsed.O === 'number' && typeof parsed.draws === 'number') {
        gameState.scores = parsed;
      }
    }
  } catch (e) {
    // Ignore storage issues
  }
  updateScoreboardUI();
}

function saveScoresToStorage() {
  try {
    localStorage.setItem('tictactoe_scores', JSON.stringify(gameState.scores));
  } catch (e) {}
}

// --- UI Updates ---
function updateScoreboardUI() {
  scoreXElement.textContent = gameState.scores.X;
  scoreOElement.textContent = gameState.scores.O;
  scoreDrawElement.textContent = gameState.scores.draws;
  roundDisplay.textContent = `Round #${gameState.round}`;
}

function updateTurnIndicator() {
  boardElement.setAttribute('data-turn', gameState.currentPlayer);

  if (gameState.currentPlayer === 'X') {
    turnBadge.textContent = 'X';
    turnBadge.className = 'turn-badge turn-x';
    statusMessage.textContent = "Player X's Turn";
  } else {
    turnBadge.textContent = 'O';
    turnBadge.className = 'turn-badge turn-o';
    if (gameState.gameMode === 'pve') {
      statusMessage.textContent = gameState.isAiThinking ? "AI is computing..." : "Computer (O)'s Turn";
    } else {
      statusMessage.textContent = "Player O's Turn";
    }
  }
}

/**
 * Returns crisp SVG element for X or O mark
 */
function createMarkSvg(symbol) {
  const container = document.createElement('div');
  container.className = `mark mark-${symbol.toLowerCase()}`;

  if (symbol === 'X') {
    container.innerHTML = `
      <svg viewBox="0 0 50 50" fill="none" stroke="currentColor" stroke-width="6.5" stroke-linecap="round">
        <path d="M12 12 L38 38" />
        <path d="M38 12 L12 38" />
      </svg>
    `;
  } else {
    container.innerHTML = `
      <svg viewBox="0 0 50 50" fill="none" stroke="currentColor" stroke-width="6.5">
        <circle cx="25" cy="25" r="16" />
      </svg>
    `;
  }
  return container;
}

// --- Winning Strike Line Calculation ---
function drawStrikeThrough(winningCombo, winner) {
  const [a, , c] = winningCombo;
  const cellA = cells[a];
  const cellC = cells[c];

  const boardRect = boardElement.getBoundingClientRect();
  const rectA = cellA.getBoundingClientRect();
  const rectC = cellC.getBoundingClientRect();

  // Coordinates relative to the board SVG
  const x1 = (rectA.left + rectA.width / 2) - boardRect.left;
  const y1 = (rectA.top + rectA.height / 2) - boardRect.top;
  const x2 = (rectC.left + rectC.width / 2) - boardRect.left;
  const y2 = (rectC.top + rectC.height / 2) - boardRect.top;

  strikeSvg.setAttribute('viewBox', `0 0 ${boardRect.width} ${boardRect.height}`);
  strikeLine.setAttribute('x1', x1);
  strikeLine.setAttribute('y1', y1);
  strikeLine.setAttribute('x2', x2);
  strikeLine.setAttribute('y2', y2);

  const strokeColor = winner === 'X' ? 'var(--neon-cyan)' : 'var(--neon-purple)';
  strikeLine.style.stroke = strokeColor;
  strikeLine.style.filter = `drop-shadow(0 0 10px ${winner === 'X' ? 'var(--neon-cyan-glow)' : 'var(--neon-purple-glow)'})`;
  strikeLine.classList.remove('animate-strike');
  // Trigger reflow for animation restart
  void strikeLine.offsetWidth;
  strikeLine.classList.add('animate-strike');
}

function clearStrikeLine() {
  strikeLine.classList.remove('animate-strike');
  strikeLine.setAttribute('x1', '0');
  strikeLine.setAttribute('y1', '0');
  strikeLine.setAttribute('x2', '0');
  strikeLine.setAttribute('y2', '0');
}

// --- Win and Draw Evaluations ---
function checkWin(board) {
  for (let combo of WINNING_COMBINATIONS) {
    const [a, b, c] = combo;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], combo: combo };
    }
  }
  return null;
}

function checkDraw(board) {
  return board.every(cell => cell !== '');
}

/**
 * Handles Game Over (Victory or Draw)
 */
function handleGameOver(result) {
  gameState.gameActive = false;
  boardElement.classList.add('game-over');

  if (result.winner) {
    const winner = result.winner;
    gameState.scores[winner] += 1;
    saveScoresToStorage();
    updateScoreboardUI();

    // Highlight winning 3 cells
    result.combo.forEach(index => {
      cells[index].classList.add('winning-cell', `win-${winner.toLowerCase()}`);
    });

    // Draw visual laser line through cells
    drawStrikeThrough(result.combo, winner);

    // Audio and particles
    playSound('win');
    triggerParticles(winner);

    // Update status bar
    const winnerName = (winner === 'O' && gameState.gameMode === 'pve') ? 'Computer' : `Player ${winner}`;
    statusMessage.textContent = `${winnerName} Wins!`;

    // Show victory banner
    bannerIcon.textContent = winner === 'X' ? '⚡' : '🔮';
    bannerTitle.textContent = `${winnerName} Victorious!`;
    bannerTitle.className = `winner-banner-title color-${winner.toLowerCase()}`;
    bannerDesc.textContent = `Magnificent tactical execution in Round ${gameState.round}.`;
  } else {
    // Draw
    gameState.scores.draws += 1;
    saveScoresToStorage();
    updateScoreboardUI();
    playSound('draw');

    statusMessage.textContent = "Tactical Stalemate (Draw)";
    bannerIcon.textContent = '⚖️';
    bannerTitle.textContent = "Tactical Stalemate";
    bannerTitle.className = "winner-banner-title color-draw";
    bannerDesc.textContent = "Both players matched strategic moves perfectly.";
  }

  // Display Winner Banner after brief delay
  setTimeout(() => {
    winnerBanner.classList.add('visible');
  }, 450);
}

// --- Player Move Handler ---
function handleCellClick(e) {
  const cell = e.currentTarget;
  const index = parseInt(cell.getAttribute('data-cell'), 10);

  // Validation: empty cell, game must be active, AI shouldn't be processing
  if (!gameState.gameActive || gameState.board[index] !== '' || gameState.isAiThinking) {
    return;
  }

  // Execute Human Player Move
  executeMove(index, gameState.currentPlayer);

  // If game is still active and in PvE mode, trigger AI move
  if (gameState.gameActive && gameState.gameMode === 'pve' && gameState.currentPlayer === 'O') {
    gameState.isAiThinking = true;
    updateTurnIndicator();

    // Natural tactical thinking pause (350ms - 500ms)
    setTimeout(() => {
      if (!gameState.gameActive) {
        gameState.isAiThinking = false;
        return;
      }
      makeAiMove();
      gameState.isAiThinking = false;
      if (gameState.gameActive) {
        updateTurnIndicator();
      }
    }, 420);
  }
}

/**
 * Places mark on board and updates game state
 */
function executeMove(index, player) {
  gameState.board[index] = player;
  const cell = cells[index];
  cell.classList.add('occupied');
  cell.appendChild(createMarkSvg(player));

  playSound(player === 'X' ? 'move-x' : 'move-o');

  // Check for Win or Draw
  const winResult = checkWin(gameState.board);
  if (winResult) {
    handleGameOver(winResult);
    return;
  }

  if (checkDraw(gameState.board)) {
    handleGameOver({ winner: null });
    return;
  }

  // Switch Player Turn
  gameState.currentPlayer = gameState.currentPlayer === 'X' ? 'O' : 'X';
  updateTurnIndicator();
}

// --- AI Opponent Engine (Casual & Master Minimax) ---
function getEmptyIndices(board) {
  const empty = [];
  board.forEach((val, idx) => {
    if (val === '') empty.push(idx);
  });
  return empty;
}

function makeAiMove() {
  const availableMoves = getEmptyIndices(gameState.board);
  if (availableMoves.length === 0) return;

  let chosenIndex;

  if (gameState.aiDifficulty === 'casual') {
    // Casual AI: 60% chance to block or win, 40% random play
    const immediateWinOrBlock = findWinningOrBlockingMove();
    if (immediateWinOrBlock !== null && Math.random() < 0.65) {
      chosenIndex = immediateWinOrBlock;
    } else {
      // Pick random available cell
      chosenIndex = availableMoves[Math.floor(Math.random() * availableMoves.length)];
    }
  } else {
    // Master AI: Unbeatable Minimax Algorithm
    chosenIndex = getBestMoveMinimax(gameState.board);
  }

  if (chosenIndex !== undefined && chosenIndex !== null) {
    executeMove(chosenIndex, 'O');
  }
}

/**
 * Checks for immediate 1-move win for O, or blocks imminent win for X
 */
function findWinningOrBlockingMove() {
  const empty = getEmptyIndices(gameState.board);

  // 1. Can O win immediately?
  for (let idx of empty) {
    gameState.board[idx] = 'O';
    if (checkWin(gameState.board)) {
      gameState.board[idx] = '';
      return idx;
    }
    gameState.board[idx] = '';
  }

  // 2. Can X win immediately? Block them!
  for (let idx of empty) {
    gameState.board[idx] = 'X';
    if (checkWin(gameState.board)) {
      gameState.board[idx] = '';
      return idx;
    }
    gameState.board[idx] = '';
  }

  return null;
}

/**
 * Minimax recursive decision algorithm for optimal AI play
 */
function getBestMoveMinimax(currentBoard) {
  let bestScore = -Infinity;
  let bestMove = null;
  const empty = getEmptyIndices(currentBoard);

  // Center opening priority optimization if empty
  if (currentBoard[4] === '' && Math.random() < 0.8) {
    return 4;
  }

  for (let move of empty) {
    currentBoard[move] = 'O';
    let score = minimax(currentBoard, 0, false);
    currentBoard[move] = '';
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove !== null ? bestMove : empty[0];
}

function minimax(board, depth, isMaximizing) {
  const win = checkWin(board);
  if (win) {
    return win.winner === 'O' ? (10 - depth) : (depth - 10);
  }
  if (checkDraw(board)) {
    return 0;
  }

  const empty = getEmptyIndices(board);

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (let move of empty) {
      board[move] = 'O';
      let evaluation = minimax(board, depth + 1, false);
      board[move] = '';
      maxEval = Math.max(maxEval, evaluation);
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (let move of empty) {
      board[move] = 'X';
      let evaluation = minimax(board, depth + 1, true);
      board[move] = '';
      minEval = Math.min(minEval, evaluation);
    }
    return minEval;
  }
}

// --- Round Reset & Score Reset ---
/**
 * Starts a new round while keeping existing scores
 */
function restartRound() {
  playSound('button');
  winnerBanner.classList.remove('visible');

  // Reset board data
  gameState.board = Array(9).fill('');
  gameState.currentPlayer = 'X';
  gameState.gameActive = true;
  gameState.isAiThinking = false;
  gameState.round += 1;

  // Clean Board UI
  boardElement.classList.remove('game-over');
  cells.forEach(cell => {
    cell.innerHTML = '';
    cell.className = 'cell';
  });

  clearStrikeLine();
  updateTurnIndicator();
  updateScoreboardUI();
}

/**
 * Resets all scores to 0 and begins fresh game session
 */
function resetAllScores() {
  playSound('button');
  gameState.scores = { X: 0, O: 0, draws: 0 };
  gameState.round = 1;
  saveScoresToStorage();
  updateScoreboardUI();
  restartRound();
}

// --- Mode & Difficulty Switchers ---
function setGameMode(mode) {
  if (gameState.gameMode === mode) return;
  playSound('button');
  gameState.gameMode = mode;

  if (mode === 'pvp') {
    pvpModeBtn.classList.add('active');
    pveModeBtn.classList.remove('active');
    playerOLabel.textContent = 'Player O';
    aiDifficultyGroup.style.display = 'none';
  } else {
    pveModeBtn.classList.add('active');
    pvpModeBtn.classList.remove('active');
    playerOLabel.textContent = 'Computer (O)';
    aiDifficultyGroup.style.display = 'flex';
  }

  restartRound();
}

function setAiDifficulty(diff) {
  if (gameState.aiDifficulty === diff) return;
  playSound('button');
  gameState.aiDifficulty = diff;

  if (diff === 'casual') {
    diffCasualBtn.classList.add('active');
    diffMasterBtn.classList.remove('active');
  } else {
    diffMasterBtn.classList.add('active');
    diffCasualBtn.classList.remove('active');
  }
}

function toggleSound() {
  gameState.soundEnabled = !gameState.soundEnabled;
  soundIcon.textContent = gameState.soundEnabled ? '🔊' : '🔇';
  soundToggleBtn.setAttribute('aria-label', gameState.soundEnabled ? 'Mute Sound' : 'Enable Sound');
  if (gameState.soundEnabled) {
    playSound('button');
  }
}

// --- Event Listeners Initialization ---
function initEventListeners() {
  // Cell clicks
  cells.forEach(cell => {
    cell.addEventListener('click', handleCellClick);
    cell.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        cell.click();
      }
    });
  });

  // Action Buttons
  restartBtn.addEventListener('click', restartRound);
  resetScoreBtn.addEventListener('click', resetAllScores);
  bannerNextBtn.addEventListener('click', restartRound);

  // Mode Selection
  pvpModeBtn.addEventListener('click', () => setGameMode('pvp'));
  pveModeBtn.addEventListener('click', () => setGameMode('pve'));

  // AI Difficulty
  diffCasualBtn.addEventListener('click', () => setAiDifficulty('casual'));
  diffMasterBtn.addEventListener('click', () => setAiDifficulty('master'));

  // Audio Toggle
  soundToggleBtn.addEventListener('click', toggleSound);

  // Resize listener for strike-line and canvas
  window.addEventListener('resize', () => {
    if (fxCanvas) {
      fxCanvas.width = window.innerWidth;
      fxCanvas.height = window.innerHeight;
    }
  });
}

// --- Application Bootstrapping ---
document.addEventListener('DOMContentLoaded', () => {
  loadScoresFromStorage();
  updateTurnIndicator();
  initEventListeners();
});
