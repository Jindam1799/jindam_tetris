const canvas = document.getElementById('tetris');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level');
const linesLeftElement = document.getElementById('lines-left');

const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const normalBtn = document.getElementById('normal-btn');
const hellBtn = document.getElementById('hell-btn');
const nextLevelBtn = document.getElementById('next-level-btn');
const gameContainer = document.getElementById('game-container');
const actionText = document.getElementById('action-text');
const itemNoti = document.getElementById('item-notification');
const gameOverUI = document.getElementById('game-over-ui');
const lobbyUI = document.getElementById('lobby-ui');
const levelClearUI = document.getElementById('level-clear-ui');
const modeText = document.getElementById('current-mode-text');

const explosionEffect = document.getElementById('explosion-effect');
const introOverlay = document.getElementById('intro-overlay');

const ROWS = 20;
const COLS = 10;
const BLOCK_SIZE = 40;
const LINES_PER_LEVEL = 30;

const COLORS = [
  null,
  '#00e5ff',
  '#2979ff',
  '#ff9100',
  '#ffea00',
  '#00e676',
  '#d500f9',
  '#ff1744',
  '#555555',
  null,
  '#ff1744',
  '#d500f9',
  '#1abc9c',
  '#ff9ff3',
  '#a29bfe',
  '#ffeaa7',
  '#fab1a0',
];

const SHAPES = [
  [],
  [[1, 1, 1, 1]],
  [
    [2, 0, 0],
    [2, 2, 2],
  ],
  [
    [0, 0, 3],
    [3, 3, 3],
  ],
  [
    [4, 4],
    [4, 4],
  ],
  [
    [0, 5, 5],
    [5, 5, 0],
  ],
  [
    [0, 6, 0],
    [6, 6, 6],
  ],
  [
    [7, 7, 0],
    [0, 7, 7],
  ],
  [],
  [],
  [],
  [],
  [
    [12, 0, 12],
    [12, 12, 12],
  ],
  [
    [0, 13, 0],
    [13, 13, 13],
    [0, 13, 0],
  ],
  [
    [14, 0, 0],
    [14, 0, 0],
    [14, 14, 14],
  ],
  [
    [15, 15],
    [15, 0],
  ],
  [
    [16, 0, 0],
    [16, 16, 0],
    [0, 16, 16],
  ],
];

let board = [];
let piece = null;
let nextPieces = [];
let dropCounter = 0;
let dropInterval = 500;
let lastTime = 0;
let animationId = null;

let score = 0;
let levelScoreStart = 0;
let level = 1;
let totalLinesCleared = 0;
let quizGauge = 0;
let actionCombo = 0;
let maxComboThisLevel = 0;
let gameState = 'IDLE';
let quizTimerId = null;
let timeLeft = 5;
let currentMode = 'NORMAL';
let levelStartTime = 0;

let skyGarbages = [];
let skyGarbageTimer = 0;
let skyGarbageInterval = 15000;

// ✨ 새로운 페널티 시스템 변수들
let randomEventTimer = 0;
let randomEventInterval = 15000; // 15초마다 페널티 발생 여부 체크
let isReversed = false;
let reverseTimeoutId = null;

let unusedQuizzes = [];
let isIntroActive = true;
let currentBGM = null;

const bgmLobby = new Audio('lobby.mp3');
const bgmOver = new Audio('over.mp3');
bgmLobby.loop = true;
bgmOver.loop = true;
bgmLobby.volume = 0.3;
bgmOver.volume = 0.4;

const sfxDrop = new Audio('drop.mp3');
const sfxClear = new Audio('clear.mp3');
const sfxBomb = new Audio('bomb.mp3');
const sfxRight = new Audio('right.mp3');
const sfxError = new Audio('error.mp3');
const sfxBroken = new Audio('broken.mp3');

sfxDrop.volume = 0.5;
sfxClear.volume = 0.7;
sfxBomb.volume = 0.8;
sfxRight.volume = 0.6;
sfxError.volume = 0.6;
sfxBroken.volume = 0.7;

function playSound(audioObj) {
  audioObj.currentTime = 0;
  audioObj.play().catch((e) => console.log('사운드 재생 대기됨'));
}

