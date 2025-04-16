// Constants
const GRID_SIZE = 15;
const CELL_SIZE = 40;

// Student names data
const STUDENT_NAMES = {
  boys: [
    "Hariz",
    "Mazizi",
    "Aqqwa",
    "Hazral",
    "Aqief",
    "Idzham",
    "Amir",
    "Irfan",
  ],
  girls: [
    "Nadzirah",
    "Irdina",
    "Athirah",
    "Syafiqah",
    "Arissa",
    "Adriana",
    "Hanan",
    "Beatrisyia",
  ],
};

// Difficulty settings
const DIFFICULTY_SETTINGS = {
  easy: {
    studentCount: 16,
    wallDensity: 0.5,
    studentSpeed: 500, // 3x faster than original
    escapeLimit: 8,
  },
  medium: {
    studentCount: 16,
    wallDensity: 0.6,
    studentSpeed: 400, // 3x faster than original
    escapeLimit: 8,
  },
  hard: {
    studentCount: 16,
    wallDensity: 0.7,
    studentSpeed: 300, // 3x faster than original
    escapeLimit: 8,
  },
  extreme: {
    studentCount: 16,
    wallDensity: 0.8,
    studentSpeed: 200, // 3x faster than original
    escapeLimit: 8,
  },
};

// Game state
let maze = [];
let zombie = { x: 1, y: 1 };
let students = [];
let gameStatus = "setup"; // setup, playing, won, lost
let score = 0;
let escapedCount = 0;
let gameInterval;
let animationFrameId;
let currentDifficulty = "medium";
let studentMoveInterval;
let timeLeft = 30;
let timerInterval;

// Audio elements
let catchSound;
let gameStartSound;

// DOM elements
let gameContainer;
let gameBoard;
let gameHeader;
let gameOverlay;

// Initialize the game
function initGame() {
  // Clear previous game if any
  if (gameInterval) {
    clearInterval(gameInterval);
  }
  if (studentMoveInterval) {
    clearInterval(studentMoveInterval);
  }
  if (timerInterval) {
    clearInterval(timerInterval);
  }
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }

  // Reset timer
  timeLeft = 30;

  // Initialize sounds
  if (!catchSound) {
    catchSound = new Audio(
      "https://assets.mixkit.co/active_storage/sfx/2068/2068-preview.mp3",
    );
  }
  if (!gameStartSound) {
    gameStartSound = new Audio(
      "https://assets.mixkit.co/active_storage/sfx/209/209-preview.mp3",
    );
  }

  // Initialize horror background sound
  if (!window.horrorSound) {
    window.horrorSound = new Audio(
      "https://assets.mixkit.co/active_storage/sfx/146/146-preview.mp3",
    );
    window.horrorSound.loop = true;
    window.horrorSound.volume = 0.3;
  }

  // Reset game state
  maze = generateMaze();
  zombie = { x: 1, y: 1 };
  students = [];
  gameStatus = "playing";
  score = 0;
  escapedCount = 0;

  const settings = DIFFICULTY_SETTINGS[currentDifficulty];

  // Generate boy students (8)
  for (let i = 0; i < 8; i++) {
    let x, y;
    do {
      x = Math.floor(Math.random() * (GRID_SIZE - 4)) + 2;
      y = Math.floor(Math.random() * (GRID_SIZE - 4)) + 2;
    } while (maze[y][x] !== "empty" || isPositionOccupied(students, { x, y }));

    students.push({
      id: i,
      position: { x, y },
      caught: false,
      name: STUDENT_NAMES.boys[i],
      gender: "boy",
    });
  }

  // Generate girl students (8)
  for (let i = 0; i < 8; i++) {
    let x, y;
    do {
      x = Math.floor(Math.random() * (GRID_SIZE - 4)) + 2;
      y = Math.floor(Math.random() * (GRID_SIZE - 4)) + 2;
    } while (maze[y][x] !== "empty" || isPositionOccupied(students, { x, y }));

    students.push({
      id: i + 8,
      position: { x, y },
      caught: false,
      name: STUDENT_NAMES.girls[i],
      gender: "girl",
    });
  }

  // Render the game
  renderGame();

  // Start student movement interval
  studentMoveInterval = setInterval(moveStudents, settings.studentSpeed);

  // Start timer countdown
  timerInterval = setInterval(updateTimer, 1000);

  // Play game start sound
  if (gameStartSound) {
    gameStartSound.currentTime = 0;
    gameStartSound.play().catch((e) => console.error("Audio play failed:", e));
  }

  // Play horror background sound
  if (window.horrorSound) {
    window.horrorSound.currentTime = 0;
    window.horrorSound
      .play()
      .catch((e) => console.error("Audio play failed:", e));
  }
}

