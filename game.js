// Platanus Hack 25: Pacman Clone
// Classic arcade action - eat pellets, avoid ghosts!

// =============================================================================
// ARCADE BUTTON MAPPING - COMPLETE TEMPLATE
// =============================================================================
// Reference: See button-layout.webp at hack.platan.us/assets/images/arcade/
//
// Maps arcade button codes to keyboard keys for local testing.
// Each arcade code can map to multiple keyboard keys (array values).
// The arcade cabinet sends codes like 'P1U', 'P1A', etc. when buttons are pressed.
//
// To use in your game:
//   if (key === 'P1U') { ... }  // Works on both arcade and local (via keyboard)
//
// CURRENT GAME USAGE (Snake):
//   - P1U/P1D/P1L/P1R (Joystick) → Snake Direction
//   - P1A (Button A) or START1 (Start Button) → Restart Game
// =============================================================================

const ARCADE_CONTROLS = {
  // ===== PLAYER 1 CONTROLS =====
  // Joystick - Left hand on WASD
  'P1U': ['w'],
  'P1D': ['s'],
  'P1L': ['a'],
  'P1R': ['d'],
  'P1DL': null,  // Diagonal down-left (no keyboard default)
  'P1DR': null,  // Diagonal down-right (no keyboard default)

  // Action Buttons - Right hand on home row area (ergonomic!)
  // Top row (ABC): U, I, O  |  Bottom row (XYZ): J, K, L
  'P1A': ['u'],
  'P1B': ['i'],
  'P1C': ['o'],
  'P1X': ['j'],
  'P1Y': ['k'],
  'P1Z': ['l'],

  // Start Button
  'START1': ['1', 'Enter'],

  // ===== PLAYER 2 CONTROLS =====
  // Joystick - Right hand on Arrow Keys
  'P2U': ['ArrowUp'],
  'P2D': ['ArrowDown'],
  'P2L': ['ArrowLeft'],
  'P2R': ['ArrowRight'],
  'P2DL': null,  // Diagonal down-left (no keyboard default)
  'P2DR': null,  // Diagonal down-right (no keyboard default)

  // Action Buttons - Left hand (avoiding P1's WASD keys)
  // Top row (ABC): R, T, Y  |  Bottom row (XYZ): F, G, H
  'P2A': ['r'],
  'P2B': ['t'],
  'P2C': ['y'],
  'P2X': ['f'],
  'P2Y': ['g'],
  'P2Z': ['h'],

  // Start Button
  'START2': ['2']
};

// Build reverse lookup: keyboard key → arcade button code
const KEYBOARD_TO_ARCADE = {};
for (const [arcadeCode, keyboardKeys] of Object.entries(ARCADE_CONTROLS)) {
  if (keyboardKeys) {
    // Handle both array and single value
    const keys = Array.isArray(keyboardKeys) ? keyboardKeys : [keyboardKeys];
    keys.forEach(key => {
      KEYBOARD_TO_ARCADE[key] = arcadeCode;
    });
  }
}

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#000000',
  scene: {
    create: create,
    update: update
  }
};

const game = new Phaser.Game(config);

// Game constants
const tileSize = 18;
const mazeWidth = 28;
const mazeHeight = 30;
const offsetX = 100;
const offsetY = 50;

// Game variables
let pacman;
let ghosts = [];
let pellets = [];
let powerPellets = [];
let walls = [];
let score = 0;
let lives = 3;
let scoreText;
let livesText;
let startText;
let gameStarted = false;
let gameOver = false;
let gameWon = false;
let graphics;
let sceneRef;
let direction = { x: 0, y: 0 };
let nextDirection = { x: 0, y: 0 };
let moveTimer = 0;
let moveDelay = 120;
let ghostMoveTimer = 0;
let ghostMoveDelay = 180;
let powerMode = false;
let powerTimer = 0;
let powerDuration = 8000;
let mouthOpen = true;
let animTimer = 0;

