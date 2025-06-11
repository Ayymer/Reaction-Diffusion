// Grid for the reaction-diffusion simulation
let current, buffer;
let canvasSize = 500; // Fixed canvas size of 500x500
let cornerRadius = 20; // Radius for rounded corners in pixels
let colorsInverted = false; // Track if colors are inverted

// Parameters for the reaction-diffusion (now let instead of const to allow modification)
let dA = 1.0;  // Diffusion rate of A
let dB = 0.5;  // Diffusion rate of B
let feed = 0.055;  // Feed rate
let kill = 0.062;  // Kill rate
let dt = 1.0;  // Time step
let updatesPerFrame = 10; // Updates per frame
let initialPatternSize = 15; // Size of initial pattern
let blobSize = 8; // Size of mouse-added blobs

// Color settings
const MATCHA_GREEN = [120, 160, 90]; // RGB values for matcha green
const WHITE = [255, 255, 255]; // RGB values for white

// Performance settings
const COMPUTE_BLOCK_SIZE = 8;  // Process pixels in blocks for better cache usage

// UI state
let showSliders = true; // Whether to show the sliders panel

function setup() {
  // Create a fixed-size canvas
  let canvas = createCanvas(canvasSize, canvasSize);
  
  // Set page background to black
  document.body.style.backgroundColor = '#000000';
  
  // Apply rounded corners to the canvas
  styleCanvas(canvas.elt);
  
  // Center the canvas on the page
  centerCanvas();
  
  // Create the color inversion toggle switch
  createToggleSwitch();
  
  // Create parameter sliders
  createParameterSliders();
  
  // Set the willReadFrequently attribute for better performance
  canvas.elt.getContext('2d', { willReadFrequently: true });
  
  pixelDensity(1);
  
  // Use typed arrays for better performance
  current = createTypedArray();
  buffer = createTypedArray();
  
  // Initialize with a pattern in the center
  initializePattern();
}