// Generate maze with dead ends
function generateMaze() {
  const newMaze = [];
  const settings = DIFFICULTY_SETTINGS[currentDifficulty];

  // Initialize with walls
  for (let y = 0; y < GRID_SIZE; y++) {
    const row = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      if (x === 0 || y === 0 || x === GRID_SIZE - 1 || y === GRID_SIZE - 1) {
        row.push("wall");
      } else if (
        x % 2 === 0 &&
        y % 2 === 0 &&
        Math.random() < settings.wallDensity
      ) {
        row.push("wall");
      } else {
        row.push("empty");
      }
    }
    newMaze.push(row);
  }

  // Create dead ends
  for (let y = 2; y < GRID_SIZE - 2; y++) {
    for (let x = 2; x < GRID_SIZE - 2; x++) {
      if (newMaze[y][x] === "empty" && Math.random() < 0.2) {
        // Count surrounding walls
        let wallCount = 0;
        if (newMaze[y - 1][x] === "wall") wallCount++;
        if (newMaze[y + 1][x] === "wall") wallCount++;
        if (newMaze[y][x - 1] === "wall") wallCount++;
        if (newMaze[y][x + 1] === "wall") wallCount++;

        // If there are already 2 or more walls around, add another to create a dead end
        if (wallCount >= 2 && Math.random() < 0.7) {
          const direction = Math.floor(Math.random() * 4);
          if (direction === 0 && newMaze[y - 1][x] !== "wall")
            newMaze[y - 1][x] = "wall";
          else if (direction === 1 && newMaze[y + 1][x] !== "wall")
            newMaze[y + 1][x] = "wall";
          else if (direction === 2 && newMaze[y][x - 1] !== "wall")
            newMaze[y][x - 1] = "wall";
          else if (direction === 3 && newMaze[y][x + 1] !== "wall")
            newMaze[y][x + 1] = "wall";
        }
      }
    }
  }

  // Ensure path from start to exit
  ensurePath(newMaze, 1, 1, GRID_SIZE - 2, GRID_SIZE - 2);

  // Place exit door
  newMaze[GRID_SIZE - 2][GRID_SIZE - 2] = "exit";

  return newMaze;
}

// Ensure there's a path from start to exit
function ensurePath(maze, startX, startY, endX, endY) {
  // Simple implementation: clear a direct path
  let x = startX;
  let y = startY;

  // Move horizontally first
  while (x < endX) {
    maze[y][x] = "empty";
    x++;
  }

  // Then move vertically
  while (y < endY) {
    maze[y][x] = "empty";
    y++;
  }
}

// Check if position is occupied by another student
function isPositionOccupied(characters, position) {
  return characters.some(
    (c) =>
      !c.caught && c.position.x === position.x && c.position.y === position.y,
  );
}