function switchBGM(newAudio) {
  [bgmLobby, bgmOver].forEach((audio) => {
    audio.pause();
    audio.currentTime = 0;
  });
  if (currentBGM && currentBGM !== bgmLobby && currentBGM !== bgmOver) {
    currentBGM.pause();
    currentBGM.currentTime = 0;
  }
  currentBGM = newAudio;
  currentBGM.play().catch((e) => console.log('BGM 재생 대기'));
}

function playRandomBGM() {
  const bgmFiles =
    currentMode === 'HELL'
      ? ['hell.mp3', 'hell2.mp3']
      : ['normal.mp3', 'normal2.mp3'];
  const track = bgmFiles[Math.floor(Math.random() * bgmFiles.length)];
  const newGameBGM = new Audio(track);
  newGameBGM.loop = true;
  newGameBGM.volume = 0.4;
  switchBGM(newGameBGM);
}

function createMatrix(w, h) {
  const matrix = [];
  while (h--) matrix.push(new Array(w).fill(0));
  return matrix;
}

function generateRandomPiece() {
  let typeId;
  if (currentMode === 'HELL' && Math.random() < 0.1) {
    const specialPool = [12, 13, 14, 15, 16];
    typeId = specialPool[Math.floor(Math.random() * specialPool.length)];
  } else {
    const normalPool = [1, 2, 3, 4, 5, 6, 7];
    typeId = normalPool[Math.floor(Math.random() * normalPool.length)];
  }
  return { matrix: SHAPES[typeId].map((row) => [...row]), pos: { x: 0, y: 0 } };
}

function spawnSkyGarbage() {
  const count = Math.floor(Math.random() * 2) + 1;
  for (let i = 0; i < count; i++) {
    const x = Math.floor(Math.random() * COLS);
    if (board[0][x] === 0)
      skyGarbages.push({ x: x, y: -1 - Math.random() * 2 });
  }
  if (skyGarbages.length > 0) {
    itemNoti.innerText = '⚠️ 방해 블록 낙하!';
    itemNoti.style.color = '#e74c3c';
    itemNoti.classList.remove('hidden', 'fade-out');
    setTimeout(() => {
      itemNoti.classList.add('fade-out');
      setTimeout(() => itemNoti.classList.add('hidden'), 500);
    }, 1000);
  }
}

// ✨ 새로운 1: 방향키 반전 페널티
function applyReversePenalty() {
  itemNoti.innerText = '⚠️ 방향키 반전!';
  itemNoti.style.color = '#e74c3c';
  itemNoti.classList.remove('hidden', 'fade-out');
  setTimeout(() => {
    itemNoti.classList.add('fade-out');
    setTimeout(() => itemNoti.classList.add('hidden'), 500);
  }, 1500);

  isReversed = true;
  triggerEffect('shake-penalty');

  clearTimeout(reverseTimeoutId);
  reverseTimeoutId = setTimeout(() => {
    isReversed = false;
    itemNoti.innerText = '✅ 방향키 원상복구!';
    itemNoti.style.color = '#2ecc71';
    itemNoti.classList.remove('hidden', 'fade-out');
    setTimeout(() => {
      itemNoti.classList.add('fade-out');
      setTimeout(() => itemNoti.classList.add('hidden'), 500);
    }, 1000);
  }, 5000); // 5초 지속
}

