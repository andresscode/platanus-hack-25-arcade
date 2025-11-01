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
let startOverlay;
let comboText;
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
let screenFlash = 0;
let pelletsEatenThisLevel = 0;
let pacmanTrail = [];
let cameraShake = { x: 0, y: 0, intensity: 0 };
let readyText = null;
let readyTimer = 0;
let showReady = false;
let livesAtLevelStart = 3;
let specialPowerups = []; // For ghost freeze and score multiplier powerups
let freezeMode = false;
let freezeTimer = 0;
let freezeDuration = 5000;
let scoreMultiplier = 1;
let multiplierTimer = 0;
let multiplierDuration = 10000;
let flames = []; // Array of flame projectiles
let thunderbolts = []; // Array of lightning bolts
let powerupsSpawnedThisLevel = []; // Track which powerups have been spawned

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
  ],
  // Layout 2
  [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,2,2,2,2,2,2,2,2,2,2,2,2,1,1,2,2,2,2,2,2,2,2,2,2,2,2,1],
    [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
    [1,3,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,3,1],
    [1,2,2,2,2,2,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,2,2,2,2,2,1],
    [1,1,1,1,1,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,1,1,1,1,1],
    [1,2,2,2,2,2,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,2,2,2,2,2,1],
    [1,2,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,2,1],
    [1,2,2,2,2,2,2,2,2,2,2,2,2,1,1,2,2,2,2,2,2,2,2,2,2,2,2,1],
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
    [1,2,1,1,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,2,1],
    [1,2,1,2,2,2,2,2,2,2,1,1,2,1,1,2,1,1,2,2,2,2,2,2,2,1,2,1],
    [1,3,2,2,1,1,2,1,1,2,2,2,2,0,0,2,2,2,2,1,1,2,1,1,2,2,3,1],
    [1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,1],
    [1,2,2,2,2,1,2,1,1,2,2,2,2,1,1,2,2,2,2,1,1,2,1,2,2,2,2,1],
    [1,2,1,1,2,2,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,2,2,1,1,2,1],
    [1,2,1,1,2,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,2,1,1,2,1],
    [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
  ],
];

// Helper function to get the current maze layout based on level
function getCurrentLayout() {
  // Cycle through layouts: level 1 uses layout 0, level 2 uses layout 1, etc.
  // When we run out of layouts, cycle back to the beginning
  return mazeLayouts[(level - 1) % mazeLayouts.length];
}

