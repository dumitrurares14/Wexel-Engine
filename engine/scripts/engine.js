// Declare the canvas and initialization variables
let canvas = null;
let leftClick = false;
let mouseX = 0;
let mouseY = 0;
let startX = 0;
let startY = 0;

// Function to initialize the canvas and add event listeners
function initializeCanvas() {
    console.log('Initializing canvas...');
    canvas = document.createElement('canvas'); // Create a new canvas element
    document.body.appendChild(canvas); // Optionally append it to the body or any other container

    // Input handling
    canvas.addEventListener('mousedown', (e) => {
        const rect = canvas.getBoundingClientRect();
        startX = e.clientX - rect.left;
        startY = e.clientY - rect.top;
        leftClick = true;
        updateMousePosition(e);
    });

    canvas.addEventListener('mouseup', () => {
        leftClick = false;
    });

    canvas.addEventListener('mousemove', (event) => {
        const rect = canvas.getBoundingClientRect();
        if (leftClick) {
            mouseX = event.clientX - rect.left;
            mouseY = event.clientY - rect.top;
        }
    });
}

// Helper function to update mouse position (can be expanded)
function updateMousePosition(event) {
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
    console.log(`Mouse position: (${mouseX}, ${mouseY})`);
}


//to move
export async function loadShaderCode(url) {
    const response = await fetch(url);
    return response.text();
}

//to move
export async function combineShaderFiles(mainShaderUrl, commonShaderUrl) {
    const [mainShader, commonShader] = await Promise.all([
        loadShaderCode(mainShaderUrl),
        loadShaderCode(commonShaderUrl)
    ]);
    return commonShader + '\n' + mainShader.replace('// #include "./shaders/common.wgsl"', '');
}

// Exporting the canvas and initialize function
export { canvas, initializeCanvas, mouseX, mouseY, startX, startY, leftClick };