// ✨ 새로운 2: 보드 셔플 (블록 엎기) 페널티
function applyShufflePenalty() {
  itemNoti.innerText = '⚠️ 보드 셔플!';
  itemNoti.style.color = '#d500f9'; // 보라색
  itemNoti.classList.remove('hidden', 'fade-out');
  setTimeout(() => {
    itemNoti.classList.add('fade-out');
    setTimeout(() => itemNoti.classList.add('hidden'), 500);
  }, 1500);

  playSound(sfxBroken);
  triggerEffect('shake-bomb');

  // 1. 현재 보드의 모든 블록 수거
  let blocks = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (board[y][x] !== 0) {
        blocks.push(board[y][x]);
        board[y][x] = 0; // 보드 초기화
      }
    }
  }

  if (blocks.length === 0) return; // 엎을 블록이 없으면 종료

  // 2. 수거한 블록 순서 섞기
  shuffleArray(blocks);

  // 3. 밑바닥부터 대충 흩뿌리기
  let totalBlocks = blocks.length;
  let rowsNeeded = Math.ceil(totalBlocks / COLS);
  let safeRows = Math.max(5, rowsNeeded + 2); // 맨 위로 튀어나와 즉사하지 않게 하단부에만 배치
  let startRow = ROWS - safeRows;
  if (startRow < 0) startRow = 0;

  for (let i = 0; i < blocks.length; i++) {
    let placed = false;
    let attempts = 0;
    while (!placed && attempts < 100) {
      let ry = startRow + Math.floor(Math.random() * (ROWS - startRow));
      let rx = Math.floor(Math.random() * COLS);
      if (board[ry][rx] === 0) {
        board[ry][rx] = blocks[i];
        placed = true;
      }
      attempts++;
    }
  }

  // 4. 공중에 뜬 블록들을 바닥으로 (중력 적용)
  for (let x = 0; x < COLS; x++) {
    let col = [];
    for (let y = ROWS - 1; y >= 0; y--) {
      if (board[y][x] !== 0) col.push(board[y][x]);
    }
    for (let y = ROWS - 1; y >= 0; y--) {
      board[y][x] = col.length > 0 ? col.shift() : 0;
    }
  }

  // 셔플 덕분에 우연히 줄이 맞춰졌을 수 있으니 스윕 체크
  sweep();
}

// ✨ 페널티 발생 여부 계산 로직
function triggerRandomPenalty() {
  let canTrigger = false;
  let chance = 0;

  if (currentMode === 'HELL') {
    canTrigger = true;
    chance = 0.2 + level * 0.05; // HELL: 레벨 1부터 25% 확률로 시작하여 지속 증가
  } else {
    if (level >= 4) {
      canTrigger = true;
      chance = 0.1 + (level - 4) * 0.1; // NORMAL: 레벨 4부터 10% 확률로 등장
    }
  }

  if (!canTrigger) return;
  if (Math.random() > chance) return; // 확률에 당첨되지 않으면 무사 통과

  // 당첨 시 둘 중 하나 무작위 실행
  if (Math.random() < 0.5) {
    applyReversePenalty();
  } else {
    applyShufflePenalty();
  }
}

function triggerEffect(className) {
  gameContainer.classList.remove(
    'shake-penalty',
    'shake-bomb',
    'shake-clear',
    'shake-tetris',
    'shake-drop',
  );
  void gameContainer.offsetWidth;
  gameContainer.classList.add(className);
}

function drawItemIcon(context, value, x, y) {
  if (value === 10 || value === 11) {
    context.font = '24px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    const icon = value === 10 ? '💣' : '⏬';
    context.shadowColor = 'rgba(0,0,0,0.8)';
    context.shadowBlur = 4;
    context.fillText(icon, x + BLOCK_SIZE / 2, y + BLOCK_SIZE / 2 + 2);
    context.shadowBlur = 0;
  }
}

function draw3DBlock(context, value, x, y) {
  context.fillStyle = COLORS[value];
  context.fillRect(x, y, BLOCK_SIZE, BLOCK_SIZE);

  context.fillStyle = 'rgba(255, 255, 255, 0.4)';
  context.fillRect(x, y, BLOCK_SIZE, BLOCK_SIZE * 0.2);
  context.fillStyle = 'rgba(255, 255, 255, 0.15)';
  context.fillRect(x, y + BLOCK_SIZE * 0.2, BLOCK_SIZE, BLOCK_SIZE * 0.2);

  context.fillStyle = 'rgba(0, 0, 0, 0.4)';
  context.fillRect(x, y + BLOCK_SIZE * 0.8, BLOCK_SIZE, BLOCK_SIZE * 0.2);
  context.fillStyle = 'rgba(0, 0, 0, 0.2)';
  context.fillRect(x, y + BLOCK_SIZE * 0.6, BLOCK_SIZE, BLOCK_SIZE * 0.2);

  context.strokeStyle = value === 10 || value === 11 ? '#FFF' : '#111';
  context.lineWidth = value === 10 || value === 11 ? 2 : 1;
  context.strokeRect(x, y, BLOCK_SIZE, BLOCK_SIZE);
}

