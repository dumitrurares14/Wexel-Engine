// Declare the canvas and initialization variables
let canvas = null;
let leftClick = false;
let mouseX = 0.0;
let mouseY = 0.0;
var startX = 0.0;
var startY = 0.0;
// Global variables for keyboard input
let keysPressed = {};
const playerSpeed = 1.1;
let mouseDelta = [0.0,0.0];

// Function to initialize the canvas and add event listeners
function initializeCanvas() {
    console.log('Initializing canvas...');
    canvas = document.createElement('canvas'); // Create a new canvas element
    document.body.appendChild(canvas); // Optionally append it to the body or any other container


    canvas.addEventListener('mouseup', () => {
        leftClick = false;
    });

    canvas.addEventListener('mousemove', (event) => {
        updateMousePosition(event)
    });

    // Keyboard event listeners
    window.addEventListener('keydown', (e) => {
        keysPressed[e.key] = true;
        handleKeyDown(e);
    });

    window.addEventListener('keyup', (e) => {
        keysPressed[e.key] = false;
        handleKeyUp(e);
    });

    

    document.addEventListener('pointerlockchange', onPointerLockChange);

}

// Helper function to update mouse position (can be expanded)
function updateMousePosition(event) {
    //const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX ;
    mouseY = event.clientY ;
    
}

function UpdateMouseStart()
{
    startX = mouseX;
    startY = mouseY;
    
}

// Function to handle pointer lock change
function onPointerLockChange() {
    if (document.pointerLockElement === canvas) {
        console.log('Pointer locked');
        window.addEventListener('mousemove', OnMouseMove);
    } else {
        console.log('Pointer unlocked');
        window.removeEventListener('mousemove', OnMouseMove);
    }
}

function OnMouseMove(event)
{
    mouseDelta[0] += -event.movementX;
    mouseDelta[1] += -event.movementY;

}

function ResetMouseDelta()
{
    mouseDelta = [0.0,0.];
}

// Function to handle keydown events
function handleKeyDown(event) {
    //console.log(`Key pressed: ${event.key}`);
    if(event.key == "h")
    {
        canvas.requestPointerLock();
    }
}

// Function to handle keyup events
function handleKeyUp(event) {
    ///console.log(`Key released: ${event.key}`);
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
export { canvas, initializeCanvas, mouseX, mouseY, startX, startY, leftClick, keysPressed,playerSpeed, UpdateMouseStart ,mouseDelta,ResetMouseDelta};
