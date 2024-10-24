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
const gui = new dat.GUI();

var debugSettings = 
{
    lightDirection: [0.51, -0.41, 0.3],
}
gui.remember(debugSettings);
gui.add(debugSettings.lightDirection, 0, -1.0, 1.0).name('Light X').step(0.01);
gui.add(debugSettings.lightDirection, 1, -1.0, 1.0).name('Light Y').step(0.01);
gui.add(debugSettings.lightDirection, 2, -1.0, 1.0).name('Light Z').step(0.01);

configureCanvas(canvas, context, device, canvasFormat);

window.addEventListener('resize', () => {
    configureCanvas(canvas, context, device, canvasFormat);

    // Recreate depth texture with new dimensions
    depthTexture = device.createTexture({
        size: [canvas.width, canvas.height],
        format: 'depth24plus',
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    aspect = canvas.width / canvas.height;
    projectionMatrix = mat4.perspective((2 * Math.PI) / 5, aspect, 1, 100.0);
});


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
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
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
    },
    {
        binding: 3,
        visibility: GPUShaderStage.FRAGMENT,
        buffer: {
            type: 'read-only-storage',
        },
    },
    ]
});
const renderPipeline = CreateRenderPipeline(device, bindGroupLayout, shaderCode)



let depthTexture = device.createTexture({
    size: [canvas.width, canvas.height],
    format: 'depth24plus',
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
});

let depthTextureView = depthTexture.createView();

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
noise.seed(Math.random());

//const noise2D = makeNoise2D(Date.now()); // Using current date as seed
// Fill the data with a gradient
for (let z = 0; z < depth; z++) {
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const index = (z * width * height + y * width + x) * bytesPerPixel;
            var value = noise.simplex3(x / 100, y / 100, z / 100)*256.0 ;

           
        
                textureData[index] = 255 * Math.round((Math.random()*50* Math.random())/50);       // Red channel

            textureData[index + 1] = value;  // Green channel
            textureData[index + 2] = value;   // Blue channel
            textureData[index + 3] = value;

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
    size: 256,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});

const materials = [
    {
        color: [0.596, 0.608, 0.639, 1.0],
        metallic: 0.5,
        roughness: 0.2,
    },
    {
        color: [0.541, 0.549, 0.561, 1.0],
        metallic: 0.3,
        roughness: 0.7,
    }

];

const materialSize = 16 + 4 + 4 + 8;

const arrayBuffer = new ArrayBuffer(materials.length * materialSize);
const dataView = new DataView(arrayBuffer);

function writeMaterialToBuffer(material, offset) {
    let byteOffset = offset;

    material.color.forEach((value) => {
        dataView.setFloat32(byteOffset, value, true);
        byteOffset += 4;
    });

    dataView.setFloat32(byteOffset, material.metallic, true);
    byteOffset += 4;

    dataView.setFloat32(byteOffset, material.roughness, true);
    byteOffset += 4;

    byteOffset += 8; // Skip 8 bytes for padding
}


materials.forEach((material, index) => {
    writeMaterialToBuffer(material, index * materialSize);
});

const materialBuffer = device.createBuffer({
    size: arrayBuffer.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
});


device.queue.writeBuffer(materialBuffer, 0, arrayBuffer);


const bindGroup = device.createBindGroup({
    label: "Cell renderer bind group",
    layout: renderPipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer: uniformBuffer } },
    { binding: 1, resource: textureView },
    { binding: 2, resource: volumeSampler },
    { binding: 3, resource: { buffer: materialBuffer } }
    ],
});



let aspect = canvas.width / canvas.height;
let projectionMatrix = mat4.perspective(Math.PI / 2.0, aspect, 0.01, 1000.0);
var viewMatrix = mat4.identity();
var modelMatrix = mat4.identity();

//modelMatrix= mat4.scale(modelMatrix,vec3.fromValues(debugSettings.rasterizedBoxSize, debugSettings.rasterizedBoxSize, debugSettings.rasterizedBoxSize));

var inverseViewMatrix = mat4.identity();