function drawNext() {
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  nextPieces.forEach((p, index) => {
    const offsetY = index * 4 + 1;
    const offsetX = Math.floor((4 - p.matrix[0].length) / 2);
    p.matrix.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value !== 0) {
          const blockX = (x + offsetX) * BLOCK_SIZE;
          const blockY = (y + offsetY) * BLOCK_SIZE;
          draw3DBlock(nextCtx, value, blockX, blockY);
          drawItemIcon(nextCtx, value, blockX, blockY);
        }
      });
    });
  });
}

function spawnPiece() {
  piece = nextPieces.shift();
  nextPieces.push(generateRandomPiece());
  piece.pos.x = Math.floor(COLS / 2) - Math.floor(piece.matrix[0].length / 2);
  piece.pos.y = 0;

  if (collide(board, piece)) {
    gameState = 'GAME_OVER';
    switchBGM(bgmOver);
    document.getElementById('final-score').innerText = score;
    document.getElementById('final-level').innerText = level;
    document.getElementById('final-lines').innerText = totalLinesCleared;
    gameOverUI.classList.remove('hidden');
    cancelAnimationFrame(animationId);
    return;
  }

  drawNext();

  let isItemBlock = false;
  piece.matrix.forEach((row) => {
    row.forEach((val) => {
      if (val === 10 || val === 11) isItemBlock = true;
    });
  });

  if (isItemBlock) gameState = 'PLAYING';
  else triggerQuiz();
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function triggerQuiz() {
  gameState = 'QUIZ';

  if (unusedQuizzes.length === 0) {
    unusedQuizzes = [...VOCAB_LIST];
  }

  const randomIndex = Math.floor(Math.random() * unusedQuizzes.length);
  const currentQuiz = unusedQuizzes.splice(randomIndex, 1)[0];

  let options = [currentQuiz];
  while (options.length < 4) {
    let randomWrong = VOCAB_LIST[Math.floor(Math.random() * VOCAB_LIST.length)];
    if (!options.some((opt) => opt.kr === randomWrong.kr)) {
      options.push(randomWrong);
    }
  }
  options = shuffleArray(options);

  const correctIndex = options.findIndex((opt) => opt.kr === currentQuiz.kr);

  document.getElementById('quiz-word').innerText = currentQuiz.kr;
  document.getElementById('quiz-question').innerText =
    '알맞은 중국어 표현을 고르세요';

  const optionsDiv = document.getElementById('quiz-options');
  optionsDiv.innerHTML = '';

  options.forEach((opt, index) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.innerText = `${index + 1}. ${opt.cn} (${opt.py})`;
    btn.onclick = () => checkAnswer(index, correctIndex);
    optionsDiv.appendChild(btn);
  });

  document.getElementById('quiz-ui').classList.remove('hidden');

  // ✨ 요청에 따라 퀴즈 제한 시간은 무조건 5초로 고정!
  timeLeft = 5;

  document.getElementById('time-left').innerText = timeLeft;

  clearInterval(quizTimerId);
  quizTimerId = setInterval(() => {
    timeLeft--;
    document.getElementById('time-left').innerText = timeLeft;
    if (timeLeft <= 0) {
      playSound(sfxError);
      handleQuizFail();
    }
  }, 1000);
}

function updateGaugeUI() {
  for (let i = 1; i <= 5; i++) {
    const slot = document.getElementById(`slot-${i}`);
    if (i <= quizGauge) slot.classList.add('filled');
    else slot.classList.remove('filled');
  }
}

function checkAnswer(selectedIndex, correctIndex) {
  clearInterval(quizTimerId);
  document.getElementById('quiz-ui').classList.add('hidden');

  if (selectedIndex === correctIndex) {
    playSound(sfxRight);
    score += timeLeft * 10;
    quizGauge++;
    updateGaugeUI();

    if (quizGauge >= 5) {
      quizGauge = 0;
      setTimeout(updateGaugeUI, 300);

      const itemType = Math.random() < 0.5 ? 10 : 11;
      itemNoti.innerText = itemType === 10 ? '💣 폭탄 장전!' : '⏬ 중력 장전!';
      itemNoti.style.color = COLORS[itemType];
      itemNoti.classList.remove('hidden', 'fade-out');

      nextPieces[0] = { matrix: [[itemType]], pos: { x: 0, y: 0 } };
      drawNext();

      setTimeout(() => {
        itemNoti.classList.add('fade-out');
        setTimeout(() => itemNoti.classList.add('hidden'), 500);
      }, 1500);
    }
    gameState = 'PLAYING';
    updateUI();
  } else {
    playSound(sfxError);
    handleQuizFail();
  }
}