function createParameterSliders() {
  // Create a container for sliders
  const sliderContainer = document.createElement('div');
  sliderContainer.style.position = 'absolute';
  sliderContainer.style.right = '20px';
  sliderContainer.style.top = '20px';
  sliderContainer.style.width = '250px';
  sliderContainer.style.padding = '15px';
  sliderContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  sliderContainer.style.borderRadius = '10px';
  sliderContainer.style.display = 'flex';
  sliderContainer.style.flexDirection = 'column';
  sliderContainer.style.gap = '15px';
  sliderContainer.style.boxShadow = '0 0 10px rgba(0, 150, 0, 0.3)';
  sliderContainer.style.border = '1px solid #4a5d3a';
  sliderContainer.style.zIndex = '1000';
  sliderContainer.id = 'slider-container';
  
  // Add title and toggle button
  const titleRow = document.createElement('div');
  titleRow.style.display = 'flex';
  titleRow.style.justifyContent = 'space-between';
  titleRow.style.alignItems = 'center';
  titleRow.style.marginBottom = '10px';
  
  const title = document.createElement('h3');
  title.textContent = 'Pattern Controls';
  title.style.color = '#ffffff';
  title.style.margin = '0';
  title.style.fontFamily = 'Arial, sans-serif';
  
  const toggleButton = document.createElement('button');
  toggleButton.textContent = '−';
  toggleButton.style.backgroundColor = '#4a5d3a';
  toggleButton.style.color = 'white';
  toggleButton.style.border = 'none';
  toggleButton.style.borderRadius = '5px';
  toggleButton.style.width = '30px';
  toggleButton.style.height = '30px';
  toggleButton.style.cursor = 'pointer';
  toggleButton.style.fontSize = '20px';
  toggleButton.style.display = 'flex';
  toggleButton.style.justifyContent = 'center';
  toggleButton.style.alignItems = 'center';
  
  // Container for the sliders that can be toggled
  const slidersContent = document.createElement('div');
  slidersContent.id = 'sliders-content';
  slidersContent.style.display = 'flex';
  slidersContent.style.flexDirection = 'column';
  slidersContent.style.gap = '15px';
  
  // Toggle button functionality
  toggleButton.addEventListener('click', function() {
    if (showSliders) {
      slidersContent.style.display = 'none';
      toggleButton.textContent = '+';
      sliderContainer.style.width = 'auto';
    } else {
      slidersContent.style.display = 'flex';
      toggleButton.textContent = '−';
      sliderContainer.style.width = '250px';
    }
    showSliders = !showSliders;
  });
  
  titleRow.appendChild(title);
  titleRow.appendChild(toggleButton);
  sliderContainer.appendChild(titleRow);
  
  // Create preset buttons
  const presetContainer = document.createElement('div');
  presetContainer.style.display = 'flex';
  presetContainer.style.flexWrap = 'wrap';
  presetContainer.style.gap = '5px';
  presetContainer.style.marginBottom = '10px';
  
  const presets = [
    { name: 'Default', feed: 0.055, kill: 0.062 },
    { name: 'Spots', feed: 0.035, kill: 0.065 },
    { name: 'Maze', feed: 0.029, kill: 0.057 },
    { name: 'Coral', feed: 0.025, kill: 0.060 },
    { name: 'Waves', feed: 0.014, kill: 0.054 }
  ];
  
  presets.forEach(preset => {
    const button = document.createElement('button');
    button.textContent = preset.name;
    button.style.backgroundColor = '#4a5d3a';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '5px';
    button.style.padding = '5px 10px';
    button.style.cursor = 'pointer';
    button.style.fontSize = '12px';
    button.style.flex = '1';
    button.style.minWidth = '60px';
    
    button.addEventListener('click', function() {
      // Update values
      feed = preset.feed;
      kill = preset.kill;
      
      // Update slider positions
      document.getElementById('feed-slider').value = feed;
      document.getElementById('kill-slider').value = kill;
      
      // Update labels
      document.getElementById('feed-value').textContent = feed.toFixed(3);
      document.getElementById('kill-value').textContent = kill.toFixed(3);
      
      // Reinitialize the pattern
      initializePattern();
    });
    
    presetContainer.appendChild(button);
  });
  
  slidersContent.appendChild(presetContainer);
  
  // Helper function to create sliders
  function createSlider(id, label, min, max, value, step, onChange) {
    const container = document.createElement('div');
    container.style.width = '100%';
    
    const labelRow = document.createElement('div');
    labelRow.style.display = 'flex';
    labelRow.style.justifyContent = 'space-between';
    labelRow.style.marginBottom = '5px';
    
    const labelElement = document.createElement('label');
    labelElement.textContent = label;
    labelElement.style.color = '#ffffff';
    labelElement.style.fontFamily = 'Arial, sans-serif';
    labelElement.style.fontSize = '14px';
    
    const valueElement = document.createElement('span');
    valueElement.id = id + '-value';
    valueElement.textContent = value.toFixed(3);
    valueElement.style.color = '#ffffff';
    valueElement.style.fontFamily = 'monospace';
    valueElement.style.fontSize = '14px';
    
    labelRow.appendChild(labelElement);
    labelRow.appendChild(valueElement);
    
    const sliderElement = document.createElement('input');
    sliderElement.type = 'range';
    sliderElement.id = id + '-slider';
    sliderElement.min = min;
    sliderElement.max = max;
    sliderElement.step = step;
    sliderElement.value = value;
    sliderElement.style.width = '100%';
    sliderElement.style.height = '6px';
    sliderElement.style.borderRadius = '3px';
    sliderElement.style.accentColor = '#4a5d3a';
    
    sliderElement.addEventListener('input', function() {
      const newValue = parseFloat(this.value);
      valueElement.textContent = newValue.toFixed(3);
      onChange(newValue);
    });
    
    container.appendChild(labelRow);
    container.appendChild(sliderElement);
    
    return container;
  }
  
  // Create all sliders
  const feedSlider = createSlider('feed', 'Feed Rate', 0.01, 0.1, feed, 0.001, 
    value => { feed = value; });
  
  const killSlider = createSlider('kill', 'Kill Rate', 0.045, 0.07, kill, 0.001, 
    value => { kill = value; });
  
  const dASlider = createSlider('dA', 'Diffusion A', 0.5, 1.5, dA, 0.1, 
    value => { dA = value; });
  
  const dBSlider = createSlider('dB', 'Diffusion B', 0.1, 0.8, dB, 0.1, 
    value => { dB = value; });
  
  const dtSlider = createSlider('dt', 'Time Step', 0.5, 1.5, dt, 0.1, 
    value => { dt = value; });
  
  const updatesSlider = createSlider('updates', 'Updates/Frame', 1, 20, updatesPerFrame, 1, 
    value => { updatesPerFrame = value; });
  
  const patternSizeSlider = createSlider('pattern', 'Pattern Size', 5, 30, initialPatternSize, 1, 
    value => { 
      initialPatternSize = value;
      // Don't automatically reinitialize as it would reset the simulation
    });
  
  const blobSizeSlider = createSlider('blob', 'Blob Size', 3, 15, blobSize, 1, 
    value => { blobSize = value; });
  
  // Reset button
  const resetButton = document.createElement('button');
  resetButton.textContent = 'Reset Simulation';
  resetButton.style.backgroundColor = '#4a5d3a';
  resetButton.style.color = 'white';
  resetButton.style.border = 'none';
  resetButton.style.borderRadius = '5px';
  resetButton.style.padding = '8px';
  resetButton.style.cursor = 'pointer';
  resetButton.style.marginTop = '10px';
  resetButton.style.fontFamily = 'Arial, sans-serif';
  
  resetButton.addEventListener('click', function() {
    initializePattern();
  });
  
  // Add all sliders to the container
  slidersContent.appendChild(feedSlider);
  slidersContent.appendChild(killSlider);
  slidersContent.appendChild(dASlider);
  slidersContent.appendChild(dBSlider);
  slidersContent.appendChild(dtSlider);
  slidersContent.appendChild(updatesSlider);
  slidersContent.appendChild(patternSizeSlider);
  slidersContent.appendChild(blobSizeSlider);
  slidersContent.appendChild(resetButton);
  
  sliderContainer.appendChild(slidersContent);
  document.body.appendChild(sliderContainer);
}

