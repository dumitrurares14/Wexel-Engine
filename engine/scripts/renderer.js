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
            

            if(z%2==0)
            {
            textureData[index] =  0;       // Red channel
            textureData[index + 1] =  0;  // Green channel
            textureData[index + 2] =  0;   // Blue channel
            textureData[index + 3] = 255;                 // Alpha channel
            }
            else{
            textureData[index] =  0;       // Red channel
            textureData[index + 1] =  0;  // Green channel
            textureData[index + 2] =  0;   // Blue channel
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
projectionMatrix[5] *= -1;
const modelViewProjectionMatrix = mat4.create();
const viewMatrix = mat4.identity();
const modelMatrix = mat4.identity();
var inverseViewMatrix = mat4.identity();

let cameraPosition = vec3.fromValues(0, 0, 20);


var startTime = 0.0;
var endTime = 0.0;
startTime = performance.now();
mat4.translate(viewMatrix, cameraPosition, viewMatrix);


function draw() { 

    inverseViewMatrix = mat4.inverse(viewMatrix);
    const mouseSpeed = 0.01;
    if(engine.keysPressed['ArrowRight'])
        mat4.rotateY(viewMatrix, -mouseSpeed, viewMatrix);
    if(engine.keysPressed['ArrowLeft'])
        mat4.rotateY(viewMatrix, mouseSpeed, viewMatrix);
    if(engine.keysPressed['ArrowUp'])
        mat4.rotateX(viewMatrix, mouseSpeed, viewMatrix);
    if(engine.keysPressed['ArrowDown'])
        mat4.rotateX(viewMatrix, -mouseSpeed, viewMatrix);

    if(engine.keysPressed['w'])
        mat4.translate(viewMatrix, vec3.fromValues(0,0,-engine.playerSpeed), viewMatrix);
    if(engine.keysPressed['s'])
        mat4.translate(viewMatrix, vec3.fromValues(0,0,engine.playerSpeed), viewMatrix);
    if(engine.keysPressed['a'])
        mat4.translate(viewMatrix, vec3.fromValues(-engine.playerSpeed,0,0), viewMatrix);
    if(engine.keysPressed['d'])
        mat4.translate(viewMatrix, vec3.fromValues(engine.playerSpeed,0,0), viewMatrix);
    if(engine.keysPressed[' '])
        mat4.translate(viewMatrix, vec3.fromValues(0,engine.playerSpeed,0), viewMatrix);

   

//mat4.rotateX(viewMatrix, engine.mouseDelta[1] *mouseSpeed, viewMatrix);
//mat4.rotateY(viewMatrix, engine.mouseDelta[0] *mouseSpeed, viewMatrix);


   engine.UpdateMouseStart();
    
    configureCanvas(canvas, context, device, canvasFormat);
    
    const transformationMatrix = mat4.multiply(projectionMatrix, inverseViewMatrix, modelMatrix);
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


    // Update the frame time display
    endTime = performance.now();
    const frameTime = endTime - startTime;
    //fpsDisplay = document.getElementById('fps');
    //fpsDisplay.textContent = `Frame Time: ${frameTime.toFixed(3)} ms`;

    requestAnimationFrame(draw);
    startTime = endTime;
    engine.ResetMouseDelta();
}

draw();