// Move zombie
function moveZombie(dx, dy) {
  if (gameStatus !== "playing") return;

  const newX = zombie.x + dx;
  const newY = zombie.y + dy;

  if (
    newX >= 0 &&
    newX < GRID_SIZE &&
    newY >= 0 &&
    newY < GRID_SIZE &&
    maze[newY][newX] !== "wall"
  ) {
    zombie.x = newX;
    zombie.y = newY;

    // Check for collisions with students
    students = students.map((student) => {
      if (
        !student.caught &&
        student.position.x === newX &&
        student.position.y === newY
      ) {
        score++;
        // Play catch sound
        if (catchSound) {
          catchSound.currentTime = 0;
          catchSound
            .play()
            .catch((e) => console.error("Audio play failed:", e));
        }
        console.log(`Caught ${student.name} (${student.gender})`);
        return { ...student, caught: true };
      }
      return student;
    });

    // Check win condition
    const settings = DIFFICULTY_SETTINGS[currentDifficulty];
    const activeStudents = students.filter((s) => !s.caught);
    if (activeStudents.length === 0 || score >= settings.studentCount) {
      gameStatus = "won";
      clearInterval(studentMoveInterval);
    }

    // Update the game display
    renderGame();
  }
}

// Move students
function moveStudents() {
  if (gameStatus !== "playing") return;

  const directions = [
    { dx: 0, dy: -1 }, // up
    { dx: 1, dy: 0 }, // right
    { dx: 0, dy: 1 }, // down
    { dx: -1, dy: 0 }, // left
  ];

  students = students.map((student) => {
    if (student.caught) return student;

    // Calculate distance to exit
    const distToExit =
      Math.abs(student.position.x - (GRID_SIZE - 2)) +
      Math.abs(student.position.y - (GRID_SIZE - 2));

    // Calculate distance to zombie
    const distToZombie =
      Math.abs(student.position.x - zombie.x) +
      Math.abs(student.position.y - zombie.y);

    // Prioritize moving away from zombie and towards exit
    directions.sort(() => Math.random() - 0.5); // Shuffle for some randomness

    // Try to move
    for (const dir of directions) {
      const newX = student.position.x + dir.dx;
      const newY = student.position.y + dir.dy;

      if (newX >= 0 && newX < GRID_SIZE && newY >= 0 && newY < GRID_SIZE) {
        // Check if new position is exit
        if (maze[newY][newX] === "exit") {
          escapedCount++;
          return { ...student, caught: true };
        }

        // Check if new position is empty and not occupied
        if (
          maze[newY][newX] === "empty" &&
          !isPositionOccupied(students, { x: newX, y: newY }) &&
          !(zombie.x === newX && zombie.y === newY)
        ) {
          // Calculate new distances
          const newDistToExit =
            Math.abs(newX - (GRID_SIZE - 2)) + Math.abs(newY - (GRID_SIZE - 2));
          const newDistToZombie =
            Math.abs(newX - zombie.x) + Math.abs(newY - zombie.y);

          // Move if it gets closer to exit or further from zombie
          if (newDistToExit < distToExit || newDistToZombie > distToZombie) {
            return { ...student, position: { x: newX, y: newY } };
          }
        }
      }
    }

    return student;
  });

  // Check lose condition
  const settings = DIFFICULTY_SETTINGS[currentDifficulty];
  if (escapedCount >= settings.escapeLimit) {
    gameStatus = "lost";
    clearInterval(studentMoveInterval);
  }

  // Update the game display
  renderGame();
}

// Update timer
function updateTimer() {
  if (gameStatus !== "playing") return;

  timeLeft--;

  // Update timer display
  const timerDiv = document.querySelector(".timer");
  if (timerDiv) {
    timerDiv.textContent = `Time Left: ${timeLeft}s`;
  }

  // Check if time's up
  if (timeLeft <= 0) {
    gameStatus = "lost";
    clearInterval(studentMoveInterval);
    clearInterval(timerInterval);
    renderGame();
  }
}

