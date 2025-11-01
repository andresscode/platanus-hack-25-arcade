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
    preload: preload,
    create: create,
    update: update
  }
};

const game = new Phaser.Game(config);

// Game constants
const tileSize = 18;
const mazeWidth = 28;
const mazeHeight = 30;
const offsetX = (800 - mazeWidth * tileSize) / 2;
const offsetY = 50;

// Game variables
let pacman;
let ghosts = [];
let pellets = [];
let powerPellets = [];
let walls = [];
let particles = [];
let score = 0;
let lives = 3;
let level = 1;
let scoreText;
let livesText;
let levelText;
let highScoreText;
let startText;
let gameStarted = false;
let gameOver = false;
let gameWon = false;
let levelComplete = false;
let graphics;
let sceneRef;
let direction = { x: 0, y: 0 };
let nextDirection = { x: 0, y: 0 };
let moveTimer = 0;
let moveDelay = 130;
let ghostMoveTimer = 0;
let ghostMoveDelay = 140;
let vulnerableGhostDelay = 180;
let powerMode = false;
let powerTimer = 0;
let powerDuration = 8000;
let mouthOpen = true;
let animTimer = 0;
let modeTimer = 0;
let modeIndex = 0;
let scatterMode = true;
let bgMusic;
let eatSound;
const modeDurations = [7000, 20000, 7000, 20000, 5000, 20000, 5000];
let highScore = 0;
let highScoreName = 'AAA';
let glowTimer = 0;
let floatingTexts = [];
let ghostEatCombo = 0;
let banana = null;
let bananaLifetime = 10000; // Banana stays for 10 seconds
let bananaSpawnedThisLevel = false;

// Maze layouts array - add more layouts here (1 = wall, 0 = path, 2 = pellet, 3 = power pellet)
// The game will cycle through layouts based on level
const mazeLayouts = [
  // Layout 1 - Classic Pacman style
  [
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
  ]
];

// Helper function to get the current maze layout based on level
function getCurrentLayout() {
  // Cycle through layouts: level 1 uses layout 0, level 2 uses layout 1, etc.
  // When we run out of layouts, cycle back to the beginning
  return mazeLayouts[(level - 1) % mazeLayouts.length];
}