var cameraPosition = vec3.fromValues(0, 0, -1);

var startTime = 0.0;
var endTime = 0.0;
startTime = performance.now();




const mouseSpeed = 1.0;
var pitch = 0, yaw = 0;

function draw(timeStamp) {


    startTime = performance.now();
    const deltaTime = (startTime - endTime) / 1000;


    yaw += engine.mouseDelta[0] * mouseSpeed * deltaTime;
    pitch += engine.mouseDelta[1] * mouseSpeed * deltaTime;
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
    const up = vec3.normalize(vec3.cross(right, direction));

    // movement
    const enginePlayerSpeed = engine.playerSpeed * deltaTime;
    let scaledDirection = vec3.mulScalar(direction, enginePlayerSpeed);
    let scaledRight = vec3.mulScalar(right, enginePlayerSpeed);
    let scaledUp = vec3.mulScalar(up, enginePlayerSpeed);

    if (engine.keysPressed['w'])
        cameraPosition = vec3.add(cameraPosition, scaledDirection);

    if (engine.keysPressed['s'])
        cameraPosition = vec3.subtract(cameraPosition, scaledDirection);

    if (engine.keysPressed['a'])
        cameraPosition = vec3.subtract(cameraPosition, scaledRight);

    if (engine.keysPressed['d'])
        cameraPosition = vec3.add(cameraPosition, scaledRight);

    if (engine.keysPressed[' '])
        cameraPosition = vec3.add(cameraPosition, scaledUp);

    if (engine.keysPressed['Shift'])
        cameraPosition = vec3.subtract(cameraPosition, scaledUp);

    const aim = vec3.add(cameraPosition, direction);

    viewMatrix = mat4.lookAt(cameraPosition, aim, up);


    engine.UpdateMouseStart();


    const transformationMatrix = mat4.multiply(mat4.multiply(projectionMatrix, viewMatrix), modelMatrix);

    device.queue.writeBuffer(
        uniformBuffer,
        0,
        transformationMatrix.buffer,
        transformationMatrix.byteOffset,
        transformationMatrix.byteLength,
    );


    inverseViewMatrix = mat4.inverse(viewMatrix);


    // const ViewMatrix = 
    device.queue.writeBuffer(
        uniformBuffer,
        64, // Offset by 64 bytes to leave room for the matrix
        inverseViewMatrix.buffer,
        inverseViewMatrix.byteOffset,
        inverseViewMatrix.byteLength
    );



    const inverseModelMatrix = mat4.inverse(modelMatrix);

    device.queue.writeBuffer(
        uniformBuffer,
        128, // Offset by 64 bytes to leave room for the matrix
        inverseModelMatrix.buffer,
        inverseModelMatrix.byteOffset,
        inverseModelMatrix.byteLength
    );



    const sizeC = vec3.fromValues(canvas.width, canvas.height, 0.0);

    device.queue.writeBuffer(
        uniformBuffer,
        192, // Offset by 64 bytes to leave room for the matrix
        sizeC.buffer,
        sizeC.byteOffset,
        sizeC.byteLength
    );

    //console.log(cameraPosition)
    device.queue.writeBuffer(
        uniformBuffer,
        208, // Offset by 64 bytes to leave room for the matrix
        cameraPosition.buffer,
        cameraPosition.byteOffset,
        cameraPosition.byteLength
    );

    const lightX = debugSettings.lightDirection[0];
    const lightY = debugSettings.lightDirection[1];
    const lightZ = debugSettings.lightDirection[2];
    const lightDirection = vec3.fromValues(lightX,lightY, lightZ);
    device.queue.writeBuffer(
        uniformBuffer,
        208+16,
        lightDirection.buffer,
        lightDirection.byteOffset,
        lightDirection.byteLength
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
            clearValue: { r: 0.737, g: 0.867, b: 0.871, a: 1 },
            storeOp: "store",
        }],
        depthStencilAttachment: {
            view: depthTextureView,
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
    engine.ResetMouseDelta();

    endTime = startTime;
    requestAnimationFrame(draw);
}

requestAnimationFrame(draw);