function preload() {
  // Load base64 images
  this.load.image('banana', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAADsAAAA7AF5KHG9AAAAGXRFWHRTb2Z0d2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAAA+1JREFUWIXtlVuIVVUYx3/f2nufvfeZM5fjJI4zRoYioWEJhtpDSGnihaiXiEAQ9MmHKKggepmXbkZEUElQD/WS6KMzag/iPGhpaFAZBRE2kE7e5nLmXPY5e+/19XA845zTeElzXvQPG9Za3/f9///1rcVecA93O5zpk/7+fnftkiXB0KlT8WwZMI3BO69tOxyODhdDPy6+tWvrttky4E6NPF2lCX7BtWVvefLIbBmY6kBlVXK6uKXKVwtGx5Osbpp1A2k+naee0uZqGMXJ/e8ee+aJWTPw6ZHN64CFAL5numxpLFzK3/tmw4Do3mWZC+3l42ecrhXVzio/nTMs9GLWPzCMlNyv/dXFF++ogWiw9yVFPwIw3UUkjElHunDum0QyMWk5+2qwevyDO2XAKLq1MdGyjxiLaYtIL+dABSdbeb92tHPH/ymqhzrmnPhyxRoAqQzOLwNhI+j0jSFGSc/mwU9w5hbAilIO3vDWTLx3O8K1Y12P4iQfS5isKYx2jA0dW/nDvwxIe4STL2FLPvZyDmmLcLpLoGDL/oGMO/msrOSm/5R6BDfxOl+xQbLTZJKFiKIVj/RSO6j8boA/mgomA0gcTFsVk62hpYD0QgeqBtNW3RRLOBZ/1/nmdUX3kql82769djx3NO4KIjoru4wf18UnA9KLHaCCwkGJBuZ/qMLLTQyZBHdeAaAuXnXBtZh8CRPW6jmpSTR2ftVEfrHinHHE9iH6oIpdLBnbI8ZKk6maix3LolWvsZQa0eVSPdSzzKbyIy0Pk+QinDklNDXYS7mpQvFjpCPCBDGI3qD/oDUPLfrYkt8Sk93hlnM7BaAyOP9zYHtrveTq9wEEWwixhQD0ysZE693IpOCmiNGrorEDNbcunphWWoCTgWvXyobzJQEo71/QZ0z6s0K+NdNka0i+hDgWTQ1a8tFyBlKDpi3komAUcVPEteClyJWvMN7OyJleFs07/31U8zfkn/tzHGDqnKLB3vWKHmD6C9ngNRaZU8aE1WkV1C+SSlPeTLBFn3Qiy9mL3ZcX94wskvVjE1M10xOjgZ6dKvLJjCwAborJRUiudk2xKcQOtpLBFgNoHIPKjnDLuS+aNtdaVxno3Y6wG9RrjTXBS5FMjLgKoogomjiQGmzNvSp6VembYOPIRhG0eXkGVA72PSXW7pvpTtwa5EQg0dOyabTQGpnxioYbzx5OE/dhRPfcprIFPgssT84kDtfowHREA73rVPRt4LH/IKwgQxZ9vW3zyMnrJd7QQAPV/b0PWcMLoI8DS4G+ZkGGgd9UZUhE94SbR4ZvhvemDbRCj8zNTZRCD6CzbCN5/q/KrXLdw92NfwC57adrhk6N8AAAAABJRU5ErkJggg==');
  this.load.image('powerup-ice', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAA7AAAAOwBeShxvQAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAASVSURBVFiF7ZdNbFRVFMd/57ZT0pbQhE5RUbagIIjBkKDEdD7ExAWsBhMTKbKhtkNBEjFdSCa4QCGB0r4hdKNUF0a6gmiMOJ0ZEkWCmJBaENkZYkU6A6GBNnTad1z0veG96SdM3PFfnXvP1/+8e96578ETlIGwpefClp4rJ0ZlmRxeL9P/0QiELT0P1Cq8k4nLFa8uZOkqga+B4XRcNs43ppnLIJbQKs+yElgjcDGc1O1FYkndLnARWI2nqHXdGiiLQKhLX8sHGQ5Z2g5QOUpIoQeoQfmiaDgp1yj0VI4SAQhZ2l5X4G7E0g2z5Zj1CAw0KCwQ2ABw9kO5D2wPJTUtynGg1jEdFaU9vUuOub4CrwLVNiyZN4HYKa3I3+Kowo1gjmN5ZRABYKnXLtMqX0Y69ZIargCIzSt9bXK1JPYzAEYYjCW0Khdkt8Cy+iV80LtVJjxFPsTQEA1Ai8ChfJB+hFUAon4CAN6E0yQv+qjNi/kgvwscAlpuDxL02vkIZFvlplGiwFVgBcLnACosaUzovN+YxoRWqjiPfjLGcuCqGiJ9e+TfGQkApHZJ9m6Atc4Zu6iQBtpL3ohpEUtolTTQDlS4e6IcvxtgbaZFpgwtPwFVCVm6ZVGBMyo0e1WiHMgH6Y92anSm5NFOjeaD9ItywBdWaF5U4EzI0i2oii+udxGxtEnhpLMcVThloNuGGgELeN7x6rUn2GsMNwBsm2WmgiMoMcf3D5S4rYwYw07gbaDa0W1Lx+UrN6fvXM0E523Dd7ahr+oBPT/slduuLpbQl27Xs0eFj1FixvBW0c9wDaUWuKdwYDhAx287peCoL2w8rnurbJqAiC38MuMTmA/e6NKlE8KnwLslqm+BeDoufz1KvDlH8f+N0h5YrnAU+HHM0PNTi9xxdeu6NbCowB6B/cBC4D4PJ6Er3xPlk8V5OnoTMub6vnlEF48toEmUqF3BR9n3ZWAmAr4mBL6xbbqNUINgAS84XnM14TWFuIERG3YKbMVtQmVHepcU7xF/D6hKKMlmoFlgE1OP6E9jE0+1SQogbKkCpOMiMPka2gYLWFHiZyucBU5kWjmDiLoKfwIRzcTl9HCAzaKc8HET9tfnWOMmnw6pNknV51ijwn5fWOXEcIDNmbic9iafSgCIdmljXYHLKrR4tid0iIPec50JvQkZ0yEOAsULR4WWugKXo13aWGrvI9CY1KdtIQWsBK6j7HAquJVNyPhcyV1kEzIuyq3J7OwArgMrbSEV6dCnZiTQ0MCQQFJhX32O1WIYcCoYLE0S6dSV08meqgcBxDBQn2O1wj6B5OKl5Lx2vkno3NO73XXY0ucc8W+vXSip29RzWanhUqRL2/s8HyTAILAOm2d7E/IrcLiU5BQCpbBt/jGGcVHSAJsOa22hmqQoTSWm1Sp0hCx9OTBKq/Pl9DMQmVBuzpZj1kmYbZMLC2wWupWNV3NOoAkYQXivaDgpjwg0jVeTAUjH5TM7R122TS48NgGA79vkgSurcAfoV1ifbpWT7n66VU4qrAf6UYrT81Ea97EQtlTdYfS4KOvPSCFbjv8TAPwHafTPIV5ge84AAAAASUVORK5CYII=');
  this.load.image('powerup-flame', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAAD1AAAA9QHG8Yv2AAAAGXRFWHRTb2Z0d2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAAAohJREFUWIXtlr9rE2EYxz/v3aVJ2oiUNhZrc2kRRKEKCqJtRRRBlFJtotbVQRcdHPwHBEFEHBycXJyLtrQIHTpJB6mDONjBSagRS7HVmjTXH/bucdCiSe5HclWnPNs97/N8v5973pe7F+pRjy1GMZO+Ucya75fPd+wP069txdwaTD0AeYTQpWnayTAaRnhz86Yobm0+O7A7jE6oCeQvdO4Vxf3SrDojoP4LgO7Yd4GGEntkz0rW7P3nACvZrjSoc25rItyrdQo1A4jjDAC6x/IxK5O+/tcBlgfNU8Ws+USudMbA6QlAfGhl0tlqAQLHlR9ob9UNYwZoQ9RVNK4hciSgbR1NZZpGZieC9AMnoBv6baDtJ67cQWRXUA/QgCMjVrbzaFCh7wSW+s3mSJQcQlMVpm4x05hMHlKPX3/3KvCdQCTKkK+5JkTMPA37FkGJW0V3cWHhkp+H/xYIZ72WlOEQOzhPpGsJY0cRFbPd60QuhweAw+6qEO3+jJZY/y0U2/DS6AsFICcw2Dx8ZWG0F9C2r5XmUnkvqRa51BGvGYAkrpsKEOkoVOT05lX0Vsu9YdXxPOyeAOopNjBf0ZBYR3mM20i6Aiyo5588yALOgKCmKpLeLwOa69Be+Hn4Aihxhiv8rQiy6n6NsL9WbrVSVGhUDdA4lhsHmS7Pr71rQTZKW+3FOBtzidJC4U38wIdRP4/Af0Ehk+rWUS8FtpU0Rm30VgsVtXG+RbG/xPnz2CooOI7Tlxj/+HZLAADLg6nTmlLPyiF8RAuOyMXEWG4yqLaq33FiLDdpI70o9Sq4WqZtjZ5qzKHG24uAsjJmvxKGRHEc2PlraU4JU6Kp4cbR2QmF9zekHvUojx+EC8KFAt161wAAAABJRU5ErkJggg==');
  this.load.image('powerup-thunder', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAA3QAAAN0BcFOiBwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAFGSURBVFiFxZavT8RAEEbflKN3AQUWi8Odb48gcARHgkOBgQT4Q4AEw6GQBEWCQ5Ac1eBwWDQK6JUfg29y1+1sm/3szuz30iYvK6qKLRKRdS9QCtJ833gJYgbIupuo3AKQ5mIFiKyLqByZd70BsrgPDMIB6MxxE+U2gIe5JdCtcAAdPQBmwwDcyzyw21R5fYBedwd0IRCARMBhk+X1ALJ4A1gOB9CQeMpxU3EW99HoydSgcs3ga3vSsdsX8BGP6Mq042oAf/EM/QC8xCPv5OMrO4C/eC5Z1w87gJ94vvmR86qhql+wZywH5Ia1zzc/AJUXe//vidOY/U0IPPYmLY9I81WXK+xPsmkRPXUdbQPglaS4CwlwBvoXCKBaPC0DVIunTQAn8bQI4Cae9gAcxdMWwIikeA4HUEM85XQ8q4eILJKMncVTzj+e+2DJc7znZQAAAABJRU5ErkJggg==');
}

function create() {
  sceneRef = this;
  graphics = this.add.graphics();

  // Load high score from localStorage with error handling
  try {
    if (typeof localStorage !== 'undefined' && localStorage !== null) {
      const saved = localStorage.getItem('pacmanHighScore');
      if (saved) {
        const data = JSON.parse(saved);
        highScore = data.score || 0;
        highScoreName = data.name || 'AAA';
      }
    }
  } catch (e) {
    // Storage not available or error accessing it - just continue without it
    console.log('Storage not available, high scores will not persist');
  }

  // Score display with retro arcade font styling
  scoreText = this.add.text(16, 16, 'SCORE: 0', {
    fontSize: '20px',
    fontFamily: 'Courier New, monospace',
    color: '#ffffff',
    fontStyle: 'bold'
  });


  // Lives display - using Pacman sprites instead of text
  // Will be drawn in drawGame() function

  // Level display with retro styling
  levelText = this.add.text(400, 16, 'LEVEL: 1', {
    fontSize: '20px',
    fontFamily: 'Courier New, monospace',
    color: '#00ffff',
    align: 'center',
    fontStyle: 'bold'
  }).setOrigin(0.5);

  // High score display with retro styling
  highScoreText = this.add.text(400, 38, 'HI-SCORE: ' + highScore + ' (' + highScoreName + ')', {
    fontSize: '16px',
    fontFamily: 'Courier New, monospace',
    color: '#ffff00',
    align: 'center',
    fontStyle: 'bold'
  }).setOrigin(0.5);

  // Add transparent overlay for start text (similar to level complete/game over)
  startOverlay = this.add.graphics();
  startOverlay.fillStyle(0x000000, 0.75);
  startOverlay.fillRect(0, 0, 800, 600);

  // Start instructions with retro arcade style
  startText = this.add.text(400, 300, 'PRESS SPACE TO START', {
    fontSize: '28px',
    fontFamily: 'Courier New, monospace',
    color: '#ffff00',
    align: 'center',
    stroke: '#000000',
    strokeThickness: 6,
    fontStyle: 'bold',
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
  if (startOverlay) startOverlay.destroy();
  livesAtLevelStart = lives;

  // Show "READY!" message with retro styling
  showReady = true;
  readyTimer = 2000;
  readyText = sceneRef.add.text(400, 300, 'READY!', {
    fontSize: '52px',
    fontFamily: 'Courier New, monospace',
    color: '#ffff00',
    stroke: '#000000',
    strokeThickness: 6,
    fontStyle: 'bold'
  }).setOrigin(0.5);

  sceneRef.tweens.add({
    targets: readyText,
    scale: { from: 0, to: 1.2 },
    duration: 400,
    ease: 'Back.out'
  });

  setTimeout(() => {
    if (readyText) readyText.destroy();
    showReady = false;
    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };
  }, 2000);
}

function update(_time, delta) {
  // Always draw the game
  drawGame();

  if (!gameStarted || gameOver || gameWon || levelComplete || showReady) return;

  glowTimer += delta;
  animTimer += delta;
  if (animTimer > 150) {
    mouthOpen = !mouthOpen;
    animTimer = 0;
  }

  // Screen flash effect decay
  if (screenFlash > 0) {
    screenFlash -= delta / 100;
    if (screenFlash < 0) screenFlash = 0;
  }

  // Update Pacman trail
  updatePacmanTrail();

  // Update camera shake
  if (cameraShake.intensity > 0) {
    cameraShake.intensity -= delta / 50;
    if (cameraShake.intensity < 0) cameraShake.intensity = 0;
    cameraShake.x = (Math.random() - 0.5) * cameraShake.intensity;
    cameraShake.y = (Math.random() - 0.5) * cameraShake.intensity;
  }

  // Update particles
  updateParticles(delta);

  // Update floating texts
  updateFloatingTexts(delta);

  // Update flames
  updateFlames(delta);

  // Update thunderbolts
  updateThunderbolts(delta);

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

  // Spawn special powerups randomly and less frequently - only one at a time
  if (specialPowerups.length === 0 && !banana) {
    const totalPellets = pellets.length;
    const eatenPellets = pellets.filter(p => p.eaten).length;
    const percentEaten = eatenPellets / totalPellets;

    // Spawn at 30%, 60%, and 85% - less frequently than before
    const powerupTypes = ['freeze', 'flame', 'thunder'];

    if (percentEaten >= 0.3 && !powerupsSpawnedThisLevel.includes('first')) {
      const randomType = powerupTypes[Math.floor(Math.random() * powerupTypes.length)];
      spawnSpecialPowerup(randomType);
      powerupsSpawnedThisLevel.push('first');
    } else if (percentEaten >= 0.6 && !powerupsSpawnedThisLevel.includes('second')) {
      const randomType = powerupTypes[Math.floor(Math.random() * powerupTypes.length)];
      spawnSpecialPowerup(randomType);
      powerupsSpawnedThisLevel.push('second');
    } else if (percentEaten >= 0.85 && !powerupsSpawnedThisLevel.includes('third')) {
      const randomType = powerupTypes[Math.floor(Math.random() * powerupTypes.length)];
      spawnSpecialPowerup(randomType);
      powerupsSpawnedThisLevel.push('third');
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

  // Update freeze mode timer
  if (freezeMode) {
    freezeTimer += delta;
    if (freezeTimer >= freezeDuration) {
      freezeMode = false;
      freezeTimer = 0;
    }
  }

  // Update score multiplier timer
  if (scoreMultiplier > 1) {
    multiplierTimer += delta;
    if (multiplierTimer >= multiplierDuration) {
      scoreMultiplier = 1;
      multiplierTimer = 0;
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

      // Check special powerup collision
      checkSpecialPowerupCollision();
    }
  }

  // Smooth Pacman movement (after grid movement)
  smoothMovement(pacman, delta);

  // Smooth ghost movement (always smooth)
  ghosts.forEach(g => smoothMovement(g, delta));

  // Move ghosts - use different delay for vulnerable ghosts, don't move if frozen
  if (!freezeMode) {
    ghostMoveTimer += delta;
    const currentDelay = powerMode ? vulnerableGhostDelay : ghostMoveDelay;
    if (ghostMoveTimer >= currentDelay) {
      ghostMoveTimer = 0;
      moveGhosts();
    }
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
      pelletsEatenThisLevel++;

      const points = Math.floor(10 * scoreMultiplier);

      score += points;
      scoreText.setText('SCORE: ' + score);
      if (score > highScore) {
        highScoreText.setText('HI-SCORE: ' + score + ' (YOU)');
      }

      // Subtle particle effect for pellet
      createParticleExplosion(
        offsetX + pellet.x * tileSize + tileSize / 2,
        offsetY + pellet.y * tileSize + tileSize / 2,
        0xffb897,
        4  // Just 4 small particles
      );

      // Speed boost every 50 pellets
      if (pelletsEatenThisLevel % 50 === 0 && moveDelay > 90) {
        moveDelay -= 5;

        // Position text to avoid blocking Pacman's path
        let textX = pacman.x + tileSize / 2;
        let textY = pacman.y - 30;

        if (direction.y < 0) {
          // Moving up - show to the side
          textX = pacman.x + tileSize / 2 + 35;
          textY = pacman.y + tileSize / 2;
        } else if (direction.y > 0) {
          // Moving down - show above
          textY = pacman.y - 35;
        } else if (direction.x < 0) {
          // Moving left - show to the right
          textX = pacman.x + tileSize / 2 + 35;
        } else if (direction.x > 0) {
          // Moving right - show to the left
          textX = pacman.x + tileSize / 2 - 35;
        }

        createFloatingText(textX, textY, 'SPEED UP!', 0x00ffff);
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

      // Screen flash effect
      screenFlash = 10;

      // Create explosion effect for power pellet
      createParticleExplosion(
        offsetX + pellet.x * tileSize + tileSize / 2,
        offsetY + pellet.y * tileSize + tileSize / 2,
        0xffb897,
        25
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
      if (ghost.vulnerable || freezeMode) {
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
        cameraShake.intensity = 15; // Strong shake on death

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

  // Apply camera shake offset
  const shakeX = cameraShake.x;
  const shakeY = cameraShake.y;

  // Screen flash overlay when power pellet is eaten
  if (screenFlash > 0) {
    graphics.fillStyle(0xffffff, Math.min(screenFlash / 10, 0.3));
    graphics.fillRect(0, 0, 800, 600);
  }

  // Draw lives as Pacman icons in top-right corner
  for (let i = 0; i < lives; i++) {
    const lifeX = 720 + i * 22;
    const lifeY = 26;
    graphics.fillStyle(0xffff00, 1);
    graphics.slice(
      lifeX,
      lifeY,
      8,
      Phaser.Math.DegToRad(30),
      Phaser.Math.DegToRad(330),
      false
    );
    graphics.fillPath();
  }

  // Draw Pacman trail effect
  pacmanTrail.forEach(trail => {
    const alpha = trail.life;
    const size = 6 * alpha;
    const trailColor = powerMode ? 0x00ffff : 0xffaa00;
    graphics.fillStyle(trailColor, alpha * 0.5);
    graphics.fillCircle(trail.x + shakeX, trail.y + shakeY, size);
  });

  // Draw maze walls with gradient effect
  walls.forEach(wall => {
    const hue = (wall.x + wall.y) * 0.1;
    const color = Phaser.Display.Color.HSVToRGB(hue % 1, 0.8, 0.6);
    graphics.fillStyle(Phaser.Display.Color.GetColor(color.r * 255, color.g * 255, color.b * 255), 1);
    graphics.fillRect(
      offsetX + wall.x * tileSize + 1 + shakeX,
      offsetY + wall.y * tileSize + 1 + shakeY,
      tileSize - 2,
      tileSize - 2
    );
  });

  // Draw pellets
  graphics.fillStyle(0xffb897, 1);
  pellets.forEach(pellet => {
    if (!pellet.eaten) {
      graphics.fillCircle(
        offsetX + pellet.x * tileSize + tileSize / 2 + shakeX,
        offsetY + pellet.y * tileSize + tileSize / 2 + shakeY,
        2
      );
    }
  });

  // Draw power pellets with pulsing neon effect
  powerPellets.forEach(pellet => {
    if (!pellet.eaten) {
      const px = offsetX + pellet.x * tileSize + tileSize / 2 + shakeX;
      const py = offsetY + pellet.y * tileSize + tileSize / 2 + shakeY;
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

  // Draw flames
  drawFlames();

  // Draw thunderbolts
  drawThunderbolts();

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

  // Draw special powerups with pulsing sprite effect
  specialPowerups.forEach(powerup => {
    if (powerup.sprite) {
      const pulse = Math.sin(glowTimer / 150) * 0.15 + 1;
      powerup.sprite.setScale(0.8 * pulse);

      // Add glowing aura using graphics
      const px = powerup.sprite.x;
      const py = powerup.sprite.y;
      const glowAlpha = (Math.sin(glowTimer / 150) * 0.3 + 0.5);

      if (powerup.type === 'freeze') {
        graphics.fillStyle(0x00ffff, glowAlpha * 0.4);
        graphics.fillCircle(px, py, 20 * pulse);
      } else if (powerup.type === 'thunder') {
        graphics.fillStyle(0xffff00, glowAlpha * 0.4);
        graphics.fillCircle(px, py, 20 * pulse);
      } else if (powerup.type === 'flame') {
        graphics.fillStyle(0xff4500, glowAlpha * 0.4);
        graphics.fillCircle(px, py, 20 * pulse);
      }
    }
  });

  // Draw active powerup indicators (removed all indicators to fix bluish square bug)

  // Draw ghosts with visual offset to prevent overlap (frozen ghosts shown with ice effect)
  ghosts.forEach(ghost => {
    const offsetAdjust = Math.sin(Date.now() / 1000 + ghost.visualOffset * Math.PI * 2) * 2;
    const ghostX = ghost.x + cameraShake.x;
    const ghostY = ghost.y + cameraShake.y;

    if (ghost.vulnerable) {
      const flicker = powerTimer > powerDuration - 2000 && Math.floor(powerTimer / 200) % 2;
      graphics.fillStyle(flicker ? 0xffffff : 0x2121de, 1);
    } else if (freezeMode) {
      // Frozen ghosts have a blue tint
      graphics.fillStyle(0x88ddff, 0.8);
    } else {
      graphics.fillStyle(ghost.color, 1);
    }

    // Ghost body
    graphics.fillCircle(
      ghostX + tileSize / 2 + offsetAdjust,
      ghostY + tileSize / 2 - 2,
      tileSize / 2 - 2
    );

    graphics.fillRect(
      ghostX + 2 + offsetAdjust,
      ghostY + tileSize / 2,
      tileSize - 4,
      tileSize / 2 - 2
    );

    // Ghost eyes - ALWAYS visible
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(ghostX + 6 + offsetAdjust, ghostY + 7, 2.5);
    graphics.fillCircle(ghostX + 12 + offsetAdjust, ghostY + 7, 2.5);

    // Pupils that look in direction of movement
    const pupilOffsetX = ghost.direction.x * 0.8;
    const pupilOffsetY = ghost.direction.y * 0.8;

    if (ghost.vulnerable) {
      // Smaller blue pupils when vulnerable - looking scared/away
      graphics.fillStyle(0x0000ff, 1);
      graphics.fillCircle(ghostX + 6 + offsetAdjust - pupilOffsetX, ghostY + 8 - pupilOffsetY, 1);
      graphics.fillCircle(ghostX + 12 + offsetAdjust - pupilOffsetX, ghostY + 8 - pupilOffsetY, 1);
    } else {
      // Normal pupils looking in movement direction
      graphics.fillStyle(0x0000ff, 1);
      graphics.fillCircle(ghostX + 6 + offsetAdjust + pupilOffsetX, ghostY + 7 + pupilOffsetY, 1);
      graphics.fillCircle(ghostX + 12 + offsetAdjust + pupilOffsetX, ghostY + 7 + pupilOffsetY, 1);
    }
  });
}

function drawPacman() {
  const centerX = pacman.x + tileSize / 2 + cameraShake.x;
  const centerY = pacman.y + tileSize / 2 + cameraShake.y;

  // Glow effect when in power mode
  if (powerMode) {
    const glowSize = (tileSize / 2 + 3) + Math.sin(glowTimer / 100) * 2;
    const glowColor = 0x00ffff;
    graphics.fillStyle(glowColor, 0.3);
    graphics.fillCircle(centerX, centerY, glowSize);
  }

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
let levelPerfectText;

function nextLevel() {
  levelComplete = true;

  // Check for perfect clear (no lives lost)
  const perfectClear = lives === livesAtLevelStart;
  const perfectBonus = perfectClear ? 1000 : 0;

  if (perfectClear) {
    score += perfectBonus;
    scoreText.setText('SCORE: ' + score);
    if (score > highScore) {
      highScoreText.setText('HI-SCORE: ' + score + ' (YOU)');
    }
  }

  playTone(sceneRef, 880, 0.3);

  levelCompleteOverlay = sceneRef.add.graphics();
  levelCompleteOverlay.fillStyle(0x000000, 0.85);
  levelCompleteOverlay.fillRect(0, 0, 800, 600);

  levelCompleteText = sceneRef.add.text(400, 250, 'LEVEL ' + level + ' COMPLETE!', {
    fontSize: '44px',
    fontFamily: 'Courier New, monospace',
    color: '#00ff00',
    stroke: '#000000',
    strokeThickness: 6,
    fontStyle: 'bold'
  }).setOrigin(0.5);

  sceneRef.tweens.add({
    targets: levelCompleteText,
    scale: { from: 0.8, to: 1.1 },
    duration: 800,
    yoyo: true,
    repeat: -1
  });

  levelScoreText = sceneRef.add.text(400, 330, 'SCORE: ' + score, {
    fontSize: '26px',
    fontFamily: 'Courier New, monospace',
    color: '#ffff00',
    fontStyle: 'bold'
  }).setOrigin(0.5);

  // Show perfect bonus if earned
  if (perfectClear) {
    levelPerfectText = sceneRef.add.text(400, 370, 'PERFECT! +1000', {
      fontSize: '22px',
      fontFamily: 'Courier New, monospace',
      color: '#00ff00',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    sceneRef.tweens.add({
      targets: levelPerfectText,
      scale: { from: 0.8, to: 1.1 },
      duration: 600,
      yoyo: true,
      repeat: -1
    });
  } else {
    levelPerfectText = null;
  }

  levelContinueText = sceneRef.add.text(400, perfectClear ? 420 : 380, 'PRESS SPACE TO CONTINUE', {
    fontSize: '22px',
    fontFamily: 'Courier New, monospace',
    color: '#ffffff',
    fontStyle: 'bold'
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
  if (levelPerfectText) levelPerfectText.destroy();

  level++;
  levelText.setText('LEVEL: ' + level);
  levelComplete = false;
  pelletsEatenThisLevel = 0;
  livesAtLevelStart = lives;

  // Regenerate maze layout for new level - this is critical!
  walls = [];
  pellets = [];
  powerPellets = [];

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

  // Reset banana for new level
  if (banana && banana.sprite) banana.sprite.destroy();
  banana = null;
  bananaSpawnedThisLevel = false;

  // Reset special powerups - destroy sprites first
  specialPowerups.forEach(p => {
    if (p.sprite) p.sprite.destroy();
  });
  specialPowerups = [];
  powerupsSpawnedThisLevel = [];
  freezeMode = false;
  freezeTimer = 0;
  scoreMultiplier = 1;
  multiplierTimer = 0;
  flames = [];
  thunderbolts = [];

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
    fontSize: '56px',
    fontFamily: 'Courier New, monospace',
    color: '#ff0000',
    stroke: '#000000',
    strokeThickness: 8,
    fontStyle: 'bold'
  }).setOrigin(0.5);

  sceneRef.tweens.add({
    targets: gameOverText,
    alpha: { from: 1, to: 0.5 },
    duration: 600,
    yoyo: true,
    repeat: -1
  });

  sceneRef.add.text(400, 300, 'FINAL SCORE: ' + score, {
    fontSize: '32px',
    fontFamily: 'Courier New, monospace',
    color: '#ffffff',
    fontStyle: 'bold'
  }).setOrigin(0.5);

  // Check for high score
  if (score > highScore) {
    highScore = score;

    sceneRef.add.text(400, 360, 'NEW HIGH SCORE!', {
      fontSize: '26px',
      fontFamily: 'Courier New, monospace',
      color: '#ffff00',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Prompt for name
    const namePrompt = sceneRef.add.text(400, 420, 'Enter your name (3 letters):', {
      fontSize: '18px',
      fontFamily: 'Courier New, monospace',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    let nameInput = '';
    const nameDisplay = sceneRef.add.text(400, 450, '___', {
      fontSize: '28px',
      fontFamily: 'Courier New, monospace',
      color: '#00ffff',
      fontStyle: 'bold'
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
        // Safe localStorage save with error handling
        try {
          if (typeof localStorage !== 'undefined' && localStorage !== null) {
            localStorage.setItem('pacmanHighScore', JSON.stringify({ score: highScore, name: highScoreName }));
          }
        } catch (err) {
          console.log('Could not save high score');
        }
        sceneRef.input.keyboard.off('keydown', handleName);
        namePrompt.destroy();
        nameDisplay.destroy();
        sceneRef.add.text(400, 450, 'Saved! Press R to Restart', {
          fontSize: '18px',
          fontFamily: 'Courier New, monospace',
          color: '#00ff00',
          fontStyle: 'bold'
        }).setOrigin(0.5);
      }
    });
  } else {
    sceneRef.add.text(400, 450, 'Press R to Restart', {
      fontSize: '22px',
      fontFamily: 'Courier New, monospace',
      color: '#00ffff',
      fontStyle: 'bold'
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
    // Smaller, slower particles for pellets (count <= 5), bigger for powerups
    const speed = count <= 5 ? 1 + Math.random() * 1.5 : 2 + Math.random() * 3;
    const size = count <= 5 ? 1 + Math.random() * 1 : 2 + Math.random() * 2;
    particles.push({
      x: x,
      y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color: color,
      life: 1.0,
      size: size
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

function drawFlames() {
  flames.forEach(f => {
    const pulse = Math.sin(Date.now() / 50) * 0.3 + 0.7;

    // Outer glow
    graphics.fillStyle(0xff4500, f.life * 0.4);
    graphics.fillCircle(f.x, f.y, f.size * 1.5);

    // Inner flame
    graphics.fillStyle(0xffa500, f.life * pulse);
    graphics.fillCircle(f.x, f.y, f.size);

    // Core
    graphics.fillStyle(0xffff00, f.life);
    graphics.fillCircle(f.x, f.y, f.size * 0.5);
  });
}

function drawThunderbolts() {
  const shakeX = cameraShake.x;
  const shakeY = cameraShake.y;

  thunderbolts.forEach(bolt => {
    const alpha = Math.min(1, bolt.life / 0.3); // Fade in/out
    const flicker = Math.random() > 0.3 ? 1 : 0.7; // Electric flicker

    bolt.segments.forEach((segment, idx) => {
      const x = offsetX + segment.gridX * tileSize + tileSize / 2 + shakeX;
      const y = offsetY + segment.gridY * tileSize + tileSize / 2 + shakeY;

      // Outer glow
      graphics.fillStyle(0xffff00, alpha * 0.3 * flicker);
      graphics.fillCircle(x, y, 8);

      // Main lightning
      graphics.fillStyle(0xffffff, alpha * 0.9 * flicker);
      graphics.fillCircle(x, y, 4);

      // Draw connecting line to next segment for continuous bolt effect
      if (idx < bolt.segments.length - 1) {
        const nextSeg = bolt.segments[idx + 1];
        const nextX = offsetX + nextSeg.gridX * tileSize + tileSize / 2 + shakeX;
        const nextY = offsetY + nextSeg.gridY * tileSize + tileSize / 2 + shakeY;

        graphics.lineStyle(3, 0xffff00, alpha * 0.5 * flicker);
        graphics.beginPath();
        graphics.moveTo(x, y);
        graphics.lineTo(nextX, nextY);
        graphics.strokePath();

        graphics.lineStyle(1, 0xffffff, alpha * flicker);
        graphics.beginPath();
        graphics.moveTo(x, y);
        graphics.lineTo(nextX, nextY);
        graphics.strokePath();
      }
    });
  });
}

function createFloatingText(x, y, text, color) {
  const textObj = sceneRef.add.text(x, y, text, {
    fontSize: '22px',
    fontFamily: 'Courier New, monospace',
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

function updatePacmanTrail() {
  // Add new trail point
  if (direction.x !== 0 || direction.y !== 0) {
    pacmanTrail.push({
      x: pacman.x + tileSize / 2,
      y: pacman.y + tileSize / 2,
      life: 1
    });
  }

  // Update and remove old trail points
  for (let i = pacmanTrail.length - 1; i >= 0; i--) {
    pacmanTrail[i].life -= 0.05;
    if (pacmanTrail[i].life <= 0) {
      pacmanTrail.splice(i, 1);
    }
  }

  // Limit trail length
  if (pacmanTrail.length > 15) {
    pacmanTrail.shift();
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
    // Eat banana - most valuable item in the game!
    const points = 500;
    score += points;
    scoreText.setText('SCORE: ' + score);
    if (score > highScore) {
      highScoreText.setText('HI-SCORE: ' + score + ' (YOU)');
    }

    const centerX = banana.sprite.x;
    const centerY = banana.sprite.y;

    // MASSIVE particle explosions with different colors for an epic effect
    createParticleExplosion(centerX, centerY, 0xffe135, 40); // Yellow
    createParticleExplosion(centerX, centerY, 0xffff00, 35); // Bright yellow
    createParticleExplosion(centerX, centerY, 0xffd700, 30); // Gold
    createParticleExplosion(centerX, centerY, 0xffaa00, 25); // Orange

    // Intense screen flash
    screenFlash = 15;

    // Big camera shake
    cameraShake.intensity = 20;

    // Create large floating text at banana center with bigger font
    const bananaText = sceneRef.add.text(centerX, centerY, '+' + points, {
      fontSize: '40px',
      fontFamily: 'Courier New, monospace',
      color: '#ffe135',
      stroke: '#000000',
      strokeThickness: 6,
      fontStyle: 'bold'
    }).setOrigin(0.5);

    floatingTexts.push({
      textObj: bananaText,
      life: 2.5,
      startY: centerY,
      velocity: -80
    });

    // Secondary text
    setTimeout(() => {
      createFloatingText(centerX, centerY - 30, 'JACKPOT!', 0xffd700);
    }, 200);

    // Destroy sprite and clear banana
    banana.sprite.destroy();
    banana = null;

    // Epic sound - play multiple tones
    playTone(sceneRef, 800, 0.15);
    setTimeout(() => playTone(sceneRef, 1000, 0.15), 80);
    setTimeout(() => playTone(sceneRef, 1200, 0.2), 160);
  }
}

function spawnSpecialPowerup(type) {
  // Find a random empty path tile for the powerup
  const currentMaze = getCurrentLayout();
  const emptyTiles = [];

  for (let y = 5; y < currentMaze.length - 5; y++) {
    for (let x = 5; x < currentMaze[y].length - 5; x++) {
      if (currentMaze[y][x] === 0 || currentMaze[y][x] === 2) {
        // Only spawn in open areas, not too close to edges
        if (!isGhostSpawn(x, y)) {
          emptyTiles.push({ x, y });
        }
      }
    }
  }

  if (emptyTiles.length > 0) {
    const tile = emptyTiles[Math.floor(Math.random() * emptyTiles.length)];

    // Create sprite based on powerup type
    const x = offsetX + tile.x * tileSize + tileSize / 2;
    const y = offsetY + tile.y * tileSize + tileSize / 2;
    let spriteKey = '';

    if (type === 'freeze') {
      spriteKey = 'powerup-ice';
    } else if (type === 'flame') {
      spriteKey = 'powerup-flame';
    } else if (type === 'thunder') {
      spriteKey = 'powerup-thunder';
    }

    const powerupSprite = sceneRef.add.image(x, y, spriteKey).setScale(0.8);

    specialPowerups.push({
      gridX: tile.x,
      gridY: tile.y,
      type: type,
      lifetime: 0,
      sprite: powerupSprite
    });
  }
}

function checkSpecialPowerupCollision() {
  for (let i = specialPowerups.length - 1; i >= 0; i--) {
    const powerup = specialPowerups[i];
    if (powerup.gridX === pacman.gridX && powerup.gridY === pacman.gridY) {
      const px = offsetX + powerup.gridX * tileSize + tileSize / 2;
      const py = offsetY + powerup.gridY * tileSize + tileSize / 2;

      // Destroy sprite
      if (powerup.sprite) {
        powerup.sprite.destroy();
      }

      if (powerup.type === 'freeze') {
        // Activate freeze mode
        freezeMode = true;
        freezeTimer = 0;

        createParticleExplosion(px, py, 0x00ffff, 20);
        createFloatingText(px, py, 'FREEZE!', 0x00ffff);
        playTone(sceneRef, 400, 0.2);
      } else if (powerup.type === 'thunder') {
        // Create lightning strikes in all cardinal directions
        createThunderStrikes(powerup.gridX, powerup.gridY);

        createParticleExplosion(px, py, 0xffff00, 25);
        createFloatingText(px, py, 'THUNDER!', 0xffff00);
        playTone(sceneRef, 1200, 0.2);
      } else if (powerup.type === 'flame') {
        // Create circular flame pattern
        createFlameCircle(pacman.x + tileSize / 2, pacman.y + tileSize / 2);

        createParticleExplosion(px, py, 0xff4500, 20);
        createFloatingText(px, py, 'FLAMES!', 0xff4500);
        playTone(sceneRef, 800, 0.2);
      }

      specialPowerups.splice(i, 1);
    }
  }
}

function createFlameCircle(centerX, centerY) {
  // Create 16 flame projectiles in a circular pattern
  const numFlames = 16;
  for (let i = 0; i < numFlames; i++) {
    const angle = (Math.PI * 2 * i) / numFlames;
    const speed = 3;
    flames.push({
      x: centerX,
      y: centerY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1.5,
      size: 6
    });
  }
}

function createThunderStrikes(gridX, gridY) {
  // Create lightning bolts in all four cardinal directions until they hit walls
  const directions = [
    { dx: 0, dy: -1 }, // up
    { dx: 0, dy: 1 },  // down
    { dx: -1, dy: 0 }, // left
    { dx: 1, dy: 0 }   // right
  ];

  const currentMaze = getCurrentLayout();

  directions.forEach(dir => {
    let currentX = gridX;
    let currentY = gridY;
    const boltSegments = [];

    // Travel in this direction until we hit a wall
    while (true) {
      currentX += dir.dx;
      currentY += dir.dy;

      // Check bounds
      if (currentY < 0 || currentY >= currentMaze.length ||
          currentX < 0 || currentX >= currentMaze[0].length) {
        break;
      }

      // Check if it's a wall
      if (currentMaze[currentY][currentX] === 1) {
        break;
      }

      // Add this position to the bolt path
      boltSegments.push({ gridX: currentX, gridY: currentY });
    }

    // Create the thunderbolt for this direction
    if (boltSegments.length > 0) {
      thunderbolts.push({
        segments: boltSegments,
        life: 0.8, // Bolt lasts 0.8 seconds
        direction: dir
      });
    }
  });
}

function updateFlames(delta) {
  for (let i = flames.length - 1; i >= 0; i--) {
    const flame = flames[i];

    // Move flame
    flame.x += flame.vx;
    flame.y += flame.vy;
    flame.life -= delta / 1000;

    // Check collision with ghosts (only those NOT in spawn area)
    for (let g = 0; g < ghosts.length; g++) {
      const ghost = ghosts[g];

      // Skip ghosts that are in the spawn area
      if (ghost.inSpawn) continue;

      const ghostCenterX = ghost.x + tileSize / 2;
      const ghostCenterY = ghost.y + tileSize / 2;
      const dist = Math.sqrt(Math.pow(flame.x - ghostCenterX, 2) + Math.pow(flame.y - ghostCenterY, 2));

      if (dist < tileSize / 2 + flame.size) {
        // Hit ghost - send back to spawn
        createParticleExplosion(ghostCenterX, ghostCenterY, ghost.color, 20);
        createFloatingText(ghostCenterX, ghostCenterY, '+300', 0xff4500);

        score += 300;
        scoreText.setText('SCORE: ' + score);
        if (score > highScore) {
          highScoreText.setText('HI-SCORE: ' + score + ' (YOU)');
        }

        const startPositions = [
          { x: 13, y: 14 },
          { x: 12, y: 14 },
          { x: 14, y: 14 },
          { x: 15, y: 14 }
        ];
        const pos = startPositions[g];
        ghost.gridX = pos.x;
        ghost.gridY = pos.y;
        ghost.x = offsetX + ghost.gridX * tileSize;
        ghost.y = offsetY + ghost.gridY * tileSize;
        ghost.targetX = ghost.x;
        ghost.targetY = ghost.y;
        ghost.vulnerable = false;
        ghost.inSpawn = true;
        ghost.exitTimer = 0;
        ghost.exitDelay = 5000;

        playTone(sceneRef, 1500, 0.1);

        // Remove the flame
        flames.splice(i, 1);
        break;
      }
    }

    // Remove if life expired
    if (flame.life <= 0) {
      flames.splice(i, 1);
    }
  }
}

function updateThunderbolts(delta) {
  for (let i = thunderbolts.length - 1; i >= 0; i--) {
    const bolt = thunderbolts[i];
    bolt.life -= delta / 1000;

    // Check collision with ghosts for each segment of the bolt
    if (bolt.life > 0.6) { // Only deal damage in first 0.2 seconds
      for (let segIdx = 0; segIdx < bolt.segments.length; segIdx++) {
        const segment = bolt.segments[segIdx];

        for (let g = 0; g < ghosts.length; g++) {
          const ghost = ghosts[g];

          // Skip ghosts that are in the spawn area or already hit
          if (ghost.inSpawn || ghost.hitByThunder) continue;

          // Check if ghost is on this segment
          if (ghost.gridX === segment.gridX && ghost.gridY === segment.gridY) {
            // Hit ghost - send back to spawn
            const ghostCenterX = ghost.x + tileSize / 2;
            const ghostCenterY = ghost.y + tileSize / 2;

            createParticleExplosion(ghostCenterX, ghostCenterY, ghost.color, 20);
            createFloatingText(ghostCenterX, ghostCenterY, '+300', 0xffff00);

            score += 300;
            scoreText.setText('SCORE: ' + score);
            if (score > highScore) {
              highScoreText.setText('HI-SCORE: ' + score + ' (YOU)');
            }

            const startPositions = [
              { x: 13, y: 14 },
              { x: 12, y: 14 },
              { x: 14, y: 14 },
              { x: 15, y: 14 }
            ];
            const pos = startPositions[g];
            ghost.gridX = pos.x;
            ghost.gridY = pos.y;
            ghost.x = offsetX + ghost.gridX * tileSize;
            ghost.y = offsetY + ghost.gridY * tileSize;
            ghost.targetX = ghost.x;
            ghost.targetY = ghost.y;
            ghost.vulnerable = false;
            ghost.inSpawn = true;
            ghost.exitTimer = 0;
            ghost.exitDelay = 5000;
            ghost.hitByThunder = true; // Mark as hit to prevent multiple hits from same bolt

            playTone(sceneRef, 1800, 0.1);
          }
        }
      }
    }

    // Remove if life expired
    if (bolt.life <= 0) {
      // Clear thunder hit markers when bolt expires
      ghosts.forEach(g => g.hitByThunder = false);
      thunderbolts.splice(i, 1);
    }
  }
}
