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

const rankingUI = document.getElementById('ranking-ui');
const playerNameInput = document.getElementById('player-name');
const saveRankBtn = document.getElementById('save-rank-btn');
const rankList = document.getElementById('rank-list');
const tabNormal = document.getElementById('tab-normal');
const tabHell = document.getElementById('tab-hell');
const closeRankBtn = document.getElementById('close-rank-btn');

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
  '#4a4a4a',
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

let garbageDropTimer = 0;
let randomEventTimer = 0;
let randomEventInterval = 15000;
let isReversed = false;
let reverseTimeoutId = null;

let unusedQuizzes = [];
let isIntroActive = true;
let currentBGM = null;
let normalBlockCount = 0;

// 알림 타이머 통제용 변수
let notiTimeout1 = null;
let notiTimeout2 = null;

const bgmLobby = new Audio('lobby.mp3');
const bgmOver = new Audio('over.mp3');
bgmLobby.loop = true;
bgmOver.loop = true;
bgmLobby.volume = 0.5;
bgmOver.volume = 0.5;

const sfxDrop = new Audio('drop.mp3');
const sfxClear = new Audio('clear.mp3');
const sfxBomb = new Audio('bomb.mp3');
const sfxRight = new Audio('right.mp3');
const sfxError = new Audio('error.mp3');
const sfxBroken = new Audio('broken.mp3');
const sfxTongkuai = new Audio('tongkuai.mp3');

sfxDrop.volume = 0.7;
sfxClear.volume = 0.7;
sfxBomb.volume = 0.7;
sfxRight.volume = 0.7;
sfxError.volume = 0.7;
sfxBroken.volume = 0.7;
sfxTongkuai.volume = 0.9;

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

// ✨ 통합 팝업 알림 함수 (통쾌 텍스트와 동일한 애니메이션)
function showNotification(text, color) {
  itemNoti.innerText = text;
  itemNoti.style.color = color;

  itemNoti.classList.remove('hidden', 'fade-out', 'text-pop');
  void itemNoti.offsetWidth;
  itemNoti.classList.add('text-pop');

  clearTimeout(notiTimeout1);
  clearTimeout(notiTimeout2);

  notiTimeout1 = setTimeout(() => {
    itemNoti.classList.add('fade-out');
    notiTimeout2 = setTimeout(() => {
      itemNoti.classList.add('hidden');
      itemNoti.classList.remove('text-pop', 'fade-out');
    }, 500);
  }, 1500);
}

function triggerGameOver() {
  gameState = 'GAME_OVER';
  switchBGM(bgmOver);
  document.getElementById('final-score').innerText = score;
  document.getElementById('final-level').innerText = level;
  document.getElementById('final-lines').innerText = totalLinesCleared;
  playerNameInput.value = '';
  gameOverUI.classList.remove('hidden');
  if (animationId) cancelAnimationFrame(animationId);
}

function getRankings(mode) {
  const ranks = localStorage.getItem(`tetris_rank_${mode}`);
  return ranks ? JSON.parse(ranks) : [];
}

function saveRanking(name) {
  const ranks = getRankings(currentMode);
  const newRecord = {
    name: name,
    score: score,
    level: level,
    date: new Date().toLocaleDateString(),
  };
  ranks.push(newRecord);
  ranks.sort((a, b) => b.score - a.score);
  localStorage.setItem(
    `tetris_rank_${currentMode}`,
    JSON.stringify(ranks.slice(0, 10)),
  );
}

