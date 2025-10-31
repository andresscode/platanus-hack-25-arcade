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
const offsetX = (800 - mazeWidth * tileSize) / 2;
const offsetY = 50;

// Game variables
let pacman;
let ghosts = [];
let pellets = [];
let powerPellets = [];
let walls = [];
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
let modeTimer = 0;
let modeIndex = 0;
let scatterMode = true;
let bgMusic;
let eatSound;
const modeDurations = [7000, 20000, 7000, 20000, 5000, 20000, 5000];
let highScore = 0;
let highScoreName = 'AAA';

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

  // Initialize ghosts (4 ghosts with different colors and behaviors)
  const ghostData = [
    { color: 0xff0000, name: 'blinky', startX: 13, startY: 11, corner: { x: mazeWidth - 2, y: 0 } },
    { color: 0xffb8ff, name: 'pinky', startX: 13, startY: 14, corner: { x: 2, y: 0 } },
    { color: 0x00ffff, name: 'inky', startX: 12, startY: 14, corner: { x: mazeWidth - 2, y: mazeHeight - 2 } },
    { color: 0xffb851, name: 'clyde', startX: 14, startY: 14, corner: { x: 2, y: mazeHeight - 2 } }
  ];

  for (let i = 0; i < 4; i++) {
    const data = ghostData[i];
    ghosts.push({
      gridX: data.startX,
      gridY: data.startY,
      x: offsetX + data.startX * tileSize,
      y: offsetY + data.startY * tileSize,
      color: data.color,
      name: data.name,
      direction: { x: 0, y: -1 },
      vulnerable: false,
      exitDelay: i * 3000,
      exitTimer: 0,
      inSpawn: true,
      scatterTarget: data.corner,
      visualOffset: i * 0.25
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

  if (!gameStarted || gameOver || gameWon) return;

  animTimer += delta;
  if (animTimer > 150) {
    mouthOpen = !mouthOpen;
    animTimer = 0;
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
    if (!isWall(testX, testY) && !isGhostSpawn(testX, testY)) {
      direction = nextDirection;
    }

    // Move in current direction
    const newX = pacman.gridX + direction.x;
    const newY = pacman.gridY + direction.y;

    if (!isWall(newX, newY) && !isGhostSpawn(newX, newY)) {
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

  // Check win condition - advance to next level
  if (pellets.every(p => p.eaten) && powerPellets.every(p => p.eaten)) {
    nextLevel();
  }
}

function isWall(gridX, gridY) {
  if (gridY < 0 || gridY >= mazeLayout.length) return true;
  if (gridX < 0 || gridX >= mazeLayout[0].length) return false; // Allow wrap
  return mazeLayout[gridY][gridX] === 1;
}

function isGhostSpawn(gridX, gridY) {
  // Ghost spawn area boundaries
  return gridX >= 11 && gridX <= 16 && gridY >= 11 && gridY <= 17;
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
      ghosts.forEach(g => g.vulnerable = true);
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
  ghosts.forEach(ghost => {
    // Handle spawn exit
    if (ghost.inSpawn) {
      ghost.exitTimer += ghostMoveDelay;
      if (ghost.exitTimer >= ghost.exitDelay) {
        // Exit spawn - move to exit position
        if (ghost.gridY > 11) {
          ghost.gridY--;
          ghost.y = offsetY + ghost.gridY * tileSize;
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
        const dist = Math.abs(newX - target.x) + Math.abs(newY - target.y);
        possibleDirs.push({ dir, dist });
      }
    }

    if (possibleDirs.length > 0) {
      // Sort by distance - pick closest to target
      possibleDirs.sort((a, b) => a.dist - b.dist);
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
        if (score > highScore) {
          highScoreText.setText('HI-SCORE: ' + score + ' (YOU)');
        }
        // Send back to spawn
        const startPositions = [
          { x: 13, y: 11 },
          { x: 13, y: 14 },
          { x: 12, y: 14 },
          { x: 14, y: 14 }
        ];
        const pos = startPositions[i];
        ghost.gridX = pos.x;
        ghost.gridY = pos.y;
        ghost.x = offsetX + ghost.gridX * tileSize;
        ghost.y = offsetY + ghost.gridY * tileSize;
        ghost.vulnerable = false;
        ghost.inSpawn = ghost.name !== 'blinky';
        ghost.exitTimer = 0;
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
            const startPositions = [
              { x: 13, y: 11 },
              { x: 13, y: 14 },
              { x: 12, y: 14 },
              { x: 14, y: 14 }
            ];
            const pos = startPositions[j];
            ghosts[j].gridX = pos.x;
            ghosts[j].gridY = pos.y;
            ghosts[j].x = offsetX + pos.x * tileSize;
            ghosts[j].y = offsetY + pos.y * tileSize;
            ghosts[j].inSpawn = ghosts[j].name !== 'blinky';
            ghosts[j].exitTimer = 0;
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

function nextLevel() {
  level++;
  levelText.setText('LEVEL: ' + level);

  // Reset pellets
  pellets.forEach(p => p.eaten = false);
  powerPellets.forEach(p => p.eaten = false);

  // Reset positions
  pacman.gridX = 14;
  pacman.gridY = 23;
  pacman.x = offsetX + 14 * tileSize;
  pacman.y = offsetY + 23 * tileSize;

  const startPositions = [
    { x: 13, y: 11 },
    { x: 13, y: 14 },
    { x: 12, y: 14 },
    { x: 14, y: 14 }
  ];

  for (let i = 0; i < ghosts.length; i++) {
    const pos = startPositions[i];
    ghosts[i].gridX = pos.x;
    ghosts[i].gridY = pos.y;
    ghosts[i].x = offsetX + pos.x * tileSize;
    ghosts[i].y = offsetY + pos.y * tileSize;
    ghosts[i].inSpawn = true;
    ghosts[i].exitTimer = 0;
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

  playTone(sceneRef, 880, 0.2);
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
  moveTimer = 0;
  ghostMoveTimer = 0;
  ghostMoveDelay = 180;
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
  masterGain.gain.value = 0.08;
  masterGain.connect(ctx.destination);

  // Pac-Man theme melody notes (simplified)
  const melody = [
    { freq: 493.88, dur: 0.15 }, // B4
    { freq: 587.33, dur: 0.15 }, // D5
    { freq: 493.88, dur: 0.15 }, // B4
    { freq: 392.00, dur: 0.15 }, // G4
    { freq: 493.88, dur: 0.3 },  // B4
    { freq: 392.00, dur: 0.3 },  // G4
    { freq: 493.88, dur: 0.15 }, // B4
    { freq: 587.33, dur: 0.15 }, // D5
    { freq: 493.88, dur: 0.15 }, // B4
    { freq: 392.00, dur: 0.15 }, // G4
    { freq: 493.88, dur: 0.3 },  // B4
    { freq: 392.00, dur: 0.3 }   // G4
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
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(masterGain);

    osc.frequency.value = note.freq;
    osc.type = 'square';

    gain.gain.setValueAtTime(0.3, startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + note.dur);

    osc.start(startTime);
    osc.stop(startTime + note.dur);

    startTime += note.dur;
    noteIndex++;

    setTimeout(playNextNote, note.dur * 1000);
  }

  playNextNote();
}
