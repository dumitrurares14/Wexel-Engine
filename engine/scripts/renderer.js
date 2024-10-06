import {
    configureCanvas, cubeVertexArray, cubeVertexSize, cubeColorOffset, cubePositionOffset,
    cubeUVOffset, cubeVertexCount, vertexBufferLayout, CreateRenderPipeline
} from './renderer-common.js';
import {
    vec3,
    mat4,
} from 'https://wgpu-matrix.org/dist/3.x/wgpu-matrix.module.js';

import * as engine from './engine.js';

engine.initializeCanvas();

const canvas = engine.canvas;
if (!canvas) {
    throw new Error('Canvas element not found.');
}

const adapter = await navigator.gpu.requestAdapter();
if (!adapter) {
    throw new Error("No appropriate GPUAdapter found.");
}

const device = await adapter.requestDevice();
const context = canvas.getContext("webgpu");
const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
configureCanvas(canvas, context, device, canvasFormat);
window.addEventListener('resize', configureCanvas(canvas, context, device, canvasFormat));




const vertexBuffer = device.createBuffer({
    size: cubeVertexArray.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
});
new Float32Array(vertexBuffer.getMappedRange()).set(cubeVertexArray);
vertexBuffer.unmap();

device.queue.writeBuffer(vertexBuffer, 0, cubeVertexArray);



const shaderCode = await engine.combineShaderFiles('./shaders/shader.wgsl', './shaders/common.wgsl');
const bindGroupLayout = device.createBindGroupLayout({
    entries: [{
        binding: 0, // camera uniforms
        visibility: GPUShaderStage.VERTEX,
        buffer: {},
    },
    {
        binding: 1, // Volume texture
        visibility: GPUShaderStage.FRAGMENT,
        texture: {
            sampleType: "float", // Assuming rgba8unorm maps to float
            viewDimension: "3d",
            multisampled: false,
        },
    },
    {
        binding: 2, // Volume texture sampler
        visibility: GPUShaderStage.FRAGMENT,
        sampler: {},
    }
    ]
});
const renderPipeline = CreateRenderPipeline(device, bindGroupLayout, shaderCode)



const depthTexture = device.createTexture({
    size: [canvas.width, canvas.height],
    format: 'depth24plus',
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
});

var volumeTexture = device.createTexture({
    size: [128, 128, 128],
    dimension: "3d",
    format: "rgba8unorm", // Choose the appropriate format
    usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST
});
// Define texture dimensions and format
const width = 128;
const height = 128;
const depth = 128;
const bytesPerPixel = 4; // rgba8unorm
const dataSize = width * height * depth * bytesPerPixel;

// Create a Uint8Array to hold the texture data
const textureData = new Uint8Array(dataSize);

// Fill the data with a gradient
for (let z = 0; z < depth; z++) {
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const index = (z * width * height + y * width + x) * bytesPerPixel;


            if (z % 2 == 0) {
                textureData[index] = 0;       // Red channel
                textureData[index + 1] = 0;  // Green channel
                textureData[index + 2] = 0;   // Blue channel
                textureData[index + 3] = 255;                 // Alpha channel
            }
            else {
                textureData[index] = 0;       // Red channel
                textureData[index + 1] = 0;  // Green channel
                textureData[index + 2] = 0;   // Blue channel
                textureData[index + 3] = 0;                 // Alpha channel
            }
        }
    }
}

// Define the texture write layout
const textureWriteLayout = {
    bytesPerRow: width * bytesPerPixel, // Number of bytes per row
    rowsPerImage: height                 // Number of rows per image (depth slice)
};
var volumeSampler = device.createSampler();
const textureView = volumeTexture.createView({
    dimension: "3d",
});

const uniformBuffer = device.createBuffer({
    size: 4 * 16, // size for 4 vec4 uniforms
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});


const bindGroup = device.createBindGroup({
    label: "Cell renderer bind group",
    layout: renderPipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer: uniformBuffer } },
    { binding: 1, resource: textureView },
    { binding: 2, resource: volumeSampler }
    ],
});


const aspect = canvas.width / canvas.height;
var projectionMatrix = mat4.perspective((2 * Math.PI) / 5, aspect, 1, 100.0);
//projectionMatrix[5] *= -1;
const modelViewProjectionMatrix = mat4.create();
var viewMatrix = mat4.identity();
const modelMatrix = mat4.identity();
var inverseViewMatrix = mat4.identity();

var cameraPosition = vec3.fromValues(0, 0, 10);
let aim = vec3.fromValues(0, 0, 0);
let up = vec3.fromValues(0, 1, 0);