function handleQuizFail() {
  clearInterval(quizTimerId);
  document.getElementById('quiz-ui').classList.add('hidden');
  quizGauge = 0;
  updateGaugeUI();

  setTimeout(() => {
    playSound(sfxBroken);
    triggerEffect('shake-penalty');
    gameState = 'PENALTY_DROP';
    addPenaltyLine();
  }, 150);
}

function addPenaltyLine() {
  board.shift();
  const penaltyRow = new Array(COLS).fill(8);
  const holeIndex = Math.floor(Math.random() * COLS);
  penaltyRow[holeIndex] = 0;
  board.push(penaltyRow);
}

function drawGrid() {
  ctx.strokeStyle =
    currentMode === 'HELL'
      ? 'rgba(255, 50, 50, 0.08)'
      : 'rgba(255, 255, 255, 0.05)';
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++)
      ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
  }
}

function drawMatrix(matrix, offset) {
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        const blockX = (x + offset.x) * BLOCK_SIZE;
        const blockY = (y + offset.y) * BLOCK_SIZE;
        draw3DBlock(ctx, value, blockX, blockY);
        drawItemIcon(ctx, value, blockX, blockY);
      }
    });
  });
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();
  drawMatrix(board, { x: 0, y: 0 });

  skyGarbages.forEach((g) => {
    if (g.y > -1) draw3DBlock(ctx, 8, g.x * BLOCK_SIZE, g.y * BLOCK_SIZE);
  });

  if (piece) drawMatrix(piece.matrix, piece.pos);
}

function collide(board, piece) {
  const m = piece.matrix;
  const o = piece.pos;
  for (let y = 0; y < m.length; ++y) {
    for (let x = 0; x < m[y].length; ++x) {
      if (m[y][x] !== 0 && (board[y + o.y] && board[y + o.y][x + o.x]) !== 0)
        return true;
    }
  }
  return false;
}

function merge(board, piece) {
  piece.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) board[y + piece.pos.y][x + piece.pos.x] = value;
    });
  });
}

function applyItemEffects(p) {
  let isBomb = false,
    isGravity = false;
  let itemX = p.pos.x,
    itemY = p.pos.y;
  let bombPixelX = 0,
    bombPixelY = 0;

  p.matrix.forEach((row, dy) => {
    row.forEach((val, dx) => {
      if (val === 10) {
        isBomb = true;
        itemX = p.pos.x + dx;
        itemY = p.pos.y + dy;
        bombPixelX = itemX * BLOCK_SIZE + BLOCK_SIZE / 2;
        bombPixelY = itemY * BLOCK_SIZE + BLOCK_SIZE / 2;
      }
      if (val === 11) {
        isGravity = true;
        itemX = p.pos.x + dx;
        itemY = p.pos.y + dy;
      }
    });
  });

  if (isBomb) {
    playSound(sfxBomb);
    triggerEffect('shake-bomb');

    explosionEffect.style.left = bombPixelX + 'px';
    explosionEffect.style.top = bombPixelY + 'px';

    explosionEffect.classList.remove('hidden', 'explode-anim');
    void explosionEffect.offsetWidth;
    explosionEffect.classList.add('explode-anim');

    setTimeout(() => {
      explosionEffect.classList.add('hidden');
      explosionEffect.classList.remove('explode-anim');
    }, 300);

    for (let y = itemY - 1; y <= itemY + 1; y++) {
      for (let x = itemX - 1; x <= itemX + 1; x++) {
        if (y >= 0 && y < ROWS && x >= 0 && x < COLS) board[y][x] = 0;
      }
    }

    let startX = Math.max(0, itemX - 2);
    let endX = Math.min(COLS - 1, itemX + 2);

    for (let x = startX; x <= endX; x++) {
      let col = [];
      for (let y = ROWS - 1; y >= 0; y--) {
        if (board[y][x] !== 0) col.push(board[y][x]);
      }
      for (let y = ROWS - 1; y >= 0; y--) {
        board[y][x] = col.length > 0 ? col.shift() : 0;
      }
    }
  }

  if (isGravity) {
    for (let x = 0; x < COLS; x++) {
      let col = [];
      for (let y = ROWS - 1; y >= 0; y--) {
        if (board[y][x] !== 0) col.push(board[y][x]);
      }
      for (let y = ROWS - 1; y >= 0; y--) {
        board[y][x] = col.length > 0 ? col.shift() : 0;
      }
    }
  }
}