function createToggleSwitch() {
  // Create a container for the switch
  const switchContainer = document.createElement('div');
  switchContainer.style.position = 'absolute';
  switchContainer.style.left = (windowWidth - canvasSize) / 2 + 'px';
  switchContainer.style.top = ((windowHeight - canvasSize) / 2 + canvasSize + 20) + 'px';
  switchContainer.style.width = canvasSize + 'px';
  switchContainer.style.display = 'flex';
  switchContainer.style.justifyContent = 'center';
  switchContainer.style.alignItems = 'center';
  switchContainer.style.gap = '10px';
  switchContainer.id = 'switch-container';
  
  // Create label for the switch
  const label = document.createElement('label');
  label.textContent = 'Invert Colors';
  label.style.color = '#ffffff';
  label.style.fontFamily = 'Arial, sans-serif';
  label.style.fontSize = '16px';
  
  // Create the toggle switch
  const toggleSwitch = document.createElement('label');
  toggleSwitch.className = 'switch';
  toggleSwitch.style.position = 'relative';
  toggleSwitch.style.display = 'inline-block';
  toggleSwitch.style.width = '60px';
  toggleSwitch.style.height = '34px';
  
  // Create the input (checkbox)
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.style.opacity = '0';
  checkbox.style.width = '0';
  checkbox.style.height = '0';
  checkbox.addEventListener('change', function() {
    colorsInverted = this.checked;
  });
  
  // Create the slider
  const slider = document.createElement('span');
  slider.className = 'slider';
  slider.style.position = 'absolute';
  slider.style.cursor = 'pointer';
  slider.style.top = '0';
  slider.style.left = '0';
  slider.style.right = '0';
  slider.style.bottom = '0';
  slider.style.backgroundColor = '#4a5d3a'; // Darker matcha color
  slider.style.transition = '.4s';
  slider.style.borderRadius = '34px';
  
  // Create the slider button
  const sliderButton = document.createElement('span');
  sliderButton.style.position = 'absolute';
  sliderButton.style.content = '""';
  sliderButton.style.height = '26px';
  sliderButton.style.width = '26px';
  sliderButton.style.left = '4px';
  sliderButton.style.bottom = '4px';
  sliderButton.style.backgroundColor = 'white';
  sliderButton.style.transition = '.4s';
  sliderButton.style.borderRadius = '50%';
  
  // Add CSS for checked state
  checkbox.addEventListener('change', function() {
    if (this.checked) {
      sliderButton.style.transform = 'translateX(26px)';
      slider.style.backgroundColor = '#ffffff';
      sliderButton.style.backgroundColor = '#4a5d3a';
    } else {
      sliderButton.style.transform = 'translateX(0)';
      slider.style.backgroundColor = '#4a5d3a';
      sliderButton.style.backgroundColor = '#ffffff';
    }
  });
  
  // Assemble the toggle switch
  slider.appendChild(sliderButton);
  toggleSwitch.appendChild(checkbox);
  toggleSwitch.appendChild(slider);
  
  // Add elements to the container
  switchContainer.appendChild(label);
  switchContainer.appendChild(toggleSwitch);
  
  // Add the container to the document
  document.body.appendChild(switchContainer);
}