function preload() {
  // Load banana image from base64
  this.load.image('banana', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAADsAAAA7AF5KHG9AAAAGXRFWHRTb2Z0d2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAAA+1JREFUWIXtlVuIVVUYx3/f2nufvfeZM5fjJI4zRoYioWEJhtpDSGnihaiXiEAQ9MmHKKggepmXbkZEUElQD/WS6KMzag/iPGhpaFAZBRE2kE7e5nLmXPY5e+/19XA845zTeElzXvQPG9Za3/f9///1rcVecA93O5zpk/7+fnftkiXB0KlT8WwZMI3BO69tOxyODhdDPy6+tWvrttky4E6NPF2lCX7BtWVvefLIbBmY6kBlVXK6uKXKVwtGx5Osbpp1A2k+naee0uZqGMXJ/e8ee+aJWTPw6ZHN64CFAL5numxpLFzK3/tmw4Do3mWZC+3l42ecrhXVzio/nTMs9GLWPzCMlNyv/dXFF++ogWiw9yVFPwIw3UUkjElHunDum0QyMWk5+2qwevyDO2XAKLq1MdGyjxiLaYtIL+dABSdbeb92tHPH/ymqhzrmnPhyxRoAqQzOLwNhI+j0jSFGSc/mwU9w5hbAilIO3vDWTLx3O8K1Y12P4iQfS5isKYx2jA0dW/nDvwxIe4STL2FLPvZyDmmLcLpLoGDL/oGMO/msrOSm/5R6BDfxOl+xQbLTZJKFiKIVj/RSO6j8boA/mgomA0gcTFsVk62hpYD0QgeqBtNW3RRLOBZ/1/nmdUX3kql82769djx3NO4KIjoru4wf18UnA9KLHaCCwkGJBuZ/qMLLTQyZBHdeAaAuXnXBtZh8CRPW6jmpSTR2ftVEfrHinHHE9iH6oIpdLBnbI8ZKk6maix3LolWvsZQa0eVSPdSzzKbyIy0Pk+QinDklNDXYS7mpQvFjpCPCBDGI3qD/oDUPLfrYkt8Sk93hlnM7BaAyOP9zYHtrveTq9wEEWwixhQD0ysZE693IpOCmiNGrorEDNbcunphWWoCTgWvXyobzJQEo71/QZ0z6s0K+NdNka0i+hDgWTQ1a8tFyBlKDpi3komAUcVPEteClyJWvMN7OyJleFs07/31U8zfkn/tzHGDqnKLB3vWKHmD6C9ngNRaZU8aE1WkV1C+SSlPeTLBFn3Qiy9mL3ZcX94wskvVjE1M10xOjgZ6dKvLJjCwAborJRUiudk2xKcQOtpLBFgNoHIPKjnDLuS+aNtdaVxno3Y6wG9RrjTXBS5FMjLgKoogomjiQGmzNvSp6VembYOPIRhG0eXkGVA72PSXW7pvpTtwa5EQg0dOyabTQGpnxioYbzx5OE/dhRPfcprIFPgssT84kDtfowHREA73rVPRt4LH/IKwgQxZ9vW3zyMnrJd7QQAPV/b0PWcMLoI8DS4G+ZkGGgd9UZUhE94SbR4ZvhvemDbRCj8zNTZRCD6CzbCN5/q/KrXLdw92NfwC57adrhk6N8AAAAABJRU5ErkJggg==')
}

function create() {
  sceneRef = this;
  graphics = this.add.graphics();

  // Load high score from localStorage
  const saved = localStorage.getItem('pacmanHighScore');
  if (saved) {
    const data = JSON.parse(saved);
    highScore = data.score || 0;
    highScoreName = data.name || 'AAA';
  }

  // Score display
  scoreText = this.add.text(16, 16, 'SCORE: 0', {
    fontSize: '18px',
    fontFamily: 'Arial, sans-serif',
    color: '#ffffff'
  });

  // Lives display
  livesText = this.add.text(708, 16, 'LIVES: 3', {
    fontSize: '18px',
    fontFamily: 'Arial, sans-serif',
    color: '#ffffff'
  });

  // Level display
  levelText = this.add.text(400, 16, 'LEVEL: 1', {
    fontSize: '18px',
    fontFamily: 'Arial, sans-serif',
    color: '#00ffff',
    align: 'center'
  }).setOrigin(0.5);

  // High score display
  highScoreText = this.add.text(400, 36, 'HI-SCORE: ' + highScore + ' (' + highScoreName + ')', {
    fontSize: '14px',
    fontFamily: 'Arial, sans-serif',
    color: '#ffff00',
    align: 'center'
  }).setOrigin(0.5);

  // Start instructions with better contrast
  startText = this.add.text(400, 300, 'PRESS SPACE TO START', {
    fontSize: '32px',
    fontFamily: 'Arial, sans-serif',
    color: '#ffffff',
    align: 'center',
    stroke: '#000000',
    strokeThickness: 8,
    backgroundColor: '#000000',
    padding: { x: 20, y: 10 }
  }).setOrigin(0.5);

  // Blinking animation with scale pulse for extra visibility
  this.tweens.add({
    targets: startText,
    scale: { from: 1, to: 1.05 },
    duration: 800,
    yoyo: true,
    repeat: -1
  });

  // Initialize game
  initGame();

  // Start background music
  startBgMusic(this);

  // Keyboard input
  this.input.keyboard.on('keydown', (event) => {
    if (!gameStarted && event.code === 'Space') {
      startGame();
      return;
    }

    if ((gameOver || gameWon) && event.code === 'KeyR') {
      restartGame();
      return;
    }

    if (levelComplete && event.code === 'Space') {
      continueToNextLevel();
      return;
    }

    if (!gameStarted || gameOver || gameWon || levelComplete) return;

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

  const currentMaze = getCurrentLayout();

  for (let y = 0; y < currentMaze.length; y++) {
    for (let x = 0; x < currentMaze[y].length; x++) {
      const cell = currentMaze[y][x];

      if (cell === 1) {
        walls.push({ x, y });
      } else if (cell === 2) {
        pellets.push({ x, y, eaten: false });
      } else if (cell === 3) {
        powerPellets.push({ x, y, eaten: false });
      }
    }
  }

  // Initialize Pacman with smooth movement
  pacman = {
    gridX: 14,
    gridY: 23,
    x: offsetX + 14 * tileSize,
    y: offsetY + 23 * tileSize,
    targetX: offsetX + 14 * tileSize,
    targetY: offsetY + 23 * tileSize,
    movingTo: null
  };

  // Initialize ghosts (4 ghosts with different colors and behaviors)
  const ghostData = [
    { color: 0xff0000, name: 'blinky', startX: 13, startY: 14, corner: { x: mazeWidth - 2, y: 0 } },
    { color: 0xffb8ff, name: 'pinky', startX: 12, startY: 14, corner: { x: 2, y: 0 } },
    { color: 0x00ffff, name: 'inky', startX: 14, startY: 14, corner: { x: mazeWidth - 2, y: mazeHeight - 2 } },
    { color: 0xffb851, name: 'clyde', startX: 15, startY: 14, corner: { x: 2, y: mazeHeight - 2 } }
  ];

  for (let i = 0; i < 4; i++) {
    const data = ghostData[i];
    const exitDelays = [0, 2000, 4000, 6000]; // Staggered ghost exits
    ghosts.push({
      gridX: data.startX,
      gridY: data.startY,
      x: offsetX + data.startX * tileSize,
      y: offsetY + data.startY * tileSize,
      targetX: offsetX + data.startX * tileSize,
      targetY: offsetY + data.startY * tileSize,
      color: data.color,
      name: data.name,
      direction: { x: 0, y: -1 },
      vulnerable: false,
      exitDelay: exitDelays[i],
      exitTimer: 0,
      inSpawn: true, // All ghosts start inside spawn
      scatterTarget: data.corner,
      visualOffset: i * 0.25,
      lastDirection: { x: 0, y: -1 }
    });
  }

  direction = { x: 0, y: 0 };
  nextDirection = { x: 0, y: 0 };
  powerMode = false;
  powerTimer = 0;
  modeTimer = 0;
  modeIndex = 0;
  scatterMode = true;
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

  if (!gameStarted || gameOver || gameWon || levelComplete) return;

  glowTimer += delta;
  animTimer += delta;
  if (animTimer > 150) {
    mouthOpen = !mouthOpen;
    animTimer = 0;
  }

  // Update particles
  updateParticles(delta);

  // Update floating texts
  updateFloatingTexts(delta);

  // Check if banana should spawn (40% of pellets eaten)
  if (!bananaSpawnedThisLevel && !banana) {
    const totalPellets = pellets.length;
    const eatenPellets = pellets.filter(p => p.eaten).length;
    const percentEaten = eatenPellets / totalPellets;

    if (percentEaten >= 0.4) {
      spawnBanana();
      bananaSpawnedThisLevel = true;
    }
  }

  // Update banana lifetime
  if (banana) {
    banana.lifetime += delta;
    if (banana.lifetime >= bananaLifetime) {
      banana.sprite.destroy();
      banana = null;
    }
  }

  // Update scatter/chase mode
  if (!powerMode && modeIndex < modeDurations.length) {
    modeTimer += delta;
    if (modeTimer >= modeDurations[modeIndex]) {
      modeTimer = 0;
      modeIndex++;
      scatterMode = !scatterMode;
    }
  }

  // Update power mode timer
  if (powerMode) {
    powerTimer += delta;
    if (powerTimer >= powerDuration) {
      powerMode = false;
      powerTimer = 0;
      ghostEatCombo = 0; // Reset combo when power mode ends
      ghosts.forEach(g => g.vulnerable = false);
    }
  }

  // Move Pacman
  moveTimer += delta;
  if (moveTimer >= moveDelay) {
    moveTimer = 0;

    // Try to change direction immediately
    const testX = pacman.gridX + nextDirection.x;
    const testY = pacman.gridY + nextDirection.y;
    if ((nextDirection.x !== 0 || nextDirection.y !== 0) && !isWall(testX, testY) && !isGhostSpawnCenter(testX, testY)) {
      direction = { ...nextDirection };
    }

    // Move in current direction
    const newX = pacman.gridX + direction.x;
    const newY = pacman.gridY + direction.y;

    if (!isWall(newX, newY) && !isGhostSpawnCenter(newX, newY)) {
      pacman.gridX = newX;
      pacman.gridY = newY;

      // Wrap around - snap position instantly to avoid weird transition
      if (pacman.gridX < 0) {
        pacman.gridX = mazeWidth - 1;
        pacman.x = offsetX + pacman.gridX * tileSize;
      }
      if (pacman.gridX >= mazeWidth) {
        pacman.gridX = 0;
        pacman.x = offsetX + pacman.gridX * tileSize;
      }

      pacman.targetX = offsetX + pacman.gridX * tileSize;
      pacman.targetY = offsetY + pacman.gridY * tileSize;

      // Check pellet collision
      checkPelletCollision();

      // Check banana collision
      checkBananaCollision();
    }
  }

  // Smooth Pacman movement (after grid movement)
  smoothMovement(pacman, delta);

  // Smooth ghost movement (always smooth)
  ghosts.forEach(g => smoothMovement(g, delta));

  // Move ghosts - use different delay for vulnerable ghosts
  ghostMoveTimer += delta;
  const currentDelay = powerMode ? vulnerableGhostDelay : ghostMoveDelay;
  if (ghostMoveTimer >= currentDelay) {
    ghostMoveTimer = 0;
    moveGhosts();
  }

  // Check ghost collision
  checkGhostCollision();

  // Check win condition - advance to next level
  if (pellets.every(p => p.eaten) && powerPellets.every(p => p.eaten)) {
    nextLevel();
  }
}

function isWall(gridX, gridY) {
  const currentMaze = getCurrentLayout();
  if (gridY < 0 || gridY >= currentMaze.length) return true;
  if (gridX < 0 || gridX >= currentMaze[0].length) return false; // Allow wrap
  return currentMaze[gridY][gridX] === 1;
}

function isGhostSpawn(gridX, gridY) {
  // Ghost spawn area boundaries
  return gridX >= 11 && gridX <= 16 && gridY >= 11 && gridY <= 17;
}

function isGhostSpawnCenter(gridX, gridY) {
  // Only the inner spawn box is blocked for Pacman
  return gridX >= 12 && gridX <= 15 && gridY >= 12 && gridY <= 15;
}

function checkPelletCollision() {
  // Check regular pellets
  for (let pellet of pellets) {
    if (!pellet.eaten && pellet.x === pacman.gridX && pellet.y === pacman.gridY) {
      pellet.eaten = true;
      score += 10;
      scoreText.setText('SCORE: ' + score);
      if (score > highScore) {
        highScoreText.setText('HI-SCORE: ' + score + ' (YOU)');
      }
      playTone(sceneRef, 880, 0.05);
    }
  }

  // Check power pellets
  for (let pellet of powerPellets) {
    if (!pellet.eaten && pellet.x === pacman.gridX && pellet.y === pacman.gridY) {
      pellet.eaten = true;
      score += 50;
      scoreText.setText('SCORE: ' + score);
      if (score > highScore) {
        highScoreText.setText('HI-SCORE: ' + score + ' (YOU)');
      }
      powerMode = true;
      powerTimer = 0;
      ghostEatCombo = 0; // Reset combo counter
      ghosts.forEach(g => g.vulnerable = true);

      // Create explosion effect for power pellet
      createParticleExplosion(
        offsetX + pellet.x * tileSize + tileSize / 2,
        offsetY + pellet.y * tileSize + tileSize / 2,
        0xffb897,
        15
      );

      playTone(sceneRef, 660, 0.2);
    }
  }
}

function getGhostTarget(ghost) {
  // Calculate target tile based on ghost personality
  if (ghost.vulnerable) {
    // Run away from Pacman
    return {
      x: ghost.gridX + (ghost.gridX - pacman.gridX) * 2,
      y: ghost.gridY + (ghost.gridY - pacman.gridY) * 2
    };
  }

  // Scatter mode - go to corners
  if (scatterMode) {
    return ghost.scatterTarget;
  }

  // Chase mode - different behaviors per ghost
  switch (ghost.name) {
    case 'blinky':
      // Red: Direct chase
      return { x: pacman.gridX, y: pacman.gridY };

    case 'pinky':
      // Pink: Ambush 4 tiles ahead
      return {
        x: pacman.gridX + direction.x * 4,
        y: pacman.gridY + direction.y * 4
      };

    case 'inky':
      // Cyan: 2 tiles ahead of Pacman, then double distance from Blinky
      const pivot = {
        x: pacman.gridX + direction.x * 2,
        y: pacman.gridY + direction.y * 2
      };
      const blinky = ghosts[0];
      return {
        x: pivot.x + (pivot.x - blinky.gridX),
        y: pivot.y + (pivot.y - blinky.gridY)
      };

    case 'clyde':
      // Orange: Chase if far (>8 tiles), scatter if close
      const dist = Math.abs(ghost.gridX - pacman.gridX) + Math.abs(ghost.gridY - pacman.gridY);
      if (dist > 8) {
        return { x: pacman.gridX, y: pacman.gridY };
      } else {
        return ghost.scatterTarget;
      }

    default:
      return { x: pacman.gridX, y: pacman.gridY };
  }
}

function moveGhosts() {
  ghosts.forEach((ghost, index) => {
    // Handle spawn exit
    if (ghost.inSpawn) {
      ghost.exitTimer += ghostMoveDelay;
      if (ghost.exitTimer >= ghost.exitDelay) {
        // Exit spawn - move to exit position
        if (ghost.gridY > 11) {
          ghost.gridY--;
          ghost.targetY = offsetY + ghost.gridY * tileSize;
        } else {
          ghost.inSpawn = false;
        }
        return;
      } else {
        // Idle in spawn - slight bobbing
        return;
      }
    }

    // Get target based on personality
    const target = getGhostTarget(ghost);
    let possibleDirs = [];

    // Check all 4 directions
    const dirs = [
      { x: 0, y: -1 }, // up
      { x: 0, y: 1 },  // down
      { x: -1, y: 0 }, // left
      { x: 1, y: 0 }   // right
    ];

    for (let dir of dirs) {
      const newX = ghost.gridX + dir.x;
      const newY = ghost.gridY + dir.y;

      // Don't reverse direction (unless vulnerable)
      if (!ghost.vulnerable && dir.x === -ghost.direction.x && dir.y === -ghost.direction.y) continue;

      if (!isWall(newX, newY)) {
        // Calculate distance to target
        let dist = Math.abs(newX - target.x) + Math.abs(newY - target.y);

        // Add penalty for overlapping with other ghosts to avoid clustering
        ghosts.forEach((otherGhost, otherIndex) => {
          if (otherIndex !== index && !otherGhost.inSpawn) {
            if (otherGhost.gridX === newX && otherGhost.gridY === newY) {
              dist += 100; // Heavy penalty for same position
            } else if (Math.abs(otherGhost.gridX - newX) <= 1 && Math.abs(otherGhost.gridY - newY) <= 1) {
              dist += 5; // Small penalty for being close
            }
          }
        });

        possibleDirs.push({ dir, dist });
      }
    }

    if (possibleDirs.length > 0) {
      // Sort by distance - pick closest to target with penalties
      possibleDirs.sort((a, b) => a.dist - b.dist);

      // Add some randomness for vulnerable ghosts to make them less predictable
      if (ghost.vulnerable && possibleDirs.length > 1 && Math.random() < 0.3) {
        ghost.direction = possibleDirs[Math.floor(Math.random() * Math.min(2, possibleDirs.length))].dir;
      } else {
        ghost.direction = possibleDirs[0].dir;
      }
    }

    // Move ghost
    ghost.gridX += ghost.direction.x;
    ghost.gridY += ghost.direction.y;

    // Wrap around - snap position instantly to avoid weird transition
    if (ghost.gridX < 0) {
      ghost.gridX = mazeWidth - 1;
      ghost.x = offsetX + ghost.gridX * tileSize;
    }
    if (ghost.gridX >= mazeWidth) {
      ghost.gridX = 0;
      ghost.x = offsetX + ghost.gridX * tileSize;
    }

    ghost.targetX = offsetX + ghost.gridX * tileSize;
    ghost.targetY = offsetY + ghost.gridY * tileSize;
    ghost.lastDirection = { ...ghost.direction };
  });
}

function checkGhostCollision() {
  for (let i = 0; i < ghosts.length; i++) {
    const ghost = ghosts[i];
    if (ghost.gridX === pacman.gridX && ghost.gridY === pacman.gridY) {
      if (ghost.vulnerable) {
        // Eat ghost - combo scoring
        ghostEatCombo++;
        const points = 200 * ghostEatCombo;
        score += points;
        scoreText.setText('SCORE: ' + score);
        if (score > highScore) {
          highScoreText.setText('HI-SCORE: ' + score + ' (YOU)');
        }

        // Create particle explosion when eating ghost
        createParticleExplosion(
          ghost.x + tileSize / 2,
          ghost.y + tileSize / 2,
          ghost.color,
          20
        );

        // Create floating point text
        createFloatingText(
          ghost.x + tileSize / 2,
          ghost.y + tileSize / 2,
          '+' + points,
          0x00ffff
        );

        // Send back to spawn
        const startPositions = [
          { x: 13, y: 14 },
          { x: 12, y: 14 },
          { x: 14, y: 14 },
          { x: 15, y: 14 }
        ];
        const pos = startPositions[i];
        ghost.gridX = pos.x;
        ghost.gridY = pos.y;
        ghost.x = offsetX + ghost.gridX * tileSize;
        ghost.y = offsetY + ghost.gridY * tileSize;
        ghost.targetX = ghost.x;
        ghost.targetY = ghost.y;
        ghost.vulnerable = false;
        ghost.inSpawn = true;
        ghost.exitTimer = 0;
        ghost.exitDelay = 5000; // 5 second respawn delay
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
          pacman.targetX = pacman.x;
          pacman.targetY = pacman.y;

          for (let j = 0; j < ghosts.length; j++) {
            const startPositions = [
              { x: 13, y: 14 },
              { x: 12, y: 14 },
              { x: 14, y: 14 },
              { x: 15, y: 14 }
            ];
            const exitDelays = [0, 2000, 4000, 6000];
            const pos = startPositions[j];
            ghosts[j].gridX = pos.x;
            ghosts[j].gridY = pos.y;
            ghosts[j].x = offsetX + pos.x * tileSize;
            ghosts[j].y = offsetY + pos.y * tileSize;
            ghosts[j].targetX = ghosts[j].x;
            ghosts[j].targetY = ghosts[j].y;
            ghosts[j].inSpawn = true;
            ghosts[j].exitTimer = 0;
            ghosts[j].exitDelay = exitDelays[j];
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

  // Draw maze walls with gradient effect
  walls.forEach(wall => {
    const hue = (wall.x + wall.y) * 0.1;
    const color = Phaser.Display.Color.HSVToRGB(hue % 1, 0.8, 0.6);
    graphics.fillStyle(Phaser.Display.Color.GetColor(color.r * 255, color.g * 255, color.b * 255), 1);
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

  // Draw power pellets with pulsing neon effect
  powerPellets.forEach(pellet => {
    if (!pellet.eaten) {
      const px = offsetX + pellet.x * tileSize + tileSize / 2;
      const py = offsetY + pellet.y * tileSize + tileSize / 2;
      const pulse = Math.sin(glowTimer / 150) * 2 + 5;

      // Outer glow
      graphics.fillStyle(0xffb897, 0.3);
      graphics.fillCircle(px, py, pulse + 2);

      // Inner pellet
      graphics.fillStyle(0xffb897, 1);
      graphics.fillCircle(px, py, pulse);
    }
  });

  // Draw Pacman
  drawPacman();

  // Draw particles
  drawParticles();

  // Draw banana with pulsing glow effect
  if (banana && banana.sprite) {
    const pulse = Math.sin(glowTimer / 150) * 0.15 + 1;
    banana.sprite.setScale(0.7 * pulse);

    // Add glowing aura using graphics
    const glowAlpha = (Math.sin(glowTimer / 150) * 0.3 + 0.5);
    graphics.fillStyle(0xffe135, glowAlpha * 0.4);
    graphics.fillCircle(
      banana.sprite.x,
      banana.sprite.y,
      20 * pulse
    );
  }

  // Draw ghosts with visual offset to prevent overlap
  ghosts.forEach(ghost => {
    const offsetAdjust = Math.sin(Date.now() / 1000 + ghost.visualOffset * Math.PI * 2) * 2;

    if (ghost.vulnerable) {
      const flicker = powerTimer > powerDuration - 2000 && Math.floor(powerTimer / 200) % 2;
      graphics.fillStyle(flicker ? 0xffffff : 0x2121de, 1);
    } else {
      graphics.fillStyle(ghost.color, 1);
    }

    // Ghost body
    graphics.fillCircle(
      ghost.x + tileSize / 2 + offsetAdjust,
      ghost.y + tileSize / 2 - 2,
      tileSize / 2 - 2
    );

    graphics.fillRect(
      ghost.x + 2 + offsetAdjust,
      ghost.y + tileSize / 2,
      tileSize - 4,
      tileSize / 2 - 2
    );

    // Ghost eyes - ALWAYS visible
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(ghost.x + 6 + offsetAdjust, ghost.y + 7, 2.5);
    graphics.fillCircle(ghost.x + 12 + offsetAdjust, ghost.y + 7, 2.5);

    if (ghost.vulnerable) {
      // Smaller blue pupils when vulnerable
      graphics.fillStyle(0x0000ff, 1);
      graphics.fillCircle(ghost.x + 6 + offsetAdjust, ghost.y + 8, 1);
      graphics.fillCircle(ghost.x + 12 + offsetAdjust, ghost.y + 8, 1);
    } else {
      // Normal pupils
      graphics.fillStyle(0x0000ff, 1);
      graphics.fillCircle(ghost.x + 6 + offsetAdjust, ghost.y + 7, 1);
      graphics.fillCircle(ghost.x + 12 + offsetAdjust, ghost.y + 7, 1);
    }
  });
}

function drawPacman() {
  const centerX = pacman.x + tileSize / 2;
  const centerY = pacman.y + tileSize / 2;

  graphics.fillStyle(0xffff00, 1);

  if (mouthOpen) {
    // Draw Pacman with mouth open
    const startAngle = direction.x === 1 ? 0.25 :
                       direction.x === -1 ? 1.25 :
                       direction.y === -1 ? 1.75 : 0.75;

    graphics.slice(
      centerX,
      centerY,
      tileSize / 2 - 2,
      Phaser.Math.DegToRad(startAngle * 180),
      Phaser.Math.DegToRad((startAngle + 1.5) * 180),
      false
    );
    graphics.fillPath();
  } else {
    // Draw Pacman with mouth closed (full circle)
    graphics.fillCircle(centerX, centerY, tileSize / 2 - 2);
  }
}

// Store level complete UI elements to destroy them later
let levelCompleteOverlay;
let levelCompleteText;
let levelScoreText;
let levelContinueText;

function nextLevel() {
  levelComplete = true;
  playTone(sceneRef, 880, 0.3);

  levelCompleteOverlay = sceneRef.add.graphics();
  levelCompleteOverlay.fillStyle(0x000000, 0.85);
  levelCompleteOverlay.fillRect(0, 0, 800, 600);

  levelCompleteText = sceneRef.add.text(400, 250, 'LEVEL ' + level + ' COMPLETE!', {
    fontSize: '48px',
    fontFamily: 'Arial, sans-serif',
    color: '#00ff00',
    stroke: '#000000',
    strokeThickness: 6
  }).setOrigin(0.5);

  sceneRef.tweens.add({
    targets: levelCompleteText,
    scale: { from: 0.8, to: 1.1 },
    duration: 800,
    yoyo: true,
    repeat: -1
  });

  levelScoreText = sceneRef.add.text(400, 330, 'SCORE: ' + score, {
    fontSize: '28px',
    fontFamily: 'Arial, sans-serif',
    color: '#ffff00'
  }).setOrigin(0.5);

  levelContinueText = sceneRef.add.text(400, 380, 'PRESS SPACE TO CONTINUE', {
    fontSize: '24px',
    fontFamily: 'Arial, sans-serif',
    color: '#ffffff'
  }).setOrigin(0.5);

  sceneRef.tweens.add({
    targets: levelContinueText,
    alpha: { from: 1, to: 0.3 },
    duration: 600,
    yoyo: true,
    repeat: -1
  });
}

function continueToNextLevel() {
  // Destroy level complete UI elements
  if (levelCompleteOverlay) levelCompleteOverlay.destroy();
  if (levelCompleteText) levelCompleteText.destroy();
  if (levelScoreText) levelScoreText.destroy();
  if (levelContinueText) levelContinueText.destroy();

  level++;
  levelText.setText('LEVEL: ' + level);
  levelComplete = false;

  // Reset pellets
  pellets.forEach(p => p.eaten = false);
  powerPellets.forEach(p => p.eaten = false);

  // Reset banana for new level
  if (banana && banana.sprite) banana.sprite.destroy();
  banana = null;
  bananaSpawnedThisLevel = false;

  // Reset positions
  pacman.gridX = 14;
  pacman.gridY = 23;
  pacman.x = offsetX + 14 * tileSize;
  pacman.y = offsetY + 23 * tileSize;
  pacman.targetX = pacman.x;
  pacman.targetY = pacman.y;

  const startPositions = [
    { x: 13, y: 14 },
    { x: 12, y: 14 },
    { x: 14, y: 14 },
    { x: 15, y: 14 }
  ];
  const exitDelays = [0, 2000, 4000, 6000];

  for (let i = 0; i < ghosts.length; i++) {
    const pos = startPositions[i];
    ghosts[i].gridX = pos.x;
    ghosts[i].gridY = pos.y;
    ghosts[i].x = offsetX + pos.x * tileSize;
    ghosts[i].y = offsetY + pos.y * tileSize;
    ghosts[i].targetX = ghosts[i].x;
    ghosts[i].targetY = ghosts[i].y;
    ghosts[i].inSpawn = true;
    ghosts[i].exitTimer = 0;
    ghosts[i].exitDelay = exitDelays[i];
    ghosts[i].vulnerable = false;
  }

  direction = { x: 1, y: 0 };
  nextDirection = { x: 1, y: 0 };
  powerMode = false;
  powerTimer = 0;
  modeTimer = 0;
  modeIndex = 0;
  scatterMode = true;

  // Increase difficulty
  if (ghostMoveDelay > 80) ghostMoveDelay -= 10;
}

function endGame() {
  gameOver = true;
  playTone(sceneRef, 220, 0.5);

  const overlay = sceneRef.add.graphics();
  overlay.fillStyle(0x000000, 0.8);
  overlay.fillRect(0, 0, 800, 600);

  const gameOverText = sceneRef.add.text(400, 200, 'GAME OVER', {
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

  sceneRef.add.text(400, 300, 'FINAL SCORE: ' + score, {
    fontSize: '36px',
    fontFamily: 'Arial, sans-serif',
    color: '#ffffff'
  }).setOrigin(0.5);

  // Check for high score
  if (score > highScore) {
    highScore = score;

    sceneRef.add.text(400, 360, 'NEW HIGH SCORE!', {
      fontSize: '28px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffff00'
    }).setOrigin(0.5);

    // Prompt for name
    const namePrompt = sceneRef.add.text(400, 420, 'Enter your name (3 letters):', {
      fontSize: '20px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff'
    }).setOrigin(0.5);

    let nameInput = '';
    const nameDisplay = sceneRef.add.text(400, 450, '___', {
      fontSize: '32px',
      fontFamily: 'Arial, sans-serif',
      color: '#00ffff'
    }).setOrigin(0.5);

    sceneRef.input.keyboard.on('keydown', function handleName(e) {
      if (nameInput.length < 3 && e.key.match(/^[a-zA-Z]$/)) {
        nameInput += e.key.toUpperCase();
        nameDisplay.setText(nameInput + '___'.substring(nameInput.length));
      } else if (e.code === 'Backspace' && nameInput.length > 0) {
        nameInput = nameInput.slice(0, -1);
        nameDisplay.setText(nameInput + '___'.substring(nameInput.length));
      } else if (e.code === 'Enter' && nameInput.length === 3) {
        highScoreName = nameInput;
        localStorage.setItem('pacmanHighScore', JSON.stringify({ score: highScore, name: highScoreName }));
        sceneRef.input.keyboard.off('keydown', handleName);
        namePrompt.destroy();
        nameDisplay.destroy();
        sceneRef.add.text(400, 450, 'Saved! Press R to Restart', {
          fontSize: '20px',
          fontFamily: 'Arial, sans-serif',
          color: '#00ff00'
        }).setOrigin(0.5);
      }
    });
  } else {
    sceneRef.add.text(400, 450, 'Press R to Restart', {
      fontSize: '24px',
      fontFamily: 'Arial, sans-serif',
      color: '#00ffff'
    }).setOrigin(0.5);
  }
}

function restartGame() {
  score = 0;
  lives = 3;
  level = 1;
  gameOver = false;
  gameWon = false;
  gameStarted = false;
  levelComplete = false;
  moveTimer = 0;
  ghostMoveTimer = 0;
  ghostMoveDelay = 140;
  animTimer = 0;

  scoreText.setText('SCORE: 0');
  livesText.setText('LIVES: 3');
  levelText.setText('LEVEL: 1');
  highScoreText.setText('HI-SCORE: ' + highScore + ' (' + highScoreName + ')');

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

function startBgMusic(scene) {
  const ctx = scene.sound.context;
  const masterGain = ctx.createGain();
  masterGain.gain.value = 0.06;
  masterGain.connect(ctx.destination);

  // Extended Pac-Man theme melody with bass
  const melody = [
    { freq: 493.88, dur: 0.12 }, // B4
    { freq: 587.33, dur: 0.12 }, // D5
    { freq: 659.25, dur: 0.12 }, // E5
    { freq: 587.33, dur: 0.12 }, // D5
    { freq: 493.88, dur: 0.24 }, // B4
    { freq: 392.00, dur: 0.24 }, // G4
    { freq: 493.88, dur: 0.12 }, // B4
    { freq: 587.33, dur: 0.12 }, // D5
    { freq: 659.25, dur: 0.12 }, // E5
    { freq: 587.33, dur: 0.12 }, // D5
    { freq: 493.88, dur: 0.24 }, // B4
    { freq: 392.00, dur: 0.24 }  // G4
  ];

  let noteIndex = 0;
  let startTime = ctx.currentTime;

  function playNextNote() {
    if (!gameStarted && !gameOver) {
      setTimeout(playNextNote, 100);
      return;
    }

    if (gameOver) return;

    const note = melody[noteIndex % melody.length];

    // Main melody
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(masterGain);
    osc.frequency.value = note.freq;
    osc.type = 'square';
    gain.gain.setValueAtTime(0.2, startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + note.dur);
    osc.start(startTime);
    osc.stop(startTime + note.dur);

    // Bass line
    const bass = ctx.createOscillator();
    const bassGain = ctx.createGain();
    bass.connect(bassGain);
    bassGain.connect(masterGain);
    bass.frequency.value = note.freq / 2;
    bass.type = 'triangle';
    bassGain.gain.setValueAtTime(0.15, startTime);
    bassGain.gain.exponentialRampToValueAtTime(0.01, startTime + note.dur);
    bass.start(startTime);
    bass.stop(startTime + note.dur);

    startTime += note.dur;
    noteIndex++;

    setTimeout(playNextNote, note.dur * 1000);
  }

  playNextNote();
}

function smoothMovement(entity, delta) {
  const speed = 0.25;
  const dx = entity.targetX - entity.x;
  const dy = entity.targetY - entity.y;

  if (Math.abs(dx) > 0.1) {
    entity.x += dx * speed;
  } else {
    entity.x = entity.targetX;
  }

  if (Math.abs(dy) > 0.1) {
    entity.y += dy * speed;
  } else {
    entity.y = entity.targetY;
  }
}

function createParticleExplosion(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count;
    const speed = 2 + Math.random() * 3;
    particles.push({
      x: x,
      y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color: color,
      life: 1.0,
      size: 2 + Math.random() * 2
    });
  }
}

function updateParticles(delta) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= delta / 1000;

    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

function drawParticles() {
  particles.forEach(p => {
    graphics.fillStyle(p.color, p.life);
    graphics.fillCircle(p.x, p.y, p.size * p.life);
  });
}

function createFloatingText(x, y, text, color) {
  const textObj = sceneRef.add.text(x, y, text, {
    fontSize: '24px',
    fontFamily: 'Arial, sans-serif',
    color: '#' + color.toString(16).padStart(6, '0'),
    stroke: '#000000',
    strokeThickness: 4,
    fontStyle: 'bold'
  }).setOrigin(0.5);

  floatingTexts.push({
    textObj: textObj,
    life: 1.5,
    startY: y,
    velocity: -50
  });
}

function updateFloatingTexts(delta) {
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const ft = floatingTexts[i];
    ft.life -= delta / 1000;

    if (ft.life <= 0) {
      ft.textObj.destroy();
      floatingTexts.splice(i, 1);
    } else {
      // Float upward
      ft.textObj.y += ft.velocity * (delta / 1000);
      // Fade out
      ft.textObj.setAlpha(ft.life / 1.5);
      // Scale pulse
      const scale = 1 + Math.sin(ft.life * 5) * 0.2;
      ft.textObj.setScale(scale);
    }
  }
}

function spawnBanana() {
  // Spawn in the corridor below the ghost spawn (y = 17, center x)
  const x = offsetX + 13 * tileSize;
  const y = offsetY + 17 * tileSize;

  // Create banana sprite from base64 image
  const bananaSprite = sceneRef.add.image(x + tileSize, y + tileSize / 2, 'banana').setScale(0.7);

  banana = {
    gridX: 13,
    gridY: 17,
    lifetime: 0,
    sprite: bananaSprite,
    x: x,
    y: y
  };
}

function checkBananaCollision() {
  // Check both tiles since banana is 2 tiles wide
  if (banana && ((banana.gridX === pacman.gridX || banana.gridX + 1 === pacman.gridX) && banana.gridY === pacman.gridY)) {
    // Eat banana
    const points = 300;
    score += points;
    scoreText.setText('SCORE: ' + score);
    if (score > highScore) {
      highScoreText.setText('HI-SCORE: ' + score + ' (YOU)');
    }

    const centerX = banana.sprite.x;
    const centerY = banana.sprite.y;

    // Create multiple particle explosions with different colors for a vibrant effect
    createParticleExplosion(centerX, centerY, 0xffe135, 20); // Yellow
    createParticleExplosion(centerX, centerY, 0xffff00, 15); // Bright yellow
    createParticleExplosion(centerX, centerY, 0xffd700, 12); // Gold

    // Create floating text at banana center
    createFloatingText(centerX, centerY, '+' + points, 0xffe135);

    // Destroy sprite and clear banana
    banana.sprite.destroy();
    banana = null;
    playTone(sceneRef, 1000, 0.1);
  }
}