function renderRankings(mode) {
  const ranks = getRankings(mode);
  rankList.innerHTML = '';
  if (ranks.length === 0) {
    rankList.innerHTML =
      '<li style="justify-content: center; color: #888;">기록이 없습니다.</li>';
    return;
  }
  ranks.forEach((record, index) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span class="rank-rank">${index + 1}</span>
      <span class="rank-name">${record.name}</span>
      <span class="rank-score">${record.score}</span>
      <span class="rank-level">Lv.${record.level}</span>
    `;
    rankList.appendChild(li);
  });
}

saveRankBtn.addEventListener('click', () => {
  let name = playerNameInput.value.trim();
  if (name === '') name = 'Unknown';
  saveRanking(name);
  gameOverUI.classList.add('hidden');

  if (currentMode === 'NORMAL') {
    tabNormal.classList.add('active');
    tabHell.classList.remove('active');
  } else {
    tabHell.classList.add('active');
    tabNormal.classList.remove('active');
  }
  renderRankings(currentMode);
  rankingUI.classList.remove('hidden');
});

tabNormal.addEventListener('click', () => {
  tabNormal.classList.add('active');
  tabHell.classList.remove('active');
  renderRankings('NORMAL');
});

tabHell.addEventListener('click', () => {
  tabHell.classList.add('active');
  tabNormal.classList.remove('active');
  renderRankings('HELL');
});

closeRankBtn.addEventListener('click', () => {
  rankingUI.classList.add('hidden');
  openLobby();
});

function generateStartingObstacles(lvl) {
  if (lvl < 2) return;
  let maxObstacleHeight = Math.min(10, Math.floor(lvl * 1.5));
  let startY = ROWS - maxObstacleHeight;

  for (let y = startY; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (Math.random() < 0.35) board[y][x] = 9;
    }
    let isFull = board[y].every((val) => val !== 0);
    if (isFull) board[y][Math.floor(Math.random() * COLS)] = 0;
  }
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
    showNotification('⚠️ 乱石穿空！', '#e74c3c');
  }
}

function applyReversePenalty() {
  showNotification('⚠️ 声东击西！', '#e74c3c');
  isReversed = true;
  triggerEffect('shake-penalty');

  clearTimeout(reverseTimeoutId);
  reverseTimeoutId = setTimeout(() => {
    isReversed = false;
    showNotification('✅ 拨云见日！', '#2ecc71');
  }, 5000);
}

function applyHellShufflePenalty() {
  showNotification('⚠️ 天崩地裂！', '#d500f9');
  playSound(sfxBroken);
  triggerEffect('shake-bomb');

  let shuffleStartRow = ROWS - 4;
  if (shuffleStartRow < 0) shuffleStartRow = 0;

  let blocks = [];
  for (let y = shuffleStartRow; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (board[y][x] !== 0) {
        blocks.push(board[y][x]);
        board[y][x] = 0;
      }
    }
  }

  if (blocks.length === 0) return;
  shuffleArray(blocks);

  let availableSlots = [];
  for (let y = shuffleStartRow; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      availableSlots.push({ x: x, y: y });
    }
  }

  shuffleArray(availableSlots);

  let fillCount = Math.min(blocks.length, availableSlots.length);
  for (let i = 0; i < fillCount; i++) {
    let slot = availableSlots[i];
    board[slot.y][slot.x] = 9;
  }
  sweep();
}

function triggerRandomPenalty() {
  if (currentMode !== 'HELL') return;

  let chance = 0.2 + level * 0.05;
  if (Math.random() > chance) return;

  if (Math.random() < 0.5) applyReversePenalty();
  else applyHellShufflePenalty();
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

function triggerFlash() {
  const flash = document.getElementById('flash-effect');
  if (flash) {
    flash.classList.remove('flash-anim');
    void flash.offsetWidth;
    flash.classList.add('flash-anim');
  }
}

function spawnPiece() {
  piece = nextPieces.shift();
  nextPieces.push(generateRandomPiece());
  piece.pos.x = Math.floor(COLS / 2) - Math.floor(piece.matrix[0].length / 2);

  let topEmptyRows = 0;
  for (let r = 0; r < piece.matrix.length; r++) {
    if (piece.matrix[r].every((val) => val === 0)) topEmptyRows++;
    else break;
  }
  piece.pos.y = -topEmptyRows;

  while (collide(board, piece) && piece.pos.y > -piece.matrix.length) {
    piece.pos.y--;
  }

  if (collide(board, piece)) {
    triggerGameOver();
    return;
  }

  drawNext();

  let isItemBlock = false;
  piece.matrix.forEach((row) => {
    row.forEach((val) => {
      if (val === 10 || val === 11) isItemBlock = true;
    });
  });

  if (isItemBlock) {
    gameState = 'PLAYING';
  } else {
    normalBlockCount++;
    if (normalBlockCount % 5 === 0) triggerQuiz();
    else gameState = 'PLAYING';
  }
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

  if (unusedQuizzes.length === 0) unusedQuizzes = [...VOCAB_LIST];

  const randomIndex = Math.floor(Math.random() * unusedQuizzes.length);
  const currentQuiz = unusedQuizzes.splice(randomIndex, 1)[0];

  let options = [currentQuiz];

  while (options.length < 3) {
    let randomWrong = VOCAB_LIST[Math.floor(Math.random() * VOCAB_LIST.length)];
    if (!options.some((opt) => opt.kr === randomWrong.kr))
      options.push(randomWrong);
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

  timeLeft = 5;
  document.getElementById('time-left').innerText = timeLeft;

  clearInterval(quizTimerId);
  quizTimerId = setInterval(() => {
    timeLeft--;
    document.getElementById('time-left').innerText = timeLeft;
    if (timeLeft <= 0) {
      playSound(sfxError);
      handleQuizFail(true); // 시간 초과 오답
    }
  }, 700);
}

function updateGaugeUI() {
  for (let i = 1; i <= 5; i++) {
    const slot = document.getElementById(`slot-${i}`);
    if (i <= quizGauge) slot.classList.add('filled');
    else slot.classList.remove('filled');
  }
}

function checkAnswer(selectedIndex, correctIndex) {
  // ✨ 핵심 방어 1: 퀴즈 상태가 아니면(이미 시간초과로 넘어갔다면) 입력을 무시함
  if (gameState !== 'QUIZ') return;

  clearInterval(quizTimerId);
  document.getElementById('quiz-ui').classList.add('hidden');

  if (selectedIndex === correctIndex) {
    playSound(sfxRight);
    score += timeLeft * 10;
    quizGauge++;
    updateGaugeUI();

    showNotification('答对', '#2ecc71');

    if (quizGauge >= 5) {
      quizGauge = 0;
      setTimeout(updateGaugeUI, 300);

      const itemType = Math.random() < 0.5 ? 10 : 11;

      setTimeout(() => {
        showNotification(
          itemType === 10 ? '💣 火烧连营！' : '⏬ 泰山压顶！',
          COLORS[itemType],
        );
      }, 700);

      nextPieces[0] = { matrix: [[itemType]], pos: { x: 0, y: 0 } };
      drawNext();
    }
    gameState = 'PLAYING';
    updateUI();
  } else {
    playSound(sfxError);
    handleQuizFail(false); // 선택 오답
  }
}

function handleQuizFail(isTimeout) {
  // ✨ 핵심 방어 2: 0.5초 대기 시간 동안 키보드가 먹히지 않게 즉시 상태를 바꿈
  gameState = 'PENALTY_WAIT';

  clearInterval(quizTimerId);
  document.getElementById('quiz-ui').classList.add('hidden');
  quizGauge = 0;
  updateGaugeUI();

  if (isTimeout) {
    showNotification('超时', '#e74c3c');
  } else {
    showNotification('答错', '#e74c3c');
  }

  setTimeout(() => {
    playSound(sfxBroken);
    triggerEffect('shake-penalty');
    gameState = 'PENALTY_DROP'; // 페널티 줄이 올라올 때 상태 변경
    addPenaltyLine();
  }, 500);
}

function addPenaltyLine() {
  board.shift();
  const penaltyRow = new Array(COLS).fill(9); // 8(모래) -> 9(벽돌)로 변경
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
      if (m[y][x] !== 0) {
        let boardY = y + o.y;
        let boardX = x + o.x;
        if (boardX < 0 || boardX >= COLS || boardY >= ROWS) return true;
        if (boardY >= 0 && board[boardY][boardX] !== 0) return true;
      }
    }
  }
  return false;
}

function isOccupiedByPiece(x, y) {
  if (!piece || gameState !== 'PLAYING') return false;
  const m = piece.matrix;
  const o = piece.pos;
  for (let r = 0; r < m.length; r++) {
    for (let c = 0; c < m[r].length; c++) {
      if (m[r][c] !== 0) {
        if (o.x + c === x && o.y + r === y) return true;
      }
    }
  }
  return false;
}

function merge(board, piece) {
  piece.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        let boardY = y + piece.pos.y;
        let boardX = x + piece.pos.x;
        if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS) {
          board[boardY][boardX] = value;
        }
      }
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

    let visitedArr = createMatrix(COLS, ROWS);
    let queue = [];
    for (let x = 0; x < COLS; x++) {
      if (board[ROWS - 1][x] !== 0) {
        visitedArr[ROWS - 1][x] = 1;
        queue.push({ x: x, y: ROWS - 1 });
      }
    }

    let dirs = [
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 },
    ];
    while (queue.length > 0) {
      let curr = queue.shift();
      for (let d of dirs) {
        let nx = curr.x + d.dx;
        let ny = curr.y + d.dy;
        if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS) {
          if (board[ny][nx] !== 0 && visitedArr[ny][nx] === 0) {
            visitedArr[ny][nx] = 1;
            queue.push({ x: nx, y: ny });
          }
        }
      }
    }

    for (let x = 0; x < COLS; x++) {
      for (let y = ROWS - 2; y >= 0; y--) {
        if (board[y][x] !== 0 && visitedArr[y][x] === 0) {
          let dropY = y;
          while (dropY + 1 < ROWS && board[dropY + 1][x] === 0) dropY++;
          if (dropY !== y) {
            board[dropY][x] = board[y][x];
            board[y][x] = 0;
          }
        }
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

function showActionText(lines, combo, isTongkuai = false) {
  let msg = '';
  let color = '#FFF';

  if (isTongkuai) {
    msg = '痛快!';
    color = '#ff1744';
  } else {
    if (lines === 2) {
      msg = '双消!';
      color = '#00e5ff';
    } else if (lines === 3) {
      msg = '三消!!';
      color = '#d500f9';
    }
  }

  if (combo > 1) {
    msg += (msg !== '' ? '\n' : '') + `${combo} 连击!`;
    if (lines < 2 && !isTongkuai) color = '#ff9100';
  }

  if (msg !== '') {
    actionText.innerText = msg;
    actionText.style.color = color;
    actionText.classList.remove('hidden', 'fade-out', 'text-pop');
    void actionText.offsetWidth;
    actionText.classList.add('text-pop');

    setTimeout(() => {
      actionText.classList.add('fade-out');
      setTimeout(() => {
        actionText.classList.add('hidden');
        actionText.classList.remove('text-pop', 'fade-out');
      }, 500);
    }, 1500);
  }
}

function sweep() {
  const newBoard = board.filter((row) => row.some((val) => val === 0));
  let linesCleared = ROWS - newBoard.length;

  if (linesCleared > 0) {
    for (let i = 0; i < linesCleared; i++) {
      newBoard.unshift(new Array(COLS).fill(0));
    }
    board = newBoard;

    actionCombo++;
    if (actionCombo > maxComboThisLevel) maxComboThisLevel = actionCombo;

    if (!gameContainer.classList.contains('shake-bomb')) {
      if (linesCleared >= 4) {
        playSound(sfxTongkuai);
        triggerEffect('shake-tetris');
        triggerFlash();
        showActionText(linesCleared, actionCombo, true);
      } else {
        playSound(sfxClear);
        triggerEffect('shake-clear');
        showActionText(linesCleared, actionCombo, false);
      }
    }

    const lineScores = [0, 100, 300, 500, 800];
    let baseScore = lineScores[linesCleared] || 1000;
    baseScore += (actionCombo - 1) * 50;
    score += baseScore;

    let prevLevel = level;
    totalLinesCleared += linesCleared;
    level = Math.floor(totalLinesCleared / LINES_PER_LEVEL) + 1;

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
    let isCompletelyOffscreen = true;
    for (let r = 0; r < piece.matrix.length; r++) {
      for (let c = 0; c < piece.matrix[r].length; c++) {
        if (piece.matrix[r][c] !== 0 && piece.pos.y + r >= 0) {
          isCompletelyOffscreen = false;
        }
      }
    }
    if (isCompletelyOffscreen) {
      triggerGameOver();
      return;
    }

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

    skyGarbageTimer += deltaTime;
    if (skyGarbageTimer > skyGarbageInterval) {
      skyGarbageTimer = 0;
      spawnSkyGarbage();
    }

    randomEventTimer += deltaTime;
    if (randomEventTimer > randomEventInterval) {
      randomEventTimer = 0;
      triggerRandomPenalty();
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
        if (lockY < 0) {
          triggerGameOver();
          return;
        }
        while (lockY >= 0 && board[lockY][g.x] !== 0) lockY--;
        if (lockY >= 0 && lockY < ROWS) {
          board[lockY][g.x] = 8;
          needsSweep = true;
        }
        skyGarbages.splice(i, 1);
      }
    }

    garbageDropTimer += deltaTime;
    if (garbageDropTimer > 50) {
      garbageDropTimer = 0;
      let garbageMoved = false;

      for (let y = ROWS - 2; y >= 0; y--) {
        for (let x = 0; x < COLS; x++) {
          if (board[y][x] === 8) {
            if (board[y + 1][x] === 0 && !isOccupiedByPiece(x, y + 1)) {
              board[y + 1][x] = 8;
              board[y][x] = 0;
              garbageMoved = true;
            }
          }
        }
      }
      if (garbageMoved) needsSweep = true;
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
  if (rankingUI && !rankingUI.classList.contains('hidden')) return;

  if (gameState === 'QUIZ') {
    const keyMap = { 1: 0, 2: 1, 3: 2 };
    if (keyMap[event.key] !== undefined) {
      const btns = document.querySelectorAll('#quiz-options .option-btn');
      if (btns[keyMap[event.key]]) btns[keyMap[event.key]].click();
    }
    return;
  }

  if (gameState !== 'PLAYING') return;

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

    let isCompletelyOffscreen = true;
    for (let r = 0; r < piece.matrix.length; r++) {
      for (let c = 0; c < piece.matrix[r].length; c++) {
        if (piece.matrix[r][c] !== 0 && piece.pos.y + r >= 0)
          isCompletelyOffscreen = false;
      }
    }
    if (isCompletelyOffscreen) {
      triggerGameOver();
      return;
    }

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

  board = createMatrix(COLS, ROWS);
  generateStartingObstacles(level);

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
  rankingUI.classList.add('hidden');
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
  normalBlockCount = 0;
  garbageDropTimer = 0;
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