function showActionText(lines, combo) {
  let msg = '';
  let color = '#FFF';

  if (lines === 2) {
    msg = 'DOUBLE!';
    color = '#00e5ff';
  } else if (lines === 3) {
    msg = 'TRIPLE!!';
    color = '#d500f9';
  } else if (lines >= 4) {
    msg = 'TETRIS!!!';
    color = '#ffea00';
  }

  if (combo > 1) {
    msg += (msg !== '' ? '\n' : '') + `${combo} COMBO!`;
    if (lines < 2) color = '#ff9100';
  }

  if (msg !== '') {
    actionText.innerText = msg;
    actionText.style.color = color;
    actionText.classList.remove('hidden', 'fade-out');
    actionText.classList.add('text-pop');

    setTimeout(() => actionText.classList.remove('text-pop'), 200);
    setTimeout(() => actionText.classList.add('fade-out'), 1000);
    setTimeout(() => actionText.classList.add('hidden'), 1500);
  }
}

function sweep() {
  const newBoard = board.filter((row) => row.some((val) => val === 0));
  let linesCleared = ROWS - newBoard.length;

  if (linesCleared > 0) {
    playSound(sfxClear);

    for (let i = 0; i < linesCleared; i++) {
      newBoard.unshift(new Array(COLS).fill(0));
    }
    board = newBoard;

    actionCombo++;
    if (actionCombo > maxComboThisLevel) maxComboThisLevel = actionCombo;

    if (!gameContainer.classList.contains('shake-bomb')) {
      if (linesCleared >= 4) triggerEffect('shake-tetris');
      else triggerEffect('shake-clear');
    }

    const lineScores = [0, 100, 300, 500, 800];
    let baseScore = lineScores[linesCleared] || 1000;
    baseScore += (actionCombo - 1) * 50;
    score += baseScore;

    let prevLevel = level;
    totalLinesCleared += linesCleared;
    level = Math.floor(totalLinesCleared / LINES_PER_LEVEL) + 1;

    showActionText(linesCleared, actionCombo);
    updateUI();

    if (level > prevLevel) {
      gameState = 'LEVEL_CLEAR';

      let timeInSeconds = Math.floor(
        (performance.now() - levelStartTime) / 1000,
      );
      let m = String(Math.floor(timeInSeconds / 60)).padStart(2, '0');
      let s = String(timeInSeconds % 60).padStart(2, '0');

      document.getElementById('level-time').innerText = `${m}:${s}`;
      document.getElementById('level-combo').innerText = maxComboThisLevel;
      document.getElementById('level-score').innerText =
        score - levelScoreStart;

      setTimeout(() => {
        levelClearUI.classList.remove('hidden');
        cancelAnimationFrame(animationId);
      }, 1200);
      return;
    }

    let baseSpeed = currentMode === 'HELL' ? 300 : 500;
    let speedDecrease = currentMode === 'HELL' ? 35 : 40;
    let minSpeed = currentMode === 'HELL' ? 60 : 100;
    dropInterval = Math.max(minSpeed, baseSpeed - (level - 1) * speedDecrease);
  } else {
    actionCombo = 0;
  }
}

function drop() {
  piece.pos.y++;
  if (collide(board, piece)) {
    piece.pos.y--;
    merge(board, piece);
    applyItemEffects(piece);
    sweep();

    if (gameState !== 'GAME_OVER' && gameState !== 'LEVEL_CLEAR') spawnPiece();
    else piece = null;
  }
  dropCounter = 0;
}