// Simplified maze layout (1 = wall, 0 = path, 2 = pellet, 3 = power pellet)
const mazeLayout = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,1,1,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
  [1,3,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,3,1],
  [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,2,1],
  [1,2,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,2,1],
  [1,2,2,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,2,2,1],
  [1,1,1,1,1,1,2,1,1,1,1,1,0,1,1,0,1,1,1,1,1,2,1,1,1,1,1,1],
  [1,1,1,1,1,1,2,1,1,1,1,1,0,1,1,0,1,1,1,1,1,2,1,1,1,1,1,1],
  [1,1,1,1,1,1,2,1,1,0,0,0,0,0,0,0,0,0,0,1,1,2,1,1,1,1,1,1],
  [1,1,1,1,1,1,2,1,1,0,1,1,1,0,0,1,1,1,0,1,1,2,1,1,1,1,1,1],
  [1,1,1,1,1,1,2,1,1,0,1,0,0,0,0,0,0,1,0,1,1,2,1,1,1,1,1,1],
  [0,0,0,0,0,0,2,0,0,0,1,0,0,0,0,0,0,1,0,0,0,2,0,0,0,0,0,0],
  [1,1,1,1,1,1,2,1,1,0,1,0,0,0,0,0,0,1,0,1,1,2,1,1,1,1,1,1],
  [1,1,1,1,1,1,2,1,1,0,1,1,1,1,1,1,1,1,0,1,1,2,1,1,1,1,1,1],
  [1,1,1,1,1,1,2,1,1,0,0,0,0,0,0,0,0,0,0,1,1,2,1,1,1,1,1,1],
  [1,1,1,1,1,1,2,1,1,0,1,1,1,1,1,1,1,1,0,1,1,2,1,1,1,1,1,1],
  [1,1,1,1,1,1,2,1,1,0,1,1,1,1,1,1,1,1,0,1,1,2,1,1,1,1,1,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,1,1,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
  [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
  [1,3,2,2,1,1,2,2,2,2,2,2,2,0,0,2,2,2,2,2,2,2,1,1,2,2,3,1],
  [1,1,1,2,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,2,1,1,1],
  [1,2,2,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,2,2,1],
  [1,2,1,1,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,2,1],
  [1,2,1,1,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,2,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

function create() {
  sceneRef = this;
  graphics = this.add.graphics();

  // Score display
  scoreText = this.add.text(16, 16, 'SCORE: 0', {
    fontSize: '18px',
    fontFamily: 'Arial, sans-serif',
    color: '#ffffff'
  });

  // Lives display
  livesText = this.add.text(680, 16, 'LIVES: 3', {
    fontSize: '18px',
    fontFamily: 'Arial, sans-serif',
    color: '#ffffff'
  });

  // Start instructions
  startText = this.add.text(400, 300, 'PRESS SPACE TO START', {
    fontSize: '32px',
    fontFamily: 'Arial, sans-serif',
    color: '#ffff00',
    align: 'center'
  }).setOrigin(0.5);

  // Blinking animation
  this.tweens.add({
    targets: startText,
    alpha: { from: 1, to: 0.3 },
    duration: 800,
    yoyo: true,
    repeat: -1
  });

  // Instructions
  this.add.text(400, 580, 'ARROW KEYS TO MOVE', {
    fontSize: '14px',
    fontFamily: 'Arial, sans-serif',
    color: '#888888',
    align: 'center'
  }).setOrigin(0.5);

  // Initialize game
  initGame();

  // Keyboard and Arcade Button input
  this.input.keyboard.on('keydown', (event) => {
    if (!gameStarted && event.code === 'Space') {
      startGame();
      return;
    }

    if ((gameOver || gameWon) && event.code === 'KeyR') {
      restartGame();
      return;
    }

    if (!gameStarted || gameOver || gameWon) return;

    if (event.code === 'ArrowUp') {
      nextDirection = { x: 0, y: -1 };
    } else if (event.code === 'ArrowDown') {
      nextDirection = { x: 0, y: 1 };
    } else if (event.code === 'ArrowLeft') {
      nextDirection = { x: -1, y: 0 };
    } else if (event.code === 'ArrowRight') {
      nextDirection = { x: 1, y: 0 };
    }
  });

  playTone(this, 440, 0.1);
}

function initGame() {
  walls = [];
  pellets = [];
  powerPellets = [];
  ghosts = [];

  for (let y = 0; y < mazeLayout.length; y++) {
    for (let x = 0; x < mazeLayout[y].length; x++) {
      const cell = mazeLayout[y][x];

      if (cell === 1) {
        walls.push({ x, y });
      } else if (cell === 2) {
        pellets.push({ x, y, eaten: false });
      } else if (cell === 3) {
        powerPellets.push({ x, y, eaten: false });
      }
    }
  }

  // Initialize Pacman
  pacman = {
    gridX: 14,
    gridY: 23,
    x: offsetX + 14 * tileSize,
    y: offsetY + 23 * tileSize
  };

  // Initialize ghosts (4 ghosts with different colors)
  const ghostColors = [0xff0000, 0xffb8ff, 0x00ffff, 0xffb851];
  for (let i = 0; i < 4; i++) {
    ghosts.push({
      gridX: 12 + i,
      gridY: 14,
      x: offsetX + (12 + i) * tileSize,
      y: offsetY + 14 * tileSize,
      color: ghostColors[i],
      direction: { x: 0, y: -1 },
      vulnerable: false
    });
  }

  direction = { x: 0, y: 0 };
  nextDirection = { x: 0, y: 0 };
  powerMode = false;
  powerTimer = 0;
}

function startGame() {
  gameStarted = true;
  if (startText) startText.destroy();
  direction = { x: 1, y: 0 };
  nextDirection = { x: 1, y: 0 };
}

function update(_time, delta) {
  // Always draw the game
  drawGame();

  if (!gameStarted || gameOver || gameWon) return;

  animTimer += delta;
  if (animTimer > 150) {
    mouthOpen = !mouthOpen;
    animTimer = 0;
  }

  // Update power mode timer
  if (powerMode) {
    powerTimer += delta;
    if (powerTimer >= powerDuration) {
      powerMode = false;
      powerTimer = 0;
      ghosts.forEach(g => g.vulnerable = false);
    }
  }

  // Move Pacman
  moveTimer += delta;
  if (moveTimer >= moveDelay) {
    moveTimer = 0;

    // Try to change direction
    const testX = pacman.gridX + nextDirection.x;
    const testY = pacman.gridY + nextDirection.y;
    if (!isWall(testX, testY)) {
      direction = nextDirection;
    }

    // Move in current direction
    const newX = pacman.gridX + direction.x;
    const newY = pacman.gridY + direction.y;

    if (!isWall(newX, newY)) {
      pacman.gridX = newX;
      pacman.gridY = newY;

      // Wrap around
      if (pacman.gridX < 0) pacman.gridX = mazeWidth - 1;
      if (pacman.gridX >= mazeWidth) pacman.gridX = 0;

      pacman.x = offsetX + pacman.gridX * tileSize;
      pacman.y = offsetY + pacman.gridY * tileSize;

      // Check pellet collision
      checkPelletCollision();
    }
  }

  // Move ghosts
  ghostMoveTimer += delta;
  if (ghostMoveTimer >= ghostMoveDelay) {
    ghostMoveTimer = 0;
    moveGhosts();
  }

  // Check ghost collision
  checkGhostCollision();

  // Check win condition
  if (pellets.every(p => p.eaten) && powerPellets.every(p => p.eaten)) {
    winGame();
  }
}

function isWall(gridX, gridY) {
  if (gridY < 0 || gridY >= mazeLayout.length) return true;
  if (gridX < 0 || gridX >= mazeLayout[0].length) return false; // Allow wrap
  return mazeLayout[gridY][gridX] === 1;
}

function checkPelletCollision() {
  // Check regular pellets
  for (let pellet of pellets) {
    if (!pellet.eaten && pellet.x === pacman.gridX && pellet.y === pacman.gridY) {
      pellet.eaten = true;
      score += 10;
      scoreText.setText('SCORE: ' + score);
      playTone(sceneRef, 880, 0.05);
    }
  }

  // Check power pellets
  for (let pellet of powerPellets) {
    if (!pellet.eaten && pellet.x === pacman.gridX && pellet.y === pacman.gridY) {
      pellet.eaten = true;
      score += 50;
      scoreText.setText('SCORE: ' + score);
      powerMode = true;
      powerTimer = 0;
      ghosts.forEach(g => g.vulnerable = true);
      playTone(sceneRef, 660, 0.2);
    }
  }
}

function moveGhosts() {
  ghosts.forEach(ghost => {
    // Simple AI: try to move towards/away from Pacman
    let possibleDirs = [];

    // Check all 4 directions
    const dirs = [
      { x: 0, y: -1 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 1, y: 0 }
    ];

    for (let dir of dirs) {
      const newX = ghost.gridX + dir.x;
      const newY = ghost.gridY + dir.y;

      // Don't reverse direction
      if (dir.x === -ghost.direction.x && dir.y === -ghost.direction.y) continue;

      if (!isWall(newX, newY)) {
        const dist = Math.abs(newX - pacman.gridX) + Math.abs(newY - pacman.gridY);
        possibleDirs.push({ dir, dist });
      }
    }

    if (possibleDirs.length > 0) {
      // If vulnerable, run away (pick furthest). Otherwise chase (pick closest)
      possibleDirs.sort((a, b) => ghost.vulnerable ? b.dist - a.dist : a.dist - b.dist);
      ghost.direction = possibleDirs[0].dir;
    }

    // Move ghost
    ghost.gridX += ghost.direction.x;
    ghost.gridY += ghost.direction.y;

    // Wrap around
    if (ghost.gridX < 0) ghost.gridX = mazeWidth - 1;
    if (ghost.gridX >= mazeWidth) ghost.gridX = 0;

    ghost.x = offsetX + ghost.gridX * tileSize;
    ghost.y = offsetY + ghost.gridY * tileSize;
  });
}

function checkGhostCollision() {
  for (let i = 0; i < ghosts.length; i++) {
    const ghost = ghosts[i];
    if (ghost.gridX === pacman.gridX && ghost.gridY === pacman.gridY) {
      if (ghost.vulnerable) {
        // Eat ghost
        score += 200;
        scoreText.setText('SCORE: ' + score);
        ghost.gridX = 13 + i;
        ghost.gridY = 14;
        ghost.x = offsetX + ghost.gridX * tileSize;
        ghost.y = offsetY + ghost.gridY * tileSize;
        ghost.vulnerable = false;
        playTone(sceneRef, 1200, 0.15);
      } else {
        // Lose a life
        lives--;
        livesText.setText('LIVES: ' + lives);

        if (lives <= 0) {
          endGame();
        } else {
          // Reset positions
          pacman.gridX = 14;
          pacman.gridY = 23;
          pacman.x = offsetX + 14 * tileSize;
          pacman.y = offsetY + 23 * tileSize;

          for (let j = 0; j < ghosts.length; j++) {
            ghosts[j].gridX = 12 + j;
            ghosts[j].gridY = 14;
            ghosts[j].x = offsetX + (12 + j) * tileSize;
            ghosts[j].y = offsetY + 14 * tileSize;
          }

          direction = { x: 1, y: 0 };
          nextDirection = { x: 1, y: 0 };
          powerMode = false;
          playTone(sceneRef, 220, 0.3);
        }
      }
    }
  }
}

function drawGame() {
  graphics.clear();

  // Draw maze walls
  graphics.fillStyle(0x0000ff, 1);
  walls.forEach(wall => {
    graphics.fillRect(
      offsetX + wall.x * tileSize + 1,
      offsetY + wall.y * tileSize + 1,
      tileSize - 2,
      tileSize - 2
    );
  });

  // Draw pellets
  graphics.fillStyle(0xffb897, 1);
  pellets.forEach(pellet => {
    if (!pellet.eaten) {
      graphics.fillCircle(
        offsetX + pellet.x * tileSize + tileSize / 2,
        offsetY + pellet.y * tileSize + tileSize / 2,
        2
      );
    }
  });

  // Draw power pellets
  graphics.fillStyle(0xffb897, 1);
  powerPellets.forEach(pellet => {
    if (!pellet.eaten) {
      graphics.fillCircle(
        offsetX + pellet.x * tileSize + tileSize / 2,
        offsetY + pellet.y * tileSize + tileSize / 2,
        5
      );
    }
  });

  // Draw Pacman
  drawPacman();

  // Draw ghosts
  ghosts.forEach(ghost => {
    if (ghost.vulnerable) {
      const flicker = powerTimer > powerDuration - 2000 && Math.floor(powerTimer / 200) % 2;
      graphics.fillStyle(flicker ? 0xffffff : 0x0000ff, 1);
    } else {
      graphics.fillStyle(ghost.color, 1);
    }

    // Ghost body
    graphics.fillCircle(
      ghost.x + tileSize / 2,
      ghost.y + tileSize / 2 - 2,
      tileSize / 2 - 2
    );

    graphics.fillRect(
      ghost.x + 2,
      ghost.y + tileSize / 2,
      tileSize - 4,
      tileSize / 2 - 2
    );

    // Ghost eyes (unless vulnerable)
    if (!ghost.vulnerable) {
      graphics.fillStyle(0xffffff, 1);
      graphics.fillCircle(ghost.x + 6, ghost.y + 7, 2.5);
      graphics.fillCircle(ghost.x + 12, ghost.y + 7, 2.5);
      graphics.fillStyle(0x0000ff, 1);
      graphics.fillCircle(ghost.x + 6, ghost.y + 7, 1);
      graphics.fillCircle(ghost.x + 12, ghost.y + 7, 1);
    }
  });
}

function drawPacman() {
  graphics.fillStyle(0xffff00, 1);

  if (mouthOpen) {
    // Draw Pacman with mouth open
    const startAngle = direction.x === 1 ? 0.25 :
                       direction.x === -1 ? 1.25 :
                       direction.y === -1 ? 1.75 : 0.75;

    graphics.slice(
      pacman.x + tileSize / 2,
      pacman.y + tileSize / 2,
      tileSize / 2 - 2,
      Phaser.Math.DegToRad(startAngle * 180),
      Phaser.Math.DegToRad((startAngle + 1.5) * 180),
      false
    );
    graphics.fillPath();
  } else {
    // Draw Pacman with mouth closed (full circle)
    graphics.fillCircle(
      pacman.x + tileSize / 2,
      pacman.y + tileSize / 2,
      tileSize / 2 - 2
    );
  }
}

function winGame() {
  gameWon = true;

  const overlay = sceneRef.add.graphics();
  overlay.fillStyle(0x000000, 0.8);
  overlay.fillRect(0, 0, 800, 600);

  const winText = sceneRef.add.text(400, 250, 'YOU WIN!', {
    fontSize: '64px',
    fontFamily: 'Arial, sans-serif',
    color: '#ffff00',
    stroke: '#000000',
    strokeThickness: 8
  }).setOrigin(0.5);

  sceneRef.tweens.add({
    targets: winText,
    scale: { from: 1, to: 1.2 },
    duration: 800,
    yoyo: true,
    repeat: -1
  });

  sceneRef.add.text(400, 350, 'SCORE: ' + score, {
    fontSize: '36px',
    fontFamily: 'Arial, sans-serif',
    color: '#ffffff'
  }).setOrigin(0.5);

  sceneRef.add.text(400, 450, 'Press R to Play Again', {
    fontSize: '24px',
    fontFamily: 'Arial, sans-serif',
    color: '#00ffff'
  }).setOrigin(0.5);

  playTone(sceneRef, 660, 0.3);
}

function endGame() {
  gameOver = true;
  playTone(sceneRef, 220, 0.5);

  const overlay = sceneRef.add.graphics();
  overlay.fillStyle(0x000000, 0.8);
  overlay.fillRect(0, 0, 800, 600);

  const gameOverText = sceneRef.add.text(400, 250, 'GAME OVER', {
    fontSize: '64px',
    fontFamily: 'Arial, sans-serif',
    color: '#ff0000',
    stroke: '#000000',
    strokeThickness: 8
  }).setOrigin(0.5);

  sceneRef.tweens.add({
    targets: gameOverText,
    alpha: { from: 1, to: 0.5 },
    duration: 600,
    yoyo: true,
    repeat: -1
  });

  sceneRef.add.text(400, 350, 'SCORE: ' + score, {
    fontSize: '36px',
    fontFamily: 'Arial, sans-serif',
    color: '#ffffff'
  }).setOrigin(0.5);

  sceneRef.add.text(400, 450, 'Press R to Restart', {
    fontSize: '24px',
    fontFamily: 'Arial, sans-serif',
    color: '#00ffff'
  }).setOrigin(0.5);
}

function restartGame() {
  score = 0;
  lives = 3;
  gameOver = false;
  gameWon = false;
  gameStarted = false;
  moveTimer = 0;
  ghostMoveTimer = 0;
  animTimer = 0;

  scoreText.setText('SCORE: 0');
  livesText.setText('LIVES: 3');

  sceneRef.scene.restart();
}

function playTone(scene, frequency, duration) {
  const audioContext = scene.sound.context;
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.frequency.value = frequency;
  oscillator.type = 'square';

  gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration);
}
