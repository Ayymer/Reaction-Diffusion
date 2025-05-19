// Grid for the reaction-diffusion simulation
let grid;
let next;

// Parameters for the reaction-diffusion
let dA = 1.0;  // Diffusion rate of A
let dB = 0.5;  // Diffusion rate of B
let feed = 0.055;  // Feed rate
let kill = 0.062;  // Kill rate

function setup() {
  // Create a canvas that fills the window
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  
  // Initialize grid
  initializeGrid();
}

function initializeGrid() {
  // Initialize grid
  grid = [];
  next = [];
  for (let x = 0; x < width; x++) {
    grid[x] = [];
    next[x] = [];
    for (let y = 0; y < height; y++) {
      grid[x][y] = { a: 1, b: 0 };
      next[x][y] = { a: 1, b: 0 };
    }
  }
  
  // Add a small square of chemical B in the center
  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);
  const squareSize = 20; // Fixed size to ensure pattern forms
  
  for (let x = centerX - squareSize; x < centerX + squareSize; x++) {
    for (let y = centerY - squareSize; y < centerY + squareSize; y++) {
      if (x >= 0 && x < width && y >= 0 && y < height) {
        grid[x][y].b = 1;
      }
    }
  }
}

function draw() {
  // Update the simulation multiple times per frame for faster results
  for (let i = 0; i < 1; i++) {
    update();
  }
  
  // Display the results
  loadPixels();
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      // Map chemical A concentration to a grayscale value
      let pix = (x + y * width) * 4;
      let a = grid[x][y].a;
      let b = grid[x][y].b;
      let c = floor((a - b) * 255);
      c = constrain(c, 0, 255);
      
      pixels[pix + 0] = c;
      pixels[pix + 1] = c;
      pixels[pix + 2] = c;
      pixels[pix + 3] = 255;
    }
  }
  updatePixels();
}

function update() {
  // Calculate the new values based on the previous values
  for (let x = 1; x < width - 1; x++) {
    for (let y = 1; y < height - 1; y++) {
      let a = grid[x][y].a;
      let b = grid[x][y].b;
      
      // Calculate laplacian for diffusion using a 3x3 convolution
      let laplaceA = 0;
      let laplaceB = 0;
      
      laplaceA += grid[x-1][y-1].a * 0.05;
      laplaceA += grid[x][y-1].a * 0.2;
      laplaceA += grid[x+1][y-1].a * 0.05;
      laplaceA += grid[x-1][y].a * 0.2;
      laplaceA += grid[x][y].a * -1;
      laplaceA += grid[x+1][y].a * 0.2;
      laplaceA += grid[x-1][y+1].a * 0.05;
      laplaceA += grid[x][y+1].a * 0.2;
      laplaceA += grid[x+1][y+1].a * 0.05;
      
      laplaceB += grid[x-1][y-1].b * 0.05;
      laplaceB += grid[x][y-1].b * 0.2;
      laplaceB += grid[x+1][y-1].b * 0.05;
      laplaceB += grid[x-1][y].b * 0.2;
      laplaceB += grid[x][y].b * -1;
      laplaceB += grid[x+1][y].b * 0.2;
      laplaceB += grid[x-1][y+1].b * 0.05;
      laplaceB += grid[x][y+1].b * 0.2;
      laplaceB += grid[x+1][y+1].b * 0.05;
      
      // Gray-Scott reaction-diffusion formula
      let abb = a * b * b;
      next[x][y].a = a + (dA * laplaceA - abb + feed * (1 - a)) * 1.0;
      next[x][y].b = b + (dB * laplaceB + abb - (kill + feed) * b) * 1.0;
      
      // Keep values in a valid range
      next[x][y].a = constrain(next[x][y].a, 0, 1);
      next[x][y].b = constrain(next[x][y].b, 0, 1);
    }
  }
  
  // Swap grids
  let temp = grid;
  grid = next;
  next = temp;
}

// Click to add more chemical B at mouse position
function mousePressed() {
  // Add a blob of chemical B
  const blobSize = 10; // Fixed size for consistency
  
  for (let x = mouseX - blobSize; x < mouseX + blobSize; x++) {
    for (let y = mouseY - blobSize; y < mouseY + blobSize; y++) {
      if (x >= 0 && x < width && y >= 0 && y < height) {
        grid[x][y].b = 1;
      }
    }
  }
}

// Handle window resizing
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  
  // We need to reinitialize the grid when the window is resized
  initializeGrid();
}