function styleCanvas(canvasElement) {
  // Apply rounded corners and other styling to the canvas
  canvasElement.style.borderRadius = cornerRadius + 'px';
  
  // Optional: Add a subtle border or shadow
  canvasElement.style.border = '1px solid #4a5d3a'; // Darker matcha border
  canvasElement.style.boxShadow = '0 0 20px rgba(0, 150, 0, 0.5)'; // Green glow
  
  // Ensure the canvas doesn't have any overflow
  canvasElement.style.overflow = 'hidden';
}

function centerCanvas() {
  // Calculate position for centered canvas
  let x = (windowWidth - canvasSize) / 2;
  let y = (windowHeight - canvasSize) / 2;
  
  // Position the canvas
  let canvas = document.querySelector('canvas');
  if (canvas) {
    canvas.style.position = 'absolute';
    canvas.style.left = x + 'px';
    canvas.style.top = y + 'px';
  }
  
  // Reposition the switch container if it exists
  let switchContainer = document.getElementById('switch-container');
  if (switchContainer) {
    switchContainer.style.left = x + 'px';
    switchContainer.style.top = (y + canvasSize + 20) + 'px';
  }
}

function createTypedArray() {
  // Each pixel needs 2 values (a and b), so the array length is width * height * 2
  return new Float32Array(width * height * 2);
}

function initializePattern() {
  // Fill with default values (a=1, b=0)
  for (let i = 0; i < current.length; i += 2) {
    current[i] = 1;     // a
    current[i + 1] = 0; // b
  }
  
  // Add a square of chemical B in the center
  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);
  const squareSize = initialPatternSize;
  
  for (let y = centerY - squareSize; y < centerY + squareSize; y++) {
    for (let x = centerX - squareSize; x < centerX + squareSize; x++) {
      if (x >= 0 && x < width && y >= 0 && y < height) {
        const i = (x + y * width) * 2;
        current[i + 1] = 1; // Set b to 1
      }
    }
  }
}

function draw() {
  // Update the simulation multiple times per frame
  for (let i = 0; i < updatesPerFrame; i++) {
    update();
  }
  
  // Display the results
  displaySimulation();
}