function updateUI() {
  scoreElement.innerText = score;
  levelElement.innerText = level;
  let remainder = totalLinesCleared % LINES_PER_LEVEL;
  linesLeftElement.innerText = LINES_PER_LEVEL - remainder;
}

function update(time = 0) {
  if (gameState === 'IDLE' || gameState === 'GAME_OVER') return;

  const deltaTime = time - lastTime;
  lastTime = time;

  if (gameState === 'LEVEL_CLEAR') {
    draw();
    animationId = requestAnimationFrame(update);
    return;
  }

  if (gameState !== 'QUIZ') {
    dropCounter += deltaTime;
    let currentInterval = gameState === 'PENALTY_DROP' ? 20 : dropInterval;
    if (dropCounter > currentInterval) drop();

    // 하늘 방해 쓰레기 발생
    skyGarbageTimer += deltaTime;
    if (skyGarbageTimer > skyGarbageInterval) {
      skyGarbageTimer = 0;
      spawnSkyGarbage();
    }

    // ✨ 랜덤 페널티 발생 타이머 로직
    randomEventTimer += deltaTime;
    if (randomEventTimer > randomEventInterval) {
      randomEventTimer = 0;
      triggerRandomPenalty(); // 여기서 확률 계산 후 셔플/반전 발동!
    }

    let needsSweep = false;
    for (let i = skyGarbages.length - 1; i >= 0; i--) {
      let g = skyGarbages[i];
      g.y += deltaTime / 30;
      let checkY = Math.floor(g.y);
      let hit = false;

      if (checkY >= ROWS - 1) hit = true;
      else if (checkY >= 0 && board[checkY + 1][g.x] !== 0) hit = true;

      if (hit) {
        let lockY = checkY;
        while (lockY >= 0 && board[lockY][g.x] !== 0) lockY--;

        if (lockY >= 0 && lockY < ROWS) {
          board[lockY][g.x] = 8;
          needsSweep = true;
        }
        skyGarbages.splice(i, 1);
      }
    }
    if (needsSweep) {
      triggerEffect('shake-clear');
      sweep();
    }
  }

  draw();
  animationId = requestAnimationFrame(update);
}

function closeIntro() {
  if (isIntroActive) {
    isIntroActive = false;
    introOverlay.classList.add('hidden');
    lobbyUI.classList.remove('hidden');
    switchBGM(bgmLobby);
  }
}

document.addEventListener('keydown', (event) => {
  if (
    ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(
      event.code,
    )
  ) {
    event.preventDefault();
  }

  if (isIntroActive) {
    closeIntro();
    return;
  }

  if (gameState === 'QUIZ') {
    const keyMap = { 1: 0, 2: 1, 3: 2, 4: 3 };
    if (keyMap[event.key] !== undefined) {
      const btns = document.querySelectorAll('#quiz-options .option-btn');
      if (btns[keyMap[event.key]]) btns[keyMap[event.key]].click();
    }
    return;
  }

  if (gameState !== 'PLAYING') return;

  // ✨ 방향키 반전 적용 (isReversed가 true일 때 Left와 Right가 바뀝니다)
  if (event.key === 'ArrowLeft') {
    let dir = isReversed ? 1 : -1;
    piece.pos.x += dir;
    if (collide(board, piece)) piece.pos.x -= dir;
  } else if (event.key === 'ArrowRight') {
    let dir = isReversed ? -1 : 1;
    piece.pos.x += dir;
    if (collide(board, piece)) piece.pos.x -= dir;
  } else if (event.key === 'ArrowDown') {
    drop();
  } else if (event.key === 'ArrowUp') {
    const prevMatrix = piece.matrix;
    const originalX = piece.pos.x;
    const originalY = piece.pos.y;

    const m = piece.matrix;
    piece.matrix = m[0].map((val, index) =>
      m.map((row) => row[index]).reverse(),
    );

    const kicks = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 2, y: 0 },
      { x: -2, y: 0 },
      { x: 0, y: -1 },
    ];

    let success = false;
    for (let i = 0; i < kicks.length; i++) {
      piece.pos.x = originalX + kicks[i].x;
      piece.pos.y = originalY + kicks[i].y;
      if (!collide(board, piece)) {
        success = true;
        break;
      }
    }

    if (!success) {
      piece.matrix = prevMatrix;
      piece.pos.x = originalX;
      piece.pos.y = originalY;
    }
  } else if (event.code === 'Space') {
    event.preventDefault();
    while (!collide(board, piece)) piece.pos.y++;
    piece.pos.y--;
    merge(board, piece);

    triggerEffect('shake-drop');
    playSound(sfxDrop);

    applyItemEffects(piece);
    sweep();

    if (gameState !== 'GAME_OVER' && gameState !== 'LEVEL_CLEAR') spawnPiece();
    else piece = null;

    dropCounter = 0;
  }
});

