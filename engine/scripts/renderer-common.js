export function configureCanvas(canvas, context, device, canvasFormat) {
      // Check if the passed object is an HTMLCanvasElement
      if (!(canvas instanceof HTMLCanvasElement)) {
        console.error("Invalid argument: Expected an HTMLCanvasElement.");
        return;
    }
    const devicePixelRatio = window.devicePixelRatio || 1;
    const displayWidth = Math.floor(canvas.clientWidth * devicePixelRatio/1.0);
    const displayHeight = Math.floor(canvas.clientHeight * devicePixelRatio/1.0);

    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        context.configure({
            device: device,
            format: canvasFormat,
            size: [displayWidth, displayHeight]
        });
    }
}

export const cubeVertexSize = 4 * 10; // Byte size of one cube vertex.
export const cubePositionOffset = 0;
export const cubeColorOffset = 4 * 4; // Byte offset of cube vertex color attribute.
export const cubeUVOffset = 4 * 8;
export const cubeVertexCount = 36;

export const cubeVertexArray = new Float32Array([
    // float4 position, float4 color, float2 uv,
    1, -1, 1, 1,   1, 0, 1, 1,  0, 1,
    -1, -1, 1, 1,  0, 0, 1, 1,  1, 1,
    -1, -1, -1, 1, 0, 0, 0, 1,  1, 0,
    1, -1, -1, 1,  1, 0, 0, 1,  0, 0,
    1, -1, 1, 1,   1, 0, 1, 1,  0, 1,
    -1, -1, -1, 1, 0, 0, 0, 1,  1, 0,
  
    1, 1, 1, 1,    1, 1, 1, 1,  0, 1,
    1, -1, 1, 1,   1, 0, 1, 1,  1, 1,
    1, -1, -1, 1,  1, 0, 0, 1,  1, 0,
    1, 1, -1, 1,   1, 1, 0, 1,  0, 0,
    1, 1, 1, 1,    1, 1, 1, 1,  0, 1,
    1, -1, -1, 1,  1, 0, 0, 1,  1, 0,
  
    -1, 1, 1, 1,   0, 1, 1, 1,  0, 1,
    1, 1, 1, 1,    1, 1, 1, 1,  1, 1,
    1, 1, -1, 1,   1, 1, 0, 1,  1, 0,
    -1, 1, -1, 1,  0, 1, 0, 1,  0, 0,
    -1, 1, 1, 1,   0, 1, 1, 1,  0, 1,
    1, 1, -1, 1,   1, 1, 0, 1,  1, 0,
  
    -1, -1, 1, 1,  0, 0, 1, 1,  0, 1,
    -1, 1, 1, 1,   0, 1, 1, 1,  1, 1,
    -1, 1, -1, 1,  0, 1, 0, 1,  1, 0,
    -1, -1, -1, 1, 0, 0, 0, 1,  0, 0,
    -1, -1, 1, 1,  0, 0, 1, 1,  0, 1,
    -1, 1, -1, 1,  0, 1, 0, 1,  1, 0,
  
    1, 1, 1, 1,    1, 1, 1, 1,  0, 1,
    -1, 1, 1, 1,   0, 1, 1, 1,  1, 1,
    -1, -1, 1, 1,  0, 0, 1, 1,  1, 0,
    -1, -1, 1, 1,  0, 0, 1, 1,  1, 0,
    1, -1, 1, 1,   1, 0, 1, 1,  0, 0,
    1, 1, 1, 1,    1, 1, 1, 1,  0, 1,
  
    1, -1, -1, 1,  1, 0, 0, 1,  0, 1,
    -1, -1, -1, 1, 0, 0, 0, 1,  1, 1,
    -1, 1, -1, 1,  0, 1, 0, 1,  1, 0,
    1, 1, -1, 1,   1, 1, 0, 1,  0, 0,
    1, -1, -1, 1,  1, 0, 0, 1,  0, 1,
    -1, 1, -1, 1,  0, 1, 0, 1,  1, 0,
  ]);
