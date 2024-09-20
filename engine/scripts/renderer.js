import {configureCanvas, cubeVertexArray,cubeVertexSize,cubeColorOffset,cubePositionOffset,
    cubeUVOffset,cubeVertexCount,vertexBufferLayout, CreateRenderPipeline
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
const renderPipeline = CreateRenderPipeline(device,shaderCode)



const depthTexture = device.createTexture({
    size: [canvas.width, canvas.height],
    format: 'depth24plus',
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
  });


const uniformBuffer = device.createBuffer({
    size: 4 * 16, // size for 4 vec4 uniforms
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});
const bindGroup = device.createBindGroup({
    label: "Cell renderer bind group",
    layout: renderPipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
});
        

const aspect = canvas.width / canvas.height;
const projectionMatrix = mat4.perspective((2 * Math.PI) / 5, aspect, 1, 100.0);
const modelViewProjectionMatrix = mat4.create();
const viewMatrix = mat4.identity();
mat4.translate(viewMatrix, vec3.fromValues(0, 0, -6), viewMatrix);

 
        
var startTime = 0.0;
var endTime =0.0;
startTime = performance.now();
function draw() {
    
    
    configureCanvas(canvas, context, device, canvasFormat);
    const transformationMatrix = mat4.multiply(projectionMatrix, viewMatrix, modelViewProjectionMatrix)
    device.queue.writeBuffer(
        uniformBuffer,
        0,
        transformationMatrix.buffer,
        transformationMatrix.byteOffset,
        transformationMatrix.byteLength
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
    const frameTime = endTime -startTime;
        //fpsDisplay = document.getElementById('fps');
    //fpsDisplay.textContent = `Frame Time: ${frameTime.toFixed(3)} ms`;
    
    requestAnimationFrame(draw); 
    startTime = endTime;

}
 
draw();