document.addEventListener('click', closeIntro);

nextLevelBtn.addEventListener('click', () => {
  levelClearUI.classList.add('hidden');

  maxComboThisLevel = 0;
  levelScoreStart = score;
  levelStartTime = performance.now();
  lastTime = performance.now();

  isReversed = false;
  clearTimeout(reverseTimeoutId);
  randomEventTimer = 0;

  let baseSpeed = currentMode === 'HELL' ? 300 : 500;
  let speedDecrease = currentMode === 'HELL' ? 35 : 40;
  let minSpeed = currentMode === 'HELL' ? 60 : 100;
  dropInterval = Math.max(minSpeed, baseSpeed - (level - 1) * speedDecrease);

  let baseGarbageInt = currentMode === 'HELL' ? 8000 : 15000;
  let minGarbageInt = currentMode === 'HELL' ? 2000 : 5000;
  skyGarbageInterval = Math.max(minGarbageInt, baseGarbageInt - level * 500);

  playRandomBGM();

  spawnPiece();
  animationId = requestAnimationFrame(update);
});

function openLobby() {
  if (animationId) cancelAnimationFrame(animationId);
  clearInterval(quizTimerId);
  if (currentBGM) currentBGM.pause();

  isReversed = false;
  clearTimeout(reverseTimeoutId);

  gameState = 'IDLE';
  document.getElementById('quiz-ui').classList.add('hidden');
  document.getElementById('game-over-ui').classList.add('hidden');
  document.getElementById('level-clear-ui').classList.add('hidden');
  document.getElementById('action-text').classList.add('hidden');
  document.getElementById('item-notification').classList.add('hidden');
  gameContainer.className = '';

  document.body.classList.remove('hell-theme');
  lobbyUI.classList.remove('hidden');

  switchBGM(bgmLobby);
}

function startGame(mode) {
  if (document.activeElement) document.activeElement.blur();

  currentMode = mode;
  lobbyUI.classList.add('hidden');

  if (mode === 'HELL') document.body.classList.add('hell-theme');
  else document.body.classList.remove('hell-theme');

  modeText.innerText =
    currentMode === 'HELL' ? '🔥 HELL MODE' : '🟢 NORMAL MODE';
  modeText.style.color = currentMode === 'HELL' ? '#e74c3c' : '#2ecc71';

  board = createMatrix(COLS, ROWS);
  score = 0;
  level = 1;
  totalLinesCleared = 0;
  quizGauge = 0;
  actionCombo = 0;
  dropCounter = 0;

  maxComboThisLevel = 0;
  levelScoreStart = 0;

  isReversed = false;
  clearTimeout(reverseTimeoutId);
  randomEventTimer = 0;

  unusedQuizzes = [...VOCAB_LIST];

  skyGarbages = [];
  skyGarbageTimer = 0;
  skyGarbageInterval = currentMode === 'HELL' ? 8000 : 15000;

  levelStartTime = performance.now();
  lastTime = performance.now();

  updateGaugeUI();

  dropInterval = currentMode === 'HELL' ? 300 : 500;
  nextPieces = [generateRandomPiece(), generateRandomPiece()];
  updateUI();

  playRandomBGM();

  spawnPiece();
  animationId = requestAnimationFrame(update);
}

normalBtn.addEventListener('click', () => startGame('NORMAL'));
hellBtn.addEventListener('click', () => startGame('HELL'));
startBtn.addEventListener('click', openLobby);
restartBtn.addEventListener('click', openLobby);