// Show difficulty selector
function showDifficultySelector() {
  // Clear the game container
  gameContainer = document.getElementById("game-container");
  gameContainer.innerHTML = "";

  // Create the game structure
  const zombieGame = document.createElement("div");
  zombieGame.className = "zombie-game";

  // Create header
  gameHeader = document.createElement("div");
  gameHeader.className = "game-header";

  const title = document.createElement("h1");
  title.textContent = "Unizombie";
  gameHeader.appendChild(title);

  // Create difficulty selector
  const difficultySelector = document.createElement("div");
  difficultySelector.className = "difficulty-selector";

  const difficultyLabel = document.createElement("h2");
  difficultyLabel.textContent = "Select Difficulty:";
  difficultySelector.appendChild(difficultyLabel);

  const difficultyOptions = document.createElement("div");
  difficultyOptions.className = "difficulty-options";

  const difficulties = ["easy", "medium", "hard", "extreme"];
  difficulties.forEach((diff) => {
    const btn = document.createElement("button");
    btn.className = `difficulty-btn ${diff === currentDifficulty ? "selected" : ""}`;
    btn.textContent = diff.charAt(0).toUpperCase() + diff.slice(1);
    btn.onclick = () => {
      // Remove selected class from all buttons
      document.querySelectorAll(".difficulty-btn").forEach((b) => {
        b.classList.remove("selected");
      });
      // Add selected class to clicked button
      btn.classList.add("selected");
      currentDifficulty = diff;
    };
    difficultyOptions.appendChild(btn);
  });

  difficultySelector.appendChild(difficultyOptions);

  const startBtn = document.createElement("button");
  startBtn.className = "start-btn";
  startBtn.textContent = "Start Game";
  startBtn.onclick = initGame;
  difficultySelector.appendChild(startBtn);

  // Assemble the game
  zombieGame.appendChild(gameHeader);
  zombieGame.appendChild(difficultySelector);

  gameContainer.appendChild(zombieGame);
}