var startTime = 0.0;
var endTime = 0.0;
startTime = performance.now();


var x = 0;
var y = 0;
var z = -10;

const mouseSpeed = 0.3;
var pitch = 0, yaw = 0;

function draw() {


    startTime = performance.now();
    const deltaTime = (startTime -  endTime)/1000;


    yaw += engine.mouseDelta[0] * mouseSpeed*deltaTime;
    pitch += engine.mouseDelta[1] * mouseSpeed*deltaTime;
    console.log(yaw)
    // Clamp the pitch to prevent flipping
    const maxPitch = Math.PI / 2 - 0.01;
    if (pitch > maxPitch) pitch = maxPitch;
    if (pitch < -maxPitch) pitch = -maxPitch;

    const direction = vec3.fromValues(
        Math.cos(pitch) * Math.sin(yaw),
        Math.sin(pitch),
        Math.cos(pitch) * Math.cos(yaw)
    );

    // Calculate right and up vectors
    const right = vec3.normalize(vec3.cross(direction, vec3.fromValues(0, 1, 0)));
    vec3.normalize(right, right);
    const up = vec3.normalize(vec3.cross(right, direction));
    vec3.normalize(up, up);

    const enginePlayerSpeed = engine.playerSpeed *deltaTime;
    // Update camera position based on key presses
    if (engine.keysPressed['w']) {
        x += direction[0] * enginePlayerSpeed;
        y += direction[1] * enginePlayerSpeed;
        z += direction[2] * enginePlayerSpeed;
    }

    if (engine.keysPressed['s']) {
        x -= direction[0] * enginePlayerSpeed;
        y -= direction[1] * enginePlayerSpeed;
        z -= direction[2] * enginePlayerSpeed;
    }

    if (engine.keysPressed['a']) {
        x -= right[0] * enginePlayerSpeed;
        y -= right[1] * enginePlayerSpeed;
        z -= right[2] * enginePlayerSpeed;
    }

    if (engine.keysPressed['d']) {
        x += right[0] * enginePlayerSpeed;
        y += right[1] * enginePlayerSpeed;
        z += right[2] * enginePlayerSpeed;
    }

    if (engine.keysPressed[' ']) { // Spacebar for upward movement
        x += up[0] * enginePlayerSpeed;
        y += up[1] * enginePlayerSpeed;
        z += up[2] * enginePlayerSpeed;
    }

    if (engine.keysPressed['Shift']) { // Shift key for downward movement
        x -= up[0] * enginePlayerSpeed;
        y -= up[1] * enginePlayerSpeed;
        z -= up[2] * enginePlayerSpeed;
    }

    const cameraPosition = vec3.fromValues(x, y, z);

    const aim = vec3.add(cameraPosition, direction);

    viewMatrix = mat4.lookAt(cameraPosition, aim, up);


    engine.UpdateMouseStart();

    configureCanvas(canvas, context, device, canvasFormat);

    const transformationMatrix = mat4.multiply(projectionMatrix, viewMatrix, modelMatrix);
    //const transformationMatrix = mat4.multiply(projectionMatrix, mat4.inverse(viewMatrix), modelViewProjectionMatrix)


    device.queue.writeBuffer(
        uniformBuffer,
        0,
        transformationMatrix.buffer,
        transformationMatrix.byteOffset,
        transformationMatrix.byteLength,
    );

    // Upload the data to the texture
    device.queue.writeTexture(
        { texture: volumeTexture }, // Destination texture
        textureData,                // Data to write
        textureWriteLayout,         // Data layout
        [width, height, depth]      // Size of the texture
    );


    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
        colorAttachments: [{
            view: context.getCurrentTexture().createView(),
            loadOp: "clear",
            clearValue: { r: 0, g: 0, b: 0.4, a: 1 },
            storeOp: "store",
        }],
        depthStencilAttachment: {
            view: depthTexture.createView(),
            depthClearValue: 1.0,
            depthLoadOp: 'clear',
            depthStoreOp: 'store',
        },
    });

    pass.setPipeline(renderPipeline);
    pass.setVertexBuffer(0, vertexBuffer);
    pass.setBindGroup(0, bindGroup);
    pass.draw(cubeVertexCount);
    pass.end();

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);




    //fpsDisplay = document.getElementById('fps');
    //fpsDisplay.textContent = `Frame Time: ${frameTime.toFixed(3)} ms`;

    requestAnimationFrame(draw);
    endTime = startTime;
    engine.ResetMouseDelta();
}

draw();
