import {configureCanvas, cubeVertexArray,cubeVertexSize,cubeColorOffset,cubePositionOffset,
    cubeUVOffset,cubeVertexCount
} from './renderer-common.js';
import {
    vec3,
    mat4,
  } from 'https://wgpu-matrix.org/dist/3.x/wgpu-matrix.module.js';

const  canvas = document.querySelector("canvas");
if (!canvas) {
    console.error('Canvas element not found.');
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


let mouseX = 0;
let mouseY = 0;
let startX = 0;
let startY = 0;
var mX = canvas.width / 2;
var mY= canvas.height / 2;

let leftClick = false;


//input handling
canvas.addEventListener('mousedown', (e) => 
{
    const rect = canvas.getBoundingClientRect();
    startX = e.clientX - rect.left;
    startY = e.clientY - rect.top;
            leftClick = true;
    updateMousePosition(e);
});

canvas.addEventListener('mouseup', () => {
    leftClick = false;
});
       
canvas.addEventListener('mousemove', (event) => 
{
    const rect = canvas.getBoundingClientRect();
    if(leftClick)
{
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
}
});


const encoder = device.createCommandEncoder();

/* const vertices = device.createBuffer({
    size: cubeVertexArray.byteLength,
    usage: GPUBufferUsage.VERTEX,
    mappedAtCreation: true,
  });
   */

const vertexBuffer = device.createBuffer({
    size: cubeVertexArray.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
});
new Float32Array(vertexBuffer.getMappedRange()).set(cubeVertexArray);
vertexBuffer.unmap();

device.queue.writeBuffer(vertexBuffer, 0, cubeVertexArray);

const vertexBufferLayout = {
    arrayStride: cubeVertexSize,
    attributes: [
      {
        // position
        shaderLocation: 0,
        offset: cubePositionOffset,
        format: 'float32x4',
      },
      {
        // uv
        shaderLocation: 1,
        offset: cubeUVOffset,
        format: 'float32x2',
      },
    ],
  };

//to move
async function loadShaderCode(url) {
    const response = await fetch(url);
    return response.text();
}

//to move
async function combineShaderFiles(mainShaderUrl, commonShaderUrl) {
    const [mainShader, commonShader] = await Promise.all([
        loadShaderCode(mainShaderUrl),
        loadShaderCode(commonShaderUrl)
    ]);
    return commonShader + '\n' + mainShader.replace('// #include "./shaders/common.wgsl"', '');
}

const shaderCode = await combineShaderFiles('./shaders/shader.wgsl', './shaders/common.wgsl');

const cellShaderModule = device.createShaderModule({
    label: 'vertexMain',
    code: shaderCode
});
const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
const cellPipeline = device.createRenderPipeline({
    layout: "auto",
    label: "Render pipeline",
    vertex: {
        module: cellShaderModule,
        entryPoint: "vertexMain",
        buffers: [vertexBufferLayout]
    },
    fragment: {
        module: cellShaderModule,
        entryPoint: "fragmentMain",
        targets: [{ format: canvasFormat }],
        format: presentationFormat
    },
    primitive:
    {
        topology: "triangle-list",
        cullMode: "back"
    },
    depthStencil: {
        depthWriteEnabled: true,
        depthCompare: 'less',
        format: 'depth24plus',
      },
});

const depthTexture = device.createTexture({
    size: [canvas.width, canvas.height],
    format: 'depth24plus',
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
  });


const uniformBuffer = device.createBuffer({
    size: 4 * 16, // size for 4 vec4 uniforms
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});
        
//to move
        function lerp(start, end, t) 
        {
    return start + t * (end - start);

        }


        const aspect = canvas.width / canvas.height;
const projectionMatrix = mat4.perspective((2 * Math.PI) / 5, aspect, 1, 100.0);
const modelViewProjectionMatrix = mat4.create();

function getTransformationMatrix() {
  const viewMatrix = mat4.identity();
  mat4.translate(viewMatrix, vec3.fromValues(0, 0, -4), viewMatrix);
  const now = Date.now() / 1000;
  mat4.rotate(
    viewMatrix,
    vec3.fromValues(Math.sin(now), Math.cos(now), 0),
    1,
    viewMatrix
  );

  mat4.multiply(projectionMatrix, viewMatrix, modelViewProjectionMatrix);

  return modelViewProjectionMatrix;
}
        function updateUniforms() 
        {
            const transformationMatrix = getTransformationMatrix();
            device.queue.writeBuffer(
              uniformBuffer,
              0,
              transformationMatrix.buffer,
              transformationMatrix.byteOffset,
              transformationMatrix.byteLength
            );
        }
 
        const bindGroup = device.createBindGroup({
            label: "Cell renderer bind group",
            layout: cellPipeline.getBindGroupLayout(0),
            entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
        });
        var startTime = 0.0;
        var endTime =0.0;

   startTime = performance.now();
        function draw() {
             

            configureCanvas(canvas, context, device, canvasFormat);
            updateUniforms();


        
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

            pass.setPipeline(cellPipeline);
            pass.setVertexBuffer(0, vertexBuffer);
            pass.setBindGroup(0, bindGroup);
         //   pass.setBindGroup(0, uniformBindGroup);
           
            pass.draw(cubeVertexCount);
       //     pass.draw(cubeVertexArray.length / 2, 1);
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