// Render the game
function renderGame() {
  if (gameStatus === "setup") {
    showDifficultySelector();
    return;
  }

  // Clear the game container
  gameContainer = document.getElementById("game-container");
  gameContainer.innerHTML = "";

  // Create the game structure
  const zombieGame = document.createElement("div");
  zombieGame.className = "zombie-game";

  // Create header
  gameHeader = document.createElement("div");
  gameHeader.className = "game-header";

  const title = document.createElement("h1");
  title.textContent = "Unizombie (Level 6 UPTM)";

  const gameStats = document.createElement("div");
  gameStats.className = "game-stats";

  const caughtDiv = document.createElement("div");
  caughtDiv.textContent = `Caught: ${score}`;

  const escapedDiv = document.createElement("div");
  escapedDiv.textContent = `Escaped: ${escapedCount}`;

  const difficultyDiv = document.createElement("div");
  difficultyDiv.textContent = `Difficulty: ${currentDifficulty.charAt(0).toUpperCase() + currentDifficulty.slice(1)}`;

  const timerDiv = document.createElement("div");
  timerDiv.textContent = `Time Left: ${timeLeft}s`;
  timerDiv.className = "timer";

  gameStats.appendChild(caughtDiv);
  gameStats.appendChild(escapedDiv);
  gameStats.appendChild(difficultyDiv);
  gameStats.appendChild(timerDiv);

  gameHeader.appendChild(title);
  gameHeader.appendChild(gameStats);

  // Create game board
  gameBoard = document.createElement("div");
  gameBoard.className = "game-board";
  gameBoard.style.width = GRID_SIZE * CELL_SIZE + "px";
  gameBoard.style.height = GRID_SIZE * CELL_SIZE + "px";

  // Render cells
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const cell = document.createElement("div");
      cell.className = `cell ${maze[y][x]}`;
      cell.style.left = x * CELL_SIZE + "px";
      cell.style.top = y * CELL_SIZE + "px";
      cell.style.width = CELL_SIZE + "px";
      cell.style.height = CELL_SIZE + "px";
      gameBoard.appendChild(cell);
    }
  }

  // Render zombie
  const zombieElement = document.createElement("div");
  zombieElement.className = "character zombie";
  zombieElement.style.left = zombie.x * CELL_SIZE + "px";
  zombieElement.style.top = zombie.y * CELL_SIZE + "px";
  zombieElement.style.width = CELL_SIZE + "px";
  zombieElement.style.height = CELL_SIZE + "px";
  zombieElement.style.backgroundImage =
    "url('./uptm zombie.png'), url('https://images.unsplash.com/photo-1546776310-eef45dd6d63c?w=100&q=80')";
  zombieElement.style.backgroundSize = "cover";
  zombieElement.style.backgroundPosition = "center";

  const zombieName = document.createElement("div");
  zombieName.className = "character-name";
  zombieName.textContent = "Muhammad Bin Amran";

  zombieElement.appendChild(zombieName);
  gameBoard.appendChild(zombieElement);

  // Render students
  students.forEach((student) => {
    // Only render students that haven't been caught
    if (!student.caught) {
      const studentElement = document.createElement("div");
      studentElement.className = `character student ${student.gender}`;
      studentElement.style.left = student.position.x * CELL_SIZE + "px";
      studentElement.style.top = student.position.y * CELL_SIZE + "px";
      studentElement.style.width = CELL_SIZE + "px";
      studentElement.style.height = CELL_SIZE + "px";

      // Set background image based on gender
      if (student.gender === "boy") {
        studentElement.style.backgroundImage =
          "url('https://api.dicebear.com/7.x/avataaars/svg?seed=boy" +
          student.id +
          "&mouth=smile&style=circle')";
      } else {
        studentElement.style.backgroundImage =
          "url('https://api.dicebear.com/7.x/avataaars/svg?seed=girl" +
          student.id +
          "&mouth=smile&style=circle')";
      }
      studentElement.style.backgroundSize = "cover";
      studentElement.style.backgroundPosition = "center";

      const STUDENT_NAMES = document.createElement("div");
      STUDENT_NAMES.className = "character-name";
      STUDENT_NAMES.textContent = student.name;

      studentElement.appendChild(STUDENT_NAMES);
      gameBoard.appendChild(studentElement);
    }
  });

  // Create game controls
  const gameControls = document.createElement("div");
  gameControls.className = "game-controls";

  const controlsText1 = document.createElement("p");
  controlsText1.textContent = "Use arrow keys or WASD to move";

  const controlsText2 = document.createElement("p");
  controlsText2.textContent = "Catch all students before they escape!";

  gameControls.appendChild(controlsText1);
  gameControls.appendChild(controlsText2);

  // Add game over overlay if needed
  if (gameStatus !== "playing") {
    // Stop horror sound when game ends
    if (window.horrorSound) {
      window.horrorSound.pause();
    }

    gameOverlay = document.createElement("div");
    gameOverlay.className = "game-overlay";

    const gameMessage = document.createElement("div");
    gameMessage.className = "game-message";

    const messageText = document.createElement("div");
    messageText.textContent = gameStatus === "won" ? "You Won!" : "You Lost!";

    const playAgainButton = document.createElement("button");
    playAgainButton.textContent = "Play Again";
    playAgainButton.onclick = () => {
      gameStatus = "setup";
      showDifficultySelector();
    };

    gameMessage.appendChild(messageText);
    gameMessage.appendChild(playAgainButton);
    gameOverlay.appendChild(gameMessage);

    gameBoard.appendChild(gameOverlay);
  }

  // Assemble the game
  zombieGame.appendChild(gameHeader);
  zombieGame.appendChild(gameBoard);
  zombieGame.appendChild(gameControls);

  gameContainer.appendChild(zombieGame);
}

// Handle keyboard input
function handleKeyDown(e) {
  switch (e.key) {
    case "ArrowUp":
    case "w":
    case "W":
      moveZombie(0, -1);
      break;
    case "ArrowRight":
    case "d":
    case "D":
      moveZombie(1, 0);
      break;
    case "ArrowDown":
    case "s":
    case "S":
      moveZombie(0, 1);
      break;
    case "ArrowLeft":
    case "a":
    case "A":
      moveZombie(-1, 0);
      break;
  }
}

// Initialize the game when the page loads
document.addEventListener("DOMContentLoaded", () => {
  // Add keyboard event listener
  window.addEventListener("keydown", handleKeyDown);

  // Start with difficulty selector
  gameStatus = "setup";
  showDifficultySelector();
});
