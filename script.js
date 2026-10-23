(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  const CELL = 24;
  const COLS = canvas.width / CELL;
  const ROWS = canvas.height / CELL;

  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');
  const speedLabelEl = document.getElementById('speedLabel');
  const startOverlay = document.getElementById('startOverlay');
  const gameOverOverlay = document.getElementById('gameOverOverlay');
  const finalScoreText = document.getElementById('finalScoreText');
  const startBtn = document.getElementById('startBtn');
  const restartBtn = document.getElementById('restartBtn');

  const FOOD_TYPES = [
    { emoji: '🪱', points: 1, weight: 60, speedUp: 0 },
    { emoji: '🐛', points: 2, weight: 30, speedUp: 0 },
    { emoji: '🪲', points: 3, weight: 10, speedUp: 10 },
  ];

  const BASE_INTERVAL = 160;
  const MIN_INTERVAL = 70;

  let mole, dir, nextDir, food, score, best, interval, timer, running, paused;

  function randInt(n) { return Math.floor(Math.random() * n); }

  function loadBest() {
    try { return parseInt(localStorage.getItem('moleMunchBest') || '0', 10); }
    catch (e) { return 0; }
  }
  function saveBest(v) {
    try { localStorage.setItem('moleMunchBest', String(v)); } catch (e) {}
  }

  function pickFoodType() {
    const total = FOOD_TYPES.reduce((s, f) => s + f.weight, 0);
    let r = Math.random() * total;
    for (const f of FOOD_TYPES) {
      if (r < f.weight) return f;
      r -= f.weight;
    }
    return FOOD_TYPES[0];
  }

  function placeFood() {
    let pos;
    do {
      pos = { x: randInt(COLS), y: randInt(ROWS) };
    } while (mole.some(seg => seg.x === pos.x && seg.y === pos.y));
    food = { ...pos, type: pickFoodType() };
  }

  function resetGame() {
    mole = [
      { x: 8, y: 10 },
      { x: 7, y: 10 },
      { x: 6, y: 10 },
    ];
    dir = { x: 1, y: 0 };
    nextDir = dir;
    score = 0;
    interval = BASE_INTERVAL;
    best = loadBest();
    scoreEl.textContent = score;
    bestEl.textContent = best;
    speedLabelEl.textContent = 'Normal';
    placeFood();
  }

  function updateSpeedLabel() {
    if (interval <= MIN_INTERVAL + 10) speedLabelEl.textContent = 'Turbo!';
    else if (interval < BASE_INTERVAL) speedLabelEl.textContent = 'Fast';
    else speedLabelEl.textContent = 'Normal';
  }

  function gameOver() {
    running = false;
    clearInterval(timer);
    if (score > best) {
      best = score;
      saveBest(best);
    }
    bestEl.textContent = best;
    finalScoreText.textContent = `You ate ${score} snack${score === 1 ? '' : 's'}!`;
    gameOverOverlay.classList.remove('hidden');
  }

  function tick() {
    dir = nextDir;
    const head = mole[0];
    const newHead = { x: head.x + dir.x, y: head.y + dir.y };

    if (newHead.x < 0 || newHead.x >= COLS || newHead.y < 0 || newHead.y >= ROWS) {
      gameOver();
      return;
    }
    if (mole.some(seg => seg.x === newHead.x && seg.y === newHead.y)) {
      gameOver();
      return;
    }

    mole.unshift(newHead);

    if (newHead.x === food.x && newHead.y === food.y) {
      score += food.type.points;
      scoreEl.textContent = score;
      if (food.type.speedUp) {
        interval = Math.max(MIN_INTERVAL, interval - food.type.speedUp);
      } else {
        interval = Math.max(MIN_INTERVAL, interval - 1);
      }
      updateSpeedLabel();
      placeFood();
      restartTimer();
    } else {
      mole.pop();
    }

    draw();
  }

  function restartTimer() {
    clearInterval(timer);
    timer = setInterval(tick, interval);
  }

  function drawRoundedCell(x, y, color, inset = 2) {
    const px = x * CELL + inset;
    const py = y * CELL + inset;
    const size = CELL - inset * 2;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(px, py, size, size, 6);
    ctx.fill();
  }

  function draw() {
    // tunnel background
    ctx.fillStyle = '#7a4f2c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= COLS; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL, 0);
      ctx.lineTo(i * CELL, canvas.height);
      ctx.stroke();
    }
    for (let j = 0; j <= ROWS; j++) {
      ctx.beginPath();
      ctx.moveTo(0, j * CELL);
      ctx.lineTo(canvas.width, j * CELL);
      ctx.stroke();
    }

    // dirt specks
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    for (let i = 0; i < 40; i++) {
      const sx = (i * 53) % canvas.width;
      const sy = (i * 97) % canvas.height;
      ctx.fillRect(sx, sy, 3, 3);
    }

    // food
    ctx.font = `${CELL - 2}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(food.type.emoji, food.x * CELL + CELL / 2, food.y * CELL + CELL / 2 + 1);

    // mole body
    for (let i = mole.length - 1; i >= 1; i--) {
      const shade = i % 2 === 0 ? '#9c6b3f' : '#8b5a2b';
      drawRoundedCell(mole[i].x, mole[i].y, shade, 3);
    }

    // mole head
    const head = mole[0];
    drawRoundedCell(head.x, head.y, '#5c3a21', 1);

    // nose direction offset
    const cx = head.x * CELL + CELL / 2;
    const cy = head.y * CELL + CELL / 2;
    const noseX = cx + dir.x * (CELL / 2 - 4);
    const noseY = cy + dir.y * (CELL / 2 - 4);
    ctx.fillStyle = '#ff8fa3';
    ctx.beginPath();
    ctx.arc(noseX, noseY, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // tiny eyes
    ctx.fillStyle = '#2a1a0f';
    const eyeOffX = dir.x !== 0 ? 0 : 6;
    const eyeOffY = dir.y !== 0 ? 0 : -4;
    ctx.beginPath();
    ctx.arc(cx - eyeOffX - (dir.y !== 0 ? 5 : 0), cy - eyeOffY - (dir.x !== 0 ? 5 : 0), 1.6, 0, Math.PI * 2);
    ctx.arc(cx + eyeOffX - (dir.y !== 0 ? -5 : 0), cy + eyeOffY - (dir.x !== 0 ? -5 : 0), 1.6, 0, Math.PI * 2);
    ctx.fill();
  }

  function setDirection(nx, ny) {
    if (!running || paused) return;
    // prevent reversing directly into own body
    if (mole.length > 1 && dir.x === -nx && dir.y === -ny) return;
    nextDir = { x: nx, y: ny };
  }

  function handleKey(e) {
    switch (e.key) {
      case 'ArrowUp': case 'w': case 'W': setDirection(0, -1); e.preventDefault(); break;
      case 'ArrowDown': case 's': case 'S': setDirection(0, 1); e.preventDefault(); break;
      case 'ArrowLeft': case 'a': case 'A': setDirection(-1, 0); e.preventDefault(); break;
      case 'ArrowRight': case 'd': case 'D': setDirection(1, 0); e.preventDefault(); break;
    }
  }

  function startGame() {
    resetGame();
    running = true;
    paused = false;
    startOverlay.classList.add('hidden');
    gameOverOverlay.classList.add('hidden');
    draw();
    restartTimer();
  }

  document.addEventListener('keydown', handleKey);
  startBtn.addEventListener('click', startGame);
  restartBtn.addEventListener('click', startGame);

  document.querySelectorAll('.dpad').forEach(btn => {
    const dirMap = {
      up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0],
    };
    const [dx, dy] = dirMap[btn.dataset.dir];
    const fire = (e) => { e.preventDefault(); setDirection(dx, dy); };
    btn.addEventListener('click', fire);
    btn.addEventListener('touchstart', fire, { passive: false });
  });

  // swipe support
  let touchStart = null;
  canvas.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    touchStart = { x: t.clientX, y: t.clientY };
  }, { passive: true });
  canvas.addEventListener('touchend', (e) => {
    if (!touchStart) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.x;
    const dy = t.clientY - touchStart.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      setDirection(dx > 0 ? 1 : -1, 0);
    } else {
      setDirection(0, dy > 0 ? 1 : -1);
    }
    touchStart = null;
  }, { passive: true });

  // initial static preview
  resetGame();
  draw();
  bestEl.textContent = loadBest();
})();