function update() {
  // Process the grid in blocks for better cache performance
  for (let blockY = 1; blockY < height - 1; blockY += COMPUTE_BLOCK_SIZE) {
    for (let blockX = 1; blockX < width - 1; blockX += COMPUTE_BLOCK_SIZE) {
      // Process each block
      const blockEndY = min(blockY + COMPUTE_BLOCK_SIZE, height - 1);
      const blockEndX = min(blockX + COMPUTE_BLOCK_SIZE, width - 1);
      
      for (let y = blockY; y < blockEndY; y++) {
        for (let x = blockX; x < blockEndX; x++) {
          const i = (x + y * width) * 2;
          
          // Get current values
          const a = current[i];
          const b = current[i + 1];
          
          // Calculate laplacian using pre-computed offsets for better performance
          const center = i;
          const left = ((x - 1) + y * width) * 2;
          const right = ((x + 1) + y * width) * 2;
          const top = (x + (y - 1) * width) * 2;
          const bottom = (x + (y + 1) * width) * 2;
          const topLeft = ((x - 1) + (y - 1) * width) * 2;
          const topRight = ((x + 1) + (y - 1) * width) * 2;
          const bottomLeft = ((x - 1) + (y + 1) * width) * 2;
          const bottomRight = ((x + 1) + (y + 1) * width) * 2;
          
          // Compute Laplacians more efficiently
          let laplaceA = 
            current[topLeft] * 0.05 +
            current[top] * 0.2 +
            current[topRight] * 0.05 +
            current[left] * 0.2 +
            current[center] * -1 +
            current[right] * 0.2 +
            current[bottomLeft] * 0.05 +
            current[bottom] * 0.2 +
            current[bottomRight] * 0.05;
            
          let laplaceB = 
            current[topLeft + 1] * 0.05 +
            current[top + 1] * 0.2 +
            current[topRight + 1] * 0.05 +
            current[left + 1] * 0.2 +
            current[center + 1] * -1 +
            current[right + 1] * 0.2 +
            current[bottomLeft + 1] * 0.05 +
            current[bottom + 1] * 0.2 +
            current[bottomRight + 1] * 0.05;
          
          // Gray-Scott reaction-diffusion formula
          const abb = a * b * b;
          let nextA = a + (dA * laplaceA - abb + feed * (1 - a)) * dt;
          let nextB = b + (dB * laplaceB + abb - (kill + feed) * b) * dt;
          
          // Constrain values
          nextA = nextA < 0 ? 0 : nextA > 1 ? 1 : nextA;
          nextB = nextB < 0 ? 0 : nextB > 1 ? 1 : nextB;
          
          // Store in buffer
          buffer[i] = nextA;
          buffer[i + 1] = nextB;
        }
      }
    }
  }
  
  // Swap buffers
  [current, buffer] = [buffer, current];
}

function displaySimulation() {
  // Use direct pixel manipulation for faster rendering
  loadPixels();
  
  // Get color values based on inversion state
  const bgColor = colorsInverted ? WHITE : MATCHA_GREEN;
  const patternColor = colorsInverted ? MATCHA_GREEN : WHITE;
  
  // Process in blocks for better performance
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (x + y * width) * 2;
      const pixelIndex = (x + y * width) * 4;
      
      // Calculate color based on the difference between a and b
      const a = current[i];
      const b = current[i + 1];
      
      // Map the value to a color between background and pattern color
      const value = (a - b);
      const normalizedValue = constrain(value, 0, 1);
      
      // Interpolate between background and pattern color
      const r = bgColor[0] + (patternColor[0] - bgColor[0]) * normalizedValue;
      const g = bgColor[1] + (patternColor[1] - bgColor[1]) * normalizedValue;
      const bl = bgColor[2] + (patternColor[2] - bgColor[2]) * normalizedValue;
      
      // Set pixel color
      pixels[pixelIndex] = r;
      pixels[pixelIndex + 1] = g;
      pixels[pixelIndex + 2] = bl;
      pixels[pixelIndex + 3] = 255;
    }
  }
  
  updatePixels();
}

function mousePressed() {
  // Check if the mouse is within the canvas
  if (mouseX >= 0 && mouseX < width && mouseY >= 0 && mouseY < height) {
    // Add a blob of chemical B
    for (let y = mouseY - blobSize; y < mouseY + blobSize; y++) {
      for (let x = mouseX - blobSize; x < mouseX + blobSize; x++) {
        if (x >= 0 && x < width && y >= 0 && y < height) {
          const i = (x + y * width) * 2;
          current[i + 1] = 1; // Set b to 1
        }
      }
    }
  }
}

function windowResized() {
  // Don't resize the canvas, just recenter it
  centerCanvas();
  
  // Make sure the styling is maintained after window resize
  let canvas = document.querySelector('canvas');
  if (canvas) {
    styleCanvas(canvas);
  }
}
